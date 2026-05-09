import { QueryTypes } from 'sequelize';
import { sequelize, Job } from '../models';
import logger from '../config/logger';
import { 
  calculateTitleSimilarity, 
  calculateExperienceScore, 
  calculateSkillMatchScore,
  normalizeSkills 
} from '../utils/heuristic-matching.utils';
import { getShortlistedKeySet } from './shortlist.service';

export interface ScoredTalent {
  id: number;
  source: 'bench' | 'candidate';
  name: string;
  role: string;
  matchScore: number;
  skills: string[];
  experience: number;
  location: string;
  email?: string;
  hourlyRate?: number;
  expectedSalary?: { min: number; max: number };
  isShortlisted: boolean;
}

/**
 * Service for heuristic-based talent matching
 */
export const findMatchesForJob = async (
  jobId: number,
  limit: number = 20,
  offset: number = 0,
  employerProfileId?: number,
): Promise<{ results: ScoredTalent[]; total: number }> => {
  try {
    // 1. Fetch job details including required skills
    const job = await Job.findByPk(jobId, {
      include: [{ association: 'skills', attributes: ['name'] }],
    });

    if (!job) {
      throw new Error('Job not found');
    }

    const jobSkills = normalizeSkills(
      ((job as any).skills || []).map((s: any) => s.name || '')
    );
    
    const minExp = job.dataValues.minExperience || 0;
    const workMode = (job.dataValues.workMode || 'remote').toLowerCase();
    const jobTitle = job.dataValues.title || '';

    /**
     * STAGE 1: RAW SQL RECALL
     * Fetch all candidates who have at least some metadata match
     * or are within a reasonable experience range (to keep pool manageable)
     */
    const recallSql = `
      WITH all_talent AS (
        -- Bench Resources
        SELECT 
          id,
          'bench' as source,
          resource_name as name,
          email,
          "current_role" as role,
          technical_skills as talent_skills,
          total_experience as exp,
          location,
          hourly_rate as rate,
          NULL::decimal as salary_min,
          NULL::decimal as salary_max,
          deployment_preference as work_prefs,
          created_at
        FROM bench_resource
        WHERE is_active = true

        UNION ALL

        -- Candidate Profiles
        SELECT 
          cp.user_id as id,
          'candidate' as source,
          (SELECT first_name || ' ' || last_name FROM candidates WHERE id = cp.user_id) as name,
          (SELECT email FROM candidates WHERE id = cp.user_id) as email,
          primary_job_role as role,
          primary_skills as talent_skills,
          years_experience as exp,
          location,
          NULL as rate,
          expected_salary_min as salary_min,
          expected_salary_max as salary_max,
          preferred_work_type as work_prefs,
          cp.created_at
        FROM candidate_profile cp
      )
      SELECT * FROM all_talent;
    `;

    const allTalent: any[] = await sequelize.query(recallSql, {
      type: QueryTypes.SELECT,
    });

    /**
     * STAGE 2: HEURISTIC SCORING (JavaScript Layer)
     * Applying sophisticated rules for Title, Skills, and Experience
     */
    const scoredTalent: ScoredTalent[] = allTalent.map((r) => {
      const talentSkills = normalizeSkills(r.talent_skills || []);
      const talentRole = r.role || '';
      const talentExp = parseFloat(r.exp) || 0;
      const talentWorkPrefs = String(r.work_prefs || '').toLowerCase();

      // 1. Title/Role Similarity (30%)
      const titleScore = calculateTitleSimilarity(jobTitle, talentRole) * 0.1;

      // 2. Skill Match (40%)
      // This fix specifically addresses the "empty job skills" bug.
      const skillScore = calculateSkillMatchScore(jobSkills, talentSkills) * 0.75;

      // 3. Experience Match (20%)
      // Uses the new strict heuristic (0 score if < 70% requirement)
      const expScore = calculateExperienceScore(minExp, talentExp) * 0.1;

      // 4. Metadata match (10%)
      const modeMatch = talentWorkPrefs.includes(workMode) ? 0.05 : 0;

      const totalScore = titleScore + skillScore + expScore + modeMatch;

      return {
        id: r.id,
        source: r.source,
        name: r.name,
        role: r.role,
        matchScore: Math.round(totalScore * 100),
        skills: r.talent_skills,
        experience: r.exp,
        location: r.location,
        email: r.email,
        hourlyRate: r.rate,
        expectedSalary: r.salary_min ? { min: r.salary_min, max: r.salary_max } : undefined,
        isShortlisted: false, // placeholder — overwritten below after DB lookup
        created_at: r.created_at
      };
    });

    // Sort by score, then by recency
    const sortedResults = scoredTalent
      .filter((r) => r.matchScore > 10) // Quality threshold
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime();
      });

    // Annotate isShortlisted from EmployerShortlist table
    let shortlistedKeys = new Set<string>();
    if (employerProfileId) {
      shortlistedKeys = await getShortlistedKeySet(jobId, employerProfileId);
    }

    const annotatedResults: ScoredTalent[] = sortedResults.map((r) => ({
      ...r,
      isShortlisted: shortlistedKeys.has(`${r.source}:${r.id}`),
    }));

    const total = annotatedResults.length;
    const paginatedResults = annotatedResults.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      total,
    };
  } catch (error) {
    logger.error('Talent Matching Service Error:', error);
    throw error;
  }
};
