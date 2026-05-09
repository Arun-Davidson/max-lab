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

/**
 * Service to interact with Judge0 API for code execution.
 */
export const submitCode = async (
  sourceCode: string,
  languageId: number,
  stdin?: string,
  expectedOutput?: string,
): Promise<Judge0Result> => {


  let functionName = '';

  const patterns = [
    /function\s+(\w+)\s*\(([^)]*)\)/,
    /(?:var|let|const)\s+(\w+)\s*=\s*function\s*\(([^)]*)\)/,
    /(?:var|let|const)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/,
    /def\s+(\w+)\s*\(([^)]*)\):/,
    /func\s+(\w+)\s*\(([^)]*)\)/,
    /(?:[\w*<>&\[\]]+\s+)+(\w+)\s*\(([^)]*)\)\s*\{/,
  ];

  for (const pattern of patterns) {
    const match = sourceCode.match(pattern);
    if (match) {
      functionName = match[1];
      break;
    }
  }

  const wrapperCode = [
    {
      id: 63,
      source_code: `
    ${sourceCode}
    const line = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
    if (!line) process.exit(0);
    const input = JSON.parse(line);
    const result = ${functionName}(...input);
    console.log(typeof result === 'object' ? JSON.stringify(result) : result);
    `,
    },
    {
      id: 74,
      source_code: `
    declare const require: (module: any) => any;
    declare const process: any;
    ${sourceCode}
    const line = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
    if (!line) process.exit(0);
    const input = JSON.parse(line);
    const result = (${functionName} as any)(...input);
    console.log(typeof result === 'object' ? JSON.stringify(result) : result);
    `,
    },
    {
      id: 71,
      source_code: `
import sys
import json

${sourceCode}

line = sys.stdin.read().strip()
if not line:
    sys.exit(0)

input_data = json.loads(line)

result = ${functionName}(*input_data)

if isinstance(result, bool):
    print(str(result).lower())
elif isinstance(result, (dict, list)):
    print(json.dumps(result, separators=(',', ':')))
else:
    print(result)
`
    },
    {
      id: 60,
      source_code: `
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
	default: // all numeric kinds
		n, _ := val.(json.Number).Float64()
		return reflect.ValueOf(n).Convert(t)
	}
}

func main() {
	var input []interface{}
	d := json.NewDecoder(os.Stdin)
	d.UseNumber()
	d.Decode(&input)

	fn := reflect.ValueOf(${functionName})
	args := make([]reflect.Value, fn.Type().NumIn())
	for i := range args {
		args[i] = convert(input[i], fn.Type().In(i))
	}

	res := fn.Call(args)[0].Interface()
	if b, ok := res.(bool); ok {
		fmt.Println(b)
	} else if s, ok := res.(string); ok {
		fmt.Println(s)
	} else {
		out, _ := json.Marshal(res)
		fmt.Println(string(out))
	}
}`,
    }
  ];

  try {
    const response = await axios.post(
      `${config.services.judge0.url}/submissions`,
      {
        source_code: Buffer.from(
          wrapperCode.find((w) => w.id === languageId)?.source_code || sourceCode
        ).toString('base64'),
        language_id: languageId,
        stdin: stdin ? Buffer.from(`[${stdin.trim()}]`).toString('base64') : null,
        expected_output: expectedOutput ? Buffer.from(expectedOutput).toString('base64') : null,
      },
      {
        params: { base64_encoded: 'true', wait: 'true' },
        headers: {
          'content-type': 'application/json',
        },
      },
    );

    const result = response.data;

    // Decode base64 results
    if (result.stdout) result.stdout = Buffer.from(result.stdout, 'base64').toString();
    if (result.stderr) result.stderr = Buffer.from(result.stderr, 'base64').toString();
    if (result.compile_output)
      result.compile_output = Buffer.from(result.compile_output, 'base64').toString();

    return result;
  } catch (error: any) {
    logger.error('Judge0 API Error:', error.response?.data || error.message);
    throw new Error('Code execution failed via Judge0');
  }
};

/**
 * Get all supported languages from Judge0.
 */
export const getLanguages = async (): Promise<any[]> => {
  try {
    const response = await axios.get(`${config.services.judge0.url}/languages`);
    return response.data;
  } catch (error: any) {
    logger.error('Judge0 Get Languages Error:', error.response?.data || error.message);
    return [];
  }
};
