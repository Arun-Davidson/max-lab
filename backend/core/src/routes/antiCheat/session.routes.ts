import { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../../middleware/errorHandler';
import {
  assertUuid,
  parseOptionalString,
  parseRequiredString,
} from '../../utils/antiCheat';
import {
  createSession,
  endSession,
  getSessionSummary,
} from '../../services/antiCheat.service';

const router = Router();

router.post('/start', async (req: Request, res: Response) => {
  const candidateId = parseRequiredString(req.body?.candidateId, 'candidateId');
  const jobId = parseOptionalString(req.body?.jobId);

  const sessionId = await createSession(candidateId, jobId);

  res.status(StatusCodes.OK).json({ sessionId });
});

router.post('/end', async (req: Request, res: Response) => {
  const sessionId = parseRequiredString(req.body?.sessionId, 'sessionId');
  assertUuid(sessionId, 'sessionId');

  const session = await endSession(sessionId);

  if (!session) {
    throw new AppError('Session not found', StatusCodes.NOT_FOUND);
  }

  res.status(StatusCodes.OK).json({ message: 'Session ended' });
});

router.get('/:id', async (req: Request, res: Response) => {
  const sessionId = parseRequiredString(req.params.id, 'sessionId');
  assertUuid(sessionId, 'sessionId');

  const summary = await getSessionSummary(sessionId);

  if (!summary) {
    throw new AppError('Session not found', StatusCodes.NOT_FOUND);
  }

  res.status(StatusCodes.OK).json(summary);
});

export default router;
