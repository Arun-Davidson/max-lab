import { Transaction, Op } from 'sequelize';
import {
  Job,
  EmployerProfile,
  CandidateProfile,
  Skill,
  JobSkill,
  JobNiceToHaveSkill,
  Application,
  sequelize,
  JobSaved,
  BenchResource,
  BusinessUser,
} from '../models';
import { AppError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';
import logger from '../config/logger';
// import { rateResumeForJob } from './ai/resumeRating.service';

type JobPayload = {
  title: string;
  description: string;
  category?: string;
  role?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  certifications?: string[];
  paymentType?: 'fixed' | 'hourly' | 'monthly';

  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';
  workMode?: 'hybrid' | 'on-site' | 'remote';
  experienceLevel?: string;

  minExperience?: number;
  maxExperience?: number;
  fresherAllowed?: boolean;

  salaryMin?: number;
  salaryMax?: number;
  salaryType?: 'fixed-range' | 'negotiable' | 'not-disclosed';
  currency?: string;

  duration?: number;
  numberOfOpenings?: number;
  mltipleLocationsAllowed?: boolean;

  jobVisibility?: 'public' | 'private' | 'all';
  urgency?: 'normal' | 'urgent' | 'critical';

  enableAiTalentMatching?: boolean;
  aiMatchingEnabled?: boolean;
  autoScreenCandidates?: boolean;
  enableSkillAssessment?: boolean;
  scheduleAIInterviews?: boolean;

  healthInsurance?: boolean;
  ESOPs?: boolean;
  performanceBonus?: boolean;
  remoteAllowance?: boolean;

  educationQualification?: string;
  languagesKnown?: string;

  equalOpportunityEmployer?: boolean;
  dataPrivacyPolicies?: boolean;
  termsAndConditions?: boolean;

  expiresAt?: Date;
  status?: 'draft' | 'published' | 'closed';

  testType?: string;
  difficultyLevel?: string;
  timeLimit?: number;
  autoRejectBelowScore?: number;
  interviewType?: string;
  aiEvaluationCriteria?: string[];
  autoAdvanceScore?: number;
  startDate?: Date;
  durationUnit?: 'weeks' | 'months' | 'years';

  skills?: { name: string; proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' }[];
  niceToHaveSkills?: {
    name: string;
    proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced';
  }[];
};

/**
 * Create a new job posting (Employer only)
 */
export const createJob = async (
  userId: number,
  data: JobPayload,
  // {
  //   title: string;
  //   description: string;
  //   category?: string;
  //   location?: string;
  //   employmentType: 'full-time' | 'part-time' |'contract' | 'internship' | 'freelance';
  //   salaryMin?: number;
  //   salaryMax?: number;
  //   currency?: string;
  //   skills?: string[];
  //   aiMatchingEnabled?: boolean;
  // },
): Promise<Job> => {
  const transaction: Transaction = await sequelize.transaction();
  let isCommitted = false;

  try {
    // Get employer profile
    const employerProfile = await EmployerProfile.findOne({
      where: { userId },
      transaction,
    });

    if (!employerProfile) {
      throw new AppError(
        'Employer profile not found',
        StatusCodes.NOT_FOUND,
        'ERR_EMPLOYER_NOT_FOUND',
      );
    }

    // Create job
    const job = await Job.create(
      {
        employerProfileId: employerProfile.dataValues.id,
        title: data.title,
        description: data.description,
        category: data.category || null,
        role: data.role || null,
        location: data.location || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        employmentType: data.employmentType,
        experienceLevel: data.experienceLevel,
        workMode:
          data.workMode === 'hybrid' || data.workMode === 'remote' ? data.workMode : 'on-site',
        minExperience: data.minExperience || 0,
        maxExperience: data.maxExperience || null,
        fresherAllowed: data.fresherAllowed !== undefined ? data.fresherAllowed : false,
        salaryMin: data.salaryMin || null,
        salaryMax: data.salaryMax || null,
        salaryType: data.salaryType || 'not-disclosed',
        currency: data.currency || 'INR',
        numberOfOpenings: data.numberOfOpenings || 1,
        duration: data.duration || null,
        paymentType: data.paymentType || 'monthly',
        mltipleLocationsAllowed:
          data.mltipleLocationsAllowed !== undefined ? data.mltipleLocationsAllowed : false,
        jobVisibility: data.jobVisibility || 'public',
        urgency: data.urgency || 'normal',
        enableAiTalentMatching:
          data.enableAiTalentMatching !== undefined ? data.enableAiTalentMatching : false,
        aiMatchingEnabled: data.aiMatchingEnabled !== undefined ? data.aiMatchingEnabled : false,
        autoScreenCandidates:
          data.autoScreenCandidates !== undefined ? data.autoScreenCandidates : false,
        enableSkillAssessment:
          data.enableSkillAssessment !== undefined ? data.enableSkillAssessment : false,
        scheduleAIInterviews:
          data.scheduleAIInterviews !== undefined ? data.scheduleAIInterviews : false,
        healthInsurance: data.healthInsurance !== undefined ? data.healthInsurance : false,
        ESOPs: data.ESOPs !== undefined ? data.ESOPs : false,
        performanceBonus: data.performanceBonus !== undefined ? data.performanceBonus : false,
        remoteAllowance: data.remoteAllowance !== undefined ? data.remoteAllowance : false,
        educationQualification: data.educationQualification || null,
        languagesKnown: data.languagesKnown || null,
        equalOpportunityEmployer:
          data.equalOpportunityEmployer !== undefined ? data.equalOpportunityEmployer : false,
        dataPrivacyPolicies:
          data.dataPrivacyPolicies !== undefined ? data.dataPrivacyPolicies : false,
        termsAndConditions: data.termsAndConditions !== undefined ? data.termsAndConditions : false,
        certifications: data.certifications || null,
        testType: data.testType || null,
        difficultyLevel: data.difficultyLevel || null,
        timeLimit: data.timeLimit || null,
        autoRejectBelowScore: data.autoRejectBelowScore || null,
        interviewType: data.interviewType || null,
        aiEvaluationCriteria: data.aiEvaluationCriteria || null,
        autoAdvanceScore: data.autoAdvanceScore || null,
        startDate: data.startDate || null,
        durationUnit: data.durationUnit || null,

        expiresAt: data.expiresAt || null,
        status: data.status || 'published',
        isActive: true,
      },
      { transaction },
    );

    // Handle required skills if provided
    if (data.skills && data.skills.length > 0) {
      for (const skillItem of data.skills) {
        // Find or create skill
        const [skill] = await Skill.findOrCreate({
          where: { name: skillItem.name.trim() },
          defaults: { name: skillItem.name.trim() },
          transaction,
        });

        // Link skill to job
        await JobSkill.create(
          {
            jobId: job.dataValues.id,
            skillId: skill.dataValues.id,
            required: true,
            proficiencyLevel: skillItem.proficiencyLevel || 'beginner',
          },
          { transaction },
        );
      }
    }

    // Handle nice-to-have skills if provided
    if (data.niceToHaveSkills && data.niceToHaveSkills.length > 0) {
      for (const skillItem of data.niceToHaveSkills) {
        // Find or create skill
        const [skill] = await Skill.findOrCreate({
          where: { name: skillItem.name.trim() },
          defaults: { name: skillItem.name.trim() },
          transaction,
        });

        // Link skill to job as nice-to-have
        await JobNiceToHaveSkill.create(
          {
            jobId: job.dataValues.id,
            skillId: skill.dataValues.id,
            proficiencyLevel: skillItem.proficiencyLevel || 'beginner',
          },
          { transaction },
        );
      }
    }

    await transaction.commit();
    isCommitted = true;

    // Fetch complete job with associations (after commit)
    const completeJob = await Job.findByPk(job.dataValues.id, {
      include: [
        {
          association: 'employerProfile',
          include: [
            { association: 'businessUser', attributes: ['firstName', 'lastName', 'email'] },
          ],
        },
        { association: 'skills' },
        { association: 'niceToHaveSkills' },
      ],
    });

    logger.info(`Job created: ${job.dataValues.id} by employer ${userId}`);
    return completeJob!;
  } catch (error) {
    // Only rollback if transaction hasn't been committed
    if (!isCommitted) {
      await transaction.rollback();
    }
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error creating job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(
      `Failed to create job: ${errorMessage}`,
      StatusCodes.INTERNAL_SERVER_ERROR,
      'ERR_JOB_CREATE_FAILED',
    );
  }
};

/**
 * Update job (Employer only - ownership check)
 */
export const updateJob = async (
  jobId: number,
  userId: number,
  data: JobPayload,
  // {
  //   title?: string;
  //   description?: string;
  //   category?: string;
  //   location?: string;
  //   employmentType?: 'full-time' | 'part-time' |'contract' | 'internship' | 'freelance';
  //   salaryMin?: number;
  //   salaryMax?: number;
  //   currency?: string;
  //   skills?: string[];
  //   aiMatchingEnabled?: boolean;
  //   status?: 'draft' | 'published' | 'closed';
  // },
): Promise<Job> => {
  const transaction: Transaction = await sequelize.transaction();
  let isCommitted = false;

  try {
    // Get employer profile
    const employerProfile = await EmployerProfile.findOne({
      where: { userId },
      transaction,
    });

    if (!employerProfile) {
      throw new AppError(
        'Employer profile not found',
        StatusCodes.NOT_FOUND,
        'ERR_EMPLOYER_NOT_FOUND',
      );
    }

    // Get job and verify ownership
    const job = await Job.findByPk(jobId, { transaction });

    if (!job) {
      throw new AppError('Job not found', StatusCodes.NOT_FOUND, 'ERR_JOB_NOT_FOUND');
    }

    if (job.dataValues.employerProfileId !== employerProfile.dataValues.id) {
      throw new AppError(
        'You do not have permission to update this job',
        StatusCodes.FORBIDDEN,
        'ERR_FORBIDDEN',
      );
    }

    // console.log(data.status, 'data.status')
    // // Update job fields
    // if (data.title !== undefined) job.dataValues.title = data.title;
    // if (data.description !== undefined) job.dataValues.description = data.description;
    // if (data.category !== undefined) job.dataValues.category = data.category || null;
    // if (data.location !== undefined) job.dataValues.location = data.location || null;
    // if (data.employmentType !== undefined) job.dataValues.employmentType = data.employmentType;
    // if (data.salaryMin !== undefined) job.dataValues.salaryMin = data.salaryMin || null;
    // if (data.salaryMax !== undefined) job.dataValues.salaryMax = data.salaryMax || null;
    // if (data.currency !== undefined) job.dataValues.currency = data.currency;
    // if (data.aiMatchingEnabled !== undefined) job.dataValues.aiMatchingEnabled = data.aiMatchingEnabled;
    // if (data.status !== undefined) job.dataValues.status = data.status;

    if ((data as any).workMode === 'onsite') {
      data.workMode = 'on-site';
    }
    job.set(data as any);
    await job.save({ transaction });

    // Handle required skills if provided
    if (data.skills) {
      // Remove existing required skills
      await JobSkill.destroy({
        where: { jobId: job.dataValues.id },
        transaction,
      });

      // Add new required skills
      for (const skillItem of data.skills) {
        const [skill] = await Skill.findOrCreate({
          where: { name: skillItem.name.trim() },
          defaults: { name: skillItem.name.trim() },
          transaction,
        });

        await JobSkill.create(
          {
            jobId: job.dataValues.id,
            skillId: skill.dataValues.id,
            required: true,
            proficiencyLevel: skillItem.proficiencyLevel || 'beginner',
          },
          { transaction },
        );
      }
    }

    // Handle nice-to-have skills if provided
    if (data.niceToHaveSkills) {
      // Remove existing nice-to-have skills
      await JobNiceToHaveSkill.destroy({
        where: { jobId: job.dataValues.id },
        transaction,
      });

      // Add new nice-to-have skills
      for (const skillItem of data.niceToHaveSkills) {
        const [skill] = await Skill.findOrCreate({
          where: { name: skillItem.name.trim() },
          defaults: { name: skillItem.name.trim() },
          transaction,
        });

        await JobNiceToHaveSkill.create(
          {
            jobId: job.dataValues.id,
            skillId: skill.dataValues.id,
            proficiencyLevel: skillItem.proficiencyLevel || 'beginner',
          },
          { transaction },
        );
      }
    }

    await transaction.commit();
    isCommitted = true;

    // Return updated job with associations (after commit)
    const updatedJob = await Job.findByPk(job.dataValues.id, {
      include: [
        {
          association: 'employerProfile',
          attributes: ['companyName', 'location'],
          include: [
            { association: 'businessUser', attributes: ['firstName', 'lastName', 'email'] },
          ],
        },
        { association: 'skills' },
        { association: 'niceToHaveSkills' },
      ],
    });

    logger.info(`Job updated: ${job.dataValues.id} by employer ${userId}`);
    return updatedJob!;
  } catch (error) {
    // Only rollback if transaction hasn't been committed
    if (!isCommitted) {
      await transaction.rollback();
    }
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error updating job:', error);
    throw new AppError(
      'Failed to update job',
      StatusCodes.INTERNAL_SERVER_ERROR,
      'ERR_JOB_UPDATE_FAILED',
    );
  }
};

/**
 * Get jobs with filtering, search, and pagination (Public)
 */
export const getJobs = async (filters: {
  page?: number;
  limit?: number;
  category?: string;
  location?: string;
  employmentType?: string | string[];
  salaryMin?: number;
  jobVisibility?: 'public' | 'private' | 'all';
  salaryMax?: number;
  skills?: string | string[];
  keyword?: string;
}): Promise<{
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  // Build where clause
  const whereClause: any = {
    isActive: true,
    status: 'published',
  };

  if (filters.category) {
    whereClause.category = { [Op.iLike]: `%${filters.category}%` };
  }

  if (filters.jobVisibility) {
    whereClause.jobVisibility = filters.jobVisibility;
  }

  if (filters.location) {
    whereClause.location = { [Op.iLike]: `%${filters.location}%` };
  }

  if (filters.employmentType) {
    if (Array.isArray(filters.employmentType)) {
      whereClause.employmentType = { [Op.in]: filters.employmentType };
    } else {
      whereClause.employmentType = filters.employmentType;
    }
  }

  if (filters.salaryMin !== undefined) {
    whereClause.salaryMax = { [Op.gte]: filters.salaryMin };
  }

  if (filters.salaryMax !== undefined) {
    whereClause.salaryMin = { [Op.lte]: filters.salaryMax };
  }

  // Keyword search in title or description
  if (filters.keyword) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${filters.keyword}%` } },
      { description: { [Op.iLike]: `%${filters.keyword}%` } },
    ];
  }

  // Build include for skills filter
  const includeClause: any[] = [
    {
      association: 'employerProfile',
      attributes: ['companyName', 'location', 'industry'],
    },
    {
      association: 'skills',
      attributes: ['id', 'name'],
      through: { attributes: ['required', 'proficiencyLevel'] },
    },
    {
      association: 'niceToHaveSkills',
      attributes: ['id', 'name'],
      through: { attributes: ['proficiencyLevel'] },
    },
  ];

  // Skills filter - complex query using include
  let skillsWhere: any = undefined;
  if (filters.skills) {
    const skillsArray = Array.isArray(filters.skills) ? filters.skills : [filters.skills];
    skillsWhere = {
      name: { [Op.in]: skillsArray },
    };
  }

  if (skillsWhere) {
    // Modify skills include to add where clause
    includeClause[1].where = skillsWhere;
    includeClause[1].required = true; // INNER JOIN to filter jobs
  }

  try {
    const { count, rows } = await Job.findAndCountAll({
      where: whereClause,
      include: includeClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    const totalPages = Math.ceil(count / limit);

    return {
      jobs: rows,
      total: count,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    logger.error('Error fetching jobs:', error);
    throw new AppError(
      'Failed to fetch jobs',
      StatusCodes.INTERNAL_SERVER_ERROR,
      'ERR_JOB_FETCH_FAILED',
    );
  }
};

/**
 * Get job by ID with full details (Public)
 */
export const getJobById = async (jobId: number): Promise<Job> => {
  const job = await Job.findByPk(jobId, {
    include: [
      {
        association: 'employerProfile',
        attributes: [
          'companyName',
          'location',
          'industry',
          'companySize',
          'website',
          'description',
        ],
        include: [
          {
            association: 'businessUser',
            attributes: ['firstName', 'lastName'],
          },
        ],
      },
      {
        association: 'skills',
        attributes: ['id', 'name'],
        through: { attributes: ['required', 'proficiencyLevel'] },
      },
      {
        association: 'niceToHaveSkills',
        attributes: ['id', 'name'],
        through: { attributes: ['proficiencyLevel'] },
      },
    ],
  });

  if (!job) {
    throw new AppError('Job not found', StatusCodes.NOT_FOUND, 'ERR_JOB_NOT_FOUND');
  }

  // Don't show inactive or draft jobs to public
  if (!job.dataValues.isActive || job.dataValues.status === 'draft') {
    throw new AppError('Job not found', StatusCodes.NOT_FOUND, 'ERR_JOB_NOT_FOUND');
  }

  return job;
};

/**
 * Delete job - soft delete (Employer only - ownership check)
 */
export const deleteJob = async (jobId: number, userId: number): Promise<void> => {
  const employerProfile = await EmployerProfile.findOne({ where: { userId } });

  if (!employerProfile) {
    throw new AppError(
      'Employer profile not found',
      StatusCodes.NOT_FOUND,
      'ERR_EMPLOYER_NOT_FOUND',
    );
  }

  const job = await Job.findByPk(jobId);

  if (!job) {
    throw new AppError('Job not found', StatusCodes.NOT_FOUND, 'ERR_JOB_NOT_FOUND');
  }

  if (job.dataValues.employerProfileId !== employerProfile.dataValues.id) {
    throw new AppError(
      'You do not have permission to delete this job',
      StatusCodes.FORBIDDEN,
      'ERR_FORBIDDEN',
    );
  }

  // Soft delete
  // job.dataValues.isActive = false;
  // await job.save();
  await job.destroy();

  logger.info(`Job soft deleted: ${jobId} by employer ${userId}`);
};

/**
 * Apply to a job (Candidate only)
 */
export const applyToJob = async (
  jobId: number,
  userId: number,
  data: {
    coverLetter?: string;
  },
): Promise<Application> => {
  // Get candidate profile
  const candidateProfile = await CandidateProfile.findOne({ where: { userId } });

  // console.log('candidateProfile',candidateProfile,)

  if (!candidateProfile) {
    throw new AppError(
      'Candidate profile not found',
      StatusCodes.NOT_FOUND,
      'ERR_CANDIDATE_NOT_FOUND',
    );
  }

  // Verify job exists and is active
  const job = await Job.findByPk(jobId);

  if (!job || !job.dataValues.isActive || job.dataValues.status !== 'published') {
    throw new AppError(
      'Job not found or not available for applications',
      StatusCodes.NOT_FOUND,
      'ERR_JOB_NOT_FOUND',
    );
  }

  // Check if already applied
  const existingApplication = await Application.findOne({
    where: {
      candidateProfileId: candidateProfile.dataValues.id,
      jobId,
    },
  });

  if (existingApplication) {
    throw new AppError(
      'You have already applied to this job',
      StatusCodes.CONFLICT,
      'ERR_ALREADY_APPLIED',
    );
  }

  // Create application
  const application = await Application.create({
    candidateProfileId: candidateProfile.dataValues.id,
    jobId,
    coverLetter: data.coverLetter || null,
    status: 'pending',
  });

  logger.info(`Application created: candidate ${userId} applied to job ${jobId}`);
  return application;
};

/**
 * Save a job (Candidate only)
 */
export const saveJob = async (jobId: number, userId: number): Promise<JobSaved> => {
  // Get candidate profile
  const candidateProfile = await CandidateProfile.findOne({ where: { userId } });

  console.log('candidateProfile', candidateProfile);

  if (!candidateProfile) {
    throw new AppError(
      'Candidate profile not found',
      StatusCodes.NOT_FOUND,
      'ERR_CANDIDATE_NOT_FOUND',
    );
  }

  // Verify job exists and is active
  const job = await JobSaved.findByPk(jobId);

  if (job) {
    throw new AppError('Job already saved', StatusCodes.CONFLICT, 'ERR_JOB_ALREADY_SAVED');
  }

  // save application
  const saveApplication = await JobSaved.create({
    candidateProfileId: candidateProfile.dataValues.id,
    jobId,
  });

  logger.info(`Application created: candidate ${userId} applied to job ${jobId}`);
  return saveApplication;
};

/**
 * Get saved jobs (Candidate only)
 */
export const getSavedJobs = async (userId: number): Promise<JobSaved[]> => {
  const candidateProfile = await CandidateProfile.findOne({ where: { userId } });

  if (!candidateProfile) {
    throw new AppError(
      'Candidate profile not found',
      StatusCodes.NOT_FOUND,
      'ERR_CANDIDATE_NOT_FOUND',
    );
  }

  const savedJobs = await JobSaved.findAll({
    where: { candidateProfileId: candidateProfile.dataValues.id },
    include: [{ association: 'job' }],
  });

  return savedJobs;
};

/**
 * Get candidate's applications (Candidate only)
 */
export const getCandidateApplications = async (userId: number): Promise<Application[]> => {
  const candidateProfile = await CandidateProfile.findOne({ where: { userId } });
  console.log('candidateProfile', candidateProfile);
  if (!candidateProfile) {
    throw new AppError(
      'Candidate profile not found',
      StatusCodes.NOT_FOUND,
      'ERR_CANDIDATE_NOT_FOUND',
    );
  }

  const applications = await Application.findAll({
    where: { candidateProfileId: candidateProfile.dataValues.id },
    include: [
      {
        association: 'job',
        attributes: [
          'id',
          'title',
          'description',
          'location',
          'employmentType',
          'salaryMin',
          'salaryMax',
          'currency',
          'status',
        ],
        include: [
          {
            association: 'employerProfile',
            attributes: ['companyName', 'location', 'industry'],
          },
          {
            association: 'skills',
            attributes: ['name'],
          },
        ],
      },
    ],
    order: [['appliedAt', 'DESC']],
  });

  return applications;
};

/**
 * Get employer's jobs with application counts (Employer only)
 */
export const getEmployerJobs = async (
  userId: number,
  filters: any = {},
): Promise<{ jobs: any[]; total: number; page: number; limit: number }> => {
  const employerProfile = await EmployerProfile.findOne({ where: { userId } });

  if (!employerProfile) {
    throw new AppError(
      'Employer profile not found',
      StatusCodes.NOT_FOUND,
      'ERR_EMPLOYER_NOT_FOUND',
    );
  }

  const {
    page = 1,
    limit = 20,
    category,
    location,
    employmentType,
    workMode,
    experienceLevel,
    status,
    jobVisibility,
    salaryMin,
    salaryMax,
    keyword,
    title,
    skills,
    id,
  } = filters;

  const where: any = { employerProfileId: employerProfile.dataValues.id };

  if (id) where.id = id;
  if (category) where.category = category;
  if (location) where.location = { [Op.iLike]: `%${location}%` };
  if (workMode) where.workMode = workMode;
  if (experienceLevel) where.experienceLevel = experienceLevel;
  if (status) where.status = status;
  if (jobVisibility) where.jobVisibility = jobVisibility;

  if (employmentType) {
    where.employmentType = Array.isArray(employmentType)
      ? { [Op.in]: employmentType }
      : employmentType;
  }

  if (salaryMin !== undefined) {
    where.salaryMin = { [Op.gte]: salaryMin };
  }
  if (salaryMax !== undefined) {
    where.salaryMax = { [Op.lte]: salaryMax };
  }

  if (title) {
    where.title = { [Op.iLike]: `%${title}%` };
  }

  if (keyword) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${keyword}%` } },
      { description: { [Op.iLike]: `%${keyword}%` } },
    ];
  }

  const include: any[] = [];

  if (skills) {
    const skillArray = Array.isArray(skills) ? skills : [skills];
    include.push({
      association: 'skills',
      where: { name: { [Op.in]: skillArray } },
      attributes: ['name'],
      through: { attributes: [] },
    });
  } else {
    include.push({
      association: 'skills',
      attributes: ['name'],
      through: { attributes: ['required', 'proficiencyLevel'] },
    });
  }

  // Always include nice-to-have skills
  include.push({
    association: 'niceToHaveSkills',
    attributes: ['name'],
    through: { attributes: ['proficiencyLevel'] },
  });

  const { rows: jobs, count } = await Job.findAndCountAll({
    where,
    attributes: {
      include: [
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM application AS app
            WHERE app.job_id = "Job".id
          )`),
          'applicationCount',
        ],
      ],
    },
    include,
    distinct: true,
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit.toString()),
    offset: (parseInt(page.toString()) - 1) * parseInt(limit.toString()),
  });

  return {
    jobs,
    total: count,
    page: parseInt(page.toString()),
    limit: parseInt(limit.toString()),
  };
};

/**
 * Get applications for a specific job (Employer only - ownership check)
 */
export const getJobApplications = async (jobId: number, userId: number): Promise<any[]> => {
  const employerProfile = await EmployerProfile.findOne({ where: { userId } });

  if (!employerProfile) {
    throw new AppError(
      'Employer profile not found',
      StatusCodes.NOT_FOUND,
      'ERR_EMPLOYER_NOT_FOUND',
    );
  }

  const job = await Job.findByPk(jobId);

  if (!job) {
    throw new AppError('Job not found', StatusCodes.NOT_FOUND, 'ERR_JOB_NOT_FOUND');
  }

  if (job.dataValues.employerProfileId !== employerProfile.dataValues.id) {
    throw new AppError(
      'You do not have permission to view applications for this job',
      StatusCodes.FORBIDDEN,
      'ERR_FORBIDDEN',
    );
  }

  const applications = await Application.findAll({
    where: { jobId },
    include: [
      {
        association: 'candidateProfile',
        include: [
          {
            association: 'candidate',
            attributes: ['firstName', 'lastName', 'email'],
          },
          {
            association: 'skills',
            attributes: ['name'],
          },
        ],
      },
      {
        association: 'resume',
        attributes: ['id', 'originalName', 'fileSize', 'mimeType', 'uploadedAt'],
      },
    ],
    order: [['appliedAt', 'DESC']],
  });

  // Enhance applications with AI ratings
  // const enhancedApplications = await Promise.all(
  //   applications.map(async (app) => {
  //     const appData = app.toJSON() as any;

  //     try {
  //       if (app.dataValues.resumeId) {
  //         // Calculate/fetch rating
  //         const rating = await rateResumeForJob(app.dataValues.resumeId, jobId);
  //         appData.aiRating = rating;
  //       }
  //     } catch (error) {
  //       logger.error(`Failed to calculate rating for application ${app.id}:`, error);
  //       appData.aiRating = null;
  //     }

  //     return appData;
  //   })
  // );

  // return enhancedApplications;
  return applications;
};

/**
 * Update application status and trigger notifications
 */
export const updateApplicationStatus = async (
  applicationId: number,
  userId: number, // HR or Employer performing the update
  status: Application['status'],
): Promise<Application> => {
  const application = await Application.findByPk(applicationId, {
    include: [
      { model: Job, as: 'job' },
      {
        model: BenchResource,
        as: 'benchResource',
        include: [{ model: EmployerProfile, as: 'employerProfile' }],
      },
    ],
  });

  if (!application) {
    throw new AppError('Application not found', StatusCodes.NOT_FOUND, 'ERR_APP_NOT_FOUND');
  }

  // Get user performing the action
  const performingUser = await BusinessUser.findByPk(userId);
  if (!performingUser) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'ERR_USER_NOT_FOUND');
  }

  // Permission check: Only HR or the Job Owner (Employer) can update status
  const employerProfile = await EmployerProfile.findOne({ where: { userId } });
  if (
    performingUser.role !== 'hr' &&
    (!employerProfile || application.job?.employerProfileId !== employerProfile.id)
  ) {
    throw new AppError(
      'You do not have permission to update this application',
      StatusCodes.FORBIDDEN,
      'ERR_PERMISSION_DENIED',
    );
  }

  const oldStatus = application.status;
  application.status = status;
  await application.save();

  // Notification logic
  if (application.benchResourceId && (status === 'shortlisted' || status === 'selected')) {
    const benchResource = application.benchResource;
    if (benchResource && benchResource.employerProfile) {
      const employerUserId = benchResource.employerProfile.userId;
      // In a real app, we'd call a NotificationService here
      logger.info(
        `NOTIFICATION: Employer ${employerUserId} notified that their bench resource ${benchResource.resourceName} was ${status} for job ${application.job?.title}`,
      );
    }
  }

  logger.info(
    `Application ${applicationId} status updated from ${oldStatus} to ${status} by user ${userId}`,
  );
  return application;
};
