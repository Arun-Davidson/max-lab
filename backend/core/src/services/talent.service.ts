import { Op, literal } from 'sequelize';
import { BenchResource, CandidateProfile, Candidate, BusinessUser, Job, Skill } from '../models';
import { MatchScoringService, ScorableTalent } from './matchScoring.service';

export interface TalentSearchResult {
  id: number;
  source: 'bench' | 'candidate';
  name: string;
  currentRole: string;
  totalExperience: string | number;
  location: string;
  skills: string[];
  hourlyRate?: number;
  expectedSalary?: { min: number; max: number };
  availability: string;
  deploymentPreference?: string;
  currency: string;
  isAiMatchingEnabled?: boolean;
  createdAt?: Date;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    mobileNumber?: string;
    companyName?: string;
  };
}

/**
 * Unified search across BenchResource and CandidateProfile
 */
export const searchTalent = async (
  employerProfileId?: number,
  filters: {
    jobTitle?: string;
    category?: string;
    skills?: string[];
    experienceMin?: number;
    experienceMax?: number;
    certifications?: string[];
    workMode?: string;
    location?: string;
    budgetMin?: number;
    budgetMax?: number;
    currency?: string;
    type?: 'candidate' | 'bench' | 'all';
    openToBenchResources?: number; // 1 for true, 0 for false
    page?: number;
    limit?: number;
    search?: string;
    jobId?: number;
  } = {},
): Promise<{ results: TalentSearchResult[]; total: number; page: number; totalPages: number }> => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  let benchResults: any[] = [];
  let candidateResults: any[] = [];
  let totalBench = 0;
  let totalCandidate = 0;

  // 1. Search Bench Resources (if applicable)
  // Logic: if openToBenchResources is 0, we skip bench. If 1 or undefined, we check the 'type' filter.
  const includeBench =
    filters.openToBenchResources !== 0 &&
    (filters.type === 'bench' || filters.type === 'all' || !filters.type);

  if (includeBench) {
    const benchWhere: any = {
      isActive: true,
    };

    if (employerProfileId) {
      benchWhere.employerProfileId = employerProfileId;
    }

    if (filters.jobTitle || filters.search) {
      benchWhere[Op.or] = [
        { currentRole: { [Op.iLike]: `%${filters.jobTitle || filters.search}%` } },
        { resourceName: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    if (filters.category) {
      benchWhere.category = { [Op.iLike]: `%${filters.category}%` };
    }

    if (filters.skills && filters.skills.length > 0) {
      // Case-insensitive skill matching: match if ANY of the provided skills exist in technicalSkills
      // We need to check each skill individually in a case-insensitive manner
      const skillMatchConditions = filters.skills.map((skill) =>
        literal(
          `EXISTS (SELECT 1 FROM unnest(technical_skills) AS ts WHERE LOWER(ts) = LOWER('${skill.replace(/'/g, "''")}'))`,
        ),
      );
      // At least one skill must match (OR condition)
      if (benchWhere[Op.and]) {
        benchWhere[Op.and].push({ [Op.or]: skillMatchConditions });
      } else {
        benchWhere[Op.and] = [{ [Op.or]: skillMatchConditions }];
      }
    }

    if (filters.certifications && filters.certifications.length > 0) {
      benchWhere.certifications = { [Op.overlap]: filters.certifications };
    }

    if (filters.workMode) {
      benchWhere.deploymentPreference = { [Op.contains]: [filters.workMode] };
    }

    if (filters.location) {
      benchWhere[Op.or] = [
        ...(benchWhere[Op.or] || []),
        { location: { [Op.iLike]: `%${filters.location}%` } },
      ];
    }

    if (filters.experienceMin !== undefined) {
      benchWhere.totalExperience = {
        ...benchWhere.totalExperience,
        [Op.gte]: filters.experienceMin,
      };
    }
    if (filters.experienceMax !== undefined) {
      benchWhere.totalExperience = {
        ...benchWhere.totalExperience,
        [Op.lte]: filters.experienceMax,
      };
    }

    if (filters.budgetMin !== undefined || filters.budgetMax !== undefined) {
      if (filters.budgetMin !== undefined) {
        benchWhere.hourlyRate = { ...benchWhere.hourlyRate, [Op.gte]: filters.budgetMin };
      }
      if (filters.budgetMax !== undefined) {
        benchWhere.hourlyRate = { ...benchWhere.hourlyRate, [Op.lte]: filters.budgetMax };
      }
    }

    if (filters.currency) {
      benchWhere.currency = filters.currency;
    }

    const { rows, count } = await BenchResource.findAndCountAll({
      where: benchWhere,
      include: [
        {
          model: require('../models').EmployerProfile,
          as: 'employerProfile',
          include: [
            {
              model: BusinessUser,
              as: 'businessUser',
              attributes: ['id', 'email', 'firstName', 'lastName', 'companyName'],
            },
          ],
        },
      ],
      limit: limit,
      offset: offset,
      order: [['createdAt', 'DESC']],
    });

    benchResults = rows.map((b: any) => {
      const benchData = b.get({ plain: true });
      const employerProfile = benchData.employerProfile || {};
      const businessUser = employerProfile.businessUser || {};

      return {
        id: benchData.id,
        source: 'bench',
        name: benchData.resourceName,
        currentRole: benchData.currentRole,
        totalExperience: benchData.totalExperience,
        location:
          Array.isArray(benchData.deploymentPreference) &&
          benchData.deploymentPreference.includes('remote')
            ? 'Remote'
            : benchData.location || 'On-site',
        skills: benchData.technicalSkills,
        hourlyRate: benchData.hourlyRate,
        currency: benchData.currency,
        availability: benchData.availableFrom,
        deploymentPreference: benchData.deploymentPreference,
        createdAt: benchData.createdAt,
        user: businessUser.id
          ? {
              id: businessUser.id,
              email: businessUser.email,
              firstName: businessUser.firstName,
              lastName: businessUser.lastName,
              companyName: businessUser.companyName,
            }
          : undefined,
      };
    });
    totalBench = count;
  }

  // 2. Search Registered Candidates (if applicable)
  if (filters.type === 'candidate' || filters.type === 'all' || !filters.type) {
    const candidateWhere: any = {};
    const andConditions: any[] = [];

    // Build jobTitle/search OR group
    if (filters.jobTitle || filters.search) {
      const jobOrGroup = {
        [Op.or]: [
          { primaryJobRole: { [Op.iLike]: `%${filters.jobTitle || filters.search}%` } },
          { bio: { [Op.iLike]: `%${filters.search}%` } },
        ],
      };
      andConditions.push(jobOrGroup);
    }

    // Build skills OR group
    if (filters.skills && filters.skills.length > 0) {
      const skillsOrGroup = {
        [Op.or]: [
          { primarySkills: { [Op.overlap]: filters.skills } },
          { secondarySkills: { [Op.overlap]: filters.skills } },
        ],
      };
      andConditions.push(skillsOrGroup);
    }

    // Apply AND conditions if any exist
    if (andConditions.length > 0) {
      candidateWhere[Op.and] = andConditions;
    }

    if (filters.category) {
      candidateWhere.primaryJobRole = { [Op.iLike]: `%${filters.category}%` };
    }

    if (filters.certifications && filters.certifications.length > 0) {
      candidateWhere.certifications = { [Op.overlap]: filters.certifications };
    }

    if (filters.workMode) {
      candidateWhere.preferredWorkType = { [Op.contains]: [filters.workMode] };
    }

    if (filters.location) {
      candidateWhere[Op.or] = [
        { location: { [Op.iLike]: `%${filters.location}%` } },
        { city: { [Op.iLike]: `%${filters.location}%` } },
        { country: { [Op.iLike]: `%${filters.location}%` } },
      ];
    }

    if (filters.experienceMin !== undefined) {
      candidateWhere.yearsExperience = {
        ...candidateWhere.yearsExperience,
        [Op.gte]: filters.experienceMin,
      };
    }
    if (filters.experienceMax !== undefined) {
      candidateWhere.yearsExperience = {
        ...candidateWhere.yearsExperience,
        [Op.lte]: filters.experienceMax,
      };
    }

    if (filters.budgetMin !== undefined || filters.budgetMax !== undefined) {
      if (filters.budgetMin !== undefined) {
        candidateWhere.expectedSalaryMin = { [Op.gte]: filters.budgetMin };
      }
      if (filters.budgetMax !== undefined) {
        candidateWhere.expectedSalaryMax = { [Op.lte]: filters.budgetMax };
      }
    }

    // Note: Currency filter for candidates is informational since candidates default to 'INR'
    // Optionally add logic here if candidates can specify currency in future

    const { rows, count } = await CandidateProfile.findAndCountAll({
      where: candidateWhere,
      include: [
        {
          model: Candidate,
          as: 'candidate',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
      limit: limit,
      offset: offset,
      order: [['createdAt', 'DESC']],
    });

    candidateResults = rows.map((c: any) => {
      const candidateData = c.get({ plain: true });
      const candidateAssoc = candidateData.candidate || {};

      return {
        id: candidateData.id,
        source: 'candidate',
        name: `${candidateAssoc.firstName || ''} ${candidateAssoc.lastName || ''}`.trim(),
        currentRole: candidateData.primaryJobRole || '',
        totalExperience: candidateData.yearsExperience || 0,
        location:
          candidateData.location ||
          (candidateData.city && candidateData.country
            ? `${candidateData.city}, ${candidateData.country}`
            : 'Remote'),
        skills: [...(candidateData.primarySkills || []), ...(candidateData.secondarySkills || [])],
        expectedSalary: {
          min: candidateData.expectedSalaryMin || 0,
          max: candidateData.expectedSalaryMax || 0,
        },
        currency: 'INR',
        availability: candidateData.availableIn,
        isAiMatchingEnabled: candidateData.enableAiMatching,
        createdAt: candidateData.createdAt,
        user: candidateAssoc.id
          ? {
              id: candidateAssoc.id,
              email: candidateAssoc.email,
              firstName: candidateAssoc.firstName,
              lastName: candidateAssoc.lastName,
              mobileNumber: candidateData.mobileNumber,
            }
          : undefined,
      };
    });
    totalCandidate = count;
  }

  // Combine and handle pagination properly if searching both
  let combinedResults = [...benchResults, ...candidateResults];
  const totalItems = totalBench + totalCandidate;

  // Sort by createdAt descending for stable global order
  combinedResults = combinedResults.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  // Apply offset and limit to sorted combined results
  const paginatedResults = combinedResults.slice(offset, offset + limit);

  // 3. Apply Scoring if jobId is present
  if (filters.jobId) {
    const job = await Job.findByPk(filters.jobId, {
      include: [
        { model: Skill, as: 'skills', attributes: ['name'] },
        { model: Skill, as: 'niceToHaveSkills', attributes: ['name'] },
      ],
    });

    if (job) {
      // Attach plain skills array for the scoring service
      (job as any).skills = (job as any).skills?.map((s: any) => s.name) || [];

      const scorableTalents: ScorableTalent[] = paginatedResults.map((t) => ({
        id: t.id,
        source: t.source,
        role: t.currentRole,
        experience: t.totalExperience,
        skills: t.skills,
        availability: t.availability,
        workModePreferences: t.deploymentPreference ? [t.deploymentPreference] : [],
        location: t.location,
        budgetMin: t.source === 'bench' ? t.hourlyRate || 0 : t.expectedSalary?.min || 0,
        budgetMax: t.source === 'bench' ? t.hourlyRate || 0 : t.expectedSalary?.max || 0,
        currency: t.currency,
      }));

      const scoringBatch = MatchScoringService.scoreCandidatesBatch(
        job,
        scorableTalents,
        page,
        limit,
      );

      // Map scores back to results
      for (let i = 0; i < paginatedResults.length; i++) {
        paginatedResults[i].match = scoringBatch.results[i];
      }

      // Re-sort by matchScore descending
      paginatedResults.sort((a, b) => (b.match?.matchScore || 0) - (a.match?.matchScore || 0));
    }
  }

  return {
    results: paginatedResults,
    total: totalItems,
    page,
    totalPages: Math.ceil(totalItems / limit),
  };
};
