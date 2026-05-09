import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthRequest } from '../middleware/authMiddleware';
import * as jobService from '../services/job.service';
import { AppError } from '../middleware/errorHandler';

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     tags:
 *       - Job Management
 *     summary: Create a new job posting (Employer only)
 *     description: Create a new job posting with skills
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - employmentType
 *             properties:
 *               title:
 *                 type: string
 *                 example: Senior Full Stack Developer
 *               description:
 *                 type: string
 *                 example: We are looking for an experienced full stack developer...
 *               category:
 *                 type: string
 *                 example: Engineering
 *               location:
 *                 type: string
 *                 example: San Francisco, CA
 *               employmentType:
 *                 type: string
 *                 enum: [full-time, part-time, contract, remote, hybrid, onsite]
 *                 example: full-time
 *               salaryMin:
 *                 type: number
 *                 example: 120000
 *               salaryMax:
 *                 type: number
 *                 example: 180000
 *               currency:
 *                 type: string
 *                 default: USD
 *                 example: USD
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["JavaScript", "React", "Node.js", "PostgreSQL"]
 *               aiMatchingEnabled:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Job created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Employer role required
 */
export const createJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const job = await jobService.createJob(req.user.dataValues.id, req.body);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Job created successfully',
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/jobs/draft:
 *   post:
 *     tags:
 *       - Job Management
 *     summary: Save a job as draft (Employer only)
 *     description: Create a new job post in draft status
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Job'
 *     responses:
 *       201:
 *         description: Job saved as draft successfully
 */
export const saveJobAsDraft = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    // Explicitly set status to draft
    const jobData = { ...req.body, status: 'draft' };
    const job = await jobService.createJob(req.user.dataValues.id, jobData);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Job saved as draft successfully',
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     tags:
 *       - Job Management
 *     summary: Get all active jobs with filtering
 *     description: Retrieve paginated list of published active jobs with optional filters
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: employmentType
 *         schema:
 *           type: string
 *           enum: [full-time, part-time, contract, remote, hybrid, onsite]
 *       - in: query
 *         name: salaryMin
 *         schema:
 *           type: number
 *       - in: query
 *         name: salaryMax
 *         schema:
 *           type: number
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *           description: Comma-separated skill names
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 */
export const getJobs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      category: req.query.category as string,
      location: req.query.location as string,
      employmentType: req.query.employmentType as string | string[],
      jobVisibility: req.query.jobVisibility as 'public' | 'private' | 'all',
      salaryMin: req.query.salaryMin ? parseFloat(req.query.salaryMin as string) : undefined,
      salaryMax: req.query.salaryMax ? parseFloat(req.query.salaryMax as string) : undefined,
      keyword: req.query.keyword as string,
      skills: req.query.skills
        ? typeof req.query.skills === 'string'
          ? req.query.skills.split(',')
          : (req.query.skills as string[])
        : undefined,
      id: req.query.id ? req.query.id : undefined,
    };

    // console.log('___________________________')
    // console.log(filters)
    // console.log('___________________________')

    const result = await jobService.getJobs(filters);

    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     tags:
 *       - Job Management
 *     summary: Get job details by ID
 *     description: Retrieve full job details including employer info and skills
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Job details retrieved successfully
 *       404:
 *         description: Job not found
 */
export const getJobById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const job = await jobService.getJobById(jobId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     tags:
 *       - Job Management
 *     summary: Update job (Employer only)
 *     description: Update job details - only the employer who created it
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               location:
 *                 type: string
 *               employmentType:
 *                 type: string
 *                 enum: [full-time, part-time, contract, remote, hybrid, onsite]
 *               salaryMin:
 *                 type: number
 *               salaryMax:
 *                 type: number
 *               currency:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               aiMatchingEnabled:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, published, closed]
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       403:
 *         description: Forbidden - Not the job owner
 *       404:
 *         description: Job not found
 */
export const updateJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const jobId = parseInt(req.params.id, 10);
    const job = await jobService.updateJob(jobId, req.user.dataValues.id, req.body);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Job updated successfully',
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     tags:
 *       - Job Management
 *     summary: Delete job (Employer only)
 *     description: Soft delete job - sets isActive to false
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *       403:
 *         description: Forbidden - Not the job owner
 *       404:
 *         description: Job not found
 */
export const deleteJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const jobId = parseInt(req.params.id, 10);
    await jobService.deleteJob(jobId, req.user.dataValues.id);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/jobs/{id}/apply:
 *   post:
 *     tags:
 *       - Job Management - Applications
 *     summary: Apply to a job (Candidate only)
 *     description: Submit an application to a job posting
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coverLetter:
 *                 type: string
 *                 example: I am very interested in this position...
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       409:
 *         description: Already applied to this job
 *       404:
 *         description: Job not found
 */
export const applyToJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const jobId = parseInt(req.params.id, 10);
    const application = await jobService.applyToJob(jobId, req.user.dataValues.id, req.body);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/jobs/{id}/save:
 *   post:
 *     tags:
 *       - Job Management - Applications
 *     summary: Save a job (Candidate only)
 *     description: Save a job posting
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       409:
 *         description: Already applied to this job
 *       404:
 *         description: Job not found
 */
export const saveToJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const jobId = parseInt(req.params.id, 10);
    const application = await jobService.saveJob(jobId, req.user.dataValues.id);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/jobs/save:
 *   get:
 *     tags:
 *       - Job Management - Applications
 *     summary: Get saved jobs (Candidate only)
 *     description: Retrieve list of saved jobs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 */

export const getSavedJobs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    console.log('---------------------------------');

    console.log('first');
    console.log('---------------------------------');
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    console.log(req.user);

    const jobs = await jobService.getSavedJobs(req.user.dataValues.id);

    console.log(jobs, 'jobs');
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Jobs retrieved successfully',
      data: jobs,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

/**
 * @swagger
 * /api/candidates/applications:
 *   get:
 *     tags:
 *       - Job Management - Applications
 *     summary: Get candidate's applications (Candidate only)
 *     description: Retrieve all jobs the candidate has applied to with application status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Candidate role required
 */
export const getCandidateApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const applications = await jobService.getCandidateApplications(req.user.dataValues.id);

    res.status(StatusCodes.OK).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/employers/jobs:
 *   get:
 *     tags:
 *       - Job Management - Employer
 *     summary: Get employer's jobs (Employer only)
 *     description: Retrieve all jobs posted by the employer with application counts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Employer role required
 */
export const getEmployerJobs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }
    const filters = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      category: req.query.category as string,
      location: req.query.location as string,
      employmentType: req.query.employmentType as string | string[],
      workMode: req.query.workMode as string,
      experienceLevel: req.query.experienceLevel as string,
      status: req.query.status as string,
      jobVisibility: req.query.jobVisibility as 'public' | 'private' | 'all',
      salaryMin: req.query.salaryMin ? parseFloat(req.query.salaryMin as string) : undefined,
      salaryMax: req.query.salaryMax ? parseFloat(req.query.salaryMax as string) : undefined,
      keyword: req.query.keyword as string,
      title: req.query.title as string,
      skills: req.query.skills
        ? typeof req.query.skills === 'string'
          ? req.query.skills.split(',')
          : (req.query.skills as string[])
        : undefined,
      id: req.query.id ? req.query.id : undefined,
    };

    const result = await jobService.getEmployerJobs(req.user.dataValues.id, filters);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Employer jobs fetched successfully',
      data: result.jobs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/employers/jobs/{id}/applications:
 *   get:
 *     tags:
 *       - Job Management - Employer
 *     summary: Get job applications with AI ratings (Employer only)
 *     description: Retrieve all applications for a specific job along with AI resume ratings. Only the job owner can access this.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the job owner
 *       404:
 *         description: Job or Employer profile not found
 */
export const getJobApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const jobId = parseInt(req.params.id, 10);
    const applications = await jobService.getJobApplications(jobId, req.user.dataValues.id);

    res.status(StatusCodes.OK).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PATCH /api/applications/:id/status
 * @desc Update application status
 * @access Private (HR or Job Owner)
 */
export const updateApplicationStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const applicationId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!status) {
      throw new AppError('Status is required', StatusCodes.BAD_REQUEST, 'ERR_STATUS_REQUIRED');
    }

    const application = await jobService.updateApplicationStatus(
      applicationId,
      req.user.dataValues.id,
      status,
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Application status updated successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};
