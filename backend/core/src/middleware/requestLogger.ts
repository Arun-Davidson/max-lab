import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface RequestWithId extends Request {
  id: string;
}

/**
 * Middleware to add request ID and log incoming requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // Add request ID to request object
  (req as RequestWithId).id = requestId;

  // Add request ID to response headers
  res.setHeader('X-Request-Id', requestId);

  // Log request start
  const start = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent') || 'unknown',
      ip: req.ip || req.connection.remoteAddress,
    };

    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.http('Request completed', logData);
    }
  });

  next();
};
