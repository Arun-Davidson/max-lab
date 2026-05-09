import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { AppError } from './errorHandler';
import { StatusCodes } from 'http-status-codes';

/**
 * Check if user has a specific permission
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthRequest).user;

    if (!user) {
      return next(
        new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'ERR_AUTH_REQUIRED'),
      );
    }

    // Admin has all permissions
    if (user.admin) {
      return next();
    }

    // TODO: Check user's role permissions
    // For now, deny access if not admin
    return next(
      new AppError(
        `Permission denied: ${permission}`,
        StatusCodes.FORBIDDEN,
        'ERR_PERMISSION_DENIED',
      ),
    );
  };
};

/**
 * Check if business user has job post permission
 */
export const requireJobPostPermission = () => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    const user = authReq.user;

    if (!user) {
      return next(
        new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'ERR_AUTH_REQUIRED'),
      );
    }

    // Check if business user has the flag in EmployerPermission
    if (authReq.userType === 'business' && (user.permissions?.canPostJob || user.admin)) {
      return next();
    }

    return next(
      new AppError(
        'You do not have permission to post jobs',
        StatusCodes.FORBIDDEN,
        'ERR_PERMISSION_DENIED',
      ),
    );
  };
};

/**
 * Check if user can manage bench resources
 * - Employers: Always allowed (basic feature)
 * - HR: Not allowed (bench resources are employer-specific)
 */
export const requireBenchResourcePermission = () => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    const user = authReq.user;

    if (!user) {
      return next(
        new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'ERR_AUTH_REQUIRED'),
      );
    }

    // Only employers can manage bench resources
    if (
      authReq.userType === 'employer' ||
      user.dataValues?.role === 'employer' ||
      user.role === 'employer'
    ) {
      return next();
    }

    return next(
      new AppError(
        'Only employers can manage bench resources',
        StatusCodes.FORBIDDEN,
        'ERR_EMPLOYER_ONLY',
      ),
    );
  };
};

/**
 * Check if user can browse talent (candidates + bench resources)
 * - HR: Requires canPostJob permission
 * - Employer: Requires canPostJob permission
 */
export const requireTalentBrowsePermission = () => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    const user = authReq.user;

    if (!user) {
      return next(
        new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'ERR_AUTH_REQUIRED'),
      );
    }

    // Both HR and Employer need canPostJob to browse talent OR canBrowseTalent
    if (
      (authReq.userType === 'business' || authReq.userType === 'employer') &&
      (user.permissions?.canPostJob || user.permissions?.canBrowseTalent || user.admin)
    ) {
      return next();
    }

    return next(
      new AppError(
        'You do not have permission to browse talent. Please upgrade your account.',
        StatusCodes.FORBIDDEN,
        'ERR_PERMISSION_DENIED',
      ),
    );
  };
};

/**
 * Check if user is project member with required role
 */
export const requireProjectRole = (roles: string[]) => {
  console.log('requireProjectRole', roles);
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthRequest).user;
    const projectId = req.params.projectId || req.body.projectId;

    if (!user) {
      return next(
        new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'ERR_AUTH_REQUIRED'),
      );
    }

    // Admin bypasses project role checks
    if (user.admin) {
      return next();
    }

    if (!projectId) {
      return next(
        new AppError('Project ID required', StatusCodes.BAD_REQUEST, 'ERR_PROJECT_ID_REQUIRED'),
      );
    }

    next();
  };
};

/**
 * Check if user can manage users (admin only)
 */
export const requireUserManagement = requirePermission('user:manage');

/**
 * Check if user can assign to project (admin or project manager)
 */
export const requireProjectManagement = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthRequest).user;

  if (!user) {
    return next(
      new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'ERR_AUTH_REQUIRED'),
    );
  }

  // Admin can manage all projects
  if (user.admin) {
    return next();
  }

  // Check if user is PM for this project
  return requireProjectRole(['Manager', 'Admin'])(req, res, next);
};
