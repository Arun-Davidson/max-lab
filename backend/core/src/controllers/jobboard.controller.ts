import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthRequest } from '../middleware/authMiddleware';
import * as jobboardService from '../services/jobboard.service';
import jwtService from '../services/jwtService';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * @swagger
 * /api/v1/jobboard/register/candidate:
 *   post:
 *     tags:
 *       - Job Board - Authentication
 *     summary: Register a new candidate
 *     description: Create a new candidate account with profile and skills
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: candidate@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 pattern: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$
 *                 example: Test1234!
 *                 description: Must contain at least one uppercase, one lowercase, and one number
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               location:
 *                 type: string
 *                 example: San Francisco, CA
 *               candidateType:
 *                 type: string
 *                 enum: ['Full-Time Job Seeker', 'Contract / Freelance', 'Hybrid Professional']
 *                 default: 'Full-Time Job Seeker'
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["JavaScript", "React", "Node.js"]
 *               bio:
 *                 type: string
 *                 example: Experienced full-stack developer
 *               yearsExperience:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 70
 *                 example: 5
 *               availabeIn:
 *                 type: string
 *                 enum: ['Immediate', '15 Days', '30 Days']
 *                 default: 'Immediate'
 *               englishProficiency:
 *                 type: string
 *                 enum: ['Basic', 'Professional', 'Fluent', 'Native']
 *                 default: 'Basic'
 *               headline:
 *                 type: string
 *                 example: "Senior Software Engineer"
 *               resourceType:
 *                 type: string
 *                 example: "BENCH RESOURCE"
 *               hourlyRateMin:
 *                 type: integer
 *                 example: 30
 *               hourlyRateMax:
 *                 type: integer
 *                 example: 50
 *     responses:
 *       201:
 *         description: Candidate registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Candidate registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         email:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         role:
 *                           type: string
 *                           example: candidate
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                     profile:
 *                       type: object
 *                       properties:
 *                         id: { type: integer }
 *                         location: { type: string }
 *                         candidateType: { type: string }
 *                         bio: { type: string }
 *                         yearsExperience: { type: integer }
 *                         hourlyRateMin: { type: integer }
 *                         hourlyRateMax: { type: integer }
 *                         availabeIn: { type: string }
 *                         englishProficiency: { type: string }
 *                         headline: { type: string }
 *                         resourceType: { type: string }
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
export const registerCandidate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user, candidateProfile } = await jobboardService.registerCandidate(req.body);

    // Generate JWT tokens
    const accessToken = jwtService.signAccessToken({
      userId: user.dataValues.id,
      email: user.dataValues.email,
      admin: user.dataValues.admin,
      role: user.dataValues.role,
      userType: 'candidate',
    });
    const { token: refreshToken } = jwtService.signRefreshToken({
      userId: user.dataValues.id,
      email: user.dataValues.email,
      admin: user.dataValues.admin,
      role: user.dataValues.role,
      userType: 'candidate',
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Candidate registered successfully',
      data: {
        user: {
          id: user.dataValues.id,
          uuid: user.dataValues.uuid,
          email: user.dataValues.email,
          firstName: user.dataValues.firstName,
          lastName: user.dataValues.lastName,
          role: user.dataValues.role,
        },
        profile: candidateProfile,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/jobboard/register/employer:
 *   post:
 *     tags:
 *       - Job Board - Authentication
 *     summary: Register a new employer
 *     description: Create a new employer account with company profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - companyName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: employer@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Test1234!
 *               firstName:
 *                 type: string
 *                 example: Jane
 *               lastName:
 *                 type: string
 *                 example: Smith
 *               companyName:
 *                 type: string
 *                 example: Tech Corp
 *               industry:
 *                 type: string
 *                 example: Technology
 *               location:
 *                 type: string
 *                 example: New York, NY
 *               companySize:
 *                 type: string
 *                 enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]
 *                 example: 51-200
 *               website:
 *                 type: string
 *                 format: uri
 *                 example: https://techcorp.com
 *               description:
 *                 type: string
 *                 example: Leading tech company
 *     responses:
 *       201:
 *         description: Employer registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
export const registerEmployer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user, employerProfile } = await jobboardService.registerEmployer(req.body);

    // Generate JWT tokens
    const accessToken = jwtService.signAccessToken({
      userId: user.dataValues.id,
      email: user.dataValues.email,
      admin: user.dataValues.admin,
      role: user.dataValues.role,
      userType: 'employer',
    });
    const { token: refreshToken } = jwtService.signRefreshToken({
      userId: user.dataValues.id,
      email: user.dataValues.email,
      admin: user.dataValues.admin,
      role: user.dataValues.role,
      userType: 'employer',
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Employer registered successfully',
      data: {
        user: {
          id: user.dataValues.id,
          uuid: user.dataValues.uuid,
          email: user.dataValues.email,
          firstName: user.dataValues.firstName,
          lastName: user.dataValues.lastName,
          role: user.dataValues.role,
        },
        profile: employerProfile,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/jobboard/profile:
 *   get:
 *     tags:
 *       - Job Board - Profile
 *     summary: Get current user's profile
 *     description: Retrieve complete profile based on user role (candidate or employer)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const profile = await jobboardService.getUserProfile(req.user.dataValues.id, req.userType);

    res.status(StatusCodes.OK).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfileById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    let updatedProfile;
    if (req.user.dataValues.role === 'candidate') {
      updatedProfile = await jobboardService.getCandidateProfileById(req.user.dataValues.id);
    } else {
      throw new AppError('Invalid user role', StatusCodes.BAD_REQUEST, 'ERR_INVALID_ROLE');
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/jobboard/profile:
 *   put:
 *     tags:
 *       - Job Board - Profile
 *     summary: Update current user's profile
 *     description: Update profile fields based on user role
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 description: Candidate profile update
 *                 properties:
 *                   location:
 *                     type: string
 *                   candidateType:
 *                     type: string
 *                     enum: ['Full-Time Job Seeker', 'Contract / Freelance', 'Hybrid Professional']
 *                   bio:
 *                     type: string
 *                   yearsExperience:
 *                     type: integer
 *                   skills:
 *                     type: array
 *                     items:
 *                       type: string
 *                   availabeIn:
 *                     type: string
 *                     enum: ['Immediate', '15 Days', '30 Days']
 *                   englishProficiency:
 *                     type: string
 *                     enum: ['Basic', 'Professional', 'Fluent', 'Native']
 *                   headline:
 *                     type: string
 *                   resourceType:
 *                     type: string
 *                   hourlyRateMin:
 *                     type: integer
 *                   hourlyRateMax:
 *                     type: integer
 *                   workExperiences:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         companyName: { type: string }
 *                         role: { type: string }
 *                         employmentType: { type: string, enum: ['Full-time', 'Part-time', 'Contract', 'Freelance'] }
 *                         startDate: { type: string, format: date }
 *                         endDate: { type: string, format: date, nullable: true }
 *                         description: { type: string }
 *                         location: { type: string }
 *                   projects:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         title: { type: string }
 *                         description: { type: string }
 *                         techStack: { type: array, items: { type: string } }
 *                         projectUrl: { type: string, format: uri }
 *                         isFeatured: { type: boolean }
 *                   certifications:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         name: { type: string }
 *                         issuedBy: { type: string }
 *                         issueDate: { type: string, format: date }
 *                         expiryDate: { type: string, format: date }
 *                         credentialUrl: { type: string, format: uri }
 *               - type: object
 *                 description: Employer profile update
 *                 properties:
 *                   companyName:
 *                     type: string
 *                   industry:
 *                     type: string
 *                   location:
 *                     type: string
 *                   companySize:
 *                     type: string
 *                   website:
 *                     type: string
 *                   description:
 *                     type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    let updatedProfile;
    if (req.user.dataValues.role === 'candidate') {
      updatedProfile = await jobboardService.updateCandidateProfile(
        req.user.dataValues.id,
        req.body,
      );
    } else if (req.user.dataValues.role === 'employer' || req.user.dataValues.role === 'hr') {
      updatedProfile = await jobboardService.updateEmployerProfile(
        req.user.dataValues.id,
        req.body,
      );
    } else {
      throw new AppError('Invalid user role', StatusCodes.BAD_REQUEST, 'ERR_INVALID_ROLE');
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/jobboard/profile/resume:
 *   post:
 *     tags:
 *       - Job Board - Resume
 *     summary: Upload resume
 *     description: Upload a resume file (PDF or DOCX, max 5MB). Candidate only.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - resume
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: Resume file (PDF or DOCX, max 5MB)
 *     responses:
 *       200:
 *         description: Resume uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     originalName:
 *                       type: string
 *                     fileSize:
 *                       type: integer
 *                     mimeType:
 *                       type: string
 *                     uploadedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: No file uploaded or invalid file type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Candidate role required
 */
export const uploadResume = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    console.log(req.user, 'User');
    if (!req.file) {
      throw new AppError('No file uploaded', StatusCodes.BAD_REQUEST, 'ERR_NO_FILE');
    }

    const resume = await jobboardService.uploadResume(req.user.dataValues.id, req.file);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        id: resume.dataValues.id,
        originalName: resume.dataValues.originalName,
        fileSize: resume.dataValues.fileSize,
        mimeType: resume.dataValues.mimeType,
        uploadedAt: resume.dataValues.uploadedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/jobboard/profile/resume/{id}:
 *   get:
 *     tags:
 *       - Job Board - Resume
 *     summary: Download resume
 *     description: Download resume file by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Resume ID
 *     responses:
 *       200:
 *         description: Resume file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/msword:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Resume not found
 *       401:
 *         description: Unauthorized
 */
export const getResume = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const resumeId = parseInt(req.params.id, 10);
    const resume = await jobboardService.getResume(resumeId, req.user.dataValues.id);

    // Set headers for file download
    res.setHeader('Content-Type', resume.dataValues.mimeType);

    // Support inline viewing if requested (useful for PDFs)
    const isInline = req.query.view === 'inline';
    const disposition = isInline ? 'inline' : 'attachment';

    // Aggressive sanitization: only allow safe characters
    // This prevents all possible header injection attacks
    const originalName = (resume.dataValues.originalName || 'resume').replace(/[\r\n]/g, '');
    const sanitizedFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'resume';

    // Use RFC 5987 encoding for proper filename support
    const encodedFilename = encodeURIComponent(originalName);

    // Set Content-Disposition with both ASCII fallback and UTF-8 encoded filename
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${sanitizedFilename}"; filename*=UTF-8''${encodedFilename}`,
    );

    // Send file
    res.sendFile(resume.dataValues.filePath, (err) => {
      if (err) {
        logger.error('Error sending file:', err);
        next(
          new AppError(
            'Failed to download resume',
            StatusCodes.INTERNAL_SERVER_ERROR,
            'ERR_FILE_SEND',
          ),
        );
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/jobboard/profile/resume/{id}:
 *   delete:
 *     tags:
 *       - Job Board - Resume
 *     summary: Delete resume
 *     description: Delete resume file by ID. Candidate only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Resume ID
 *     responses:
 *       200:
 *         description: Resume deleted successfully
 *       404:
 *         description: Resume not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Candidate role required
 */
export const deleteResume = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const resumeId = parseInt(req.params.id, 10);
    await jobboardService.deleteResume(resumeId, req.user.dataValues.id);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/jobboard/profile/resume/{id}/default:
 *   patch:
 *     tags:
 *       - Job Board - Resume
 *     summary: Set resume as default
 *     description: Set a specific resume as the default one for the candidate. Candidate only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Resume ID
 *     responses:
 *       200:
 *         description: Resume set as default successfully
 *       404:
 *         description: Resume not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Candidate role required
 */
export const setDefaultResume = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const resumeId = parseInt(req.params.id, 10);
    const resume = await jobboardService.setDefaultResume(resumeId, req.user.dataValues.id);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Resume set as default successfully',
      data: {
        id: resume.dataValues.id,
        isDefault: resume.dataValues.isDefault,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/jobboard/forgot-password:
 *   post:
 *     tags:
 *       - Job Board - Password
 *     summary: Request password reset
 *     description: Send password reset token (logged to console in development)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: candidate@example.com
 *     responses:
 *       200:
 *         description: Reset link sent (if email exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: Only in development mode
 */
export const forgotPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;
    const token = await jobboardService.createPasswordResetToken(email);

    // In production, send email with reset link
    // For now, just log it (as per requirements)
    logger.info(`Password reset token for ${email}: ${token}`);
    logger.info(
      `Reset link: ${process.env.APP_BASE_URL || 'http://localhost:4000'}/reset-password?token=${token}`,
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'If the email exists, a reset link will be sent',
      // In development, include token in response
      ...(process.env.NODE_ENV === 'development' && { token }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/jobboard/reset-password:
 *   post:
 *     tags:
 *       - Job Board - Password
 *     summary: Reset password with token
 *     description: Reset password using the token from email/logs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 example: abc123tokenFromEmail
 *               password:
 *                 type: string
 *                 format: password
 *                 example: NewPassword123!
 *                 description: Must contain at least one uppercase, one lowercase, and one number
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
export const resetPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token, password } = req.body;
    await jobboardService.resetPassword(token, password);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/jobboard/profile/image:
 *   post:
 *     tags:
 *       - Job Board - Profile
 *     summary: Update profile image
 *     description: Upload a profile image (JPEG, PNG, WEBP, max 2MB)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file
 *     responses:
 *       200:
 *         description: Profile image updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *       400:
 *         description: No file uploaded or invalid file type
 *       401:
 *         description: Unauthorized
 */
export const updateProfileImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    if (!req.file) {
      throw new AppError('No file uploaded', StatusCodes.BAD_REQUEST, 'ERR_NO_FILE');
    }

    const imageUrl = await jobboardService.updateProfileImage(req.user, req.file);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        imageUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/jobboard/profile/image/employer-hr:
 *   post:
 *     tags:
 *       - Job Board - Profile
 *     summary: Update Employer/HR profile image
 *     description: Upload a profile image (JPEG, PNG, WEBP, max 2MB). Only accessible to Employers and HR.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file
 *     responses:
 *       200:
 *         description: Profile image updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *       400:
 *         description: No file uploaded or invalid file type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Employer/HR role required
 */
export const updateProfileImageEmployerHr = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    if (!req.file) {
      throw new AppError('No file uploaded', StatusCodes.BAD_REQUEST, 'ERR_NO_FILE');
    }

    const imageUrl = await jobboardService.updateProfileImageEmployerHr(req.user, req.file);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        imageUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a skill from candidate profile
 */
export const deleteSkill = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const skillId = parseInt(req.params.id, 10);
    await jobboardService.deleteCandidateSkill(req.user.dataValues.id, skillId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Skill deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete work experience
 */
export const deleteWorkExperience = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const expId = parseInt(req.params.id, 10);
    await jobboardService.deleteWorkExperience(req.user.dataValues.id, expId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Work experience deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete project
 */
export const deleteProject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const projectId = parseInt(req.params.id, 10);
    await jobboardService.deleteProject(req.user.dataValues.id, projectId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete certification
 */
export const deleteCertification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const certId = parseInt(req.params.id, 10);
    await jobboardService.deleteCertification(req.user.dataValues.id, certId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Certification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         email: { type: string }
 *         firstName: { type: string }
 *         lastName: { type: string }
 *         role: { type: string }
 *         candidateProfile:
 *           $ref: '#/components/schemas/CandidateProfile'
 *         employerProfile:
 *           $ref: '#/components/schemas/EmployerProfile'
 *     CandidateProfile:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         location: { type: string }
 *         availability: { type: string }
 *         bio: { type: string }
 *         yearsExperience: { type: integer }
 *         hourlyRateMin: { type: integer }
 *         hourlyRateMax: { type: integer }
 *         availabeIn: { type: string }
 *         englishProficiency: { type: string }
 *         headline: { type: string }
 *         resourceType: { type: string }
 *         workExperiences:
 *           type: array
 *           items: { $ref: '#/components/schemas/WorkExperience' }
 *         projects:
 *           type: array
 *           items: { $ref: '#/components/schemas/Project' }
 *         certifications:
 *           type: array
 *           items: { $ref: '#/components/schemas/Certification' }
 *         resumes:
 *           type: array
 *           items: { $ref: '#/components/schemas/Resume' }
 *     EmployerProfile:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         companyName: { type: string }
 *         industry: { type: string }
 *         location: { type: string }
 *         companySize: { type: string }
 *         website: { type: string }
 *         description: { type: string }
 *     WorkExperience:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         companyName: { type: string }
 *         role: { type: string }
 *         employmentType: { type: string }
 *         startDate: { type: string, format: date }
 *         endDate: { type: string, format: date, nullable: true }
 *         description: { type: string }
 *         location: { type: string }
 *     Project:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         title: { type: string }
 *         description: { type: string }
 *         techStack: { type: array, items: { type: string } }
 *         projectUrl: { type: string, format: uri }
 *         isFeatured: { type: boolean }
 *     Certification:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         name: { type: string }
 *         issuedBy: { type: string }
 *         issueDate: { type: string, format: date }
 *         expiryDate: { type: string, format: date }
 *         credentialUrl: { type: string, format: uri }
 *     Resume:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         originalName: { type: string }
 *         fileSize: { type: integer }
 *         mimeType: { type: string }
 *         uploadedAt: { type: string, format: date-time }
 */
