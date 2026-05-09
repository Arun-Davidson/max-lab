import path from 'path';

const parseHeartbeatMs = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveUploadRoot = (): string => {
  const configuredRoot = process.env.ANTI_CHEAT_UPLOAD_DIR || process.env.UPLOAD_DIR || 'uploads';
  return path.resolve(process.cwd(), configuredRoot);
};

export const antiCheatConfig = {
  sseHeartbeatMs: parseHeartbeatMs(
    process.env.ANTI_CHEAT_SSE_HEARTBEAT_MS || process.env.SSE_HEARTBEAT_MS,
    15000,
  ),
  uploadRoot: resolveUploadRoot(),
  chunkUploadRoot: path.join(resolveUploadRoot(), 'chunks'),
  recordingsUploadRoot: path.join(resolveUploadRoot(), 'recordings'),
};

export default antiCheatConfig;
