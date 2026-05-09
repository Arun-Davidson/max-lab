import { QueryTypes, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../db/sequelize';
import { IntegrityReport, RecordingType } from '../utils/antiCheat';

export interface AntiCheatSessionRow {
  id: string;
  candidate_id: string;
  job_id: string | null;
  started_at: Date;
  ended_at: Date | null;
  status: string;
}

export interface AntiCheatViolationRow {
  id: number;
  session_id: string;
  type: string;
  question_id: string | null;
  timestamp: Date;
  meta: unknown | null;
}

export interface AntiCheatRecordingRow {
  id: number;
  session_id: string;
  file_path: string | null;
  type: RecordingType;
  status: string;
  started_at: Date;
  completed_at: Date | null;
  total_chunks: number;
}

export interface AntiCheatChunkMetadataRow {
  chunk_index: number;
  file_path: string;
  size_bytes: number;
  checksum: string | null;
  timestamp: Date;
  client_timestamp: Date | null;
  type: RecordingType;
}

export interface StartRecordingResult {
  recordingId: number;
  nextChunkIndex: number;
  resumed: boolean;
}

const selectMany = async <T extends object>(
  query: string,
  bind: unknown[],
  transaction?: Transaction,
): Promise<T[]> => {
  return (await sequelize.query(query, {
    bind,
    transaction,
    type: QueryTypes.SELECT,
  })) as T[];
};

const selectOne = async <T extends object>(
  query: string,
  bind: unknown[],
  transaction?: Transaction,
): Promise<T | null> => {
  const rows = await selectMany<T>(query, bind, transaction);
  return rows[0] ?? null;
};

const execute = async (query: string, bind: unknown[], transaction?: Transaction): Promise<void> => {
  await sequelize.query(query, {
    bind,
    transaction,
  });
};

export const createSession = async (
  candidateId: string,
  jobId: string | null,
): Promise<string> => {
  const sessionId = uuidv4();

  await execute(
    'INSERT INTO sessions (id, candidate_id, job_id) VALUES ($1, $2, $3)',
    [sessionId, candidateId, jobId],
  );

  return sessionId;
};

export const findSessionById = async (
  sessionId: string,
): Promise<AntiCheatSessionRow | null> => {
  return selectOne<AntiCheatSessionRow>(
    `SELECT id, candidate_id, job_id, started_at, ended_at, status
     FROM sessions
     WHERE id = $1`,
    [sessionId],
  );
};

export const findSessionByJobId = async (
  jobId: string,
): Promise<AntiCheatSessionRow | null> => {
  return selectOne<AntiCheatSessionRow>(
    `SELECT id, candidate_id, job_id, started_at, ended_at, status
     FROM sessions
     WHERE job_id = $1
     ORDER BY started_at DESC
     LIMIT 1`,
    [jobId],
  );
};

export const endSession = async (sessionId: string): Promise<AntiCheatSessionRow | null> => {
  return selectOne<AntiCheatSessionRow>(
    `UPDATE sessions
     SET ended_at = NOW(), status = $1
     WHERE id = $2
     RETURNING id, candidate_id, job_id, started_at, ended_at, status`,
    ['completed', sessionId],
  );
};

export const getSessionSummary = async (
  sessionId: string,
): Promise<{ session: AntiCheatSessionRow; violations: AntiCheatViolationRow[] } | null> => {
  const session = await findSessionById(sessionId);

  if (!session) {
    return null;
  }

  const violations = await selectMany<AntiCheatViolationRow>(
    `SELECT id, session_id, type, question_id, timestamp, meta
     FROM violations
     WHERE session_id = $1
     ORDER BY timestamp ASC`,
    [sessionId],
  );

  return { session, violations };
};

export const logViolation = async (
  sessionId: string,
  type: string,
  questionId: string | null,
  meta: unknown | null,
): Promise<void> => {
  await execute(
    `INSERT INTO violations (session_id, type, question_id, meta)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, type, questionId, meta === null ? null : JSON.stringify(meta)],
  );
};

export const findRecordingById = async (
  sessionId: string,
  recordingId: number,
  type: RecordingType,
): Promise<AntiCheatRecordingRow | null> => {
  return selectOne<AntiCheatRecordingRow>(
    `SELECT id, session_id, file_path, type, status, started_at, completed_at, total_chunks
     FROM recordings
     WHERE id = $1 AND session_id = $2 AND type = $3
     LIMIT 1`,
    [recordingId, sessionId, type],
  );
};

export const findLatestRecording = async (
  sessionId: string,
  type: RecordingType,
): Promise<AntiCheatRecordingRow | null> => {
  return selectOne<AntiCheatRecordingRow>(
    `SELECT id, session_id, file_path, type, status, started_at, completed_at, total_chunks
     FROM recordings
     WHERE session_id = $1 AND type = $2
     ORDER BY started_at DESC, id DESC
     LIMIT 1`,
    [sessionId, type],
  );
};

export const findActiveRecording = async (
  sessionId: string,
  type: RecordingType,
): Promise<AntiCheatRecordingRow | null> => {
  return selectOne<AntiCheatRecordingRow>(
    `SELECT id, session_id, file_path, type, status, started_at, completed_at, total_chunks
     FROM recordings
     WHERE session_id = $1 AND type = $2 AND status = 'streaming'
     ORDER BY started_at DESC, id DESC
     LIMIT 1`,
    [sessionId, type],
  );
};

export const createRecording = async (
  sessionId: string,
  type: RecordingType,
  status: string = 'streaming',
): Promise<AntiCheatRecordingRow> => {
  const recording = await selectOne<AntiCheatRecordingRow>(
    `INSERT INTO recordings (session_id, type, status)
     VALUES ($1, $2, $3)
     RETURNING id, session_id, file_path, type, status, started_at, completed_at, total_chunks`,
    [sessionId, type, status],
  );

  if (!recording) {
    throw new Error('Failed to create recording');
  }

  return recording;
};

export const createLegacyRecording = async (
  sessionId: string,
  type: RecordingType,
  filePath: string,
): Promise<AntiCheatRecordingRow> => {
  const recording = await selectOne<AntiCheatRecordingRow>(
    `INSERT INTO recordings (session_id, file_path, type, status)
     VALUES ($1, $2, $3, 'completed')
     RETURNING id, session_id, file_path, type, status, started_at, completed_at, total_chunks`,
    [sessionId, filePath, type],
  );

  if (!recording) {
    throw new Error('Failed to create legacy recording');
  }

  return recording;
};

export const startRecordingSession = async (
  sessionId: string,
  type: RecordingType,
): Promise<StartRecordingResult> => {
  const activeRecording = await findActiveRecording(sessionId, type);

  if (activeRecording) {
    return {
      recordingId: activeRecording.id,
      nextChunkIndex: activeRecording.total_chunks,
      resumed: true,
    };
  }

  const recording = await createRecording(sessionId, type, 'streaming');

  return {
    recordingId: recording.id,
    nextChunkIndex: 0,
    resumed: false,
  };
};

export const resolveRecordingIdForChunk = async (
  sessionId: string,
  type: RecordingType,
  providedRecordingId: number | null,
): Promise<number> => {
  if (providedRecordingId !== null) {
    const recording = await findRecordingById(sessionId, providedRecordingId, type);

    if (recording) {
      return recording.id;
    }
  }

  const latestRecording = await findLatestRecording(sessionId, type);

  if (latestRecording) {
    return latestRecording.id;
  }

  const recording = await createRecording(sessionId, type, 'streaming');
  return recording.id;
};

export const insertRecordingChunk = async (
  params: {
    sessionId: string;
    recordingId: number;
    chunkIndex: number;
    filePath: string;
    sizeBytes: number;
    checksum: string;
    clientTimestamp: Date;
    type: RecordingType;
    durationMs?: number | null;
    metadata?: unknown | null;
  },
): Promise<void> => {
  await sequelize.transaction(async (transaction) => {
    await execute(
      `INSERT INTO recording_chunks
       (session_id, recording_id, chunk_index, file_path, size_bytes, duration_ms, checksum, client_timestamp, type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        params.sessionId,
        params.recordingId,
        params.chunkIndex,
        params.filePath,
        params.sizeBytes,
        params.durationMs ?? null,
        params.checksum,
        params.clientTimestamp,
        params.type,
        params.metadata === undefined || params.metadata === null ? null : JSON.stringify(params.metadata),
      ],
      transaction,
    );

    await execute(
      'UPDATE recordings SET total_chunks = total_chunks + 1 WHERE id = $1',
      [params.recordingId],
      transaction,
    );
  });
};

export const finalizeRecording = async (
  sessionId: string,
  type: RecordingType,
): Promise<AntiCheatRecordingRow | null> => {
  return selectOne<AntiCheatRecordingRow>(
    `UPDATE recordings
     SET status = 'completed', completed_at = NOW()
     WHERE id = (
       SELECT id
       FROM recordings
       WHERE session_id = $1 AND type = $2 AND status = 'streaming'
       ORDER BY started_at DESC, id DESC
       LIMIT 1
     )
     RETURNING id, session_id, file_path, type, status, started_at, completed_at, total_chunks`,
    [sessionId, type],
  );
};

export const buildIntegrityReport = async (
  sessionId: string,
  type: RecordingType,
): Promise<IntegrityReport> => {
  const recording = await findLatestRecording(sessionId, type);

  if (!recording) {
    return {
      duplicateChunks: [],
      isValid: false,
      missingChunks: [],
    };
  }

  const chunks = await selectMany<{ chunk_index: number; occurrences: number }>(
    `SELECT chunk_index, COUNT(*)::int AS occurrences
     FROM recording_chunks
     WHERE recording_id = $1
     GROUP BY chunk_index
     ORDER BY chunk_index ASC`,
    [recording.id],
  );

  const missingChunks: number[] = [];
  const duplicateChunks: number[] = [];
  let expectedChunkIndex = 0;

  for (const row of chunks) {
    const chunkIndex = Number(row.chunk_index);
    const occurrences = Number(row.occurrences);

    while (expectedChunkIndex < chunkIndex) {
      missingChunks.push(expectedChunkIndex);
      expectedChunkIndex += 1;
    }

    if (occurrences > 1) {
      duplicateChunks.push(chunkIndex);
    }

    expectedChunkIndex = chunkIndex + 1;
  }

  return {
    duplicateChunks,
    isValid: missingChunks.length === 0 && duplicateChunks.length === 0,
    missingChunks,
  };
};

export const getChunkMetadata = async (
  sessionId: string,
  type: RecordingType | null = null,
): Promise<AntiCheatChunkMetadataRow[]> => {
  const rows = await selectMany<AntiCheatChunkMetadataRow>(
    `SELECT chunk_index, file_path, size_bytes, checksum, timestamp, client_timestamp, type
     FROM recording_chunks
     WHERE session_id = $1${type ? ' AND type = $2' : ''}
     ORDER BY chunk_index ASC`,
    type ? [sessionId, type] : [sessionId],
  );

  return rows;
};
