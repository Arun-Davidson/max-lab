import { Request, Response, NextFunction } from 'express';
import { EmployerPermission } from '../models';

export interface AuthRequest extends Request {
  user?: any;
  userType?: string;
  employerPermissions?: any;
}

/**
 * Middleware to load employer permissions from database
 * Only loads for users with 'employer' role
 * HR users bypass this completely (permissions are role-based)
 */
export const loadEmployerPermissions = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authReq = req as AuthRequest;
  const user = authReq.user;

  if (!user) {
    return next();
  }

  const role = user.dataValues?.role || user.role;

  // Load permissions for both HR and Employer (DB-driven permissions)
  if (role === 'hr' || role === 'employer') {
    try {
      const perms = await EmployerPermission.findOne({
        where: { employerId: user.dataValues?.id || user.id },
      });

      console.log(perms, 'perms');

      authReq.employerPermissions = perms;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
};
