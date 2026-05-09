import { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../../middleware/errorHandler';
import antiCheatConfig from '../../config/antiCheat';
import { calculateChecksum, chunkUpload, uploadRecording } from '../../middleware/antiCheatUpload';
import {
  assertUuid,
  normalizeRecordingType,
  parseNonNegativeInteger,
  parseOptionalDate,
  parseOptionalInteger,
  parseRequiredString,
  RecordingType,
} from '../../utils/antiCheat';
import {
  buildIntegrityReport,
  createLegacyRecording,
  finalizeRecording,
  findSessionById,
  getChunkMetadata,
  resolveRecordingIdForChunk,
  startRecordingSession,
  insertRecordingChunk,
} from '../../services/antiCheat.service';

const router = Router();
const sseConnections = new Map<string, Set<Response>>();

const safeRemoveFile = (filePath?: string): void => {
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  try {
    fs.unlinkSync(filePath);
  } catch {
    // Ignore cleanup failures; the request has already been handled.
  }
};

const getChunkDirectory = (sessionId: string, type: RecordingType): string =>
  path.join(antiCheatConfig.chunkUploadRoot, sessionId, type);

const listChunksFromDisk = (
  sessionId: string,
  type: RecordingType,
): Array<{ chunkIndex: number; filename: string; size: number; url: string }> => {
  const chunkDir = getChunkDirectory(sessionId, type);

  if (!fs.existsSync(chunkDir)) {
    return [];
  }

  return fs
    .readdirSync(chunkDir)
    .filter((file) => file.endsWith('.webm'))
    .map((file) => {
      const stats = fs.statSync(path.join(chunkDir, file));
      const match = file.match(/chunk-(\d+)-/);
      const chunkIndex = match ? Number.parseInt(match[1], 10) : 0;

      return {
        chunkIndex,
        filename: file,
        size: stats.size,
        url: `/api/recordings/chunk/${sessionId}/${type}/${chunkIndex}`,
      };
    })
    .sort((left, right) => left.chunkIndex - right.chunkIndex);
};

const broadcastChunk = (sessionId: string, payload: Record<string, unknown>): void => {
  const connections = sseConnections.get(sessionId);

  if (!connections || connections.size === 0) {
    return;
  }

  const message = JSON.stringify({
    type: 'chunk',
    ...payload,
  });

  connections.forEach((res) => {
    res.write(`data: ${message}\n\n`);
  });
};

const parseMetadata = (value: unknown): unknown | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const streamSequentially = (res: Response, files: string[], directory: string): void => {
  const streamNext = (index: number): void => {
    if (index >= files.length) {
      res.end();
      return;
    }

    const fullPath = path.join(directory, files[index]);
    const readStream = fs.createReadStream(fullPath);

    readStream.on('error', () => {
      streamNext(index + 1);
    });

    readStream.on('end', () => {
      streamNext(index + 1);
    });

    readStream.pipe(res, { end: false });
  };

  streamNext(0);
};

router.get('/stream/:sessionId', async (req: Request, res: Response) => {
  const sessionId = parseRequiredString(req.params.sessionId, 'sessionId');
  assertUuid(sessionId, 'sessionId');
  const type = typeof req.query.type === 'string' ? normalizeRecordingType(req.query.type) : 'webcam';

  const session = await findSessionById(sessionId);
  if (!session) {
    throw new AppError('Session not found', StatusCodes.NOT_FOUND);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId, streamType: type })}\n\n`);

  if (!sseConnections.has(sessionId)) {
    sseConnections.set(sessionId, new Set());
  }

  sseConnections.get(sessionId)?.add(res);

  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
  }, antiCheatConfig.sseHeartbeatMs);

  req.on('close', () => {
    clearInterval(heartbeat);

    const connections = sseConnections.get(sessionId);
    if (!connections) {
      return;
    }

    connections.delete(res);
    if (connections.size === 0) {
      sseConnections.delete(sessionId);
    }
  });
});

router.get('/chunk/:sessionId/:type/:chunkIndex', async (req: Request, res: Response) => {
  const sessionId = parseRequiredString(req.params.sessionId, 'sessionId');
  assertUuid(sessionId, 'sessionId');
  const type = normalizeRecordingType(req.params.type);
  const chunkIndex = parseNonNegativeInteger(req.params.chunkIndex, 'chunkIndex');
  const chunkDir = getChunkDirectory(sessionId, type);

  if (!fs.existsSync(chunkDir)) {
    throw new AppError('Chunk directory not found', StatusCodes.NOT_FOUND);
  }

  const paddedIndex = String(chunkIndex).padStart(6, '0');
  const files = fs
    .readdirSync(chunkDir)
    .filter((file) => file.includes(`-${paddedIndex}-`) && file.endsWith('.webm'));

  if (files.length === 0) {
    throw new AppError('Chunk not found', StatusCodes.NOT_FOUND);
  }

  res.sendFile(path.join(chunkDir, files[0]));
});

router.get('/chunks/:sessionId', async (req: Request, res: Response) => {
  const sessionId = parseRequiredString(req.params.sessionId, 'sessionId');
  assertUuid(sessionId, 'sessionId');
  const type = typeof req.query.type === 'string' ? normalizeRecordingType(req.query.type) : 'webcam';

  const chunks = listChunksFromDisk(sessionId, type);

  res.status(StatusCodes.OK).json({
    chunks,
    sessionId,
    totalChunks: chunks.length,
    type,
  });
});

router.get('/play/:sessionId/:type?', async (req: Request, res: Response) => {
  const sessionId = parseRequiredString(req.params.sessionId, 'sessionId');
  assertUuid(sessionId, 'sessionId');
  const type = normalizeRecordingType(req.params.type);
  const chunkDir = getChunkDirectory(sessionId, type);

  if (!fs.existsSync(chunkDir)) {
    throw new AppError('Recording directory not found', StatusCodes.NOT_FOUND);
  }

  const files = fs
    .readdirSync(chunkDir)
    .filter((file) => file.endsWith('.webm'))
    .sort((a, b) => {
      const indexA = Number.parseInt(a.split('-')[1] || '0', 10);
      const indexB = Number.parseInt(b.split('-')[1] || '0', 10);
      return indexA - indexB;
    });

  if (files.length === 0) {
    throw new AppError('No chunks found for this recording', StatusCodes.NOT_FOUND);
  }

  res.setHeader('Content-Type', 'video/webm');
  res.setHeader('Connection', 'keep-alive');
  streamSequentially(res, files, chunkDir);
});

router.post('/ping', async (req: Request, res: Response) => {
  const sessionId = parseRequiredString(req.body?.sessionId, 'sessionId');
  assertUuid(sessionId, 'sessionId');

  res.status(StatusCodes.OK).json({
    sessionId,
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

router.post(
  '/chunk/:sessionId/:type/:chunkIndex',
  chunkUpload.single('chunk'),
  async (req: Request, res: Response) => {
    try {
      const sessionId = parseRequiredString(
        req.params.sessionId || req.body?.sessionId,
        'sessionId',
      );
      assertUuid(sessionId, 'sessionId');
      const type = normalizeRecordingType(req.params.type || req.body?.type);
      const chunkIndex = parseNonNegativeInteger(
        req.params.chunkIndex || req.body?.chunkIndex,
        'chunkIndex',
      );
      const providedRecordingId = parseOptionalInteger(req.body?.recordingId);
      const clientTimestamp = parseOptionalDate(req.body?.clientTimestamp) ?? new Date();
      const durationMs = parseOptionalInteger(req.body?.durationMs);
      const metadata = parseMetadata(req.body?.metadata);

      if (!req.file) {
        throw new AppError('No chunk file provided in request', StatusCodes.BAD_REQUEST);
      }

      if (req.file.size === 0) {
        safeRemoveFile(req.file.path);
        res.status(StatusCodes.OK).json({
          chunkIndex,
          reason: 'empty_chunk',
          status: 'skipped',
        });
        return;
      }

      const session = await findSessionById(sessionId);
      if (!session) {
        safeRemoveFile(req.file.path);
        throw new AppError('Session not found', StatusCodes.NOT_FOUND);
      }

      const gracePeriodMs = 60000;
      if (session.status !== 'active') {
        const endedAt = session.ended_at ? new Date(session.ended_at) : null;
        const timeSinceEnd = endedAt ? Date.now() - endedAt.getTime() : Number.POSITIVE_INFINITY;

        if (timeSinceEnd > gracePeriodMs) {
          safeRemoveFile(req.file.path);
          throw new AppError(
            'Session has ended. Uploads must complete within 60 seconds of session end.',
            StatusCodes.BAD_REQUEST,
          );
        }
      }

      const fileBuffer = fs.readFileSync(req.file.path);
      const checksum = calculateChecksum(fileBuffer);
      const recordingId = await resolveRecordingIdForChunk(sessionId, type, providedRecordingId);

      await insertRecordingChunk({
        clientTimestamp,
        chunkIndex,
        durationMs,
        filePath: req.file.path,
        metadata,
        recordingId,
        checksum,
        sessionId,
        sizeBytes: req.file.size,
        type,
      });

      const chunkUrl = `/api/recordings/chunk/${sessionId}/${type}/${chunkIndex}`;
      broadcastChunk(sessionId, {
        checksum,
        chunkIndex,
        chunkUrl,
        size: req.file.size,
        timestamp: new Date().toISOString(),
        type,
      });

      res.status(StatusCodes.OK).json({
        checksum,
        chunkIndex,
        recordingId,
        serverTimestamp: new Date().toISOString(),
        size: req.file.size,
        success: true,
      });
    } catch (error) {
      safeRemoveFile(req.file?.path);
      throw error;
    }
  },
);

router.post('/start', async (req: Request, res: Response) => {
  const sessionId = parseRequiredString(req.body?.sessionId, 'sessionId');
  assertUuid(sessionId, 'sessionId');
  const type = normalizeRecordingType(req.body?.type);

  const session = await findSessionById(sessionId);
  if (!session) {
    throw new AppError('Session not found', StatusCodes.NOT_FOUND);
  }

  if (session.status !== 'active') {
    throw new AppError('Session is not active', StatusCodes.BAD_REQUEST);
  }

  const recording = await startRecordingSession(sessionId, type);

  res.status(StatusCodes.OK).json(recording);
});

router.post('/end', async (req: Request, res: Response) => {
  const sessionId = parseRequiredString(req.body?.sessionId, 'sessionId');
  assertUuid(sessionId, 'sessionId');
  const type = normalizeRecordingType(req.body?.type);

  const integrity = await buildIntegrityReport(sessionId, type);
  const recording = await finalizeRecording(sessionId, type);

  if (!recording) {
    res.status(StatusCodes.OK).json({
      integrity,
      message: 'No active recording was found for this session.',
      recordingId: null,
      success: true,
      totalChunks: 0,
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    integrity,
    recordingId: recording.id,
    success: true,
    totalChunks: recording.total_chunks,
  });
});

router.get('/chunks/:sessionId/metadata', async (req: Request, res: Response) => {
  const sessionId = parseRequiredString(req.params.sessionId, 'sessionId');
  assertUuid(sessionId, 'sessionId');
  const type = typeof req.query.type === 'string' ? normalizeRecordingType(req.query.type) : null;

  const chunks = await getChunkMetadata(sessionId, type);

  res.status(StatusCodes.OK).json({
    chunks,
    sessionId,
    totalChunks: chunks.length,
  });
});

router.post('/upload', uploadRecording.single('recording'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw new AppError('No recording file provided', StatusCodes.BAD_REQUEST);
    }

    const sessionId = parseRequiredString(req.body?.sessionId, 'sessionId');
    assertUuid(sessionId, 'sessionId');
    const type = normalizeRecordingType(req.body?.type);

    const session = await findSessionById(sessionId);
    if (!session) {
      safeRemoveFile(req.file.path);
      throw new AppError('Session not found', StatusCodes.NOT_FOUND);
    }

    await createLegacyRecording(sessionId, type, req.file.path);

    res.status(StatusCodes.OK).json({ message: 'Recording saved', path: req.file.path });
  } catch (error) {
    safeRemoveFile(req.file?.path);
    throw error;
  }
});

export default router;
