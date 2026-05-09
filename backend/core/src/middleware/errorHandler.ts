import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import logger from '../config/logger';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    code?: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || `ERR_${statusCode}`;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;
  const code = isAppError ? err.code : 'ERR_INTERNAL_SERVER_ERROR';

  // Log error
  const logData = {
    error: {
      message: err.message,
      code,
      stack: err.stack,
    },
    request: {
      method: req.method,
      url: req.originalUrl || req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
    },
  };

  if (statusCode >= 500) {
    logger.error('Server error occurred:', logData);
  } else {
    logger.warn('Client error occurred:', logData);
  }

  // Send error response
  const response: any = {
    success: false,
    code,
    message: err.message || 'Internal server error',
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
