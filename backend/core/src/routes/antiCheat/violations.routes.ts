import { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../../middleware/errorHandler';
import { assertUuid, parseOptionalString, parseRequiredString, sanitizeViolationType } from '../../utils/antiCheat';
import { findSessionById, logViolation } from '../../services/antiCheat.service';

const router = Router();

router.post('/log', async (req: Request, res: Response) => {
  const sessionId = parseRequiredString(req.body?.sessionId, 'sessionId');
  assertUuid(sessionId, 'sessionId');

  const session = await findSessionById(sessionId);

  if (!session) {
    throw new AppError('Session not found', StatusCodes.NOT_FOUND);
  }

  const violationType = sanitizeViolationType(req.body?.type || req.body?.reason);
  const questionId = parseOptionalString(req.body?.questionId);
  const meta = req.body?.meta ?? null;

  await logViolation(sessionId, violationType, questionId, meta);

  res.status(StatusCodes.OK).json({ message: 'Violation logged' });
});

export default router;
