import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthRequest } from '../middleware/authMiddleware';
import * as matchingService from '../services/talent-matching.service';
import * as shortlistService from '../services/shortlist.service';
import { AppError } from '../middleware/errorHandler';
import { EmployerProfile } from '../models';

/**
 * @route GET /api/v1/jobs/:id/matches
 * @desc Get ranked talent matches for a job (annotated with isShortlisted)
 * @access Private (Employer only)
 */
export const getJobMatches = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    if (!jobId || isNaN(jobId)) {
      throw new AppError('Invalid job ID', StatusCodes.BAD_REQUEST, 'ERR_INVALID_ID');
    }

    // Resolve employer profile so we can annotate isShortlisted
    const employerProfile = await EmployerProfile.findOne({ where: { userId: req.user!.id } });
    const employerProfileId = employerProfile?.dataValues.id;

    const { results, total } = await matchingService.findMatchesForJob(
      jobId,
      limit,
      offset,
      employerProfileId,
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/v1/jobs/:jobId/shortlist
 * @desc Shortlist an AI-matched talent for a job
 * @access Private (Employer only)
 * @body { talentId: number, talentSource: 'candidate' | 'bench' }
 */
export const shortlistTalent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    const { talentId, talentSource } = req.body as { talentId: number; talentSource: 'candidate' | 'bench' };

    if (!jobId || isNaN(jobId)) {
      throw new AppError('Invalid job ID', StatusCodes.BAD_REQUEST, 'ERR_INVALID_ID');
    }
    if (!talentId || !['candidate', 'bench'].includes(talentSource)) {
      throw new AppError(
        'talentId and talentSource ("candidate" | "bench") are required',
        StatusCodes.BAD_REQUEST,
        'ERR_VALIDATION',
      );
    }

    const record = await shortlistService.shortlistTalent(
      jobId,
      talentId,
      talentSource,
      req.user!.id,
    );

    res.status(StatusCodes.CREATED).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/v1/jobs/:jobId/shortlist
 * @desc Remove a talent from the shortlist for a job
 * @access Private (Employer only)
 * @body { talentId: number, talentSource: 'candidate' | 'bench' }
 */
export const removeShortlist = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    const { talentId, talentSource } = req.body as { talentId: number; talentSource: 'candidate' | 'bench' };

    if (!jobId || isNaN(jobId)) {
      throw new AppError('Invalid job ID', StatusCodes.BAD_REQUEST, 'ERR_INVALID_ID');
    }

    await shortlistService.removeShortlist(jobId, talentId, talentSource, req.user!.id);

    res.status(StatusCodes.OK).json({ success: true, message: 'Removed from shortlist' });
  } catch (error) {
    next(error);
  }
};
