import { processSubmission } from '../src/services/coding.service';
import * as judge0Service from '../src/services/judge0.service';
import * as openaiService from '../src/services/openai.service';
import { Problem, Testcase } from '../src/models';

/**
 * Script to verify the coding submission flow.
 * Note: Requires valid database connection and optionally API keys if not mocked.
 */
async function verifyFlow() {
    console.log('Starting verification flow...');

    // Mocking problem and testcases for a simple "Sum of Two"
    const problem = await Problem.create({
        title: 'Sum of Two Numbers',
        description: 'Return the sum of a and b.',
        difficulty: 'easy',
        baseCode: { python: 'def solve(a, b):\n    pass' }
    });

    await Testcase.create({
        problemId: problem.id,
        input: '1 2',
        expectedOutput: '3',
        isHidden: false
    });

    console.log('Problem and testcase created.');

    const userCode = 'import sys\na, b = map(int, sys.stdin.read().split())\nprint(a + b)';
    const languageId = 71; // Python

    console.log('Processing submission...');
    const result = await processSubmission(1, problem.id, userCode, languageId);

    console.log('Submission result:', JSON.stringify(result, null, 2));
    
    if (result.status === 'Accepted') {
        console.log('SUCCESS: Submission accepted and reviewed.');
    } else {
        console.log('FAILED: Submission status:', result.status);
    }
}

// verifyFlow(); // Uncomment to run if environment is ready
