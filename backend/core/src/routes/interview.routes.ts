import { Router } from 'express';
import * as interviewController from '../controllers/interview.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * @route POST /api/v1/interviews/start
 * @desc Start an AI interview
 * @access Private
 */
router.post('/start', authMiddleware, interviewController.startInterview);

/**
 * @route GET /api/v1/interviews/:id
 * @desc Get interview status/results
 * @access Private
 */
router.get('/:id', authMiddleware, interviewController.getInterviewStatus);

export default router;
