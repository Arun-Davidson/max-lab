import { StatusCodes } from 'http-status-codes';
import { validate as validateUuid } from 'uuid';
import { AppError } from '../middleware/errorHandler';

export const recordingTypes = ['webcam', 'screen', 'audio'] as const;

export type RecordingType = (typeof recordingTypes)[number];

export interface IntegrityReport {
  missingChunks: number[];
  duplicateChunks: number[];
  isValid: boolean;
}

export const normalizeRecordingType = (rawType: unknown): RecordingType => {
  const normalized = typeof rawType === 'string' ? rawType.trim().toLowerCase() : '';

  if (!normalized) {
    return 'webcam';
  }

  if ((recordingTypes as readonly string[]).includes(normalized)) {
    return normalized as RecordingType;
  }

  throw new AppError('Invalid recording type', StatusCodes.BAD_REQUEST);
};

export const parseRequiredString = (value: unknown, fieldName: string): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (!normalized) {
    throw new AppError(`${fieldName} is required`, StatusCodes.BAD_REQUEST);
  }

  return normalized;
};

export const parseOptionalString = (value: unknown): string | null => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
};

export const parseNonNegativeInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError(`${fieldName} must be a non-negative integer`, StatusCodes.BAD_REQUEST);
  }

  return parsed;
};

export const parseOptionalInteger = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) ? parsed : null;
};

export const parseOptionalDate = (value: unknown): Date | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const sanitizeViolationType = (rawType: unknown): string => {
  const trimmedType = typeof rawType === 'string' ? rawType.trim() : '';

  if (!trimmedType) {
    return 'Violation detected';
  }

  if (
    /https?:\/\/\S+/i.test(trimmedType) ||
    /\b(chrome|edge|firefox|safari|opera|brave)\b/i.test(trimmedType) ||
    /\b(other|another)\s+browser\b/i.test(trimmedType)
  ) {
    return 'Opened another browser';
  }

  return trimmedType.replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim() || 'Violation detected';
};

export const assertUuid = (value: string, fieldName: string): void => {
  if (!validateUuid(value)) {
    throw new AppError(`${fieldName} must be a valid UUID`, StatusCodes.BAD_REQUEST);
  }
};
