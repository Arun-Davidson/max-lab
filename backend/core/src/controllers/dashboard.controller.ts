import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { 
  Interview, 
  CodingTest, 
  CandidateProfile, 
  Submission, 
  Candidate, 
  // sequelize 
} from '../models';
import { AppError } from '../middleware/errorHandler';
import { Op } from 'sequelize';

/**
 * Get dashboard statistics for a contractor
 */
export const getContractorDashboardStats = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = user.id;

  // 1. Get Candidate Profile and Email
  const candidate = await Candidate.findByPk(userId);
  const profile = await CandidateProfile.findOne({ where: { userId } });

  if (!candidate || !profile) {
    throw new AppError('Candidate profile not found', StatusCodes.NOT_FOUND);
  }

  const userEmail = candidate.email;

  // 2. Count Interview Invites (Video Interviews + Coding Tests)
  const videoInterviewInvites = await Interview.count({
    where: {
      candidateProfileId: profile.id,
      status: { [Op.in]: ['pending', 'scheduled'] }
    }
  });

  const skillTestInvites = await CodingTest.count({
    where: {
      candidateEmail: userEmail,
      status: 'active',
      submittedAt: null,
      interviewerId: { [Op.ne]: userId } // Exclude mock tests
    }
  });

  // 3. Count Pending Tests (Skill Tests yet to be completed)
  const pendingTests = await CodingTest.count({
    where: {
      candidateEmail: userEmail,
      submittedAt: null
    }
  });

  // 4. Get Profile Views
  const profileViews = profile.viewCount || 0;

  // 5. Get Skill Score (Highest Skill Scored excluding mock interviews)
  // We look for the maximum grade in submissions that belong to an official test.
  // An official test is one where interviewerId !== userId.
  const bestSubmission = await Submission.findOne({
    attributes: ['grade'],
    where: {
      userId: userId,
      testId: { [Op.ne]: null }
    },
    include: [{
      model: CodingTest,
      as: 'test',
      attributes: [], // Ensure no columns from CodingTest are selected to avoid GROUP BY issues
      where: {
        interviewerId: { [Op.ne]: userId }
      },
      required: true
    }],
    order: [['grade', 'DESC']],
    raw: true
  });

  const highestSkillScore = (bestSubmission as any)?.grade || 0;

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      interviewInvites: videoInterviewInvites + skillTestInvites,
      pendingTests,
      profileViews,
      skillScore: highestSkillScore || 0
    }
  });
};
