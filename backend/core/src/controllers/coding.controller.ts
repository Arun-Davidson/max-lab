import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthRequest } from '../middleware/authMiddleware';
import * as codingService from '../services/coding.service';
import { AppError } from '../middleware/errorHandler';

/**
 * @swagger
 * /api/v1/coding/problems:
 *   get:
 *     tags:
 *       - Coding
 *     summary: Get list of available coding problems
 *     description: Retrieve a list of coding problems seeded from the starter_code directory.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of problems
 *       401:
 *         description: Unauthorized
 */
export const getProblems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filters = req.query;
    const problems = await codingService.getAvailableProblems(filters);
    res.status(StatusCodes.OK).json({ success: true, data: problems });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/coding/problems/{id}:
 *   get:
 *     tags:
 *       - Coding
 *     summary: Get problem details
 *     description: Retrieve details for a specific problem, including sample testcases and starter code.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Problem details
 *       404:
 *         description: Problem not found
 */
export const getProblemById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const problem = await codingService.getProblemById(parseInt(req.params.id, 10));
    if (!problem) throw new AppError('Problem not found', StatusCodes.NOT_FOUND);
    res.status(StatusCodes.OK).json({ success: true, data: problem });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/coding/tests:
 *   post:
 *     tags:
 *       - Coding
 *     summary: Create a new coding test
 *     description: Create a coding test for candidates. Problems are picked randomly based on difficulty distribution. (Employer/HR only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               totalTime:
 *                 type: integer
 *               difficultyDistribution:
 *                 type: object
 *     responses:
 *       201:
 *         description: Test created
 */
export const createTest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, totalTime, difficultyDistribution, tags } = req.body;
    const interviewerId = (req.user as any).id;
    const test = await codingService.createTest(
      interviewerId,
      title,
      totalTime,
      difficultyDistribution,
      tags,
    );
    res.status(StatusCodes.CREATED).json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unique tags from all problems
 */
export const getProblemTags = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tags = await codingService.getProblemTags();
    res.status(StatusCodes.OK).json({ success: true, data: tags });
  } catch (error) {
    next(error);
  }
};

export const getLanguages = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const languages = await codingService.getSupportedLanguages();
    res.status(StatusCodes.OK).json({ success: true, data: languages });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/coding/tests/{id}/invite:
 *   post:
 *     tags:
 *       - Coding
 *     summary: Send candidate an invite email
 *     description: Send an invitation email to a candidate with a unique test link. (Employer/HR only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candidateEmail
 *             properties:
 *               candidateEmail:
 *                 type: string
 *               expiresInHours:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Invite sent
 */
export const sendInvite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const testId = parseInt(req.params.id, 10);
    const { candidateEmail, expiresInHours } = req.body;

    if (!candidateEmail) throw new AppError('candidateEmail is required', StatusCodes.BAD_REQUEST);

    const test = await codingService.sendInvite(
      testId,
      candidateEmail,
      expiresInHours ? parseInt(expiresInHours, 10) : 48,
    );

    res.status(StatusCodes.OK).json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/coding/tests/{id}/status:
 *   get:
 *     tags:
 *       - Coding
 *     summary: Get interview status
 *     description: Get progress and submissions for a specific test. Supports token-based access for candidates.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Interview status
 */
export const getInterviewStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const testId = parseInt(req.params.id, 10);
    const token = req.query.token as string | undefined;

    const status = await codingService.getInterviewStatus(testId, token);
    res.status(StatusCodes.OK).json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
};

/**
 * @access Private (auth) or Public (token query param)
 */
export const getTestProblems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const testId = parseInt(req.params.id, 10);
    const token = req.query.token as string | undefined;

    const problems = await codingService.getTestProblems(testId, token);
    res.status(StatusCodes.OK).json({ success: true, data: problems });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PATCH /api/v1/coding/tests/:id/start
 * @desc Candidate starts the test
 */
export const startTest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const testId = parseInt(req.params.id, 10);
    const token = req.query.token as string | undefined;
    const test = await codingService.startTest(testId, token);
    res.status(StatusCodes.OK).json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PATCH /api/v1/coding/tests/:id/end
 * @desc Candidate ends the test (manual or auto)
 */
export const endTest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const testId = parseInt(req.params.id, 10);
    const token = req.query.token as string | undefined;
    const test = await codingService.endTest(testId, token);
    res.status(StatusCodes.OK).json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/coding/submissions:
 *   post:
 *     tags:
 *       - Coding
 *     summary: Submit code for execution
 *     description: Submit code for a problem. Executes via Judge0 and performs AI review.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - problemId
 *               - code
 *               - languageId
 *             properties:
 *               problemId:
 *                 type: integer
 *               code:
 *                 type: string
 *               languageId:
 *                 type: integer
 *               testId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Submission processed
 */
export const submitCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { problemId, code, languageId, testId } = req.body;
    const userId = (req.user as any).id;

    const submission = await codingService.processSubmission(
      userId,
      parseInt(problemId, 10),
      code,
      parseInt(languageId, 10),
      testId ? parseInt(testId, 10) : undefined,
    );

    res.status(StatusCodes.OK).json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/coding/run-testcases:
 *   post:
 *     tags:
 *       - Coding
 *     summary: Run code against testcases
 *     description: Execute code against all testcases for a problem without saving a submission. Used for immediate feedback.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - problemId
 *               - code
 *               - languageId
 *             properties:
 *               problemId:
 *                 type: integer
 *               code:
 *                 type: string
 *               languageId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Testcase results returned
 */
export const runTestcases = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { problemId, code, languageId } = req.body;

    const result = await codingService.runTestcases(
      parseInt(problemId, 10),
      code,
      parseInt(languageId, 10),
    );

    res.status(StatusCodes.OK).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get test results for the current user (Mock tests they created)
 */
export const getMyTestResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const results = await codingService.getMyTestResults(userId);
    res.status(StatusCodes.OK).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a detailed AI report for a specific test
 */
export const getTestReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const testId = parseInt(req.params.id, 10);
    const userId = (req.user as any).id;
    const report = await codingService.getTestReport(testId, userId);
    res.status(StatusCodes.OK).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};
