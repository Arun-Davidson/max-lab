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
    "fmt"
    "os"
    "reflect"
)

${sourceCode}

func convert(val interface{}, t reflect.Type) reflect.Value {
    if val == nil {
        return reflect.Zero(t)
    }
    if t.Kind() == reflect.Ptr {
        p := reflect.New(t.Elem())
        p.Elem().Set(convert(val, t.Elem()))
        return p
    }
    switch t.Kind() {
    case reflect.Slice:
        arr := val.([]interface{})
        s := reflect.MakeSlice(t, len(arr), len(arr))
        for i, v := range arr {
            s.Index(i).Set(convert(v, t.Elem()))
        }
        return s
    case reflect.Map:
        m := reflect.MakeMap(t)
        for k, v := range val.(map[string]interface{}) {
            m.SetMapIndex(convert(k, t.Key()), convert(v, t.Elem()))
        }
        return m
    case reflect.String:
        return reflect.ValueOf(val.(string))
    case reflect.Bool:
        return reflect.ValueOf(val.(bool))
    default:
        n, _ := val.(json.Number).Float64()
        return reflect.ValueOf(n).Convert(t)
    }
}

func main() {
  var payload interface{}
    d := json.NewDecoder(os.Stdin)
    d.UseNumber()

  if err := d.Decode(&payload); err != nil {
    fmt.Println("")
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
    args := make([]reflect.Value, fn.Type().NumIn())
    for i := range args {
    if i >= len(input) {
      args[i] = reflect.Zero(fn.Type().In(i))
      continue
    }
        args[i] = convert(input[i], fn.Type().In(i))
    }

    result := fn.Call(args)[0].Interface()
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

    if n, ok := result.(float64); ok {
      fmt.Printf("%g\\n", n)
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
