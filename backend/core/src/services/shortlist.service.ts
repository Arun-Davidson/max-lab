import { UniqueConstraintError } from 'sequelize';
import { EmployerShortlist, EmployerProfile } from '../models';
import { AppError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';
import logger from '../config/logger';

/**
 * Shortlist a talent (candidate or bench) for a specific job.
 * Idempotent — shortlisting the same talent twice is a no-op.
 */
export const shortlistTalent = async (
  jobId: number,
  talentId: number,
  talentSource: 'candidate' | 'bench',
  userId: number,
): Promise<EmployerShortlist> => {
  const employerProfile = await EmployerProfile.findOne({ where: { userId } });

  if (!employerProfile) {
    throw new AppError(
      'Employer profile not found',
      StatusCodes.NOT_FOUND,
      'ERR_EMPLOYER_NOT_FOUND',
    );
  }

  try {
    const [record] = await EmployerShortlist.findOrCreate({
      where: {
        jobId,
        talentId,
        talentSource,
        employerProfileId: employerProfile.dataValues.id,
      },
      defaults: {
        jobId,
        talentId,
        talentSource,
        employerProfileId: employerProfile.dataValues.id,
      },
    });

    logger.info(
      `Employer ${userId} shortlisted talent ${talentId} (${talentSource}) for job ${jobId}`,
    );
    return record;
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      // Already shortlisted — idempotent, just return existing
      const existing = await EmployerShortlist.findOne({
        where: { jobId, talentId, talentSource, employerProfileId: employerProfile.dataValues.id },
      });
      return existing!;
    }
    throw error;
  }
};

/**
 * Remove a talent from the shortlist for a specific job.
 */
export const removeShortlist = async (
  jobId: number,
  talentId: number,
  talentSource: 'candidate' | 'bench',
  userId: number,
): Promise<void> => {
  const employerProfile = await EmployerProfile.findOne({ where: { userId } });

  if (!employerProfile) {
    throw new AppError(
      'Employer profile not found',
      StatusCodes.NOT_FOUND,
      'ERR_EMPLOYER_NOT_FOUND',
    );
  }

  await EmployerShortlist.destroy({
    where: {
      jobId,
      talentId,
      talentSource,
      employerProfileId: employerProfile.dataValues.id,
    },
  });

  logger.info(
    `Employer ${userId} removed talent ${talentId} (${talentSource}) from shortlist for job ${jobId}`,
  );
};

/**
 * Get a Set of shortlisted talent keys for a job, used by the matching service.
 * Key format: "<source>:<talentId>"
 */
export const getShortlistedKeySet = async (
  jobId: number,
  employerProfileId: number,
): Promise<Set<string>> => {
  const records = await EmployerShortlist.findAll({
    where: { jobId, employerProfileId },
    attributes: ['talentId', 'talentSource'],
  });

  return new Set(records.map((r) => `${r.dataValues.talentSource}:${r.dataValues.talentId}`));
};
