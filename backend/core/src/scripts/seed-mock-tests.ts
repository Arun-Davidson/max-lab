import { Problem, CodingTest, CodingTestProblem, Submission, sequelize } from '../models';

async function seedMockTests() {
  try {
    console.log('--- Starting Mock Test Seeding ---');
    
    await sequelize.authenticate();
    console.log('Database connected.');

    const userId = 13; // Contractor ID from logs
    
    // Fetch actual problems to ensure they exist
    const problems = await Problem.findAll({ limit: 3 });
    if (problems.length === 0) {
      console.error('❌ No problems found in database. Please seed problems first.');
      return;
    }
    
    console.log(`Found ${problems.length} problems for seeding.`);

    // 1. Create a "Completed" Mock Test
    const completedTest = await CodingTest.create({
      interviewerId: userId,
      title: 'React & Algorithm Practice',
      totalTime: 60,
      difficultyDistribution: { easy: 2, medium: 1, hard: 0 },
      status: 'completed',
    });

    const testId = completedTest.get('id');
    console.log(`Created completed test with ID: ${testId}`);

    if (!testId) {
      throw new Error('Failed to retrieve ID for created CodingTest');
    }

    // Link problems to the completed test sequentially
    for (let i = 0; i < problems.length; i++) {
        const problemId = problems[i].get('id');
        console.log(`Linking problem ${problemId} to test ${testId}`);
        await CodingTestProblem.create({
            testId: testId,
            problemId: problemId,
            order: i + 1,
        });
    }

    // Create submissions for the completed test
    await Submission.create({
      userId,
      testId: testId,
      problemId: problems[0].get('id'),
      code: 'function twoSum(nums, target) { /* ... */ }',
      languageId: 63, // JavaScript
      status: 'Accepted',
      grade: 95,
      openaiReview: 'The solution is efficient and handles edge cases well. Consider using a Map for better readability.',
    });

    await Submission.create({
      userId,
      testId: testId,
      problemId: problems[1].get('id'),
      code: 'function isPalindrome(x) { /* ... */ }',
      languageId: 63,
      status: 'Accepted',
      grade: 100,
      openaiReview: 'Perfect logic. The space complexity is O(1) which is optimal.',
    });

    // 2. Create an "Active" Mock Test (In Progress)
    const activeTest = await CodingTest.create({
      interviewerId: userId,
      title: 'JavaScript Fundamentals',
      totalTime: 45,
      difficultyDistribution: { easy: 3, medium: 0, hard: 0 },
      status: 'active',
    });

    const activeTestId = activeTest.get('id');
    console.log(`Created active test with ID: ${activeTestId}`);

    if (activeTestId && problems.length > 2) {
      await CodingTestProblem.create({
        testId: activeTestId,
        problemId: problems[2].get('id'),
        order: 1,
      });
    }

    console.log('✅ Seeding completed successfully.');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await sequelize.close();
  }
}

seedMockTests();
