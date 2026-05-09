import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthRequest } from '../middleware/authMiddleware';
import * as talentService from '../services/talent.service';
import * as jobboardService from '../services/jobboard.service';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';

/**
 * @route GET /api/v1/employers/browse-talent
 * @desc Search across both candidates and bench resources
 * @access Private (Employer only)
 */
export const browseTalent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const user = req.user as any;

    const employerProfileId: number | undefined = user.employerProfile?.id;
    // HR might not have an employer profile, but talent search needs one for some filters or logic
    // If talent search requires it, we should ensure it handles undefined or passes it correctly.

    // Parse query filters
    const list = (value?: string) =>
      value
        ? value
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : undefined;
    const toInt = (value?: string) => {
      const n = value ? parseInt(value, 10) : NaN;
      return Number.isFinite(n) ? n : undefined;
    };
    const toFloat = (value?: string) => {
      const n = value ? parseFloat(value) : NaN;
      return Number.isFinite(n) ? n : undefined;
    };
    const skills = list(req.query.skills as string | undefined);
    const certifications = list(req.query.certifications as string | undefined);
    const filters = {
      jobTitle: req.query.jobTitle as string,
      category: req.query.category as string,
      skills,
      experienceMin: toInt(req.query.experienceMin as string | undefined),
      experienceMax: toInt(req.query.experienceMax as string | undefined),
      certifications,
      workMode: req.query.workMode as string,
      location: req.query.location as string,
      budgetMin: toFloat(req.query.budgetMin as string | undefined),
      budgetMax: toFloat(req.query.budgetMax as string | undefined),
      // currency: (req.query.currency as string) || 'INR',
      type: req.query.type as 'candidate' | 'bench' | 'all',
      openToBenchResources: req.query.openToBenchResources
        ? parseInt(req.query.openToBenchResources as string, 10)
        : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      search: req.query.search as string,
      jobId: toInt(req.query.jobId as string | undefined),
    };

    // @ts-ignore - Support HR/authorized employer browsing all
    const result = await talentService.searchTalent(employerProfileId, filters);

    res.status(StatusCodes.OK).json({
      success: true,
      data: result.results,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: filters.limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/employers/candidates/:id
 * @desc Get candidate profile by ID
 * @access Private (Employer with browse_talent permission)
 */
export const getCandidateById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const candidateId = parseInt(req.params.id, 10);

    if (!candidateId || isNaN(candidateId)) {
      throw new AppError('Invalid candidate ID', StatusCodes.BAD_REQUEST, 'ERR_INVALID_ID');
    }

    const candidateProfile = await jobboardService.getCandidateProfileById(candidateId);

    // Record the view asynchronously (don't block the response)
    if (req.user && req.user.dataValues.id !== candidateId) {
      jobboardService.recordProfileView(candidateId, req.user.dataValues.id);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: candidateProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/employers/candidates/:candidateId/resume/:resumeId
 * @desc Get candidate resume by ID
 * @access Private (Employer with browse_talent permission)
 */
export const getCandidateResume = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const candidateId = parseInt(req.params.candidateId, 10);
    const resumeId = parseInt(req.params.resumeId, 10);

    if (!candidateId || isNaN(candidateId)) {
      throw new AppError('Invalid candidate ID', StatusCodes.BAD_REQUEST, 'ERR_INVALID_ID');
    }

    if (!resumeId || isNaN(resumeId)) {
      throw new AppError('Invalid resume ID', StatusCodes.BAD_REQUEST, 'ERR_INVALID_ID');
    }

    const resume = await jobboardService.getResume(resumeId, candidateId);

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
