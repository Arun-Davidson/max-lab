import { Op, Transaction } from 'sequelize';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import {
  User,
  Candidate,
  BusinessUser,
  CandidateProfile,
  EmployerProfile,
  EmployerPermission,
  Skill,
  CandidateSkill,
  Resume,
  PasswordReset,
  WorkExperience,
  Project,
  Certification,
  ProfileView,
  BenchResource,
  sequelize,
} from '../models';
import { AppError } from '../middleware/errorHandler';
import { StatusCodes } from 'http-status-codes';
import logger from '../config/logger';
import emailService from './email.service';

/**
 * Register a new candidate with profile and skills
 */
export const registerCandidate = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  location?: string;
  candidateType?: 'Full-Time Job Seeker' | 'Contract / Freelance' | 'Hybrid Professional';
  skills?: string[];
  bio?: string;
  yearsExperience?: number;
  availableIn?: 'Immediate' | '15 Days' | '30 Days';
  englishProficiency?: 'Basic' | 'Professional' | 'Fluent' | 'Native';
  headline?: string;
  resourceType?: string;
}): Promise<{ user: User; candidateProfile: CandidateProfile }> => {
  const transaction: Transaction = await sequelize.transaction();
  let isCommitted = false;

  try {
    // Check if user already exists across all tables
    const existingUser =
      (await User.findOne({ where: { email: data.email } })) ||
      (await Candidate.findOne({ where: { email: data.email } })) ||
      (await BusinessUser.findOne({ where: { email: data.email } }));
    if (existingUser) {
      throw new AppError('Email already registered', StatusCodes.CONFLICT, 'ERR_EMAIL_EXISTS');
    }

    // Create user
    const user = await User.create(
      {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'candidate',
        status: 'active',
      },
      { transaction },
    );

    // Set password
    await user.setPassword(data.password);
    // await user.save({ transaction });
    console.log('User created:', user);
    // Create candidate profile
    const candidateProfile = await CandidateProfile.create(
      {
        userId: user.dataValues.id,
        location: data.location || null,
        candidateType: data.candidateType || 'Full-Time Job Seeker',
        bio: data.bio || null,
        yearsExperience: data.yearsExperience || null,
        availableIn: data.availableIn || 'Immediate',
        englishProficiency: data.englishProficiency || 'Basic',
        headline: data.headline || '',
        resourceType: data.resourceType || '',
      },
      { transaction },
    );

    // Handle skills if provided
    if (data.skills && data.skills.length > 0) {
      for (const skillName of data.skills) {
        // Find or create skill
        const [skill] = await Skill.findOrCreate({
          where: { name: skillName.trim() },
          defaults: { name: skillName.trim() },
          transaction,
        });

        // Associate skill with candidate
        await CandidateSkill.create(
          {
            candidateProfileId: candidateProfile.dataValues.id,
            skillId: skill.dataValues.id,
          },
          { transaction },
        );
      }
    }

    await transaction.commit();
    isCommitted = true;
    logger.info(`Candidate registered: ${user.dataValues.email}`);

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(user.dataValues.email, user.dataValues.firstName).catch((err) => {
      logger.error(`Failed to send welcome email to ${user.dataValues.email}:`, err);
    });

    return { user, candidateProfile };
  } catch (error) {
    // Only rollback if transaction hasn't been committed
    if (!isCommitted) {
      await transaction.rollback();
    }
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Registration error details:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    logger.error('Error registering candidate:', error);
    throw new AppError(
      'Failed to register candidate',
      StatusCodes.INTERNAL_SERVER_ERROR,
      'ERR_REGISTRATION_FAILED',
    );
  }
};

/**
 * Register a new employer with profile
 */
export const registerEmployer = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  industry?: string;
  location?: string;
  companySize?: string;
  website?: string;
  description?: string;
}): Promise<{ user: User; employerProfile: EmployerProfile }> => {
  const transaction: Transaction = await sequelize.transaction();
  let isCommitted = false;

  try {
    // Check if user already exists across all tables
    const existingUser =
      (await User.findOne({ where: { email: data.email } })) ||
      (await Candidate.findOne({ where: { email: data.email } })) ||
      (await BusinessUser.findOne({ where: { email: data.email } }));
    if (existingUser) {
      throw new AppError('Email already registered', StatusCodes.CONFLICT, 'ERR_EMAIL_EXISTS');
    }

    // Create user
    const user = await User.create(
      {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'employer',
        status: 'active',
      },
      { transaction },
    );

    // Set password
    await user.setPassword(data.password);
    // await user.save({ transaction });

    // Create employer profile
    const employerProfile = await EmployerProfile.create(
      {
        userId: user.dataValues.id,
        companyName: data.companyName,
        industry: data.industry || null,
        location: data.location || null,
        companySize: data.companySize || null,
        website: data.website || null,
        description: data.description || null,
      },
      { transaction },
    );

    // Create employer permissions (default: free plan, no premium features)
    await EmployerPermission.create(
      {
        employerId: user.dataValues.id,
        canPostJob: true,
        canBrowseTalent: true,
        canManageBench: true,
        canCreateBench: true,
        plan: 'free',
      },
      { transaction },
    );

    await transaction.commit();
    isCommitted = true;
    logger.info(`Employer registered: ${user.dataValues.email}`);

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(user.dataValues.email, user.dataValues.firstName).catch((err) => {
      logger.error(`Failed to send welcome email to ${user.dataValues.email}:`, err);
    });

    return { user, employerProfile };
  } catch (error) {
    // Only rollback if transaction hasn't been committed
    if (!isCommitted) {
      await transaction.rollback();
    }
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error registering employer:', error);
    throw new AppError(
      'Failed to register employer',
      StatusCodes.INTERNAL_SERVER_ERROR,
      'ERR_REGISTRATION_FAILED',
    );
  }
};

/**
 * Get full profile for a user (candidate or employer)
 */
export const getUserProfile = async (
  userId: number,
  userType?: 'candidate' | 'business' | 'employer' | 'hr',
) => {
  // Determine which model to use
  let Model: any = User;
  if (userType === 'candidate') {
    Model = Candidate;
  } else if (userType === 'business' || userType === 'employer' || userType === 'hr') {
    Model = BusinessUser;
  }

  // Build includes dynamically based on what the model supports
  const includes: any[] = [];

  if (Model === Candidate || Model === User) {
    includes.push({
      association: 'candidateProfile',
      include: [
        {
          association: 'skills',
          through: { attributes: ['proficiencyLevel'] },
        },
        {
          association: 'resumes',
          attributes: ['id', 'originalName', 'fileSize', 'mimeType', 'isDefault', 'uploadedAt'],
        },
        { association: 'workExperiences' },
        {
          association: 'projects',
          where: { isFeatured: true },
          required: false,
        },
        { association: 'certifications' },
      ],
    });
  }

  if (Model === BusinessUser || Model === User) {
    includes.push({
      association: 'employerProfile',
    });
  }

  const user = await Model.findByPk(userId, {
    attributes: { exclude: ['passwordHash'] },
    include: includes,
  });

  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'ERR_USER_NOT_FOUND');
  }

  // Add viewUrl to resumes
  const candidateProfile = (user as any).candidateProfile;
  if (candidateProfile?.resumes) {
    (user as any).candidateProfile.resumes = candidateProfile.resumes.map((resume: any) => {
      const resumeData = resume.toJSON ? resume.toJSON() : resume;
      return {
        ...resumeData,
        viewUrl: `/api/v1/jobboard/profile/resume/${resumeData.id}?view=inline`,
      };
    });
  }

  return user;
};

export const getCandidateProfileById = async (userId: number) => {
  // Find the user (Candidate or User table)
  const user = (await Candidate.findByPk(userId)) || (await User.findByPk(userId));

  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'ERR_USER_NOT_FOUND');
  }

  // Find candidate profile with all associations
  const candidateProfile = await CandidateProfile.findOne({
    where: { userId },
    include: [
      {
        model: Candidate,
        as: 'candidate',
        // attributes: ['id', 'email', 'firstName', 'lastName', 'mobileNumber'],
      },
      {
        model: WorkExperience,
        as: 'workExperiences',
      },
      {
        model: Project,
        as: 'projects',
      },
      {
        model: Certification,
        as: 'certifications',
      },
      {
        model: Resume,
        as: 'resumes',
      },
    ],
  });

  if (!candidateProfile) {
    throw new AppError(
      'Candidate profile not found',
      StatusCodes.NOT_FOUND,
      'ERR_PROFILE_NOT_FOUND',
    );
  }

  // Return the complete profile data
  const profileData: any = candidateProfile.get({ plain: true });
  const candidateData: any = profileData.candidate || user.get({ plain: true });

  return {
    id: profileData.id,
    userId: profileData.userId,
    email: candidateData.email,
    firstName: candidateData.firstName,
    lastName: candidateData.lastName,
    mobileNumber: profileData.mobileNumber || candidateData.mobileNumber,
    location: profileData.location,
    city: profileData.city,
    country: profileData.country,
    candidateType: profileData.candidateType,
    primaryJobRole: profileData.primaryJobRole,
    bio: profileData.bio,
    headline: profileData.headline,
    resourceType: profileData.resourceType,
    availability: profileData.availability,
    availableIn: profileData.availableIn,
    yearsExperience: profileData.yearsExperience,
    primarySkills: profileData.primarySkills,
    secondarySkills: profileData.secondarySkills,
    preferredWorkType: profileData.preferredWorkType,
    preferredJobLocations: profileData.preferredJobLocations,
    hourlyRateMin: profileData.hourlyRateMin,
    hourlyRateMax: profileData.hourlyRateMax,
    expectedSalaryMin: profileData.expectedSalaryMin,
    expectedSalaryMax: profileData.expectedSalaryMax,
    englishProficiency: profileData.englishProficiency,
    enableAiMatching: profileData.enableAiMatching,
    workExperiences: profileData.workExperiences || [],
    projects: profileData.projects || [],
    certifications: profileData.certifications || [],
    resumes: profileData.resumes || [],
    viewCount: profileData.viewCount,
    createdAt: profileData.createdAt,
    updatedAt: profileData.updatedAt,
  };
};

/**
 * Record a profile view by an employer/HR
 */
export const recordProfileView = async (
  targetId: number,
  viewerUserId: number,
  type: 'candidate' | 'bench' = 'candidate',
) => {
  try {
    let profile: any;

    if (type === 'candidate') {
      // First try finding by userId (this is what controllers often pass)
      profile = await CandidateProfile.findOne({ where: { userId: targetId } });

      // Fallback: search by profile primary key (id)
      if (!profile) {
        profile = await CandidateProfile.findByPk(targetId);
      }

      if (!profile) return;

      // Don't track if viewing own profile
      if (profile.userId === viewerUserId) return;

      // Create a view record
      await ProfileView.create({
        candidateProfileId: profile.id,
        benchResourceId: null,
        viewerId: viewerUserId,
      });

      // Increment count
      await profile.increment('viewCount');
    } else {
      // Bench Resource
      profile = await BenchResource.findByPk(targetId);
      if (!profile) return;

      // Create a view record
      await ProfileView.create({
        candidateProfileId: null,
        benchResourceId: profile.id,
        viewerId: viewerUserId,
      });

      // Increment count
      await profile.increment('viewCount');
    }

    logger.info(`Profile view recorded for ${type} ${targetId} by viewer ${viewerUserId}`);
  } catch (error) {
    // Log error but don't fail the request
    logger.error(`Error recording profile view for ${type} ${targetId}:`, error);
  }
};

/**
 * Update candidate profile
 */
export const updateCandidateProfile = async (
  userId: number,
  data: {
    // User fields
    firstName?: string;
    lastName?: string;
    email?: string;
    // Contact & Location
    mobileNumber?: string;
    location?: string;
    city?: string;
    country?: string;
    // Candidate Type & Role
    candidateType?: 'Full-Time Job Seeker' | 'Contract / Freelance' | 'Hybrid Professional';
    primaryJobRole?: string;

    // Skills & Experience
    bio?: string;
    yearsExperience?: number;
    primarySkills?: string[];
    secondarySkills?: string[];
    skills?: string[];
    // Work Preferences
    preferredWorkType?: string[];
    preferredJobLocations?: string[];
    // Salary Expectations
    expectedSalaryMin?: number;
    expectedSalaryMax?: number;
    hourlyRateMin?: number;
    hourlyRateMax?: number;
    currency?: string;
    // Availability
    availableIn?: 'Immediate' | '15 Days' | '30 Days';
    availableToJoin?: string;
    // Additional Info
    englishProficiency?: 'Basic' | 'Professional' | 'Fluent' | 'Native';
    headline?: string;
    resourceType?: string;
    // Consent & Features
    enableAiMatching?: boolean;
    takeSkillAssessment?: boolean;
    scheduleAiInterview?: boolean;
    // Nested data
    workExperiences?: any[];
    projects?: any[];
    certifications?: any[];
  },
) => {
  const transaction: Transaction = await sequelize.transaction();
  let isCommitted = false;

  try {
    const user = (await Candidate.findByPk(userId)) || (await User.findByPk(userId));

    if (!user || (user.dataValues.role !== 'candidate' && (user as any).role !== 'candidate')) {
      throw new AppError('Candidate not found', StatusCodes.NOT_FOUND, 'ERR_CANDIDATE_NOT_FOUND');
    }

    const candidateProfile = await CandidateProfile.findOne({ where: { userId }, transaction });
    if (!candidateProfile) {
      throw new AppError(
        'Candidate profile not found',
        StatusCodes.NOT_FOUND,
        'ERR_PROFILE_NOT_FOUND',
      );
    }

    // Helper function for User updates
    const getUserUpdates = (data: any) => {
      const updates: any = {};

      if (data.firstName !== undefined) updates.firstName = data.firstName;
      if (data.lastName !== undefined) updates.lastName = data.lastName;
      if (data.email !== undefined) updates.email = data.email;

      return updates;
    };

    // Check email uniqueness if email is being updated
    if (data.email !== undefined) {
      const existingUser = await User.findOne({
        where: {
          email: data.email,
          id: { [Op.ne]: userId },
        },
        transaction,
      });

      if (existingUser) {
        throw new AppError('Email already in use', StatusCodes.CONFLICT, 'ERR_EMAIL_EXISTS');
      }
    }

    const userUpdates = getUserUpdates(data);
    if (Object.keys(userUpdates).length > 0) {
      await (user as any).update(userUpdates, { transaction });
    }

    // Helper function for CandidateProfile updates
    const getProfileUpdates = (data: any) => {
      const updates: any = {};

      // Contact & Location
      if (data.mobileNumber !== undefined) updates.mobileNumber = data.mobileNumber || null;
      if (data.location !== undefined) updates.location = data.location || null;
      if (data.city !== undefined) updates.city = data.city || null;
      if (data.country !== undefined) updates.country = data.country || null;

      // Candidate Type & Role
      if (data.candidateType !== undefined) updates.candidateType = data.candidateType;
      if (data.primaryJobRole !== undefined) updates.primaryJobRole = data.primaryJobRole || null;


      // Skills & Experience
      if (data.bio !== undefined) updates.bio = data.bio || null;
      if (data.yearsExperience !== undefined) updates.yearsExperience = data.yearsExperience;
      if (data.primarySkills !== undefined) updates.primarySkills = data.primarySkills;
      if (data.secondarySkills !== undefined) updates.secondarySkills = data.secondarySkills;

      // Work Preferences
      if (data.preferredWorkType !== undefined) updates.preferredWorkType = data.preferredWorkType;
      if (data.preferredJobLocations !== undefined)
        updates.preferredJobLocations = data.preferredJobLocations;

      // Salary Expectations
      if (data.expectedSalaryMin !== undefined) updates.expectedSalaryMin = data.expectedSalaryMin;
      if (data.expectedSalaryMax !== undefined) updates.expectedSalaryMax = data.expectedSalaryMax;
      if (data.hourlyRateMin !== undefined) updates.hourlyRateMin = data.hourlyRateMin;
      if (data.hourlyRateMax !== undefined) updates.hourlyRateMax = data.hourlyRateMax;
      if (data.currency !== undefined) updates.currency = data.currency || null;

      // Availability
      if (data.availableIn) updates.availableIn = data.availableIn;
      if (data.availableToJoin !== undefined)
        updates.availableToJoin = data.availableToJoin || null;

      // Additional Info
      if (data.englishProficiency) updates.englishProficiency = data.englishProficiency;
      if (data.headline !== undefined) updates.headline = data.headline || null;
      if (data.resourceType !== undefined) updates.resourceType = data.resourceType || null;

      // Consent & Features
      if (data.enableAiMatching !== undefined) updates.enableAiMatching = data.enableAiMatching;
      if (data.takeSkillAssessment !== undefined)
        updates.takeSkillAssessment = data.takeSkillAssessment;
      if (data.scheduleAiInterview !== undefined)
        updates.scheduleAiInterview = data.scheduleAiInterview;

      return updates;
    };

    const profileUpdates = getProfileUpdates(data);
    if (Object.keys(profileUpdates).length > 0) {
      await candidateProfile.update(profileUpdates, { transaction });
    }

    // Update skills if provided
    if (data.skills) {
      // Remove existing skills
      await CandidateSkill.destroy({
        where: { candidateProfileId: candidateProfile.dataValues.id },
        transaction,
      });

      // Add new skills
      for (const skillName of data.skills) {
        const [skill] = await Skill.findOrCreate({
          where: { name: skillName.trim() },
          defaults: { name: skillName.trim() },
          transaction,
        });

        await CandidateSkill.create(
          {
            candidateProfileId: candidateProfile.dataValues.id,
            skillId: skill.dataValues.id,
          },
          { transaction },
        );
      }
    }

    // Update Work Experiences
    if (data.workExperiences) {
      await WorkExperience.destroy({
        where: { candidateProfileId: candidateProfile.id },
        transaction,
      });
      for (const exp of data.workExperiences) {
        await WorkExperience.create(
          {
            ...exp,
            candidateProfileId: candidateProfile.id,
          },
          { transaction },
        );
      }
    }

    // Update Projects
    if (data.projects) {
      await Project.destroy({
        where: { candidateProfileId: candidateProfile.id },
        transaction,
      });
      for (const project of data.projects) {
        await Project.create(
          {
            ...project,
            candidateProfileId: candidateProfile.id,
          },
          { transaction },
        );
      }
    }

    // Update Certifications
    if (data.certifications) {
      await Certification.destroy({
        where: { candidateProfileId: candidateProfile.id },
        transaction,
      });
      for (const cert of data.certifications) {
        await Certification.create(
          {
            ...cert,
            candidateProfileId: candidateProfile.id,
          },
          { transaction },
        );
      }
    }

    await transaction.commit();
    isCommitted = true;

    // Refresh to get updated data (after commit)
    await user.reload();
    await candidateProfile.reload();

    // Return both user and profile data
    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      profile: candidateProfile,
    };
  } catch (error) {
    // Only rollback if transaction hasn't been committed
    if (!isCommitted) {
      await transaction.rollback();
    }
    throw error;
  }
};

/**
 * Delete a skill from candidate profile
 */
export const deleteCandidateSkill = async (userId: number, skillId: number): Promise<void> => {
  if (!Number.isInteger(skillId) || skillId <= 0) {
    throw new AppError('Invalid skill id', StatusCodes.BAD_REQUEST, 'ERR_INVALID_SKILL_ID');
  }

  const candidateProfile = await CandidateProfile.findOne({ where: { userId } });
  if (!candidateProfile) {
    throw new AppError('Profile not found', StatusCodes.NOT_FOUND, 'ERR_PROFILE_NOT_FOUND');
  }

  const deleted = await CandidateSkill.destroy({
    where: {
      candidateProfileId: candidateProfile.id,
      skillId: Number(skillId),
    },
  });
  if (!deleted) {
    throw new AppError('Skill not found', StatusCodes.NOT_FOUND, 'ERR_SKILL_NOT_FOUND');
  }
};

/**
 * Delete work experience
 */
export const deleteWorkExperience = async (userId: number, expId: number): Promise<void> => {
  const candidateProfile = await CandidateProfile.findOne({ where: { userId } });
  if (!candidateProfile) {
    throw new AppError('Profile not found', StatusCodes.NOT_FOUND, 'ERR_PROFILE_NOT_FOUND');
  }

  const deleted = await WorkExperience.destroy({
    where: {
      id: expId,
      candidateProfileId: candidateProfile.dataValues.id,
    },
  });

  if (!deleted) {
    throw new AppError('Work experience not found', StatusCodes.NOT_FOUND, 'ERR_EXP_NOT_FOUND');
  }
};

/**
 * Delete project
 */
export const deleteProject = async (userId: number, projectId: number): Promise<void> => {
  const candidateProfile = await CandidateProfile.findOne({ where: { userId } });
  if (!candidateProfile) {
    throw new AppError('Profile not found', StatusCodes.NOT_FOUND, 'ERR_PROFILE_NOT_FOUND');
  }

  const deleted = await Project.destroy({
    where: {
      id: projectId,
      candidateProfileId: candidateProfile.dataValues.id,
    },
  });

  if (!deleted) {
    throw new AppError('Project not found', StatusCodes.NOT_FOUND, 'ERR_PROJECT_NOT_FOUND');
  }
};

/**
 * Delete certification
 */
export const deleteCertification = async (userId: number, certId: number): Promise<void> => {
  const candidateProfile = await CandidateProfile.findOne({ where: { userId } });
  if (!candidateProfile) {
    throw new AppError('Profile not found', StatusCodes.NOT_FOUND, 'ERR_PROFILE_NOT_FOUND');
  }

  const deleted = await Certification.destroy({
    where: {
      id: certId,
      candidateProfileId: candidateProfile.dataValues.id,
    },
  });

  if (!deleted) {
    throw new AppError('Certification not found', StatusCodes.NOT_FOUND, 'ERR_CERT_NOT_FOUND');
  }
};

/**
 * Update employer profile
 */
export const updateEmployerProfile = async (
  userId: number,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    companyName?: string;
    industry?: string;
    location?: string;
    companySize?: string;
    website?: string;
    description?: string;
    companyDetails?: string;
  },
) => {
  const transaction: Transaction = await sequelize.transaction();
  let isCommitted = false;

  try {
    const user = (await BusinessUser.findByPk(userId)) || (await User.findByPk(userId));
    const role = user?.dataValues?.role || (user as any)?.role;

    if (!user || (role !== 'employer' && role !== 'hr')) {
      throw new AppError('Business user not found', StatusCodes.NOT_FOUND, 'ERR_USER_NOT_FOUND');
    }

    // Update User/BusinessUser fields (Identity)
    const userUpdates: any = {};
    if (data.firstName !== undefined) userUpdates.firstName = data.firstName;
    if (data.lastName !== undefined) userUpdates.lastName = data.lastName;
    if (data.email !== undefined) {
      // Check email uniqueness if email is being updated
      const existingUser =
        (await User.findOne({
          where: { email: data.email, id: { [Op.ne]: userId } },
          transaction,
        })) ||
        (await BusinessUser.findOne({
          where: { email: data.email, id: { [Op.ne]: userId } },
          transaction,
        }));

      if (existingUser) {
        throw new AppError('Email already in use', StatusCodes.CONFLICT, 'ERR_EMAIL_EXISTS');
      }
      userUpdates.email = data.email;
    }
    if (data.companyName !== undefined) userUpdates.companyName = data.companyName;
    if (data.companyDetails !== undefined) userUpdates.companyDetails = data.companyDetails;

    if (Object.keys(userUpdates).length > 0) {
      await (user as any).update(userUpdates, { transaction });
    }

    // Handle EmployerProfile
    let employerProfile = await EmployerProfile.findOne({ where: { userId }, transaction });

    // Fields that go into EmployerProfile
    const profileFields: any = {};
    if (data.companyName !== undefined) profileFields.companyName = data.companyName;
    if (data.industry !== undefined) profileFields.industry = data.industry || null;
    if (data.location !== undefined) profileFields.location = data.location || null;
    if (data.companySize !== undefined) profileFields.companySize = data.companySize || null;
    if (data.website !== undefined) profileFields.website = data.website || null;
    if (data.description !== undefined) profileFields.description = data.description || null;

    if (Object.keys(profileFields).length > 0) {
      if (!employerProfile) {
        // Create profile if it doesn't exist but profile fields are provided
        employerProfile = await EmployerProfile.create(
          {
            userId,
            companyName: data.companyName || (user as any).companyName || 'Company',
            ...profileFields,
          },
          { transaction },
        );
      } else {
        // Update existing profile
        await employerProfile.update(profileFields, { transaction });
      }
    }

    await transaction.commit();
    isCommitted = true;

    return employerProfile || { userId, ...userUpdates };
  } catch (error) {
    if (!isCommitted) {
      await transaction.rollback();
    }
    throw error;
  }
};

/**
 * Upload resume for candidate
 */
export const uploadResume = async (userId: number, file: Express.Multer.File): Promise<Resume> => {
  console.log(userId);
  const user = (await Candidate.findByPk(userId)) || (await User.findByPk(userId));
  console.log(user, 'user');
  if (!user || (user.dataValues.role !== 'candidate' && (user as any).role !== 'candidate')) {
    throw new AppError('Candidate not found', StatusCodes.NOT_FOUND, 'ERR_CANDIDATE_NOT_FOUND');
  }

  const candidateProfile = await CandidateProfile.findOne({ where: { userId } });
  if (!candidateProfile) {
    throw new AppError(
      'Candidate profile not found',
      StatusCodes.NOT_FOUND,
      'ERR_PROFILE_NOT_FOUND',
    );
  }

  // Check if candidate has any resumes
  const existingResumesCount = await Resume.count({
    where: { candidateProfileId: candidateProfile.dataValues.id },
  });

  const resume = await Resume.create({
    candidateProfileId: candidateProfile.dataValues.id,
    filePath: file.path,
    originalName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    isDefault: existingResumesCount === 0, // Set as default if it's the first resume
  });

  logger.info(`Resume uploaded for candidate ${userId}: ${file.originalname}`);
  return resume;
};

/**
 * Set a resume as default for a candidate
 */
export const setDefaultResume = async (resumeId: number, userId: number): Promise<Resume> => {
  const transaction: Transaction = await sequelize.transaction();
  let isCommitted = false;

  try {
    const candidateProfile = await CandidateProfile.findOne({ where: { userId }, transaction });
    if (!candidateProfile) {
      throw new AppError('Profile not found', StatusCodes.NOT_FOUND, 'ERR_PROFILE_NOT_FOUND');
    }

    const resume = await Resume.findOne({
      where: {
        id: resumeId,
        candidateProfileId: candidateProfile.id,
      },
      transaction,
    });

    if (!resume) {
      throw new AppError('Resume not found', StatusCodes.NOT_FOUND, 'ERR_RESUME_NOT_FOUND');
    }

    // Set all other resumes as not default
    await Resume.update(
      { isDefault: false },
      {
        where: { candidateProfileId: candidateProfile.id },
        transaction,
      },
    );

    // Set this resume as default
    await Resume.update(
      { isDefault: true },
      {
        where: { id: resumeId },
        transaction,
      },
    );

    // Reload the resume instance to return the updated data
    await resume.reload({ transaction });

    await transaction.commit();
    isCommitted = true;
    logger.info(`Resume ${resumeId} set as default for candidate ${userId}`);
    return resume;
  } catch (error) {
    // Only rollback if transaction hasn't been committed
    if (!isCommitted) {
      await transaction.rollback();
    }
    throw error;
  }
};

/**
 * Get resume by ID
 */
export const getResume = async (resumeId: number, userId: number): Promise<Resume> => {
  const resume = await Resume.findByPk(resumeId, {
    include: [{ association: 'candidateProfile', where: { userId } }],
  });

  if (!resume) {
    throw new AppError('Resume not found', StatusCodes.NOT_FOUND, 'ERR_RESUME_NOT_FOUND');
  }

  return resume;
};

/**
 * Delete resume
 */
export const deleteResume = async (resumeId: number, userId: number): Promise<void> => {
  const resume = await Resume.findByPk(resumeId, {
    include: [{ association: 'candidateProfile', where: { userId } }],
  });

  if (!resume) {
    throw new AppError('Resume not found', StatusCodes.NOT_FOUND, 'ERR_RESUME_NOT_FOUND');
  }

  // Delete file from disk
  try {
    await fs.unlink(resume.dataValues.filePath);
  } catch (error) {
    logger.warn(`Failed to delete resume file: ${resume.dataValues.filePath}`, error);
  }

  await resume.destroy();
  logger.info(`Resume deleted: ${resumeId}`);
};

/**
 * Create password reset token
 */
export const createPasswordResetToken = async (email: string): Promise<string> => {
  const user =
    (await User.findOne({ where: { email } })) ||
    (await Candidate.findOne({ where: { email } })) ||
    (await BusinessUser.findOne({ where: { email } }));
  if (!user) {
    console.log('User not available');
    // Don't reveal that user doesn't exist
    throw new AppError(
      'If the email exists, a reset link will be sent',
      StatusCodes.OK,
      'ERR_EMAIL_SENT',
    );
  }

  // Generate random token
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Token expires in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await PasswordReset.create({
    userId: user.dataValues.id,
    token: hashedToken,
    expiresAt,
  });

  logger.info(`Password reset token created for user: ${user.dataValues.email}`);
  logger.info(`Reset token (for development): ${token}`);

  // Send password reset email (non-blocking)
  emailService
    .sendPasswordResetEmail(user.dataValues.email, token, user.dataValues.firstName)
    .catch((err) => {
      logger.error(`Failed to send password reset email to ${user.dataValues.email}:`, err);
    });

  return token;
};

/**
 * Reset password with token
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const passwordReset = await PasswordReset.findOne({
    where: { token: hashedToken },
  });

  if (!passwordReset || !passwordReset.isValid()) {
    throw new AppError(
      'Invalid or expired reset token',
      StatusCodes.BAD_REQUEST,
      'ERR_INVALID_TOKEN',
    );
  }

  const user =
    (await Candidate.findByPk(passwordReset.dataValues.userId)) ||
    (await BusinessUser.findByPk(passwordReset.dataValues.userId)) ||
    (await User.findByPk(passwordReset.dataValues.userId));
  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'ERR_USER_NOT_FOUND');
  }

  // Update password
  await user.setPassword(newPassword);
  await user.save();

  // Mark token as used
  passwordReset.dataValues.used = true;
  await passwordReset.save();

  logger.info(`Password reset successful for user: ${user.dataValues.email}`);
};

/**
 * Update user's profile image
 */
export const updateProfileImage = async (user: any, file: Express.Multer.File): Promise<string> => {
  // Delete old avatar if exists
  if (user.avatar && user.avatar.startsWith('uploads/avatars/')) {
    try {
      const oldPath = path.join(process.cwd(), user.avatar);
      await fs.unlink(oldPath);
    } catch (error) {
      logger.warn(`Failed to delete old avatar: ${user.avatar}`, error);
    }
  }

  // Multer saves files with absolute paths in req.file.path if configured that way,
  // but here it seems it's relative to project root or absolute.
  // We want to store a path that can be used with our static middleware.
  const relativePath = path.relative(process.cwd(), file.path);
  user.avatar = relativePath;
  await user.save();

  logger.info(`Profile image updated for user ${user.id}: ${relativePath}`);
  return relativePath;
};

export const updateProfileImageEmployerHr = async (
  user: any,
  file: Express.Multer.File,
): Promise<string> => {
  // Delete old avatar if exists
  if (user.avatar && user.avatar.startsWith('uploads/avatars/')) {
    try {
      const oldPath = path.join(process.cwd(), user.avatar);
      await fs.unlink(oldPath);
    } catch (error) {
      logger.warn(`Failed to delete old avatar: ${user.avatar}`, error);
    }
  }

  // Multer saves files with absolute paths in req.file.path if configured that way,
  // but here it seems it's relative to project root or absolute.
  // We want to store a path that can be used with our static middleware.
  const relativePath = path.relative(process.cwd(), file.path);
  user.avatar = relativePath;
  await user.save();

  logger.info(`Profile image updated for user ${user.id}: ${relativePath}`);
  return relativePath;
};
