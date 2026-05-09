import express from 'express';
import * as codingController from '../controllers/coding.controller';
import { authMiddleware, requireEmployer } from '../middleware/authMiddleware';

const router = express.Router();

// ─── Public (token-auth) routes — candidates access via invite link ──────────
// These accept ?token=<inviteToken> as an alternative to a JWT
router.get('/tests/:id/status', codingController.getInterviewStatus);
router.get('/tests/:id/problems', codingController.getTestProblems);
router.patch('/tests/:id/start', codingController.startTest);
router.patch('/tests/:id/end', codingController.endTest);

// ─── Authenticated routes (JWT required) ────────────────────────────────────
router.use(authMiddleware);

router.get('/problems', codingController.getProblems);
router.get('/problems/:id', codingController.getProblemById);
router.get('/tags', codingController.getProblemTags);
router.get('/languages', codingController.getLanguages);

// Mock test: list results & get report (must be before /:id wildcard routes)
router.get('/tests/my-results', codingController.getMyTestResults);
router.get('/tests/report/:id', codingController.getTestReport);

// Any authenticated user can create a mock test (contractors included)
router.post('/tests', codingController.createTest);
router.post('/tests/:id/invite', requireEmployer, codingController.sendInvite);

// Candidates submit code
router.post('/submissions', codingController.submitCode);
router.post('/run-testcases', codingController.runTestcases);

export default router;
