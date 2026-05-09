import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwtService from '../services/jwtService';
import { User, Candidate, BusinessUser } from '../models';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: any; // Can be User, Candidate, or BusinessUser
  userType?: 'employer' | 'candidate' | 'business' | 'hr' | undefined;
}

/**
 * Middleware to verify JWT access token and attach user to request
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', StatusCodes.UNAUTHORIZED, 'ERR_NO_TOKEN');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwtService.verifyAccessToken(token);

    console.log('________________________');

    console.log(decoded);

    console.log('________________________');

    // Fetch user from database based on userType in token
    let user;
    if (decoded.userType === 'candidate') {
      user = await Candidate.findOne({
        where: { id: decoded.userId },
        attributes: { exclude: ['passwordHash'] },
      });
    } else if (decoded.userType === 'business' || decoded.userType === 'employer') {
      user = await BusinessUser.findOne({
        where: { id: decoded.userId },
        include: ['employerProfile', 'permissions'],
        attributes: { exclude: ['passwordHash'] },
      });
    } else {
      // Fallback for existing tokens or legacy User table
      user = await User.findOne({
        where: { id: decoded.userId },
        include: ['candidateProfile', 'employerProfile'],
        attributes: { exclude: ['passwordHash'] },
      });
    }

    console.log('_____________________');
    console.log(user, 'user');
    console.log('_____________________');

    if (!user) {
      throw new AppError('User not found', StatusCodes.UNAUTHORIZED, 'ERR_USER_NOT_FOUND');
    }

    // Attach user to request
    (req as AuthRequest).user = user;
    (req as AuthRequest).userType = decoded.userType;

    // if (user.status !== 'active') {
    //   throw new AppError(
    //     'Account is not active',
    //     StatusCodes.FORBIDDEN,
    //     'ERR_ACCOUNT_INACTIVE',
    //   );
    // }

    // Attach user to request
    (req as AuthRequest).user = user;

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    if (error instanceof AppError) {
      next(error);
    } else if (error instanceof Error) {
      next(new AppError(error.message, StatusCodes.UNAUTHORIZED, 'ERR_AUTH_FAILED'));
    } else {
      next(new AppError('Authentication failed', StatusCodes.UNAUTHORIZED, 'ERR_AUTH_FAILED'));
    }
  }
};

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const user = (req as AuthRequest).user;

  if (!user) {
    return next(
      new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'ERR_AUTH_REQUIRED'),
    );
  }

  // if (!user.admin) {
  //   return next(
  //     new AppError('Admin access required', StatusCodes.FORBIDDEN, 'ERR_ADMIN_REQUIRED'),
  //   );
  // }

  next();
};

/**
 * Optional auth middleware - does not fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwtService.verifyAccessToken(token);

    // Fetch user from database based on userType in token
    let user;
    if (decoded.userType === 'candidate') {
      user = await Candidate.findOne({
        where: { id: decoded.userId },
        attributes: { exclude: ['passwordHash'] },
      });
    } else if (decoded.userType === 'business') {
      user = await BusinessUser.findOne({
        where: { id: decoded.userId },
        include: ['permissions'],
        attributes: { exclude: ['passwordHash'] },
      });
    } else {
      // Fallback for existing tokens or legacy User table
      user = await User.findOne({
        where: { id: decoded.userId },
        include: ['candidateProfile', 'employerProfile'],
        attributes: { exclude: ['passwordHash'] },
      });
    }

    if (user) {
      const userData = user.dataValues as any;
      const status = userData.status || (user as any).status;

      if (status === 'active') {
        (req as AuthRequest).user = user;
        (req as AuthRequest).userType = decoded.userType;
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

/**
 * Middleware to require candidate role
 */
export const requireCandidate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const user = (req as AuthRequest).user;
  console.log(user);

  if (!user) {
    return next(
      new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'ERR_AUTH_REQUIRED'),
    );
  }

  if (user.dataValues.role !== 'candidate') {
    return next(
      new AppError(
        'This endpoint is only accessible to candidates',
        StatusCodes.FORBIDDEN,
        'ERR_CANDIDATE_REQUIRED',
      ),
    );
  }

  next();
};

/**
 * Middleware to require employer role
 */
export const requireEmployer = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const user = (req as AuthRequest).user;

  if (!user) {
    return next(
      new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'ERR_AUTH_REQUIRED'),
    );
  }

  const role = user.dataValues?.role || (user as any)?.role;
  if (role !== 'employer' && role !== 'hr') {
    return next(
      new AppError(
        'This endpoint is only accessible to employers and HR',
        StatusCodes.FORBIDDEN,
        'ERR_EMPLOYER_REQUIRED',
      ),
    );
  }

  next();
};

// Alias for consistency with other middleware
export const authenticateToken = authMiddleware;
