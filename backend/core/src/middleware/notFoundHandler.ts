import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    code: 'ERR_NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl || req.url}`,
  });
};
