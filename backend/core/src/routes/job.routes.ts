import { Router, Request, Response, NextFunction } from 'express';
import * as jobController from '../controllers/job.controller';
import * as matchingController from '../controllers/talent-matching.controller';
import {
  authMiddleware,
  requireEmployer,
  requireCandidate,
  optionalAuth,
} from '../middleware/authMiddleware';
// import { requireJobPostPermission } from '../middleware/rbacMiddleware';
import {
  createJobSchema,
  updateJobSchema,
  jobQuerySchema,
  applyJobSchema,
} from '../validation/jobboard.validation';
import { AppError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { authorize } from '../middleware/authorize';

const router = Router();

// Validation middleware
const validate = (schema: any) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const dataToValidate = req.method === 'GET' ? req.query : req.body;
    const { error, value } = schema.validate(dataToValidate, { abortEarly: false });

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

    // Replace validated value back
    if (req.method === 'GET') {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
};

/**
 * @route POST /api/jobs
 * @desc Create a new job posting
 * @access Private (Employer only)
 */
router.post(
  '/jobs',
  authMiddleware,
  requireEmployer,
  // requireJobPostPermission(),
  authorize('post_job'),
  validate(createJobSchema),
  jobController.createJob,
);

/**
 * @route POST /api/jobs/draft
 * @desc Save job as draft
 * @access Private (Employer only)
 */
router.post(
  '/jobs/draft',
  authMiddleware,
  requireEmployer,
  // requireJobPostPermission(),
  authorize('post_job'),
  validate(createJobSchema),
  jobController.saveJobAsDraft,
);

/**
 * @route GET /api/jobs
 * @desc Get all active published jobs with filtering
 * @access Public (optionalAuth for future features)
 */
router.get('/jobs', optionalAuth, validate(jobQuerySchema), jobController.getJobs);

/**
 * @route GET /api/jobs/save
 * @desc Get saved jobs
 * @access Private (Candidate only)
 */
router.get(
  '/jobs/getSavedJobs/all',
  authMiddleware,
  requireCandidate,
  // validate(applyJobSchema),
  jobController.getSavedJobs,
);

/**
 * @route GET /api/v1/jobs/:id/matches
 * @desc Get ranked talent matches for a job
 * @access Private (Employer only)
 */
router.get('/jobs/:id/matches', authMiddleware, requireEmployer, matchingController.getJobMatches);

/**
 * @route POST /api/v1/jobs/:jobId/shortlist
 * @desc Shortlist an AI-matched talent (candidate or bench) for a job
 * @access Private (Employer only)
 */
router.post('/jobs/:jobId/shortlist', authMiddleware, requireEmployer, matchingController.shortlistTalent);

/**
 * @route DELETE /api/v1/jobs/:jobId/shortlist
 * @desc Remove a talent from the shortlist for a job
 * @access Private (Employer only)
 */
router.delete('/jobs/:jobId/shortlist', authMiddleware, requireEmployer, matchingController.removeShortlist);

/**
 * @route GET /api/jobs/:id
 * @desc Get job details by ID
 * @access Public
 */
router.get('/jobs/:id', jobController.getJobById);

/**
 * @route PUT /api/jobs/:id
 * @desc Update job
 * @access Private (Employer only - owner)
 */
router.put(
  '/jobs/:id',
  authMiddleware,
  requireEmployer,
  // requireJobPostPermission(),
  authorize('post_job'),
  validate(updateJobSchema),
  jobController.updateJob,
);

/**
 * @route DELETE /api/jobs/:id
 * @desc Delete job (soft delete)
 * @access Private (Employer only - owner)
 */
router.delete(
  '/jobs/:id',
  authMiddleware,
  requireEmployer,
  authorize('post_job'),
  jobController.deleteJob,
);

/**
 * @route POST /api/jobs/:id/apply
 * @desc Apply to a job
 * @access Private (Candidate only)
 */
router.post(
  '/jobs/:id/apply',
  authMiddleware,
  requireCandidate,
  validate(applyJobSchema),
  jobController.applyToJob,
);

/**
 * @route POST /api/jobs/:id/save
 * @desc Save a job
 * @access Private (Candidate only)
 */
router.post(
  '/jobs/:id/save',
  authMiddleware,
  requireCandidate,
  // validate(applyJobSchema),
  jobController.saveToJob,
);

/**
 * @route GET /api/candidates/applications
 * @desc Get candidate's job applications
 * @access Private (Candidate only)
 */
router.get(
  '/candidates/applications',
  authMiddleware,
  requireCandidate,
  jobController.getCandidateApplications,
);

/**
 * @route GET /api/employers/jobs
 * @desc Get employer's job postings with application counts
 * @access Private (Employer only)
 */
router.get(
  '/employers/jobs',
  authMiddleware,
  requireEmployer,
  validate(jobQuerySchema),
  jobController.getEmployerJobs,
);

/**
 * @route PATCH /api/applications/:id/status
 * @desc Update application status
 * @access Private (HR or Job Owner)
 */
router.patch('/applications/:id/status', authMiddleware, jobController.updateApplicationStatus);

export default router;
