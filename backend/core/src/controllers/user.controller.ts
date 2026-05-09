import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { User, Candidate, BusinessUser, RefreshToken } from '../models';
import bcrypt from 'bcrypt';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/authMiddleware';
import emailService from '../services/email.service';
import logger from '../config/logger';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';

/**
 * Get current user profile
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  console.log('/me');

  const userDetails = (req as AuthRequest).user;

  // console.log('userDetails', userDetails);
  // const where: any = {};

  // where[Op.or] = [

  //     { id: userDetails?.id },
  //   ];

  //  const me = await User.findAndCountAll({
  //   where,
  //   attributes: { exclude: ['passwordHash'] },
  //   order: [['createdAt', 'DESC']],
  // });

  res.status(StatusCodes.OK).json({
    success: true,
    user: userDetails?.dataValues,
  });
};

/**
 * List all users (admin only)
 */
export const listUsers = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { page = 1, limit = 20, status, search } = req.query;
  logger.error('status', status);
  const where: any = {};

  console.log(status);
  // if (status) {
  //   where.status = status;
  // }

  if (search) {
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const offset = (Number(page) - 1) * Number(limit);

  const { rows: users, count } = await User.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    attributes: { exclude: ['passwordHash'] },
    order: [['createdAt', 'DESC']],
  });

  res.status(StatusCodes.OK).json({
    success: true,
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      pages: Math.ceil(count / Number(limit)),
    },
  });
};

/**
 * Create new user (admin only)
 */
export const createUser = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { email, password, firstName, lastName, admin = false, language, timezone } = req.body;

  // Validate required fields
  if (!email || !password || !firstName || !lastName) {
    throw new AppError(
      'Email, password, first name, and last name are required',
      StatusCodes.BAD_REQUEST,
      'ERR_MISSING_FIELDS',
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });

  if (existingUser) {
    throw new AppError(
      'User with this email already exists',
      StatusCodes.CONFLICT,
      'ERR_USER_EXISTS',
    );
  }

  // Create user
  const user = await User.create({
    email,
    passwordHash: password, // Will be hashed by model hook
    firstName,
    lastName,
    admin,
    status: 'active',
    language: language || 'en',
    timezone: timezone || 'UTC',
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    user: {
      id: user.dataValues.id,
      uuid: user.dataValues.uuid,
      email: user.dataValues.email,
      firstName: user.dataValues.firstName,
      lastName: user.dataValues.lastName,
      admin: user.dataValues.admin,
      status: user.dataValues.status,
    },
  });
};

/**
 * Get user by ID
 */
export const getUserById = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  const user = await User.findByPk(id, {
    attributes: { exclude: ['passwordHash'] },
  });

  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'ERR_USER_NOT_FOUND');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    user,
  });
};

/**
 * Update user
 */
export const updateUser = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const { firstName, lastName, language, timezone, status, admin } = req.body;
  const currentUser = (req as AuthRequest).user;

  const user = await User.findByPk(id);

  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'ERR_USER_NOT_FOUND');
  }

  // Only admin can change admin status and user status
  if ((admin !== undefined || status !== undefined) && !currentUser!.admin) {
    throw new AppError(
      'Only admins can change admin status or user status',
      StatusCodes.FORBIDDEN,
      'ERR_ADMIN_REQUIRED',
    );
  }

  // Update user
  if (firstName) user.dataValues.firstName = firstName;
  if (lastName) user.dataValues.lastName = lastName;
  if (language) user.dataValues.language = language;
  if (timezone) user.dataValues.timezone = timezone;
  if (status) user.dataValues.status = status;
  if (admin !== undefined) user.dataValues.admin = admin;

  await user.save();

  res.status(StatusCodes.OK).json({
    success: true,
    user: {
      id: user.dataValues.id,
      uuid: user.dataValues.uuid,
      email: user.dataValues.email,
      firstName: user.dataValues.firstName,
      lastName: user.dataValues.lastName,
      admin: user.dataValues.admin,
      status: user.dataValues.status,
    },
  });
};

/**
 * Delete user (admin only)
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  const user = await User.findByPk(id);

  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'ERR_USER_NOT_FOUND');
  }

  await user.destroy();

  res.status(StatusCodes.NO_CONTENT).json({ success: true });
};

/**
 * Get user avatar image
 */
export const getAvatarImage = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  let user: any = await User.findByPk(id);

  if (!user) {
    user = await Candidate.findByPk(id);
  }

  // if (!user) {
  //   user = await BusinessUser.findByPk(id);
  // }

  if (!user || !user.avatar) {
    throw new AppError('Avatar not found', StatusCodes.NOT_FOUND, 'ERR_AVATAR_NOT_FOUND');
  }

  // Convert relative path to absolute path
  const filePath = path.isAbsolute(user.avatar) ? user.avatar : path.resolve(user.avatar);

  res.sendFile(filePath, (err) => {
    if (err) {
      logger.error('Error sending avatar file:', err);
      if (!res.headersSent) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Avatar file not found on server',
          code: 'ERR_FILE_NOT_FOUND',
        });
      }
    }
  });
};

/**
 * Delete user avatar image
 */
export const deleteAvatarImage = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const currentUser = (req as AuthRequest).user;
  const currentUserType = (req as AuthRequest).userType;

  let user: any = await User.findByPk(id);
  let userType: string = 'user';

  if (!user) {
    user = await Candidate.findByPk(id);
    userType = 'candidate';
  }

  // if (!user) {
  //   user = await BusinessUser.findByPk(id);
  //   userType = 'business';
  // }

  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'ERR_USER_NOT_FOUND');
  }

  // Only the user themselves or an admin can delete the avatar
  // For hybrid users, we must check both ID and type
  const isOwner =
    currentUser.id === Number(id) &&
    (currentUserType === userType || (currentUserType === 'employer' && userType === 'business'));
  const isAdmin = currentUser.admin || currentUser.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError(
      'You are not authorized to delete this avatar',
      StatusCodes.FORBIDDEN,
      'ERR_UNAUTHORIZED',
    );
  }

  if (user.avatar) {
    try {
      const filePath = path.isAbsolute(user.avatar) ? user.avatar : path.resolve(user.avatar);
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn(`Failed to delete avatar file: ${user.avatar}`, error);
      // Continue even if file is missing, to clear the DB field
    }

    user.avatar = null;
    await user.save();
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Avatar deleted successfully',
  });
};

/**
 * @swagger
 * /api/v1/users/{id}/avatar/business:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get Employer/HR profile image
 *     description: Retrieve the avatar image for a BusinessUser (Employer or HR).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: BusinessUser ID
 *     responses:
 *       200:
 *         description: Avatar image file
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Avatar not found
 */
export const getAvatarImageEmployerHr = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { id } = req.params;

  const user: any = await BusinessUser.findByPk(id);

  if (!user || !user.avatar) {
    throw new AppError('Avatar not found', StatusCodes.NOT_FOUND, 'ERR_AVATAR_NOT_FOUND');
  }

  // Convert relative path to absolute path
  const filePath = path.isAbsolute(user.avatar) ? user.avatar : path.resolve(user.avatar);

  res.sendFile(filePath, (err) => {
    if (err) {
      logger.error('Error sending avatar file:', err);
      if (!res.headersSent) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Avatar file not found on server',
          code: 'ERR_FILE_NOT_FOUND',
        });
      }
    }
  });
};

/**
 * Delete user avatar image
 */
/**
 * @swagger
 * /api/v1/users/{id}/avatar/business:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete Employer/HR profile image
 *     description: Delete the avatar image for a BusinessUser (Employer or HR). Only accessible to the owner or admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: BusinessUser ID
 *     responses:
 *       200:
 *         description: Avatar deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Unauthorized to delete this avatar
 *       404:
 *         description: User not found
 */
export const deleteAvatarImageEmployerHr = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { id } = req.params;
  const currentUser = (req as AuthRequest).user;
  const currentUserType = (req as AuthRequest).userType;

  const user: any = await BusinessUser.findByPk(id);

  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'ERR_USER_NOT_FOUND');
  }

  // Only the user themselves or an admin can delete the avatar
  const isOwner =
    currentUser.id === Number(id) &&
    (currentUserType === 'business' || currentUserType === 'employer' || currentUserType === 'hr');
  const isAdmin = currentUser.admin || currentUser.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError(
      'You are not authorized to delete this avatar',
      StatusCodes.FORBIDDEN,
      'ERR_UNAUTHORIZED',
    );
  }

  if (user.avatar) {
    try {
      const filePath = path.isAbsolute(user.avatar) ? user.avatar : path.resolve(user.avatar);
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn(`Failed to delete avatar file: ${user.avatar}`, error);
      // Continue even if file is missing, to clear the DB field
    }

    user.avatar = null;
    await user.save();
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Avatar deleted successfully',
  });
};

/**
 * Change current user password
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const currentUser = (req as AuthRequest).user;
    const userType = (req as AuthRequest).userType;

    if (!currentPassword || !newPassword) {
      throw new AppError(
        'Current and new password are required',
        StatusCodes.BAD_REQUEST,
        'ERR_MISSING_FIELDS',
      );
    }

    // Find the user with passwordHash
    let user: any;
    if (userType === 'candidate') {
      user = await Candidate.findByPk(currentUser.id);
    } else if (userType === 'business' || userType === 'employer' || userType === 'hr') {
      user = await BusinessUser.findByPk(currentUser.id);
    } else {
      user = await User.findByPk(currentUser.id);
    }

    if (!user) {
      throw new AppError('User not found', StatusCodes.NOT_FOUND, 'ERR_USER_NOT_FOUND');
    }

    // Verify current password
    const isMatch = await user.validatePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Incorrect current password', StatusCodes.UNAUTHORIZED, 'ERR_INVALID_PASSWORD');
    }

    // Update with new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();

    // Send security notification email
    await emailService.sendPasswordChangedEmail(user.email, user.firstName);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete current user account (Danger Zone)
 */
export const deleteMyAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { password } = req.body;
    const currentUser = (req as AuthRequest).user;
    const userType = (req as AuthRequest).userType;

    if (!password) {
      throw new AppError('Password is required for confirmation', StatusCodes.BAD_REQUEST, 'ERR_PASSWORD_REQUIRED');
    }

    // Find the user with passwordHash
    let user: any;
    if (userType === 'candidate') {
      user = await Candidate.findByPk(currentUser.id);
    } else if (userType === 'business' || userType === 'employer' || userType === 'hr') {
      user = await BusinessUser.findByPk(currentUser.id);
    } else {
      user = await User.findByPk(currentUser.id);
    }

    if (!user) {
      throw new AppError('User not found', StatusCodes.NOT_FOUND, 'ERR_USER_NOT_FOUND');
    }

    // Verify password before deletion
    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      throw new AppError('Incorrect password', StatusCodes.UNAUTHORIZED, 'ERR_INVALID_PASSWORD');
    }

    // Revoke all refresh tokens
    await RefreshToken.destroy({
      where: { userId: user.id },
    });

    // Capture email and name before deletion
    const { email, firstName } = user;

    // Delete user (associations should be deleted if cascade is handled)
    await user.destroy();

    // Send final notification email
    await emailService.sendAccountDeletedEmail(email, firstName);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
