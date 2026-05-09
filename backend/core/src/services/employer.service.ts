import { Op, fn, col } from 'sequelize';
import { Job, EmployerProfile, Application, sequelize } from '../models';
import { AppError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';
import logger from '../config/logger';

/**
 * Get employer dashboard statistics
 */
export const getDashboardStats = async (userId: number): Promise<any> => {
  try {
    // Get employer profile
    const employerProfile = await EmployerProfile.findOne({
      where: { userId },
    });

    if (!employerProfile) {
      throw new AppError(
        'Employer profile not found',
        StatusCodes.NOT_FOUND,
        'ERR_EMPLOYER_NOT_FOUND',
      );
    }

    const employerProfileId = employerProfile.dataValues.id;

    // 1. Open Jobs (Published and Active)
    const openJobsCount = await Job.count({
      where: {
        employerProfileId,
        status: 'published',
        isActive: true,
      },
    });

    // 2. Candidates in Pipeline (Active applications - excluding rejected/accepted)
    const candidatesInPipeline = await Application.count({
      include: [
        {
          model: Job,
          as: 'job',
          where: { employerProfileId },
          required: true,
          attributes: [],
        },
      ],
      where: {
        status: {
          [Op.notIn]: ['rejected', 'accepted'],
        },
      },
    });

    // 3. Interviews Scheduled
    const interviewsScheduled = await Application.count({
      include: [
        {
          model: Job,
          as: 'job',
          where: { employerProfileId },
          required: true,
          attributes: [],
        },
      ],
      where: {
        status: 'interview',
      },
    });

    // 4. Offers Extended
    const offersExtended = await Application.count({
      include: [
        {
          model: Job,
          as: 'job',
          where: { employerProfileId },
          required: true,
          attributes: [],
        },
      ],
      where: {
        status: 'offered',
      },
    });

    // 5. AI Screened (Applications with a resume and potential AI analysis)
    // For now, we'll count applications that have a resumeId as a proxy for "screenable"
    const aiScreenedCount = await Application.count({
      include: [
        {
          model: Job,
          as: 'job',
          where: { employerProfileId },
          required: true,
          attributes: [],
        },
      ],
      where: {
        resumeId: { [Op.ne]: null },
      },
    });

    // 6. Time to Hire (avg)
    // Calculated as the average time from appliedAt to updatedAt for 'accepted' applications
    const acceptedApplications = await Application.findAll({
      include: [
        {
          model: Job,
          as: 'job',
          where: { employerProfileId },
          required: true,
          attributes: [],
        },
      ],
      where: {
        status: 'accepted',
      },
      attributes: [
        [
          fn(
            'AVG',
            sequelize.literal(
              'EXTRACT(EPOCH FROM ("Application"."updated_at" - "Application"."applied_at")) / 86400',
            ),
          ),
          'avgTimeToHire',
        ],
      ],
      raw: true,
    });

    const avgTimeToHire = acceptedApplications[0]
      ? parseFloat((acceptedApplications[0] as any).avgTimeToHire || 0).toFixed(1)
      : 0;

    // 7. Hiring Funnel
    const funnelStats = await Application.findAll({
      include: [
        {
          model: Job,
          as: 'job',
          where: { employerProfileId },
          required: true,
          attributes: [],
        },
      ],
      attributes: [
        [col('Application.status'), 'status'],
        [fn('COUNT', col('Application.id')), 'count'],
      ],
      group: [col('Application.status')],
      raw: true,
    });

    const funnel: any = {
      Applications: 0,
      Screened: 0,
      Interviewed: 0,
      Offered: 0,
      Hired: 0,
    };

    funnelStats.forEach((stat: any) => {
      const count = parseInt(stat.count, 10);
      funnel.Applications += count; // Total applications

      if (['reviewed', 'shortlisted', 'interview', 'offered', 'accepted'].includes(stat.status)) {
        funnel.Screened += count;
      }
      if (['interview', 'offered', 'accepted'].includes(stat.status)) {
        funnel.Interviewed += count;
      }
      if (['offered', 'accepted'].includes(stat.status)) {
        funnel.Offered += count;
      }
      if (stat.status === 'accepted') {
        funnel.Hired += count;
      }
    });

    // 8. Recent Activity
    // Combining latest job postings and latest application updates
    const recentJobs = await Job.findAll({
      where: { employerProfileId },
      limit: 5,
      order: [['updatedAt', 'DESC']],
      attributes: ['id', 'title', 'status', 'updatedAt'],
    });

    const recentApplications = await Application.findAll({
      include: [
        {
          model: Job,
          as: 'job',
          where: { employerProfileId },
          required: true,
          attributes: ['title'],
        },
      ],
      limit: 5,
      order: [['updatedAt', 'DESC']],
      attributes: ['id', 'status', 'updatedAt'],
    });

    const recentActivity = [
      ...recentJobs.map((j) => ({
        type: 'job',
        ...j.get(),
        message: `Job "${j.title}" was ${j.status}`,
      })),
      ...recentApplications.map((a) => ({
        type: 'application',
        ...a.get(),
        message: `Application for "${(a as any).job?.title || 'Unknown Job'}" changed to ${a.status}`,
      })),
    ]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    return {
      openJobs: openJobsCount,
      candidatesInPipeline,
      interviewsScheduled,
      timeToHireAvg: `${avgTimeToHire} days`,
      offersExtended,
      aiScreened: aiScreenedCount,
      hiringFunnel: funnel,
      recentActivity,
    };
  } catch (error) {
    logger.error('Error fetching employer dashboard stats:', error);
    console.error('FULL ERROR:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Failed to fetch dashboard statistics: ' + (error as any).message,
      StatusCodes.INTERNAL_SERVER_ERROR,
      'ERR_DASHBOARD_FETCH_FAILED',
    );
  }
};
