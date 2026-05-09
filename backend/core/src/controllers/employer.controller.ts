import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthRequest } from '../middleware/authMiddleware';
import * as employerService from '../services/employer.service';
import { AppError } from '../middleware/errorHandler';

/**
 * @swagger
 * /api/v1/employers/dashboard:
 *   get:
 *     tags:
 *       - Employer Dashboard
 *     summary: Get dashboard statistics for the logged-in employer
 *     description: Retrieve key metrics and recent activity for the employer's hiring process.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     openJobs:
 *                       type: integer
 *                     candidatesInPipeline:
 *                       type: integer
 *                     interviewsScheduled:
 *                       type: integer
 *                     timeToHireAvg:
 *                       type: string
 *                     offersExtended:
 *                       type: integer
 *                     aiScreened:
 *                       type: integer
 *                     hiringFunnel:
 *                       type: object
 *                       properties:
 *                         Applications:
 *                           type: integer
 *                         Screened:
 *                           type: integer
 *                         Interviewed:
 *                           type: integer
 *                         Offered:
 *                           type: integer
 *                         Hired:
 *                           type: integer
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Employer role required
 *       404:
 *         description: Employer profile not found
 */
export const getDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const stats = await employerService.getDashboardStats(req.user.dataValues.id);

    res.status(StatusCodes.OK).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
