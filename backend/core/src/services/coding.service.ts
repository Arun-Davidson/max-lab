import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Problem, Testcase, CodingTest, CodingTestProblem, Submission, sequelize } from '../models';
import * as judge0Service from './judge0.service';
import * as openaiService from './openai.service';
import * as antiCheatService from './antiCheat.service';
import logger from '../config/logger';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TestCaseResult {
  pass: boolean;
}

interface SubmissionRecord {
  problemId: number;
  createdAt: string | Date;
  grade: number;
  results: TestCaseResult[];
  code: string;
  openaiReview?: string;
  aiImprovedCode?: string | null;
}

interface ProblemRecord {
  id: number;
  title: string;
  description: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  testcases: { id: number }[];
}

interface TestProblemRecord {
  problemId: number;
  problem: ProblemRecord;
}

// ── Shared Helpers ────────────────────────────────────────────────────────────

/**
 * Keeps only the most recent submission per problem.
 */
const deduplicateByLatest = (submissions: SubmissionRecord[]): Record<number, SubmissionRecord> => {
  const latest: Record<number, SubmissionRecord> = {};
  for (const s of submissions) {
    const prev = latest[s.problemId];
    if (!prev || new Date(s.createdAt) > new Date(prev.createdAt)) {
      latest[s.problemId] = s;
    }
  }
  return latest;
};

/**
 * Per-problem scoring snapshot — the single source of truth for all
 * downstream stats. Iterates testProblems once so nothing is counted twice.
 */
interface ProblemScore {
  problemId: number;
  grade: number;           // 0–100; 0 for unattempted
  passed: number;          // test cases passed in latest submission
  total: number;           // total test cases for this problem
  isCorrect: boolean;      // every test case passed
  isAttempted: boolean;
}

/**
 * Service to manage coding assessments.
 */

export const createTest = async (
  interviewerId: number,
  title: string,
  totalTime: number,
  difficultyDistribution: { easy: number; medium: number; hard: number },
  tags?: string[], // New optional tags filter
) => {
  const transaction = await sequelize.transaction();
  try {
    const test = await CodingTest.create(
      {
        interviewerId,
        title,
        totalTime,
        difficultyDistribution,
        status: 'draft',
      },
      { transaction },
    );

    const problems: Problem[] = [];

    // Select random problems based on distribution from seeded Problem table
    // Run inside the same transaction so Postgres sees the committed coding_test row
    for (const [difficulty, count] of Object.entries(difficultyDistribution)) {
      if (count > 0) {
        const selected = await Problem.findAll({
          where: { difficulty: difficulty as any },
          order: sequelize.random(),
          limit: count,
          transaction, // keep within the same transaction boundary
        });
        problems.push(...selected);
      }
    }

    // Use test.id (typed accessor) — test.get('id') can return undefined for
    // auto-increment PKs before Sequelize refreshes the instance post-insert.
    const testId = test.id;
    if (!testId) throw new Error('Failed to retrieve test ID after creation');

    await Promise.all(
      problems.map((problem, index) =>
        CodingTestProblem.create(
          {
            testId,
            problemId: problem.id,
            order: index + 1,
          },
          { transaction },
        ),
      ),
    );

    await transaction.commit();
    return test;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating coding test:', error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// INVITE: Send a candidate an invite email with a time-limited token link
// ---------------------------------------------------------------------------

const buildMailTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

export const sendInvite = async (
  testId: number,
  candidateEmail: string,
  expiresInHours: number = 48,
) => {
  const test = await CodingTest.findByPk(testId);
  if (!test) throw new Error('Coding test not found');

  const inviteToken = crypto.randomUUID();
  const inviteExpiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await test.update({
    candidateEmail,
    inviteToken,
    inviteExpiresAt,
    inviteSentAt: new Date(),
    status: 'active',
  });

  const frontendBase =
    process.env.FRONTEND_BASE_URL ||
    (process.env.FRONTEND_ORIGINS || 'http://localhost:5173').split(',')[0];

  const link = `${frontendBase}/coding-challenge/${testId}?token=${inviteToken}`;

  const transporter = buildMailTransport();
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hirion.ai',
      to: candidateEmail,
      subject: `You've been invited to a coding assessment — ${test.title}`,
      html: `
        <h2>Coding Assessment Invitation</h2>
        <p>You have been invited to complete the coding challenge: <strong>${test.title}</strong>.</p>
        <p><strong>Time limit for the test:</strong> ${test.totalTime} minutes</p>
        <p><strong>Link expires:</strong> ${inviteExpiresAt.toUTCString()}</p>
        <p>
          <a href="${link}" style="
            display:inline-block;padding:12px 24px;background:#4f46e5;
            color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
            Start Your Assessment
          </a>
        </p>
        <p>If the button doesn't work, copy this link into your browser:</p>
        <p><a href="${link}">${link}</a></p>
        <hr/>
        <small>This link expires in ${expiresInHours} hours. Do not share it.</small>
      `,
    });
    logger.info(`Invite email successfully sent to ${candidateEmail}`);
  } catch (mailError: any) {
    logger.error('CRITICAL: Failed to send invite email:', {
      error: mailError.message,
      stack: mailError.stack,
      candidateEmail,
      testId,
      smtpConfig: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
      }
    });
    // We don't throw here to avoid failing the whole request if the DB update succeeded,
    // but the user should be notified via logs.
  }

  logger.info(`Invite logged in DB for ${candidateEmail} for test #${testId} (expires ${expiresInHours}h)`);
  return test;
};

// ---------------------------------------------------------------------------
// STATUS: Get the current interview status for a test (by token or user auth)
// ---------------------------------------------------------------------------

export const getInterviewStatus = async (testId: number, token?: string) => {
  const test = await CodingTest.findByPk(testId, {
    include: [
      {
        model: CodingTestProblem,
        as: 'testProblems',
        include: [
          {
            model: Problem,
            as: 'problem',
            include: [
              { model: Testcase, as: 'testcases', where: { isHidden: false }, required: false },
            ],
          },
        ],
      },
    ],
  });

  if (!test) throw new Error('Coding test not found');

  // Token-based access validation (for candidate using link)
  if (token) {
    if (test.inviteToken !== token) {
      throw new Error('Invalid invite token');
    }
    if (test.inviteExpiresAt && new Date() > test.inviteExpiresAt) {
      throw new Error('Invite link has expired');
    }
  }

  // Fetch all submissions for this test
  const submissions = await Submission.findAll({
    where: { testId },
    order: [['createdAt', 'DESC']],
  });

  // Aggregate per-problem status
  const problemIds = ((test as any).testProblems || []).map((ctp: any) => ctp.problemId);

  const submissionMap: Record<number, any> = {};
  for (const sub of submissions) {
    if (!submissionMap[sub.problemId]) {
      submissionMap[sub.problemId] = sub;
    }
  }

  const problemStatuses = problemIds.map((pid: number) => {
    const sub = submissionMap[pid];
    return {
      problemId: pid,
      submitted: !!sub,
      status: sub?.status ?? 'not_started',
      grade: sub?.grade ?? null,
      submittedAt: sub?.createdAt ?? null,
    };
  });

  const totalProblems = problemIds.length;
  const completedProblems = problemStatuses.filter((p: any) => p.submitted).length;
  const overallCompleted = completedProblems === totalProblems && totalProblems > 0;

  return {
    test: {
      id: test.id,
      title: test.title,
      totalTime: test.totalTime,
      status: test.status,
      difficultyDistribution: test.difficultyDistribution,
      candidateEmail: test.candidateEmail,
      inviteExpiresAt: test.inviteExpiresAt,
      inviteSentAt: test.inviteSentAt,
      startedAt: test.startedAt,
      submittedAt: test.submittedAt,
    },
    progress: {
      totalProblems,
      completedProblems,
      overallCompleted,
    },
    problemStatuses,
    submissions: submissions.map((s) => ({
      id: s.id,
      problemId: s.problemId,
      status: s.status,
      grade: s.grade,
      openaiReview: s.openaiReview,
      createdAt: s.createdAt,
    })),
  };
};

// ---------------------------------------------------------------------------
// GET PROBLEMS FOR A TEST (for candidate to see their questions)
// ---------------------------------------------------------------------------

export const getTestProblems = async (testId: number, token?: string) => {
  const test = await CodingTest.findByPk(testId);
  if (!test) throw new Error('Coding test not found');

  if (token) {
    if (test.inviteToken !== token) throw new Error('Invalid invite token');
    if (test.inviteExpiresAt && new Date() > test.inviteExpiresAt) {
      throw new Error('Invite link has expired');
    }
  }

  const ctps = await CodingTestProblem.findAll({
    where: { testId },
    order: [['order', 'ASC']],
    include: [
      {
        model: Problem,
        as: 'problem',
        include: [
          {
            model: Testcase,
            as: 'testcases',
            where: { isHidden: false },
            required: false,
          },
        ],
      },
    ],
  });

  return ctps.map((ctp: any) => ctp.problem);
};

/**
 * Mark a test as started (sets startedAt if not set)
 */
export const startTest = async (testId: number, token?: string) => {
  const test = await CodingTest.findByPk(testId);
  if (!test) throw new Error('Test not found');

  if (token && test.inviteToken !== token) {
    throw new Error('Invalid invite token');
  }

  if (!test.startedAt) {
    test.startedAt = new Date();
    test.status = 'active'; // Ensure status is active when started
    await test.save();
  }

  return test;
};

/**
 * Finalize a test (marks as completed and sets submittedAt)
 */
export const endTest = async (testId: number, token?: string) => {
  const test = await CodingTest.findByPk(testId);
  if (!test) throw new Error('Test not found');

  if (token && test.inviteToken !== token) {
    throw new Error('Invalid invite token');
  }

  test.status = 'completed';
  test.submittedAt = new Date();
  await test.save();

  return test;
};

// ---------------------------------------------------------------------------
// SUBMISSION PROCESSING (unchanged logic, now also handles token-auth tests)
// ---------------------------------------------------------------------------

export const processSubmission = async (
  userId: number,
  problemId: number,
  code: string,
  languageId: number,
  testId?: number,
) => {
  try {
    const problem = await Problem.findByPk(problemId, {
      include: [{ model: Testcase, as: 'testcases' }],
    });

    if (!problem) throw new Error('Problem not found');

    const testcases = (problem as any).testcases;
    const results: any[] = [];
    let allPassed = true;
    let overallStatus = 'Accepted';

    // Run test cases via Judge0
    for (const testcase of testcases) {
      const res = await judge0Service.submitCode(
        code,
        languageId,
        testcase.dataValues.input,
        testcase.dataValues.expectedOutput,
      );

      results.push({
        testcaseId: testcase.id,
        status: res.status.description,
        pass: res.status.id === 3, // 3 is "Accepted"
        time: res.time,
        memory: res.memory,
        isHidden: testcase.isHidden,
        ...(testcase.isHidden ? {} : { stdout: res.stdout, stderr: res.stderr }),
      });

      if (res.status.id !== 3) {
        allPassed = false;
        if (overallStatus === 'Accepted') {
          overallStatus = res.status.description;
        }
      }
    }

    // OpenAI Qualitative Review
    const { review, grade, improvedCode } = await openaiService.reviewCode(
      problem.description,
      code,
      results.map((r) => ({ status: r.status, pass: r.pass })),
    );

    // Save submission
    const submission = await Submission.create({
      userId,
      problemId,
      testId: testId || null,
      code,
      languageId,
      status: allPassed ? 'Accepted' : overallStatus,
      results,
      openaiReview: review,
      aiImprovedCode: improvedCode,
      grade,
    });

    return submission;
  } catch (error) {
    logger.error('Error processing submission:', error);
    throw error;
  }
};

export const getAvailableProblems = async (filters: any) => {
  return Problem.findAll({ where: filters });
};

export const getProblemById = async (id: number) => {
  return Problem.findByPk(id, {
    include: [{ model: Testcase, as: 'testcases', where: { isHidden: false }, required: false }],
  });
};

// ---------------------------------------------------------------------------
// RUN TESTCASES (Internal/Direct execution for immediate feedback)
// ---------------------------------------------------------------------------

export const runTestcases = async (problemId: number, code: string, languageId: number) => {
  try {
    const problem = await Problem.findByPk(problemId, {
      include: [{ model: Testcase, as: 'testcases' }],
    });

    if (!problem) throw new Error('Problem not found');

    const testcases = (problem as any).testcases;
    const results: any[] = [];
    let allPassed = true;

    for (const testcase of testcases) {
      const res = await judge0Service.submitCode(
        code,
        languageId,
        testcase.dataValues.input,
        testcase.dataValues.expectedOutput,
      );

      results.push({
        testcaseId: testcase.id,
        status: res.status.description,
        pass: res.status.id === 3,
        time: res.time,
        memory: res.memory,
        isHidden: testcase.isHidden,
        compile_output: res.compile_output,
        ...(testcase.isHidden ? {} : { stdout: res.stdout, stderr: res.stderr }),
      });

      if (res.status.id !== 3) {
        allPassed = false;
      }
    }

    return {
      success: true,
      allPassed,
      results,
    };
  } catch (error) {
    logger.error('Error running testcases:', error);
    throw error;
  }
};

/**
 * Get unique tags from all problems to act as topics
 */
export const getProblemTags = async (): Promise<string[]> => {
  const results = await sequelize.query(`
    SELECT DISTINCT unnest_tags FROM (
      SELECT jsonb_array_elements_text(tags) as unnest_tags FROM problem
    ) AS subquery
    WHERE unnest_tags IS NOT NULL
    ORDER BY unnest_tags
  `);

  return (results[0] as any[]).map((r) => r.unnest_tags);
};

// ── Service Functions ─────────────────────────────────────────────────────────

const scoreProblem = (tp: TestProblemRecord, sub: SubmissionRecord | undefined): ProblemScore => {
  const total = tp.problem?.testcases?.length ?? 0;
  if (!sub) {
    return { problemId: tp.problemId, grade: 0, passed: 0, total, isCorrect: false, isAttempted: false };
  }

  const results: TestCaseResult[] = Array.isArray(sub.results) ? sub.results : [];
  const passed = results.filter((r) => r.pass).length;
  const isCorrect = results.length > 0 && passed === results.length;

  return {
    problemId: tp.problemId,
    grade: sub.grade ?? 0,
    passed,
    total,
    isCorrect,
    isAttempted: true,
  };
};

/**
 * Overall score: average grade across ALL problems (unattempted = 0).
 * This penalises skipped problems and keeps the metric honest.
 */
const computeOverallScore = (scores: ProblemScore[]): number => {
  if (scores.length === 0) return 0;
  const total = scores.reduce((acc, s) => acc + s.grade, 0);
  return Math.round(total / scores.length);
};

/**
 * Coding accuracy: (total test cases passed) / (total test cases across ALL problems).
 * Unattempted problems contribute 0 to the numerator, keeping accuracy grounded.
 */
const computeCodingAccuracy = (scores: ProblemScore[]): number => {
  const totalTestCases = scores.reduce((acc, s) => acc + s.total, 0);
  if (totalTestCases === 0) return 0;
  const passedTestCases = scores.reduce((acc, s) => acc + s.passed, 0);
  return Math.round((passedTestCases / totalTestCases) * 100);
};

/**
 * Maps accuracy + score to a targeted improvement area.
 * Thresholds cover the full 0–100 range with no gaps.
 */
const resolveImprovementFocus = (accuracy: number, overallScore: number): string => {
  if (accuracy < 40) return 'Fundamentals & Logic Building';
  if (accuracy < 60) return 'Logic & Implementation';
  if (accuracy < 80) return 'Edge Case Handling';
  if (overallScore < 85) return 'Code Optimisation';
  if (overallScore < 95) return 'Advanced Patterns';
  return 'Clean Code & Best Practices';
};

/**
 * Returns a lightweight summary of all tests created by a user.
 */
export const getMyTestResults = async (userId: number) => {
  const tests = await CodingTest.findAll({
    where: { interviewerId: userId },
    order: [['createdAt', 'DESC']],
    include: [
      { model: Submission, as: 'submissions' },
      { model: CodingTestProblem, as: 'testProblems' },
    ],
  });

  return tests.map((test) => {
    const allSubmissions: SubmissionRecord[] = (test as any).submissions ?? [];
    const testProblems: TestProblemRecord[] = (test as any).testProblems ?? [];

    const latestByProblem = deduplicateByLatest(allSubmissions);
    const scores = testProblems.map((tp) => scoreProblem(tp, latestByProblem[tp.problemId]));

    return {
      id: test.id,
      title: test.title,
      difficultyDistribution: test.difficultyDistribution,
      createdAt: test.createdAt,
      submittedAt: test.submittedAt,
      overallScore: computeOverallScore(scores),
      codingAccuracy: computeCodingAccuracy(scores),
      attemptedCount: scores.filter((s) => s.isAttempted).length,
      submissionCount: Object.keys(latestByProblem).length,
      status: test.status,
    };
  });
};

/**
 * Returns a full report for a single test, including per-question breakdowns.
 */
export const getTestReport = async (testId: number, userId: number) => {
  const test = await CodingTest.findByPk(testId, {
    include: [
      {
        model: CodingTestProblem,
        as: 'testProblems',
        include: [
          {
            model: Problem,
            as: 'problem',
            include: [{ model: Testcase, as: 'testcases' }],
          },
        ],
      },
      {
        model: Submission,
        as: 'submissions',
        required: false,
      },
    ],
  });

  if (!test) throw new Error('Test not found');

  const allSubmissions: SubmissionRecord[] = (test as any).submissions ?? [];
  const testProblems: TestProblemRecord[] = (test as any).testProblems ?? [];

  const latestByProblem = deduplicateByLatest(allSubmissions);
  const scores = testProblems.map((tp) => scoreProblem(tp, latestByProblem[tp.problemId]));

  // ── Aggregate stats (single source of truth) ──────────────────────────────
  const overallScore = computeOverallScore(scores);
  const codingAccuracy = computeCodingAccuracy(scores);
  const correctAnswers = scores.filter((s) => s.isCorrect).length;

  const stats = {
    questionsReviewed: testProblems.length,
    attemptedCount: scores.filter((s) => s.isAttempted).length,
    correctAnswers,
    codingAccuracy,
    improvementFocus: resolveImprovementFocus(codingAccuracy, overallScore),
  };

  // ── Per-question breakdown ─────────────────────────────────────────────────
  const questions = testProblems.map((tp, i) => {
    const sub = latestByProblem[tp.problemId];
    const score = scores[i];

    const status: 'Correct' | 'Incorrect' | 'Not Attempted' = !score.isAttempted
      ? 'Not Attempted'
      : score.isCorrect
        ? 'Correct'
        : 'Incorrect';

    return {
      id: tp.problem.id,
      title: tp.problem.title,
      type: 'Coding Task',
      status,
      testCasesPassed: score.passed,
      testCasesTotal: score.total,
      grade: score.grade,
      submittedCode: sub?.code ?? '',
      aiFeedback: sub?.openaiReview ?? 'No feedback available.',
      aiImprovedCode: sub?.aiImprovedCode ?? null,
      explanation: tp.problem.description,
      submittedAt: sub?.createdAt ?? null,
      auditTrail: [
        {
          time: sub?.createdAt ?? test.createdAt,
          event: sub ? 'Assessment submitted' : 'Assessment started',
        },
      ],
    };
  });

  const session = await antiCheatService.findSessionByJobId(testId.toString());

  // ── Difficulty label derived from distribution ─────────────────────────────
  const dist = test.difficultyDistribution ?? {};
  const difficulty =
    (dist.hard ?? 0) > 0 ? 'Hard' : (dist.medium ?? 0) > 0 ? 'Medium' : 'Easy';

  return {
    sessionId: session?.id ?? null,
    test: {
      id: test.id,
      title: test.title,
      overallScore,
      codingAccuracy,
      createdAt: test.createdAt,
      submittedAt: test.submittedAt,
      difficultyDistribution: test.difficultyDistribution,
      difficulty,
      duration: test.totalTime,
    },
    stats,
    questions,
  };
};
