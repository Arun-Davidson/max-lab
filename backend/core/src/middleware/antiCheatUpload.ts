import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import antiCheatConfig from '../config/antiCheat';
import { recordingTypes } from '../utils/antiCheat';

const ensureDirectory = (directory: string): void => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

ensureDirectory(antiCheatConfig.uploadRoot);
ensureDirectory(antiCheatConfig.chunkUploadRoot);
ensureDirectory(antiCheatConfig.recordingsUploadRoot);

const createStorage = (folder: string): multer.StorageEngine => {
  const directory = path.join(antiCheatConfig.uploadRoot, folder);
  ensureDirectory(directory);

  return multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, directory);
    },
    filename: (_req, file, callback) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      callback(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
};

export const uploadRecording = multer({
  storage: createStorage('recordings'),
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith('video/')) {
      callback(null, true);
      return;
    }

    callback(new Error('Only video files allowed for recordings'));
  },
});

export const chunkUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) => {
      const sessionId =
        typeof req.params.sessionId === 'string' && req.params.sessionId.trim()
          ? req.params.sessionId.trim()
          : typeof req.body?.sessionId === 'string' && req.body.sessionId.trim()
            ? req.body.sessionId.trim()
            : 'unknown';
      const rawType = typeof req.params.type === 'string' ? req.params.type : req.body?.type;
      const normalizedType = typeof rawType === 'string' ? rawType.trim().toLowerCase() : '';
      const type = (recordingTypes as readonly string[]).includes(normalizedType)
        ? normalizedType
        : 'webcam';
      const directory = path.join(antiCheatConfig.chunkUploadRoot, sessionId, type);

      ensureDirectory(directory);
      callback(null, directory);
    },
    filename: (req, _file, callback) => {
      const chunkIndex =
        typeof req.params.chunkIndex === 'string'
          ? req.params.chunkIndex
          : req.body?.chunkIndex !== undefined
            ? String(req.body.chunkIndex)
            : '0';
      const timestamp = req.params.timestamp || req.body?.timestamp || Date.now();
      callback(null, `chunk-${String(chunkIndex).padStart(6, '0')}-${timestamp}.webm`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const validTypes = ['video/', 'audio/'];
    const isValid = validTypes.some((entry) => file.mimetype.startsWith(entry));

    if (isValid) {
      callback(null, true);
      return;
    }

    callback(new Error('Only video/audio files allowed for recordings'));
  },
});

export const calculateChecksum = (buffer: Buffer): string =>
  crypto.createHash('sha256').update(buffer).digest('hex');

export { ensureDirectory };
