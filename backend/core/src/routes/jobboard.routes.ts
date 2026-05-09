import { Router, Request, Response, NextFunction } from 'express';
import * as jobboardController from '../controllers/jobboard.controller';
import * as dashboardController from '../controllers/dashboard.controller';
import { authMiddleware, requireCandidate, requireEmployer } from '../middleware/authMiddleware';
import { uploadSingleResume, uploadSingleProfileImage } from '../middleware/upload.middleware';
import {
  candidateRegistrationSchema,
  employerRegistrationSchema,
  updateCandidateProfileSchema,
  updateEmployerProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validation/jobboard.validation';
import { AppError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';

const router = Router();

// Validation middleware
const validate = (schema: any) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((detail: any) => detail.message);
      return next(
        new AppError(
          `Validation error: ${errors.join(', ')}`,
          StatusCodes.BAD_REQUEST,
          'ERR_VALIDATION',
        ),
      );
    }
    next();
  };
};

/**
 * @route POST /api/v1/jobboard/register/candidate
 * @desc Register a new candidate
 * @access Public
 */
router.post(
  '/register/candidate',
  validate(candidateRegistrationSchema),
  jobboardController.registerCandidate,
);

/**
 * @route POST /api/v1/jobboard/register/employer
 * @desc Register a new employer
 * @access Public
 */
router.post(
  '/register/employer',
  validate(employerRegistrationSchema),
  jobboardController.registerEmployer,
);

/**
 * @route GET /api/v1/jobboard/profile
 * @desc Get current user's full profile
 * @access Private
 */
router.get('/profile', authMiddleware, jobboardController.getProfile);

/**
 * @route PUT /api/v1/jobboard/profile
 * @desc Update current user's profile
 * @access Private
 */
router.put(
  '/profile',
  authMiddleware,
  (req: Request, _res: Response, next: NextFunction) => {
    // Dynamic validation based on user role
    const user = (req as any).user;
    const role = user?.dataValues?.role || user?.role;
    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role;

    const schema =
      normalizedRole === 'candidate' ? updateCandidateProfileSchema : updateEmployerProfileSchema;
    return validate(schema)(req, _res, next);
  },
  jobboardController.updateProfile,
);

/**
 * @route POST /api/v1/jobboard/profile/image
 * @desc Update profile image
 * @access Private
 */
router.post(
  '/profile/image',
  authMiddleware,
  uploadSingleProfileImage,
  jobboardController.updateProfileImage,
);

router.post(
  '/profile/image/employer-hr',
  authMiddleware,
  requireEmployer,
  uploadSingleProfileImage,
  jobboardController.updateProfileImageEmployerHr,
);

/**
 * @route POST /api/v1/jobboard/profile/resume
 * @desc Upload resume (candidate only)
 * @access Private (Candidate)
 */
router.post(
  '/profile/resume',
  authMiddleware,
  requireCandidate,
  uploadSingleResume,
  jobboardController.uploadResume,
);

/**
 * @route GET /api/v1/jobboard/profile/resume/:id
 * @desc Download resume
 * @access Private
 */
router.get('/profile/resume/:id', authMiddleware, jobboardController.getResume);

/**
 * @route DELETE /api/v1/jobboard/profile/resume/:id
 * @desc Delete resume (candidate only)
 * @access Private (Candidate)
 */
router.delete(
  '/profile/resume/:id',
  authMiddleware,
  requireCandidate,
  jobboardController.deleteResume,
);

/**
 * @route PATCH /api/v1/jobboard/profile/resume/:id/default
 * @desc Set resume as default (candidate only)
 * @access Private (Candidate)
 */
router.patch(
  '/profile/resume/:id/default',
  authMiddleware,
  requireCandidate,
  jobboardController.setDefaultResume,
);

/**
 * @route DELETE /api/v1/jobboard/profile/skills/:id
 * @desc Delete skill
 * @access Private (Candidate)
 */
router.delete(
  '/profile/skills/:id',
  authMiddleware,
  requireCandidate,
  jobboardController.deleteSkill,
);

/**
 * @route DELETE /api/v1/jobboard/profile/work-experience/:id
 * @desc Delete work experience
 * @access Private (Candidate)
 */
router.delete(
  '/profile/work-experience/:id',
  authMiddleware,
  requireCandidate,
  jobboardController.deleteWorkExperience,
);

/**
 * @route DELETE /api/v1/jobboard/profile/projects/:id
 * @desc Delete project
 * @access Private (Candidate)
 */
router.delete(
  '/profile/projects/:id',
  authMiddleware,
  requireCandidate,
  jobboardController.deleteProject,
);

/**
 * @route DELETE /api/v1/jobboard/profile/certifications/:id
 * @desc Delete certification
 * @access Private (Candidate)
 */
router.delete(
  '/profile/certifications/:id',
  authMiddleware,
  requireCandidate,
  jobboardController.deleteCertification,
);

/**
 * @route GET /api/v1/jobboard/dashboard/stats
 * @desc Get contractor dashboard statistics
 * @access Private (Candidate)
 */
router.get(
  '/dashboard/stats',
  authMiddleware,
  requireCandidate,
  dashboardController.getContractorDashboardStats,
);

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password', validate(forgotPasswordSchema), jobboardController.forgotPassword);

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password', validate(resetPasswordSchema), jobboardController.resetPassword);

export default router;
