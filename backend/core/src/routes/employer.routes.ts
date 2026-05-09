import { Router, Request, Response, NextFunction } from 'express';
import * as benchController from '../controllers/bench.controller';
import * as employerController from '../controllers/employer.controller';
import * as talentController from '../controllers/talent.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorize } from '../middleware/authorize';
import { AppError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';
import {
  benchResourceSchema,
  updateBenchResourceSchema,
  talentSearchSchema,
} from '../validation/jobboard.validation';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Multer configuration for resume uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = './uploads/bench-resumes';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `bench-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadResume = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          'Invalid file type. Only PDF and DOC/DOCX files are allowed.',
          StatusCodes.BAD_REQUEST,
        ),
      );
    }
  },
});

// Validation middleware
const validate = (schema: any) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const dataSource = req.method === 'GET' ? req.query : req.body;
    const { error } = schema.validate(dataSource, { abortEarly: false });
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
 * Employer Dashboard Routes
 * Base: /api/v1/employers
 */

router.get('/dashboard', authMiddleware, employerController.getDashboardStats);

// Browse Talent (Unified Search) - HR always has access, employers need permission
router.get(
  '/browse-talent',
  authMiddleware,
  authorize('browse_talent'),
  validate(talentSearchSchema),
  talentController.browseTalent,
);

// Get Candidate Profile by ID - Requires browse_talent permission
router.get(
  '/candidates/:id',
  authMiddleware,
  // authorize('browse_talent'),
  talentController.getCandidateById,
);

// Get Candidate Resume by ID - Requires browse_talent permission
router.get(
  '/candidates/:candidateId/resume/:resumeId',
  authMiddleware,
  authorize('browse_talent'),
  talentController.getCandidateResume,
);

/**
 * Bench Resource Routes
 */

// Create bench resource (employer only)
router.post(
  '/post-bench-resource',
  authMiddleware,
  authorize('create_bench'),
  uploadResume.single('resume'),
  validate(benchResourceSchema),
  benchController.createBenchResource,
);

// Get all bench resources (employer only)
router.get(
  '/bench-resources',
  authMiddleware,
  authorize('manage_bench'),
  benchController.getBenchResources,
);

// Get single bench resource (employer only)
router.get(
  '/bench-resources/:id',
  authMiddleware,
  authorize('manage_bench'),
  benchController.getBenchResourceById,
);

// Update bench resource (employer only)
router.put(
  '/bench-resources/:id',
  authMiddleware,
  authorize('manage_bench'),
  uploadResume.single('resume'),
  validate(updateBenchResourceSchema),
  benchController.updateBenchResource,
);

// Delete bench resource (employer only)
router.delete(
  '/bench-resources/:id',
  authMiddleware,
  authorize('manage_bench'),
  benchController.deleteBenchResource,
);

// Download bench resource resume (employer only)
router.get(
  '/bench-resources/:id/resume',
  authMiddleware,
  authorize('manage_bench'),
  benchController.getBenchResourceResume,
);

export default router;
