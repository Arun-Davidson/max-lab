import { Op } from 'sequelize';
import fs from 'fs/promises';
import { BenchResource } from '../models';
import { AppError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';
import logger from '../config/logger';

/**
 * Create a new bench resource
 */
export const createBenchResource = async (
  employerProfileId: number,
  data: {
    resourceName: string;
    currentRole: string;
    designation?: string;
    totalExperience: number;
    employeeId: string;
    refCode?: string;
    email?: string;
    technicalSkills: string[];
    professionalSummary?: string;
    hourlyRate: number;
    currency: string;
    availableFrom: Date;
    minimumContractDuration: number;
    deploymentPreference: string[];
    location?: string;
    category?: string;
    certifications?: string[];
    requireNonSolicitation?: boolean;
    availableForDeployment?: Date;
  },
  resumeFile?: Express.Multer.File,
): Promise<BenchResource> => {
  try {
    const benchResource = await BenchResource.create({
      employerProfileId,
      resourceName: data.resourceName,
      currentRole: data.currentRole,
      designation: data.designation || null,
      totalExperience: data.totalExperience,
      employeeId: data.employeeId,
      refCode: data.refCode || null,
      email: data.email || null,
      technicalSkills: data.technicalSkills,
      professionalSummary: data.professionalSummary || null,
      hourlyRate: data.hourlyRate,
      currency: data.currency || 'USD',
      availableFrom: data.availableFrom,
      minimumContractDuration: data.minimumContractDuration,
      deploymentPreference: data.deploymentPreference,
      location: data.location || null,
      category: data.category || null,
      certifications: data.certifications || [],
      requireNonSolicitation: data.requireNonSolicitation || false,
      availableForDeployment: data.availableForDeployment || null,
      resumePath: resumeFile?.path || null,
      resumeOriginalName: resumeFile?.originalname || null,
    });

    logger.info(`Bench resource created: ${benchResource.id} for employer ${employerProfileId}`);
    return benchResource;
  } catch (error) {
    // If there was an error and a file was uploaded, clean it up
    if (resumeFile?.path) {
      try {
        await fs.unlink(resumeFile.path);
      } catch (unlinkError) {
        logger.warn(`Failed to delete resume file after error: ${resumeFile.path}`, unlinkError);
      }
    }
    throw error;
  }
};

/**
 * Get all bench resources for an employer with filtering and pagination
 */
export const getBenchResources = async (
  employerProfileId?: number,
  filters: {
    search?: string;
    skills?: string[];
    deploymentPreference?: string;
    minExperience?: number;
    maxExperience?: number;
    minRate?: number;
    maxRate?: number;
    currency?: string;
    availableFrom?: Date;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {},
): Promise<{ resources: BenchResource[]; total: number; page: number; totalPages: number }> => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  const where: any = {
    isActive: filters.isActive !== undefined ? filters.isActive : true,
  };

  if (employerProfileId) {
    where.employerProfileId = employerProfileId;
  }

  // Search filter (name or role)
  if (filters.search) {
    where[Op.or] = [
      { resourceName: { [Op.iLike]: `%${filters.search}%` } },
      { currentRole: { [Op.iLike]: `%${filters.search}%` } },
      { designation: { [Op.iLike]: `%${filters.search}%` } },
    ];
  }

  // Skills filter
  if (filters.skills && filters.skills.length > 0) {
    where.technicalSkills = { [Op.overlap]: filters.skills };
  }

  // Deployment preference - use array containment operator
  if (filters.deploymentPreference) {
    where.deploymentPreference = { [Op.contains]: [filters.deploymentPreference] };
  }

  // Experience range
  if (filters.minExperience !== undefined) {
    where.totalExperience = { ...where.totalExperience, [Op.gte]: filters.minExperience };
  }
  if (filters.maxExperience !== undefined) {
    where.totalExperience = { ...where.totalExperience, [Op.lte]: filters.maxExperience };
  }

  // Rate range
  if (filters.currency) {
    where.currency = filters.currency;
  }
  if (filters.minRate !== undefined) {
    where.hourlyRate = { ...where.hourlyRate, [Op.gte]: filters.minRate };
  }
  if (filters.maxRate !== undefined) {
    where.hourlyRate = { ...where.hourlyRate, [Op.lte]: filters.maxRate };
  }

  // Available from date
  if (filters.availableFrom) {
    where.availableFrom = { [Op.lte]: filters.availableFrom };
  }

  const { rows: resources, count: total } = await BenchResource.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });

  const totalPages = Math.ceil(total / limit);

  return {
    resources,
    total,
    page,
    totalPages,
  };
};

/**
 * Get a single bench resource by ID
 */
export const getBenchResourceById = async (
  id: number,
  employerProfileId?: number,
): Promise<BenchResource> => {
  const where: any = { id, isActive: true };
  if (employerProfileId) {
    where.employerProfileId = employerProfileId;
  }
  const resource = await BenchResource.findOne({
    where,
  });

  if (!resource) {
    throw new AppError('Bench resource not found', StatusCodes.NOT_FOUND, 'ERR_RESOURCE_NOT_FOUND');
  }

  return resource;
};

/**
 * Update a bench resource
 */
export const updateBenchResource = async (
  id: number,
  employerProfileId: number,
  data: Partial<{
    resourceName: string;
    currentRole: string;
    designation: string;
    totalExperience: number;
    employeeId: string;
    refCode: string;
    email: string;
    technicalSkills: string[];
    professionalSummary: string;
    hourlyRate: number;
    currency: string;
    availableFrom: Date;
    minimumContractDuration: number;
    deploymentPreference: string[];
    location: string;
    category: string;
    certifications: string[];
    requireNonSolicitation: boolean;
    availableForDeployment: Date;
  }>,
  resumeFile?: Express.Multer.File,
): Promise<BenchResource> => {
  const resource = await getBenchResourceById(id, employerProfileId);

  // Update fields
  if (data.resourceName !== undefined) resource.resourceName = data.resourceName;
  if (data.currentRole !== undefined) resource.currentRole = data.currentRole;
  if (data.designation !== undefined) resource.designation = data.designation;
  if (data.totalExperience !== undefined) resource.totalExperience = data.totalExperience;
  if (data.employeeId !== undefined) resource.employeeId = data.employeeId;
  if (data.refCode !== undefined) resource.refCode = data.refCode;
  if (data.email !== undefined) resource.email = data.email;
  if (data.technicalSkills !== undefined) resource.technicalSkills = data.technicalSkills;
  if (data.professionalSummary !== undefined)
    resource.professionalSummary = data.professionalSummary;
  if (data.hourlyRate !== undefined) resource.hourlyRate = data.hourlyRate;
  if (data.currency !== undefined) resource.currency = data.currency;
  if (data.availableFrom !== undefined) resource.availableFrom = data.availableFrom;
  if (data.minimumContractDuration !== undefined)
    resource.minimumContractDuration = data.minimumContractDuration;
  if (data.deploymentPreference !== undefined)
    resource.deploymentPreference = data.deploymentPreference;
  if (data.location !== undefined) resource.location = data.location;
  if (data.category !== undefined) resource.category = data.category;
  if (data.certifications !== undefined) resource.certifications = data.certifications;
  if (data.requireNonSolicitation !== undefined)
    resource.requireNonSolicitation = data.requireNonSolicitation;
  if (data.availableForDeployment !== undefined)
    resource.availableForDeployment = data.availableForDeployment;

  // Handle resume file update
  if (resumeFile) {
    // Delete old resume if exists
    if (resource.resumePath) {
      try {
        await fs.unlink(resource.resumePath);
      } catch (error) {
        logger.warn(`Failed to delete old resume: ${resource.resumePath}`, error);
      }
    }
    resource.resumePath = resumeFile.path;
    resource.resumeOriginalName = resumeFile.originalname;
  }

  await resource.save();
  logger.info(`Bench resource updated: ${id}`);
  return resource;
};

/**
 * Delete a bench resource (soft delete)
 */
export const deleteBenchResource = async (id: number, employerProfileId: number): Promise<void> => {
  const resource = await getBenchResourceById(id, employerProfileId);

  resource.isActive = false;
  await resource.save();

  logger.info(`Bench resource soft deleted: ${id}`);
};

/**
 * Get bench resource resume
 */
export const getBenchResourceResume = async (
  id: number,
  employerProfileId?: number,
): Promise<{ filePath: string; originalName: string }> => {
  const resource = await getBenchResourceById(id, employerProfileId);

  if (!resource.resumePath || !resource.resumeOriginalName) {
    throw new AppError(
      'Resume not found for this resource',
      StatusCodes.NOT_FOUND,
      'ERR_RESUME_NOT_FOUND',
    );
  }

  return {
    filePath: resource.resumePath,
    originalName: resource.resumeOriginalName,
  };
};
