import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  User,
  RefreshToken,
  Candidate,
  BusinessUser,
  EmployerProfile,
  CandidateProfile,
  EmployerPermission,
  EmailVerification,
} from '../models';
import bcrypt from 'bcrypt';
import jwtService from '../services/jwtService';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/authMiddleware';
import hashTokenDeterministic from '../services/hashTokenDeterministic';
import emailService from '../services/email.service';
import logger from '../config/logger';

/**
 * Register a new candidate
 */
export const registerCandidate = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const {
    email,
    password,
    firstName,
    lastName,
    mobileNumber,
    candidateType,
    primaryJobRole,
    yearsExperience,
    primarySkills,
    preferredWorkType,
    expectedSalaryMin,
    expectedSalaryMax,
    availableToJoin,
    acceptedTerms,
    acceptedPrivacyPolicy,
  } = req.body;

  if (!email || !password || !firstName || !lastName) {
    throw new AppError(
      'Email, password, first name, and last name are required',
      StatusCodes.BAD_REQUEST,
      'ERR_MISSING_FIELDS',
    );
  }

  const existingCandidate = await Candidate.findOne({ where: { email } });
  if (existingCandidate) {
    throw new AppError('Email already registered', StatusCodes.CONFLICT, 'ERR_EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  console.log('Registering candidate. Email:', email);
  const candidate = await Candidate.create({
    email,
    passwordHash, // Sequelize should map this to password_hash
    firstName,
    lastName,
    status: 'active',
  });

  // Create profile with all provided fields
  await CandidateProfile.create({
    userId: candidate.dataValues.id,
    mobileNumber,
    candidateType,
    primaryJobRole,
    yearsExperience,
    primarySkills,
    preferredWorkType,
    expectedSalaryMin,
    expectedSalaryMax,
    availableToJoin,
    acceptedTerms,
    acceptedPrivacyPolicy,
  });

  const accessToken = jwtService.signAccessToken({
    userId: candidate.dataValues.id,
    email: candidate.dataValues.email,
    admin: false,
    role: 'candidate',
    userType: 'candidate',
  });

  const { token: refreshToken, tokenId } = jwtService.signRefreshToken({
    userId: candidate.dataValues.id,
    email: candidate.dataValues.email,
    admin: false,
    role: 'candidate',
    userType: 'candidate',
  });

  const tokenHash = hashTokenDeterministic(refreshToken);
  await RefreshToken.create({
    userId: candidate.dataValues.id,
    tokenHash,
    tokenId,
    revoked: false,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Candidate registered successfully',
    accessToken,
    refreshToken,
    user: candidate.toJSON(),
  });
};

/**
 * Register a new employer
 */
export const registerEmployer = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { email, password, firstName, lastName, companyName, companyDetails } = req.body;
  const companyDocument = req.file?.path;

  if (!email || !password || !firstName || !lastName || !companyName || !companyDocument) {
    throw new AppError(
      'All fields including company document are required',
      StatusCodes.BAD_REQUEST,
      'ERR_MISSING_FIELDS',
    );
  }

  const existingUser = await BusinessUser.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already registered', StatusCodes.CONFLICT, 'ERR_EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const businessUser = await BusinessUser.create({
    email,
    passwordHash,
    firstName,
    lastName,
    role: 'employer',
    companyName,
    companyDetails,
    companyDocument,
    status: 'active',
  });

  // Create employer profile
  await EmployerProfile.create({
    userId: businessUser.dataValues.id,
    companyName,
  });

  // Create employer permissions (default: full access since you set canPostJob/canBrowseTalent to true)
  await EmployerPermission.create({
    employerId: businessUser.dataValues.id,
    // canPostJob: false,
    // canBrowseTalent: false,
    canPostJob: true,
    canBrowseTalent: true,
    canManageBench: true,
    canCreateBench: true,
    plan: 'free',
  });

  const accessToken = jwtService.signAccessToken({
    userId: businessUser.dataValues.id,
    email: businessUser.dataValues.email,
    admin: false,
    role: 'employer',
    userType: 'business',
  });

  const { token: refreshToken, tokenId } = jwtService.signRefreshToken({
    userId: businessUser.dataValues.id,
    email: businessUser.dataValues.email,
    admin: false,
    role: 'employer',
    userType: 'business',
  });

  const tokenHash = hashTokenDeterministic(refreshToken);
  await RefreshToken.create({
    userId: businessUser.dataValues.id,
    tokenHash,
    tokenId,
    revoked: false,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Employer registered successfully',
    accessToken,
    refreshToken,
    user: businessUser.toJSON(),
  });
};

/**
 * Register a new HR
 */
export const registerHR = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { email, password, firstName, lastName, companyName, companyDetails } = req.body;
  const companyDocument = req.file?.path;

  if (!email || !password || !firstName || !lastName || !companyName || !companyDocument) {
    throw new AppError(
      'All fields including company document are required',
      StatusCodes.BAD_REQUEST,
      'ERR_MISSING_FIELDS',
    );
  }

  const existingUser = await BusinessUser.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already registered', StatusCodes.CONFLICT, 'ERR_EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const businessUser = await BusinessUser.create({
    email,
    passwordHash,
    firstName,
    lastName,
    role: 'hr',
    companyName,
    companyDetails,
    companyDocument,
    status: 'active',
  });

  // Create employer profile for HR (same as employer registration)
  await EmployerProfile.create({
    userId: businessUser.dataValues.id,
    companyName,
  });

  // Create HR permissions (full access by default)
  await EmployerPermission.create({
    employerId: businessUser.dataValues.id,
    canPostJob: true,
    canBrowseTalent: true,
    // canManageBench: false,
    // canCreateBench: false,
    canManageBench: true,
    canCreateBench: true,
    plan: 'pro', // HR gets pro plan features
  });

  const accessToken = jwtService.signAccessToken({
    userId: businessUser.dataValues.id,
    email: businessUser.dataValues.email,
    admin: false,
    role: 'hr',
    userType: 'business',
  });

  const { token: refreshToken, tokenId } = jwtService.signRefreshToken({
    userId: businessUser.dataValues.id,
    email: businessUser.dataValues.email,
    admin: false,
    role: 'hr',
    userType: 'business',
  });

  const tokenHash = hashTokenDeterministic(refreshToken);
  await RefreshToken.create({
    userId: businessUser.dataValues.id,
    tokenHash,
    tokenId,
    revoked: false,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'HR registered successfully',
    accessToken,
    refreshToken,
    user: businessUser.toJSON(),
  });
};

/**
 * Login candidate
 */
export const loginCandidate = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(
      'Email and password are required',
      StatusCodes.BAD_REQUEST,
      'ERR_MISSING_CREDENTIALS',
    );
  }

  const candidate = await Candidate.findOne({ where: { email } });
  if (!candidate || !(await candidate.validatePassword(password))) {
    throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED, 'ERR_INVALID_CREDENTIALS');
  }

  const accessToken = jwtService.signAccessToken({
    userId: candidate.dataValues.id,
    email: candidate.dataValues.email,
    admin: false,
    role: 'candidate',
    userType: 'candidate',
  });

  const { token: refreshToken, tokenId } = jwtService.signRefreshToken({
    userId: candidate.dataValues.id,
    email: candidate.dataValues.email,
    admin: false,
    role: 'candidate',
    userType: 'candidate',
  });

  const tokenHash = hashTokenDeterministic(refreshToken);
  await RefreshToken.create({
    userId: candidate.dataValues.id,
    tokenHash,
    tokenId,
    revoked: false,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  res.status(StatusCodes.OK).json({
    success: true,
    accessToken,
    refreshToken,
    user: candidate.toJSON(),
  });
};

/**
 * Login Employer
 */
export const loginEmployer = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { email, password } = req.body;

  const user = await BusinessUser.findOne({
    where: { email, role: 'employer' },
    include: [
      {
        model: EmployerPermission,
        as: 'permissions',
      },
    ],
  });

  if (!user || !(await user.validatePassword(password))) {
    throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED, 'ERR_INVALID_CREDENTIALS');
  }

  const accessToken = jwtService.signAccessToken({
    userId: user.dataValues.id,
    email: user.dataValues.email,
    admin: user.dataValues.admin,
    role: user.dataValues.role,
    userType: 'business',
  });

  const { token: refreshToken, tokenId } = jwtService.signRefreshToken({
    userId: user.dataValues.id,
    email: user.dataValues.email,
    admin: user.dataValues.admin,
    role: user.dataValues.role,
    userType: 'business',
  });

  const tokenHash = hashTokenDeterministic(refreshToken);
  await RefreshToken.create({
    userId: user?.dataValues.id,
    tokenHash,
    tokenId,
    revoked: false,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  res.status(StatusCodes.OK).json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toJSON(),
    // permissions: (user as any).permissions || null,
  });
};

/**
 * Login HR
 */
export const loginHR = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  const { email, password } = req.body;

  const user = await BusinessUser.findOne({
    where: { email, role: 'hr' },
    include: [
      {
        model: EmployerPermission,
        as: 'permissions',
      },
    ],
  });

  if (!user || !(await user.validatePassword(password))) {
    throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED, 'ERR_INVALID_CREDENTIALS');
  }

  const accessToken = jwtService.signAccessToken({
    userId: user?.dataValues.id,
    email: user?.dataValues.email,
    admin: user?.dataValues.admin,
    role: user?.dataValues.role,
    userType: 'business',
  });

  const { token: refreshToken, tokenId } = jwtService.signRefreshToken({
    userId: user?.dataValues.id,
    email: user?.dataValues.email,
    admin: user?.dataValues.admin,
    role: user?.dataValues.role,
    userType: 'business',
  });

  const tokenHash = hashTokenDeterministic(refreshToken);
  await RefreshToken.create({
    userId: user?.dataValues.id,
    tokenHash,
    tokenId,
    revoked: false,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  res.status(StatusCodes.OK).json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toJSON(),
    // permissions: (user as any).permissions || null,
  });
};

/**
 * Refresh access token
 */
export const refresh = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  const { refreshToken, token } = req.body;
  const actualToken = refreshToken || token;

  if (!actualToken) {
    throw new AppError(
      'Refresh token required',
      StatusCodes.BAD_REQUEST,
      'ERR_REFRESH_TOKEN_REQUIRED',
    );
  }

  // Verify refresh token
  const decoded = jwtService.verifyRefreshToken(actualToken);

  // Check if token exists in database
  // const tokenHash = await jwtService.hashToken(actualToken);
  const tokenHash = hashTokenDeterministic(actualToken);

  const storedToken = await RefreshToken.findOne({
    where: {
      tokenHash,
      revoked: false,
    },
  });

  // console.log(storedToken)

  if (!storedToken || storedToken.dataValues.expiresAt < new Date()) {
    throw new AppError('Invalid refresh token', StatusCodes.UNAUTHORIZED, 'ERR_INVALID_TOKEN');
  }

  console.log(decoded, 'decoded');
  // Get user from database based on userType in token
  let user;
  if (decoded.userType === 'candidate') {
    user = await Candidate.findOne({
      where: { id: decoded.userId },
      attributes: { exclude: ['passwordHash'] },
    });
  } else if (decoded.userType === 'business') {
    user = await BusinessUser.findOne({
      where: { id: decoded.userId },
      attributes: { exclude: ['passwordHash'] },
    });
  } else {
    // Fallback for existing tokens or legacy User table
    user = await User.findOne({
      where: { id: decoded.userId },
      attributes: { exclude: ['passwordHash'] },
    });
  }

  console.log(user, 'user');
  if (!user) {
    throw new AppError('User not found or inactive', StatusCodes.UNAUTHORIZED, 'ERR_USER_INVALID');
  }

  // Generate new access token
  const userData = user.dataValues as any;
  const accessToken = jwtService.signAccessToken({
    userId: userData.id,
    role: decoded.userType === 'candidate' ? 'candidate' : userData.role,
    email: userData.email,
    admin: decoded.userType === 'candidate' ? false : !!userData.admin,
    userType: decoded.userType,
  });

  res.status(StatusCodes.OK).json({
    success: true,
    accessToken,
  });
};

/**
 * Logout
 */
export const logout = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  const { refreshToken, token } = req.body;
  const actualToken = refreshToken || token;
  const user = (req as AuthRequest).user;
  console.log('-------------------------');
  console.log(user, 'user');
  console.log('-------------------------');

  if (actualToken) {
    const tokenHash = hashTokenDeterministic(actualToken);

    await RefreshToken.update(
      { revoked: true },
      {
        where: {
          tokenHash,
          userId: user?.dataValues.id,
        },
      },
    );
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const checkEmail = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', StatusCodes.BAD_REQUEST, 'ERR_EMAIL_REQUIRED');
  }

  const [existingUser, existingCandidate] = await Promise.all([
    BusinessUser.findOne({ where: { email } }),
    Candidate.findOne({ where: { email } }),
  ]);

  if (existingUser || existingCandidate) {
    throw new AppError('Email already registered', StatusCodes.CONFLICT, 'ERR_EMAIL_EXISTS');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Email is available',
  });
};

/**
 * Send verification OTP to email
 */
export const sendVerificationOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', StatusCodes.BAD_REQUEST, 'ERR_EMAIL_REQUIRED');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database (overwrite any existing pending verification for this email)
    await EmailVerification.destroy({ where: { email, verified: false } });
    await EmailVerification.create({
      email,
      otp,
      expiresAt,
      verified: false,
    });

    // In development, log OTP to console
    logger.info(`Verification OTP for ${email}: ${otp}`);

    // Send email
    await emailService.sendVerificationOtpEmail(email, otp);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Verification OTP sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP for an email
 */
export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new AppError(
        'Email and OTP are required',
        StatusCodes.BAD_REQUEST,
        'ERR_MISSING_FIELDS',
      );
    }

    const verification = await EmailVerification.findOne({
      where: { email, otp, verified: false },
    });

    if (!verification) {
      throw new AppError('Invalid OTP', StatusCodes.BAD_REQUEST, 'ERR_INVALID_OTP');
    }

    if (verification.isExpired()) {
      throw new AppError('OTP has expired', StatusCodes.BAD_REQUEST, 'ERR_OTP_EXPIRED');
    }

    // Mark as verified
    verification.verified = true;
    await verification.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
};
