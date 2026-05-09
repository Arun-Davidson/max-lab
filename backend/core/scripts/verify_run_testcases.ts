import { runTestcases } from '../src/services/coding.service';
import { Problem, Testcase, initAssociations } from '../src/models';

async function verifyRunTestcases() {
    console.log('Testing runTestcases API...');
    initAssociations();

    try {
        // Create a test problem
        let problem = await Problem.findOne({ where: { title: 'Sum of Two Numbers (Verification)' } });
        if (!problem) {
            console.log('Seeding test problem...');
            problem = await (Problem as any).create({
                title: 'Sum of Two Numbers (Verification)',
                description: 'Return the sum of a and b.',
                difficulty: 'easy',
                baseCode: { python: 'def solve(a, b):\n    pass' }
            });

            await (Testcase as any).create({
                problemId: (problem as any).id || (problem as any).dataValues.id,
                input: '1 2',
                expectedOutput: '3',
                isHidden: false
            });
        }

        const problemId = (problem as any).id || (problem as any).dataValues.id;
        console.log(`Testing with problem: ${problem!.title} (ID: ${problemId})`);

        // Mock code (assuming python for simplicity, should match problem's expected language)
        const code = 'import sys\n# Mock solution\nprint("Hello")';
        const languageId = 71; // Python

        const result = await runTestcases(problemId, code, languageId);
        console.log('Run Testcases result:', JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('SUCCESS: runTestcases API executed correctly.');
        } else {
            console.log('FAILED: runTestcases API failed.');
        }
    } catch (error) {
        console.error('runTestcases verification failed:', error);
    }
}

verifyRunTestcases();
