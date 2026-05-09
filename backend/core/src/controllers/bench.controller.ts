import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import path from 'path';
import { AuthRequest } from '../middleware/authMiddleware';
import * as benchService from '../services/bench.service';
import * as jobboardService from '../services/jobboard.service';
import { EmployerProfile } from '../models';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';

/**
 * @route POST /api/v1/employers/post-bench-resource
 * @desc Create a new bench resource
 * @access Private (Employer only)
 */
export const createBenchResource = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    console.log(req.user, 'req.user');
    // Get employer profile ID
    let employerProfileId = (req.user as any).employerProfile?.id;

    if (!employerProfileId) {
      const profile = await EmployerProfile.findOne({ where: { userId: req.user.id } });
      employerProfileId = profile?.id;
    }

    if (!employerProfileId) {
      throw new AppError(
        'Employer profile not found',
        StatusCodes.NOT_FOUND,
        'ERR_EMPLOYER_NOT_FOUND',
      );
    }

    // Parse technical skills if provided as string
    let technicalSkills = req.body.technicalSkills;
    if (typeof technicalSkills === 'string') {
      try {
        technicalSkills = JSON.parse(technicalSkills);
      } catch (e) {
        throw new AppError(
          'Invalid technicalSkills format',
          StatusCodes.BAD_REQUEST,
          'ERR_INVALID_SKILLS',
        );
      }
    }

    // Help parsing experience range (e.g., "0-1" -> 1)
    const parseExperience = (exp: any): number => {
      if (typeof exp === 'number') return exp;
      if (typeof exp === 'string') {
        const match = exp.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      }
      return 0;
    };

    // Help parsing duration (e.g., "1 Month" -> 1)
    const parseDuration = (dur: any) => {
      if (typeof dur === 'number') return dur;
      if (typeof dur === 'string') {
        const match = dur.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 1;
      }
      return 1;
    };

    // Help parsing deployment preference
    const parseDeployment = (pref: any) => {
      if (Array.isArray(pref)) return pref.map((p) => String(p).toLowerCase());
      if (typeof pref === 'string') {
        try {
          const parsed = JSON.parse(pref);
          if (Array.isArray(parsed)) return parsed.map((p) => String(p).toLowerCase());
        } catch (e) {
          return [pref.toLowerCase()];
        }
      }
      return ['hybrid'];
    };

    const benchResource = await benchService.createBenchResource(
      employerProfileId,
      {
        resourceName: req.body.resourceName,
        currentRole: req.body.currentRole,
        availableForDeployment: req.body.availableForDeployment
          ? new Date(req.body.availableForDeployment)
          : undefined,
        designation: req.body.designation,
        email: req.body.email,
        totalExperience: parseExperience(req.body.totalExperience),
        employeeId: req.body.employeeId || `EMP-${Date.now()}`,
        refCode: req.body.refCode,
        technicalSkills: technicalSkills || [],
        professionalSummary: req.body.professionalSummary,
        hourlyRate: parseFloat(req.body.hourlyRate),
        currency: req.body.currency || 'USD',
        availableFrom: req.body.availableFrom
          ? new Date(req.body.availableFrom)
          : req.body.availableForDeployment
            ? new Date(req.body.availableForDeployment)
            : new Date(),
        minimumContractDuration: parseDuration(req.body.minimumContractDuration),
        deploymentPreference: parseDeployment(req.body.deploymentPreference),
        location: req.body.location,
        category: req.body.category,
        requireNonSolicitation:
          req.body.requireNonSolicitation === true || req.body.requireNonSolicitation === 'true',
        certifications:
          typeof req.body.certifications === 'string'
            ? JSON.parse(req.body.certifications)
            : req.body.certifications || [],
      },
      req.file,
    );

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Bench resource created successfully',
      data: benchResource,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/employers/bench-resources
 * @desc Get all bench resources for the logged-in employer
 * @access Private (Employer only)
 */
export const getBenchResources = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    let employerProfileId = (req.user as any).employerProfile?.id;

    if (!employerProfileId) {
      const profile = await EmployerProfile.findOne({ where: { userId: req.user.id } });
      employerProfileId = profile?.id;
    }

    // Visibility logic:
    // HR can see all resources.
    // Employer with canPostJob can see all resources.
    // Employer without canPostJob can only see their own.
    const canPostJob = (req.user as any).permissions?.canPostJob;
    const isAuthorized = canPostJob || (req.user as any).admin;

    const filterEmployerId = isAuthorized ? undefined : employerProfileId;

    // Parse query parameters
    const skills = req.query.skills ? String(req.query.skills).split(',') : undefined;
    const filters = {
      search: req.query.search as string,
      skills,
      deploymentPreference: req.query.deploymentPreference as string,
      minExperience: req.query.minExperience
        ? parseFloat(req.query.minExperience as string)
        : undefined,
      maxExperience: req.query.maxExperience
        ? parseFloat(req.query.maxExperience as string)
        : undefined,
      minRate: req.query.minRate ? parseFloat(req.query.minRate as string) : undefined,
      maxRate: req.query.maxRate ? parseFloat(req.query.maxRate as string) : undefined,
      currency: req.query.currency as string,
      availableFrom: req.query.availableFrom
        ? new Date(req.query.availableFrom as string)
        : undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : true,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    // @ts-ignore
    const result = await benchService.getBenchResources(filterEmployerId, filters);

    res.status(StatusCodes.OK).json({
      success: true,
      data: result.resources,
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
 * @route GET /api/v1/employers/bench-resources/:id
 * @desc Get a single bench resource by ID
 * @access Private (Employer only)
 */
export const getBenchResourceById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const user = req.user as any;

    let employerProfileId = user.employerProfile?.id;

    if (!employerProfileId) {
      const profile = await EmployerProfile.findOne({ where: { userId: req.user.id } });
      employerProfileId = profile?.id;
    }

    // Visibility logic
    const canSeeAll =
      user.admin ||
      user.role === 'hr' ||
      (user.role === 'employer' && user.permissions?.dataValues?.canPostJob);
    if (canSeeAll) {
      employerProfileId = undefined;
    }

    const id = parseInt(req.params.id, 10);
    const resource = await benchService.getBenchResourceById(id, employerProfileId);

    // Record the view asynchronously
    if (req.user) {
      jobboardService.recordProfileView(id, req.user.dataValues.id, 'bench');
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/v1/employers/bench-resources/:id
 * @desc Update a bench resource
 * @access Private (Employer only)
 */
export const updateBenchResource = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    // const employerProfileId = (req.user as any).employerProfile?.id;
    let employerProfileId = (req.user as any).employerProfile?.id;

    if (!employerProfileId) {
      const profile = await EmployerProfile.findOne({ where: { userId: req.user.id } });
      employerProfileId = profile?.id;
    }

    if (!employerProfileId) {
      throw new AppError(
        'Employer profile not found',
        StatusCodes.NOT_FOUND,
        'ERR_EMPLOYER_NOT_FOUND',
      );
    }

    const id = parseInt(req.params.id, 10);

    // Parse technical skills if provided as string
    let technicalSkills = req.body.technicalSkills;
    if (technicalSkills && typeof technicalSkills === 'string') {
      try {
        technicalSkills = JSON.parse(technicalSkills);
      } catch (e) {
        throw new AppError(
          'Invalid technicalSkills format',
          StatusCodes.BAD_REQUEST,
          'ERR_INVALID_SKILLS',
        );
      }
    }

    // Help parsing functions
    const parseExperience = (exp: any): number => {
      if (typeof exp === 'number') return exp;
      if (typeof exp === 'string') {
        const match = exp.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      }
      return 0;
    };

    const parseDuration = (dur: any) => {
      if (typeof dur === 'number') return dur;
      if (typeof dur === 'string') {
        const match = dur.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 1;
      }
      return 1;
    };

    const parseDeployment = (pref: any) => {
      if (Array.isArray(pref)) return pref.map((p) => String(p).toLowerCase());
      if (typeof pref === 'string') {
        try {
          const parsed = JSON.parse(pref);
          if (Array.isArray(parsed)) return parsed.map((p) => String(p).toLowerCase());
        } catch (e) {
          return [pref.toLowerCase()];
        }
      }
      return ['hybrid'];
    };

    const updateData: any = {};
    if (req.body.resourceName !== undefined) updateData.resourceName = req.body.resourceName;
    if (req.body.currentRole !== undefined) updateData.currentRole = req.body.currentRole;
    if (req.body.designation !== undefined) updateData.designation = req.body.designation;
    if (req.body.totalExperience !== undefined)
      updateData.totalExperience = parseExperience(req.body.totalExperience);
    if (req.body.employeeId !== undefined) updateData.employeeId = req.body.employeeId;
    if (req.body.refCode !== undefined) updateData.refCode = req.body.refCode;
    if (technicalSkills !== undefined) updateData.technicalSkills = technicalSkills;
    if (req.body.professionalSummary !== undefined)
      updateData.professionalSummary = req.body.professionalSummary;
    if (req.body.hourlyRate !== undefined) updateData.hourlyRate = parseFloat(req.body.hourlyRate);
    if (req.body.currency !== undefined) updateData.currency = req.body.currency;
    if (req.body.availableFrom !== undefined || req.body.availableForDeployment !== undefined) {
      const dateToUse = req.body.availableFrom || req.body.availableForDeployment;
      if (dateToUse) updateData.availableFrom = new Date(dateToUse);
    }
    if (req.body.availableFrom !== undefined)
      updateData.availableFrom = new Date(req.body.availableFrom);
    if (req.body.minimumContractDuration !== undefined) {
      updateData.minimumContractDuration = parseDuration(req.body.minimumContractDuration);
    }
    if (req.body.deploymentPreference !== undefined) {
      updateData.deploymentPreference = parseDeployment(req.body.deploymentPreference);
    }
    if (req.body.requireNonSolicitation !== undefined) {
      updateData.requireNonSolicitation =
        req.body.requireNonSolicitation === true || req.body.requireNonSolicitation === 'true';
    }
    if (req.body.location !== undefined) updateData.location = req.body.location;
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.availableForDeployment !== undefined) {
      updateData.availableForDeployment = req.body.availableForDeployment
        ? new Date(req.body.availableForDeployment)
        : null;
    }
    if (req.body.certifications !== undefined) {
      updateData.certifications =
        typeof req.body.certifications === 'string'
          ? JSON.parse(req.body.certifications)
          : req.body.certifications;
    }

    const resource = await benchService.updateBenchResource(
      id,
      employerProfileId,
      updateData,
      req.file,
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Bench resource updated successfully',
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/v1/employers/bench-resources/:id
 * @desc Delete (soft delete) a bench resource
 * @access Private (Employer only)
 */
export const deleteBenchResource = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    // const employerProfileId = (req.user as any).employerProfile?.id;
    let employerProfileId = (req.user as any).employerProfile?.id;

    if (!employerProfileId) {
      const profile = await EmployerProfile.findOne({ where: { userId: req.user.id } });
      employerProfileId = profile?.id;
    }

    if (!employerProfileId) {
      throw new AppError(
        'Employer profile not found',
        StatusCodes.NOT_FOUND,
        'ERR_EMPLOYER_NOT_FOUND',
      );
    }

    const id = parseInt(req.params.id, 10);
    await benchService.deleteBenchResource(id, employerProfileId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Bench resource deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/employers/bench-resources/:id/resume
 * @desc Download bench resource resume
 * @access Private (Employer only)
 */
export const getBenchResourceResume = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED, 'ERR_NOT_AUTH');
    }

    const user = req.user as any;

    let employerProfileId: number | undefined = (req.user as any).employerProfile?.id;

    if (!employerProfileId) {
      const profile = await EmployerProfile.findOne({ where: { userId: req.user.id } });
      employerProfileId = profile?.id;
    }

    const canSeeAll =
      user.admin ||
      user.role === 'hr' ||
      (user.role === 'employer' && user.permissions?.dataValues?.canPostJob);
    if (canSeeAll) {
      employerProfileId = undefined;
    }

    const id = parseInt(req.params.id, 10);
    // @ts-ignore - Support HR/authorized employer viewing all
    const { filePath, originalName } = await benchService.getBenchResourceResume(
      id,
      employerProfileId,
    );

    // Convert relative path to absolute path (res.sendFile requires absolute path)
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

    // Sanitize filename
    // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional control-char stripping
    const sanitizedFilename = originalName.replace(/[\x00-\x1F\x7F]/g, '').replace(/["\\/]/g, '_');

    const encodedFilename = encodeURIComponent(sanitizedFilename);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${sanitizedFilename}"; filename*=UTF-8''${encodedFilename}`,
    );

    res.sendFile(absolutePath, (err) => {
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
