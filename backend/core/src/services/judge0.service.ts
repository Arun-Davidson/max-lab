import axios from 'axios';
import config from '../config';
import logger from '../config/logger';

export interface Judge0Result {
  stdout: string | null;
  time: string | null;
  memory: number | null;
  stderr: string | null;
  token: string;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
}

const JUDGE0_TIMEOUT_MS = 10000;
const JUDGE0_POLL_INTERVAL_MS = 700;
const JUDGE0_POLL_TIMEOUT_MS = 25000;
const JUDGE0_MAX_RETRIES = 2;

type ExecutionMode = 'function' | 'program';
type JavaSourceShape = 'program' | 'class' | 'method';
type LanguageFamily =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'go'
  | 'java'
  | 'cpp'
  | 'rust'
  | 'ruby';

const LANGUAGE_FAMILIES: Record<LanguageFamily, number[]> = {
  javascript: [63, 93, 97, 102],
  typescript: [74, 94, 101],
  python: [70, 71, 92, 100, 109, 113],
  go: [60, 95, 106, 107],
  java: [62],
  cpp: [52, 53, 54],
  rust: [73],
  ruby: [72],
};

const FUNCTION_WRAPPER_FAMILIES = new Set<LanguageFamily>(['javascript', 'typescript', 'python', 'go']);

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const base64Encode = (value: string): string => Buffer.from(value, 'utf8').toString('base64');

const previewForLog = (value: string | null, maxLen = 200): string | null => {
  if (value === null) return null;
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}...<truncated:${value.length}>`;
};

const safeBase64Decode = (value: string | null): string | null => {
  if (!value) return value;
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return value;
  }
};

const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (config.services.judge0.apiKey) {
    headers['X-Auth-Token'] = config.services.judge0.apiKey;
  }
  return headers;
};

const isRetryableJudge0Error = (error: any): boolean => {
  const status = error?.response?.status;
  if (!status) return true;
  return status >= 500 || status === 429;
};

const withRetries = async <T>(operation: () => Promise<T>, label: string): Promise<T> => {
  let attempt = 0;
  while (attempt <= JUDGE0_MAX_RETRIES) {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt === JUDGE0_MAX_RETRIES || !isRetryableJudge0Error(error)) {
        throw error;
      }
      const backoff = 200 * Math.pow(2, attempt);
      logger.warn(`Judge0 ${label} failed, retrying`, {
        attempt: attempt + 1,
        backoff,
        status: error?.response?.status,
      });
      await delay(backoff);
      attempt += 1;
    }
  }

  throw new Error(`Judge0 ${label} failed after retries`);
};

const getLanguageFamily = (languageId: number): LanguageFamily | null => {
  for (const [family, ids] of Object.entries(LANGUAGE_FAMILIES)) {
    if (ids.includes(languageId)) {
      return family as LanguageFamily;
    }
  }
  return null;
};

const extractFunctionName = (sourceCode: string): string => {
  const patterns = [
    /function\s+(\w+)\s*\(([^)]*)\)/,
    /(?:var|let|const)\s+(\w+)\s*=\s*function\s*\(([^)]*)\)/,
    /(?:var|let|const)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/,
    /def\s+(\w+)\s*\(([^)]*)\):/,
    /func\s+(\w+)\s*\(([^)]*)\)/,
  ];

  for (const pattern of patterns) {
    const match = sourceCode.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return '';
};

const hasProgramEntrypoint = (sourceCode: string, family: LanguageFamily): boolean => {
  if (family === 'javascript' || family === 'typescript') {
    return /(?:^|\s)(?:async\s+)?function\s+main\s*\(|process\.stdin|readline|require\(['"]fs['"]\)/m.test(
      sourceCode,
    );
  }

  if (family === 'python') {
    return /if\s+__name__\s*==\s*['"]__main__['"]|sys\.stdin|input\(/m.test(sourceCode);
  }

  if (family === 'go') {
    return /func\s+main\s*\(|os\.Stdin|bufio\.NewReader\(os\.Stdin\)/m.test(sourceCode);
  }

  if (family === 'java') {
    return /public\s+static\s+void\s+main\s*\(/m.test(sourceCode);
  }

  if (family === 'cpp') {
    return /int\s+main\s*\(|std::cin|scanf\(/m.test(sourceCode);
  }

  if (family === 'rust') {
    return /fn\s+main\s*\(|std::io::stdin\(\)/m.test(sourceCode);
  }

  if (family === 'ruby') {
    return /\$stdin|gets\b|if\s+__FILE__\s*==\s*\$0/m.test(sourceCode);
  }

  return false;
};

const resolveExecutionMode = (
  sourceCode: string,
  family: LanguageFamily | null,
  functionName: string,
): ExecutionMode => {
  if (!family) return 'program';
  if (hasProgramEntrypoint(sourceCode, family)) return 'program';
  if (FUNCTION_WRAPPER_FAMILIES.has(family) && functionName) return 'function';
  return 'program';
};

const validateFunctionModeSource = (
  sourceCode: string,
  family: LanguageFamily,
): void => {
  if (family === 'javascript' || family === 'typescript') {
    if (hasProgramEntrypoint(sourceCode, family)) {
      throw new Error(
        `Function-only submission required for ${family}. Remove program entrypoint/stdin handling and submit only the target function.`,
      );
    }
  }

  if (family === 'go') {
    if (/^\s*package\s+main\b/m.test(sourceCode) || /^\s*import\s*\(/m.test(sourceCode)) {
      throw new Error(
        'Function-only submission required for go. Remove package/import declarations and submit only the target function.',
      );
    }

    if (/^\s*func\s+main\s*\(/m.test(sourceCode) || hasProgramEntrypoint(sourceCode, family)) {
      throw new Error(
        'Function-only submission required for go. Remove main/stdin program logic and submit only the target function.',
      );
    }
  }
};

const normalizeNumberString = (value: number): string => {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  return String(parseFloat(value.toString()));
};

const normalizeExpectedOutput = (expectedOutput?: string): string | null => {
  if (expectedOutput === undefined || expectedOutput === null) return null;

  const trimmed = expectedOutput.trim();
  if (!trimmed) return '';

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'string') return parsed;
    if (typeof parsed === 'number') return normalizeNumberString(parsed);
    if (typeof parsed === 'boolean') return parsed ? 'true' : 'false';
    return JSON.stringify(parsed);
  } catch {
    return trimmed;
  }
};

const normalizeFunctionInput = (stdin?: string): string | null => {
  if (!stdin) return null;
  const trimmed = stdin.trim();
  if (!trimmed) return null;

  let args: unknown[] = [];

  try {
    const parsed = JSON.parse(trimmed);
    // If a testcase input is a JSON array, it is usually a single function argument (e.g. [1,2,3]).
    // Variadic inputs are represented in starter JSON as comma-separated values and handled below.
    args = [parsed];
  } catch {
    try {
      const variadic = JSON.parse(`[${trimmed}]`);
      args = Array.isArray(variadic) ? variadic : [variadic];
    } catch {
      args = [trimmed];
    }
  }

  return JSON.stringify({ args });
};

const parseFunctionArgs = (stdin?: string): unknown[] => {
  if (!stdin) return [];
  const trimmed = stdin.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return [parsed];
  } catch {
    try {
      const variadic = JSON.parse(`[${trimmed}]`);
      return Array.isArray(variadic) ? variadic : [variadic];
    } catch {
      return [trimmed];
    }
  }
};

type JavaMethodInfo = {
  name: string;
  returnType: string;
  paramTypes: string[];
  isStatic: boolean;
};

const classifyJavaSourceShape = (sourceCode: string): JavaSourceShape => {
  if (/\bstatic\s+void\s+main\s*\(/m.test(sourceCode)) {
    return 'program';
  }

  if (/\bclass\s+[A-Za-z_$][\w$]*\b/m.test(sourceCode)) {
    return 'class';
  }

  return 'method';
};

const normalizeJavaType = (type: string): string =>
  type
    .replace(/\b(final|volatile|transient)\b/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\[\s*\]/g, '[]')
    .trim();

const parseJavaParameterTypes = (paramsBlock: string): string[] => {
  const trimmed = paramsBlock.trim();
  if (!trimmed) return [];

  return trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const withoutAnnotations = part.replace(/@[A-Za-z_$][\w$]*(\([^)]*\))?\s*/g, '').trim();
      const varArgNormalized = withoutAnnotations.replace(/\.\.\./g, '[]');
      const match = varArgNormalized.match(/^(.*\S)\s+[A-Za-z_$][\w$]*$/);
      if (!match) {
        throw new Error(`Unsupported Java parameter declaration: "${part}"`);
      }
      return normalizeJavaType(match[1]);
    });
};

const extractJavaCallableMethod = (sourceCode: string): JavaMethodInfo | null => {
  const methodRegex =
    /(?:^|\n)\s*(public|protected|private)?\s*(static\s+)?(?:final\s+)?([A-Za-z_$][\w$<>,\[\]\s?.]*)\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;

  let match: RegExpExecArray | null;
  while ((match = methodRegex.exec(sourceCode)) !== null) {
    const methodName = match[4];
    if (methodName === 'main') continue;

    const returnType = normalizeJavaType(match[3]);
    const paramTypes = parseJavaParameterTypes(match[5]);

    return {
      name: methodName,
      returnType,
      paramTypes,
      isStatic: Boolean(match[2]),
    };
  }

  return null;
};

const renamePrimaryJavaClassToMain = (sourceCode: string): string => {
  let updated = sourceCode;

  const publicClassMatch = updated.match(/\bpublic\s+class\s+([A-Za-z_$][\w$]*)\b/);
  if (publicClassMatch?.[1] && publicClassMatch[1] !== 'Main') {
    const className = publicClassMatch[1];
    const classPattern = new RegExp(`\\bpublic\\s+class\\s+${className}\\b`);
    return updated.replace(classPattern, 'public class Main');
  }

  const classMatch = updated.match(/\bclass\s+([A-Za-z_$][\w$]*)\b/);
  if (classMatch?.[1] && classMatch[1] !== 'Main') {
    const className = classMatch[1];
    const classPattern = new RegExp(`\\bclass\\s+${className}\\b`);
    updated = updated.replace(classPattern, 'public class Main');
  }

  return updated;
};

const findMainClassBounds = (sourceCode: string): { openBraceIndex: number; closeBraceIndex: number } | null => {
  const classPattern = /\bclass\s+Main\b[^\{]*\{/m;
  const match = classPattern.exec(sourceCode);
  if (!match) return null;

  const openBraceIndex = sourceCode.indexOf('{', match.index);
  if (openBraceIndex === -1) return null;

  let depth = 0;
  for (let i = openBraceIndex; i < sourceCode.length; i += 1) {
    const ch = sourceCode[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return { openBraceIndex, closeBraceIndex: i };
      }
    }
  }

  return null;
};

const escapeJavaString = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');

const escapeJavaChar = (value: string): string => {
  if (value === "'") return "\\'";
  if (value === '\\') return '\\\\';
  if (value === '\n') return '\\n';
  if (value === '\r') return '\\r';
  if (value === '\t') return '\\t';
  return value;
};

const buildJavaArgumentLiteral = (value: unknown, type: string, path: string): string => {
  const normalizedType = normalizeJavaType(type);

  if (normalizedType.endsWith('[]')) {
    if (!Array.isArray(value)) {
      throw new Error(`Java wrapper arg mismatch at ${path}: expected array for ${normalizedType}.`);
    }

    const elementType = normalizedType.slice(0, -2);
    const elements = value.map((item, index) =>
      buildJavaArgumentLiteral(item, elementType, `${path}[${index}]`),
    );

    return `new ${normalizedType}{${elements.join(', ')}}`;
  }

  if (normalizedType === 'String') {
    if (typeof value !== 'string') {
      throw new Error(`Java wrapper arg mismatch at ${path}: expected String.`);
    }
    return `"${escapeJavaString(value)}"`;
  }

  if (normalizedType === 'char' || normalizedType === 'Character') {
    if (typeof value !== 'string' || value.length !== 1) {
      throw new Error(`Java wrapper arg mismatch at ${path}: expected single-character string for ${normalizedType}.`);
    }
    return `'${escapeJavaChar(value)}'`;
  }

  if (normalizedType === 'boolean' || normalizedType === 'Boolean') {
    if (typeof value !== 'boolean') {
      throw new Error(`Java wrapper arg mismatch at ${path}: expected boolean.`);
    }
    return value ? 'true' : 'false';
  }

  if (
    normalizedType === 'int' ||
    normalizedType === 'Integer' ||
    normalizedType === 'long' ||
    normalizedType === 'Long' ||
    normalizedType === 'short' ||
    normalizedType === 'Short' ||
    normalizedType === 'byte' ||
    normalizedType === 'Byte'
  ) {
    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(`Java wrapper arg mismatch at ${path}: expected integer for ${normalizedType}.`);
    }
    if (normalizedType === 'long' || normalizedType === 'Long') {
      return `${value}L`;
    }
    return `${value}`;
  }

  if (
    normalizedType === 'double' ||
    normalizedType === 'Double' ||
    normalizedType === 'float' ||
    normalizedType === 'Float'
  ) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`Java wrapper arg mismatch at ${path}: expected number for ${normalizedType}.`);
    }
    if (normalizedType === 'float' || normalizedType === 'Float') {
      return `${value}f`;
    }
    return `${value}`;
  }

  if (normalizedType.startsWith('List<') || normalizedType.startsWith('java.util.List<')) {
    if (!Array.isArray(value)) {
      throw new Error(`Java wrapper arg mismatch at ${path}: expected JSON array for ${normalizedType}.`);
    }
    const innerMatch = normalizedType.match(/List<(.+)>$/);
    if (!innerMatch?.[1]) {
      throw new Error(`Java wrapper does not support generic type ${normalizedType}.`);
    }
    const innerType = innerMatch[1].trim();
    const items = value.map((item, index) =>
      buildJavaArgumentLiteral(item, innerType, `${path}[${index}]`),
    );
    return `java.util.Arrays.asList(${items.join(', ')})`;
  }

  if (normalizedType === 'Object') {
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${escapeJavaString(value)}"`;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return Number.isInteger(value) ? `${value}` : `${value}d`;
    throw new Error(`Java wrapper arg mismatch at ${path}: unsupported Object literal.`);
  }

  throw new Error(`Java wrapper does not support parameter type ${normalizedType} at ${path}.`);
};

const buildJavaRunnerMethods = (callExpression: string, returnType: string): string => {
  const invokeStatement =
    normalizeJavaType(returnType) === 'void'
      ? `${callExpression};\n      return;`
      : `Object __result = ${callExpression};\n      System.out.println(__formatResult(__result, false));`;

  return String.raw`
  public static void main(String[] args) {
    try {
      ${invokeStatement}
    } catch (Exception e) {
      System.out.println("runtime error: " + e.getMessage());
    }
  }

  private static String __formatResult(Object value, boolean nested) {
    if (value == null) return nested ? "null" : "null";

    if (value instanceof Boolean) {
      return ((Boolean) value) ? "true" : "false";
    }

    if (value instanceof Float || value instanceof Double) {
      double d = ((Number) value).doubleValue();
      if (Double.isFinite(d) && Math.rint(d) == d) {
        return String.valueOf((long) d);
      }
      return java.math.BigDecimal.valueOf(d).stripTrailingZeros().toPlainString();
    }

    if (value instanceof Number) {
      return String.valueOf(value);
    }

    if (value instanceof Character) {
      String s = String.valueOf(value);
      return nested ? "\\\"" + __escapeJson(s) + "\\\"" : s;
    }

    if (value instanceof String) {
      String s = (String) value;
      return nested ? "\\\"" + __escapeJson(s) + "\\\"" : s;
    }

    Class<?> cls = value.getClass();
    if (cls.isArray()) {
      int len = java.lang.reflect.Array.getLength(value);
      StringBuilder sb = new StringBuilder();
      sb.append("[");
      for (int i = 0; i < len; i++) {
        if (i > 0) sb.append(",");
        Object item = java.lang.reflect.Array.get(value, i);
        sb.append(__formatResult(item, true));
      }
      sb.append("]");
      return sb.toString();
    }

    if (value instanceof java.lang.Iterable) {
      StringBuilder sb = new StringBuilder();
      sb.append("[");
      boolean first = true;
      for (Object item : (java.lang.Iterable<?>) value) {
        if (!first) sb.append(",");
        sb.append(__formatResult(item, true));
        first = false;
      }
      sb.append("]");
      return sb.toString();
    }

    return String.valueOf(value);
  }

  private static String __escapeJson(String value) {
    return value
      .replace("\\\\", "\\\\\\\\")
      .replace("\"", "\\\\\"")
      .replace("\n", "\\\\n")
      .replace("\r", "\\\\r")
      .replace("\t", "\\\\t");
  }
`;
};

const injectIntoMainClass = (sourceCode: string, injectionCode: string): string => {
  const bounds = findMainClassBounds(sourceCode);
  if (!bounds) {
    throw new Error('Java wrapper could not locate class Main for injection.');
  }

  return `${sourceCode.slice(0, bounds.closeBraceIndex)}\n${injectionCode}\n${sourceCode.slice(
    bounds.closeBraceIndex,
  )}`;
};

const buildJavaWrappedSubmission = (
  sourceCode: string,
  stdin?: string,
): { wrappedSource: string; mode: ExecutionMode; preparedStdin: string | null } => {
  const shape = classifyJavaSourceShape(sourceCode);

  if (shape === 'program') {
    return {
      wrappedSource: renamePrimaryJavaClassToMain(sourceCode),
      mode: 'program',
      preparedStdin: stdin?.trim() || null,
    };
  }

  const normalizedSource =
    shape === 'method'
      ? `public class Main {\n${sourceCode}\n}`
      : renamePrimaryJavaClassToMain(sourceCode);

  const methodInfo = extractJavaCallableMethod(normalizedSource);
  if (!methodInfo) {
    throw new Error('Java wrapper could not detect a callable method. Submit a valid method or class implementation.');
  }

  const parsedArgs = parseFunctionArgs(stdin);
  if (parsedArgs.length !== methodInfo.paramTypes.length) {
    throw new Error(
      `Java wrapper arg mismatch: expected ${methodInfo.paramTypes.length} args, got ${parsedArgs.length}.`,
    );
  }

  const argLiterals = parsedArgs.map((arg, index) =>
    buildJavaArgumentLiteral(arg, methodInfo.paramTypes[index], `args[${index}]`),
  );

  const callExpression = methodInfo.isStatic
    ? `${methodInfo.name}(${argLiterals.join(', ')})`
    : `new Main().${methodInfo.name}(${argLiterals.join(', ')})`;

  const runnerCode = buildJavaRunnerMethods(callExpression, methodInfo.returnType);

  return {
    wrappedSource: injectIntoMainClass(normalizedSource, runnerCode),
    mode: 'function',
    preparedStdin: null,
  };
};

const buildWrappedSourceCode = (
  sourceCode: string,
  family: LanguageFamily,
  functionName: string,
): string => {
  if (family === 'javascript') {
    return `
${sourceCode}
const line = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
if (!line) process.exit(0);
const parsed = JSON.parse(line);
const args = Array.isArray(parsed)
  ? parsed
  : (parsed && Array.isArray(parsed.args) ? parsed.args : []);
const result = ${functionName}(...args);
if (typeof result === 'boolean') {
  console.log(result ? 'true' : 'false');
} else if (typeof result === 'number') {
  console.log(isFinite(result) ? String(parseFloat(result.toString())) : String(result));
} else if (typeof result === 'string') {
  console.log(result);
} else {
  console.log(result === undefined ? '' : JSON.stringify(result));
}
`;
  }

  if (family === 'typescript') {
    return `
declare const require: (module: any) => any;
declare const process: any;
${sourceCode}
const line = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
if (!line) process.exit(0);
const parsed: any = JSON.parse(line);
const args = Array.isArray(parsed)
  ? parsed
  : (parsed && Array.isArray(parsed.args) ? parsed.args : []);
const result = (${functionName} as any)(...args);
if (typeof result === 'boolean') {
  console.log(result ? 'true' : 'false');
} else if (typeof result === 'number') {
  const numericResult = result as number;
  console.log(isFinite(numericResult) ? String(parseFloat(numericResult.toString())) : String(numericResult));
} else if (typeof result === 'string') {
  console.log(result);
} else {
  console.log(result === undefined ? '' : JSON.stringify(result));
}
`;
  }

  if (family === 'python') {
    return `
import sys
import json

${sourceCode}

line = sys.stdin.read().strip()
if not line:
    sys.exit(0)

parsed = json.loads(line)
if isinstance(parsed, list):
  args = parsed
elif isinstance(parsed, dict) and isinstance(parsed.get("args"), list):
  args = parsed["args"]
else:
  args = [parsed]

result = ${functionName}(*args)

if isinstance(result, bool):
    print(str(result).lower())
elif isinstance(result, (int, float)):
    print(f"{result:g}")
elif isinstance(result, str):
    print(result)
elif isinstance(result, (dict, list)):
    print(json.dumps(result, separators=(',', ':')))
elif result is None:
    print("null")
else:
    print(result)
`;
  }

  return `
package main

import (
    "encoding/json"
    "errors"
    "fmt"
    "os"
    "reflect"
    "strconv"
    "strings"
    "unicode/utf8"
)

${sourceCode}

  func convert(path string, val interface{}, t reflect.Type) (reflect.Value, error) {
    if val == nil {
      if t.Kind() == reflect.Ptr || t.Kind() == reflect.Interface || t.Kind() == reflect.Map || t.Kind() == reflect.Slice {
        return reflect.Zero(t), nil
      }
      return reflect.Value{}, fmt.Errorf("%s: null provided for non-nullable %s", path, t.String())
    }

    if t.Kind() == reflect.Ptr {
      elem, err := convert(path, val, t.Elem())
      if err != nil {
        return reflect.Value{}, err
      }
      p := reflect.New(t.Elem())
      p.Elem().Set(elem)
      return p, nil
    }

    if t.Kind() == reflect.Interface {
      v := reflect.ValueOf(val)
      if !v.IsValid() {
        return reflect.Zero(t), nil
      }
      if v.Type().AssignableTo(t) {
        return v, nil
      }
      if v.Type().ConvertibleTo(t) {
        return v.Convert(t), nil
      }
      return v, nil
    }

    switch t.Kind() {
    case reflect.Slice:
      if s, ok := val.(string); ok && t.Elem().Kind() == reflect.Uint8 {
        return reflect.ValueOf([]byte(s)).Convert(t), nil
      }

      arr, ok := val.([]interface{})
      if !ok {
        return reflect.Value{}, fmt.Errorf("%s: expected array for %s, got %T", path, t.String(), val)
      }

      s := reflect.MakeSlice(t, len(arr), len(arr))
      for i, v := range arr {
        converted, err := convert(fmt.Sprintf("%s[%d]", path, i), v, t.Elem())
        if err != nil {
          return reflect.Value{}, err
        }
        s.Index(i).Set(converted)
      }
      return s, nil

    case reflect.Map:
      if t.Key().Kind() != reflect.String {
        return reflect.Value{}, fmt.Errorf("%s: unsupported map key type %s", path, t.Key().String())
      }

      obj, ok := val.(map[string]interface{})
      if !ok {
        return reflect.Value{}, fmt.Errorf("%s: expected object for %s, got %T", path, t.String(), val)
      }

      m := reflect.MakeMapWithSize(t, len(obj))
      for k, v := range obj {
        key := reflect.ValueOf(k).Convert(t.Key())
        converted, err := convert(fmt.Sprintf("%s.%s", path, k), v, t.Elem())
        if err != nil {
          return reflect.Value{}, err
        }
        m.SetMapIndex(key, converted)
      }
      return m, nil

    case reflect.String:
      s, ok := val.(string)
      if !ok {
        return reflect.Value{}, fmt.Errorf("%s: expected string, got %T", path, val)
      }
      return reflect.ValueOf(s).Convert(t), nil

    case reflect.Bool:
      b, ok := val.(bool)
      if !ok {
        return reflect.Value{}, fmt.Errorf("%s: expected bool, got %T", path, val)
      }
      return reflect.ValueOf(b).Convert(t), nil

    case reflect.Uint8:
      if s, ok := val.(string); ok {
        if utf8.RuneCountInString(s) != 1 {
          return reflect.Value{}, fmt.Errorf("%s: expected single-character string for byte, got %q", path, s)
        }
        return reflect.ValueOf(s[0]).Convert(t), nil
      }
      u, err := parseUnsigned(path, val, 8)
      if err != nil {
        return reflect.Value{}, err
      }
      rv := reflect.New(t).Elem()
      if rv.OverflowUint(u) {
        return reflect.Value{}, fmt.Errorf("%s: value %d overflows %s", path, u, t.String())
      }
      rv.SetUint(u)
      return rv, nil

    case reflect.Int32:
      if s, ok := val.(string); ok {
        if utf8.RuneCountInString(s) != 1 {
          return reflect.Value{}, fmt.Errorf("%s: expected single-character string for rune/int32, got %q", path, s)
        }
        r, _ := utf8.DecodeRuneInString(s)
        rv := reflect.New(t).Elem()
        rv.SetInt(int64(r))
        return rv, nil
      }
      i, err := parseSigned(path, val, 32)
      if err != nil {
        return reflect.Value{}, err
      }
      rv := reflect.New(t).Elem()
      if rv.OverflowInt(i) {
        return reflect.Value{}, fmt.Errorf("%s: value %d overflows %s", path, i, t.String())
      }
      rv.SetInt(i)
      return rv, nil

    case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int64:
      i, err := parseSigned(path, val, int(t.Bits()))
      if err != nil {
        return reflect.Value{}, err
      }
      rv := reflect.New(t).Elem()
      if rv.OverflowInt(i) {
        return reflect.Value{}, fmt.Errorf("%s: value %d overflows %s", path, i, t.String())
      }
      rv.SetInt(i)
      return rv, nil

    case reflect.Uint, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uintptr:
      u, err := parseUnsigned(path, val, int(t.Bits()))
      if err != nil {
        return reflect.Value{}, err
      }
      rv := reflect.New(t).Elem()
      if rv.OverflowUint(u) {
        return reflect.Value{}, fmt.Errorf("%s: value %d overflows %s", path, u, t.String())
      }
      rv.SetUint(u)
      return rv, nil

    case reflect.Float32, reflect.Float64:
      f, err := parseFloat(path, val, int(t.Bits()))
      if err != nil {
        return reflect.Value{}, err
      }
      rv := reflect.New(t).Elem()
      if rv.OverflowFloat(f) {
        return reflect.Value{}, fmt.Errorf("%s: value %v overflows %s", path, f, t.String())
      }
      rv.SetFloat(f)
      return rv, nil
    }

    v := reflect.ValueOf(val)
    if v.IsValid() && v.Type().ConvertibleTo(t) {
      return v.Convert(t), nil
    }
    return reflect.Value{}, fmt.Errorf("%s: unsupported conversion from %T to %s", path, val, t.String())
  }

  func parseFloat(path string, val interface{}, bits int) (float64, error) {
    switch n := val.(type) {
    case json.Number:
      f, err := n.Float64()
      if err != nil {
        return 0, fmt.Errorf("%s: invalid numeric value %q", path, n.String())
      }
      return f, nil
    case float64:
      return n, nil
    case float32:
      return float64(n), nil
    case int:
      return float64(n), nil
    case int8:
      return float64(n), nil
    case int16:
      return float64(n), nil
    case int32:
      return float64(n), nil
    case int64:
      return float64(n), nil
    case uint:
      return float64(n), nil
    case uint8:
      return float64(n), nil
    case uint16:
      return float64(n), nil
    case uint32:
      return float64(n), nil
    case uint64:
      return float64(n), nil
    case string:
      f, err := strconv.ParseFloat(strings.TrimSpace(n), bits)
      if err != nil {
        return 0, fmt.Errorf("%s: expected numeric value, got %q", path, n)
      }
      return f, nil
    default:
      return 0, fmt.Errorf("%s: expected numeric value, got %T", path, val)
    }
  }

  func parseSigned(path string, val interface{}, bits int) (int64, error) {
    switch n := val.(type) {
    case json.Number:
      raw := strings.TrimSpace(n.String())
      if strings.ContainsAny(raw, ".eE") {
        return 0, fmt.Errorf("%s: fractional value %q cannot be used as integer", path, raw)
      }
      i, err := strconv.ParseInt(raw, 10, bits)
      if err != nil {
        return 0, fmt.Errorf("%s: integer out of range for %d-bit signed: %q", path, bits, raw)
      }
      return i, nil
    case string:
      raw := strings.TrimSpace(n)
      if raw == "" {
        return 0, errors.New(path + ": empty string cannot be used as integer")
      }
      if strings.ContainsAny(raw, ".eE") {
        return 0, fmt.Errorf("%s: fractional value %q cannot be used as integer", path, raw)
      }
      i, err := strconv.ParseInt(raw, 10, bits)
      if err != nil {
        return 0, fmt.Errorf("%s: integer out of range for %d-bit signed: %q", path, bits, raw)
      }
      return i, nil
    default:
      f, err := parseFloat(path, val, 64)
      if err != nil {
        return 0, err
      }
      if f != float64(int64(f)) {
        return 0, fmt.Errorf("%s: fractional value %v cannot be used as integer", path, f)
      }
      return int64(f), nil
    }
  }

  func parseUnsigned(path string, val interface{}, bits int) (uint64, error) {
    switch n := val.(type) {
    case json.Number:
      raw := strings.TrimSpace(n.String())
      if strings.HasPrefix(raw, "-") {
        return 0, fmt.Errorf("%s: negative value %q cannot be used as unsigned integer", path, raw)
      }
      if strings.ContainsAny(raw, ".eE") {
        return 0, fmt.Errorf("%s: fractional value %q cannot be used as unsigned integer", path, raw)
      }
      u, err := strconv.ParseUint(raw, 10, bits)
      if err != nil {
        return 0, fmt.Errorf("%s: unsigned integer out of range for %d-bit: %q", path, bits, raw)
      }
      return u, nil
    case string:
      raw := strings.TrimSpace(n)
      if raw == "" {
        return 0, errors.New(path + ": empty string cannot be used as unsigned integer")
      }
      if strings.HasPrefix(raw, "-") {
        return 0, fmt.Errorf("%s: negative value %q cannot be used as unsigned integer", path, raw)
      }
      if strings.ContainsAny(raw, ".eE") {
        return 0, fmt.Errorf("%s: fractional value %q cannot be used as unsigned integer", path, raw)
      }
      u, err := strconv.ParseUint(raw, 10, bits)
      if err != nil {
        return 0, fmt.Errorf("%s: unsigned integer out of range for %d-bit: %q", path, bits, raw)
      }
      return u, nil
    default:
      f, err := parseFloat(path, val, 64)
      if err != nil {
        return 0, err
      }
      if f < 0 {
        return 0, fmt.Errorf("%s: negative value %v cannot be used as unsigned integer", path, f)
      }
      if f != float64(uint64(f)) {
        return 0, fmt.Errorf("%s: fractional value %v cannot be used as unsigned integer", path, f)
      }
      return uint64(f), nil
    }
}

func main() {
    defer func() {
    if r := recover(); r != nil {
      fmt.Printf("runtime error: %v\\n", r)
    }
    }()

  var payload interface{}
    d := json.NewDecoder(os.Stdin)
    d.UseNumber()

  if err := d.Decode(&payload); err != nil {
    fmt.Printf("runtime error: invalid input payload: %v\\n", err)
    return
  }

  input := []interface{}{}
  if arr, ok := payload.([]interface{}); ok {
    input = arr
  } else if obj, ok := payload.(map[string]interface{}); ok {
    if args, ok := obj["args"].([]interface{}); ok {
      input = args
    }
  } else if payload != nil {
    input = []interface{}{payload}
  }

  fn := reflect.ValueOf(${functionName})
  fnType := fn.Type()

  if fnType.NumOut() != 1 {
    fmt.Printf("runtime error: function must return exactly one value, got %d\\n", fnType.NumOut())
    return
  }

  if len(input) != fnType.NumIn() {
    fmt.Printf("runtime error: expected %d args, got %d\\n", fnType.NumIn(), len(input))
    return
  }

  args := make([]reflect.Value, fnType.NumIn())
  for i := range args {
    converted, err := convert(fmt.Sprintf("args[%d]", i), input[i], fnType.In(i))
    if err != nil {
      fmt.Printf("runtime error: %v\\n", err)
      return
    }
    args[i] = converted
  }

  results := fn.Call(args)
  if len(results) != 1 {
    fmt.Printf("runtime error: function returned %d values; exactly one is required\\n", len(results))
    return
  }

  result := results[0].Interface()
  if result == nil {
    fmt.Println("null")
    return
  }

  if b, ok := result.(bool); ok {
    if b {
      fmt.Println("true")
    } else {
      fmt.Println("false")
    }
    return
  }

  if s, ok := result.(string); ok {
    fmt.Println(s)
    return
  }

  rv := reflect.ValueOf(result)
  if rv.Kind() == reflect.Float32 || rv.Kind() == reflect.Float64 {
    fmt.Printf("%g\\n", rv.Convert(reflect.TypeOf(float64(0))).Float())
    return
  }

  out, _ := json.Marshal(result)
    fmt.Println(string(out))
}
`;
};

const decodeJudge0Result = (result: Judge0Result): Judge0Result => ({
  ...result,
  stdout: safeBase64Decode(result.stdout),
  stderr: safeBase64Decode(result.stderr),
  compile_output: safeBase64Decode(result.compile_output),
  message: safeBase64Decode(result.message),
});

const isTerminalStatus = (statusId?: number): boolean => {
  if (!statusId) return false;
  return statusId > 2;
};

const createSubmission = async (payload: {
  source_code: string;
  language_id: number;
  stdin?: string | null;
  expected_output?: string | null;
}): Promise<{ token: string }> => {
  const response = await withRetries(
    async () =>
      axios.post(`${config.services.judge0.url}/submissions`, payload, {
        params: { base64_encoded: 'true', wait: 'false' },
        headers: buildHeaders(),
        timeout: JUDGE0_TIMEOUT_MS,
      }),
    'create submission',
  );

  if (!response.data?.token) {
    throw new Error(`Judge0 create submission did not return token: ${JSON.stringify(response.data)}`);
  }

  return { token: response.data.token };
};

const pollSubmission = async (token: string): Promise<Judge0Result> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < JUDGE0_POLL_TIMEOUT_MS) {
    const response = await withRetries(
      async () =>
        axios.get(`${config.services.judge0.url}/submissions/${token}`, {
          params: { base64_encoded: 'true', fields: '*' },
          headers: buildHeaders(),
          timeout: JUDGE0_TIMEOUT_MS,
        }),
      'poll submission',
    );

    const result = response.data as Judge0Result;
    if (isTerminalStatus(result?.status?.id)) {
      const decoded = decodeJudge0Result(result);
      console.log('[Judge0] Terminal submission response', {
        token,
        statusId: decoded.status?.id,
        statusDescription: decoded.status?.description,
        stdout: decoded.stdout,
        stderr: decoded.stderr,
        compile_output: decoded.compile_output,
        message: decoded.message,
        time: decoded.time,
        memory: decoded.memory,
      });
      return decoded;
    }

    await delay(JUDGE0_POLL_INTERVAL_MS);
  }

  throw new Error(`Judge0 polling timed out for token ${token}`);
};

/**
 * Service to interact with Judge0 API for code execution.
 */
export const submitCode = async (
  sourceCode: string,
  languageId: number,
  stdin?: string,
  expectedOutput?: string,
): Promise<Judge0Result> => {
  try {
    const family = getLanguageFamily(languageId);
    if (!family) {
      throw new Error(`Unsupported or unmapped language_id=${languageId}.`);
    }

    if (family === 'java') {
      const javaPrepared = buildJavaWrappedSubmission(sourceCode, stdin);
      const preparedExpectedOutput = normalizeExpectedOutput(expectedOutput);

      const payload = {
        source_code: base64Encode(javaPrepared.wrappedSource),
        language_id: languageId,
        stdin: javaPrepared.preparedStdin ? base64Encode(javaPrepared.preparedStdin) : null,
        expected_output:
          preparedExpectedOutput !== null ? base64Encode(preparedExpectedOutput) : null,
      };

      console.log('[Judge0] Params passed to Judge0', {
        language_id: languageId,
        family,
        mode: javaPrepared.mode,
        stdin: previewForLog(javaPrepared.preparedStdin),
        expected_output: previewForLog(preparedExpectedOutput),
        source_code_preview: previewForLog(javaPrepared.wrappedSource),
        source_code_length: javaPrepared.wrappedSource.length,
        stdin_length: javaPrepared.preparedStdin?.length ?? 0,
        expected_output_length: preparedExpectedOutput?.length ?? 0,
      });

      logger.info('[Judge0] Submission payload prepared', {
        languageId,
        family,
        mode: javaPrepared.mode,
        hasStdin: !!javaPrepared.preparedStdin,
        hasExpectedOutput: preparedExpectedOutput !== null,
      });

      const { token } = await createSubmission(payload);
      return await pollSubmission(token);
    }

    const shouldUseFunctionMode = FUNCTION_WRAPPER_FAMILIES.has(family);
    const functionName = shouldUseFunctionMode ? extractFunctionName(sourceCode) : '';
    const mode: ExecutionMode = shouldUseFunctionMode
      ? 'function'
      : resolveExecutionMode(sourceCode, family, functionName);

    if (mode === 'function') {
      validateFunctionModeSource(sourceCode, family);
    }

    if (mode === 'function' && !functionName) {
      throw new Error(
        `Could not detect function name for language_id=${languageId}. Please submit a function implementation.`,
      );
    }

    const wrappedSource = mode === 'function' && family
      ? buildWrappedSourceCode(sourceCode, family, functionName)
      : sourceCode;

    const preparedStdin = mode === 'function' ? normalizeFunctionInput(stdin) : stdin?.trim() || null;
    const preparedExpectedOutput = normalizeExpectedOutput(expectedOutput);

    const payload = {
      source_code: base64Encode(wrappedSource),
      language_id: languageId,
      stdin: preparedStdin ? base64Encode(preparedStdin) : null,
      expected_output:
        preparedExpectedOutput !== null ? base64Encode(preparedExpectedOutput) : null,
    };

    console.log('[Judge0] Params passed to Judge0', {
      language_id: languageId,
      family,
      mode,
      stdin: previewForLog(preparedStdin),
      expected_output: previewForLog(preparedExpectedOutput),
      source_code_preview: previewForLog(wrappedSource),
      source_code_length: wrappedSource.length,
      stdin_length: preparedStdin?.length ?? 0,
      expected_output_length: preparedExpectedOutput?.length ?? 0,
    });

    logger.info('[Judge0] Submission payload prepared', {
      languageId,
      family,
      mode,
      hasStdin: !!preparedStdin,
      hasExpectedOutput: preparedExpectedOutput !== null,
    });

    const { token } = await createSubmission(payload);
    return await pollSubmission(token);
  } catch (error: any) {
    const errorDetails = {
      status: error?.response?.status,
      judge0Error: error?.response?.data,
      message: error?.message,
      languageId,
    };
    logger.error('Judge0 API Error', errorDetails);
    throw new Error(`Code execution failed via Judge0: ${JSON.stringify(errorDetails)}`);
  }
};

/**
 * Get all supported languages from Judge0.
 */
export const getLanguages = async (): Promise<any[]> => {
  try {
    const response = await axios.get(`${config.services.judge0.url}/languages`, {
      headers: buildHeaders(),
      timeout: JUDGE0_TIMEOUT_MS,
    });
    return response.data;
  } catch (error: any) {
    logger.error('Judge0 Get Languages Error:', error.response?.data || error.message);
    return [];
  }
};
