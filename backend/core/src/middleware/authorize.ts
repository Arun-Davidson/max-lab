import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: any;
  employerPermissions?: any;
}

/**
 * Simple permission check - all permissions are DB-driven
 * Checks: 'browse_talent', 'post_job', 'manage_bench', 'create_bench'
 */
export const authorize = (
  requiredPermission: 'browse_talent' | 'post_job' | 'manage_bench' | 'create_bench',
) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    const user = authReq.user;

    if (!user) {
      return next(
        new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'ERR_UNAUTHORIZED'),
      );
    }

    const role = user.dataValues?.role || user.role;

    // All permissions are DB-driven for both HR and Employer
    if (role === 'hr' || role === 'employer') {
      const perms = user.permissions;

      console.log('_____________________');
      console.log(perms, 'perm');
      console.log('_____________________');

      if (!perms) {
        return next(); // Default for employers/HR who haven't had permissions synced yet or fallback
      }

      // Direct DB flag checks for all permissions
      const hasPermission =
        (requiredPermission === 'browse_talent' && perms?.dataValues?.canBrowseTalent) ||
        (requiredPermission === 'post_job' && perms?.dataValues?.canPostJob) ||
        (requiredPermission === 'manage_bench' && perms?.dataValues?.canManageBench) ||
        (requiredPermission === 'create_bench' && perms?.dataValues?.canCreateBench);

      if (hasPermission) {
        return next();
      }

      return next(
        new AppError(
          'You do not have permission to access this resource. Please upgrade your account or contact administrator.',
          StatusCodes.FORBIDDEN,
          'ERR_PERMISSION_DENIED',
        ),
      );
    }

    return next(new AppError('Invalid role', StatusCodes.FORBIDDEN, 'ERR_PERMISSION_DENIED'));
  };
};
