import { Request, Response, NextFunction } from 'express';
import interviewService from '../services/interview.service';
import { StatusCodes } from 'http-status-codes';

/**
 * Start an AI interview
 */
export const startInterview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { applicationId } = req.body;
    if (!applicationId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Application ID is required' });
    }

    const interview = await interviewService.startInterview(parseInt(applicationId as string));
    return res.status(StatusCodes.CREATED).json(interview);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get interview status/results
 */
export const getInterviewStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const interview = await interviewService.getInterviewStatus(parseInt(id as string));
    return res.status(StatusCodes.OK).json(interview);
  } catch (error) {
    return next(error);
  }
};
