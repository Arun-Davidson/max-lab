import config from '../config';
import Job from '../models/Job';

export interface ScorableTalent {
  id: number | string;
  source: 'candidate' | 'bench';
  role: string;
  experience: number;
  skills: string[];
  certifications?: string[];
  availability: string; // 'Immediate', '15 Days', '30 Days' or ISO date
  workModePreferences: string[];
  location?: string;
  city?: string;
  country?: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
}

export interface MatchResult {
  candidateId: string | number;
  source: 'candidate' | 'bench';
  matchScore: number;
  matchLabel: 'Excellent Match' | 'Strong Match' | 'Good Match' | 'Partial Match' | 'Weak Match';
  breakdown: {
    skills: number;
    experience: number;
    role: number;
    availability: number;
    budget: number;
    location: number;
  };
  reasons: {
    strengths: string[];
    gaps: string[];
  };
}

export class MatchScoringService {
  private static WEIGHTS = config.scoring.weights;

  /**
   * Calculate match score for a single candidate against a job
   */
  public static calculateMatchScore(job: Job, talent: ScorableTalent): MatchResult {
    const breakdown = {
      skills: this.scoreSkills(job, talent),
      experience: this.scoreExperience(job, talent),
      role: this.scoreRole(job, talent),
      availability: this.scoreAvailability(job, talent),
      budget: this.scoreBudget(job, talent),
      location: this.scoreLocation(job, talent),
    };

    const totalScore = Math.round(
      breakdown.skills +
        breakdown.experience +
        breakdown.role +
        breakdown.availability +
        breakdown.budget +
        breakdown.location,
    );

    const matchLabel = this.getMatchLabel(totalScore);
    const reasons = this.generateReasons(job, talent, breakdown);

    return {
      candidateId: talent.id,
      source: talent.source,
      matchScore: totalScore,
      matchLabel,
      breakdown,
      reasons,
    };
  }

  /**
   * Batch score candidates for a specific job and page
   */
  public static scoreCandidatesBatch(
    job: Job,
    talents: ScorableTalent[],
    page: number,
    pageSize: number,
  ): { jobId: string; page: number; pageSize: number; results: MatchResult[] } {
    const results = talents.map((talent) => this.calculateMatchScore(job, talent));

    return {
      jobId: job.id.toString(),
      page,
      pageSize,
      results,
    };
  }

  // --- Scoring Logic Components ---

  private static scoreSkills(job: Job, talent: ScorableTalent): number {
    // We assume job skills are populated. Since Job model doesn't have a direct skills array field (it uses associations/JobSkill),
    // we assume the job object passed here has a 'skills' property (string[]) attached by the service.
    const jobSkills = new Set<string>(
      (job as any).skills?.map((s: string) => s.toLowerCase()) || [],
    );
    if (jobSkills.size === 0) return this.WEIGHTS.skills; // Neutral if no skills required

    const talentSkills = new Set(talent.skills.map((s) => s.toLowerCase()));
    let matches = 0;
    jobSkills.forEach((skill) => {
      if (talentSkills.has(skill)) matches++;
    });

    const matchRatio = matches / jobSkills.size;
    return matchRatio * this.WEIGHTS.skills;
  }

  private static scoreExperience(job: Job, talent: ScorableTalent): number {
    const minExp = job.minExperience || 0;
    const maxExp = job.maxExperience || 50;
    const talentExp = talent.experience || 0;

    if (talentExp >= minExp && talentExp <= maxExp) {
      return this.WEIGHTS.experience;
    }

    if (talentExp < minExp) {
      // Proportional score for having some experience but less than min
      if (minExp === 0) return this.WEIGHTS.experience;
      return (talentExp / minExp) * this.WEIGHTS.experience * 0.8; // Penalty for not meeting min
    }

    // If talentExp > maxExp, we still give full points or slight reduction?
    // Usually being over-qualified is fine, but sometimes it's a "Partial Match".
    // For now, give full points if they exceed min.
    return this.WEIGHTS.experience;
  }

  private static scoreRole(job: Job, talent: ScorableTalent): number {
    const jobTitle = job.title.toLowerCase();
    const talentRole = talent.role.toLowerCase();

    if (jobTitle === talentRole) return this.WEIGHTS.roleSimilarity;

    // Word-based overlap for similarity
    const jobWords = new Set(jobTitle.split(/\s+/));
    const talentWords = talentRole.split(/\s+/);
    let matches = 0;
    talentWords.forEach((word) => {
      if (jobWords.has(word)) matches++;
    });

    const overlap = matches / Math.max(jobWords.size, talentWords.length);
    return overlap * this.WEIGHTS.roleSimilarity;
  }

  private static scoreAvailability(_job: Job, talent: ScorableTalent): number {
    const availability = talent.availability;
    // Map 'Immediate', '15 Days', '30 Days' to scores
    if (availability === 'Immediate') return this.WEIGHTS.availability;
    if (availability === '15 Days') return this.WEIGHTS.availability * 0.6;
    if (availability === '30 Days') return this.WEIGHTS.availability * 0.3;

    // Handle date strings if applicable
    const parsedDate = Date.parse(availability);
    if (!Number.isNaN(parsedDate)) {
      const availDate = new Date(parsedDate);
      const now = new Date();
      const diffDays = Math.ceil((availDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

      if (diffDays <= 0) return this.WEIGHTS.availability;
      if (diffDays <= 15) return this.WEIGHTS.availability * 0.7;
      if (diffDays <= 30) return this.WEIGHTS.availability * 0.4;
      return 0;
    }

    return 0;
  }

  private static scoreBudget(job: Job, talent: ScorableTalent): number {
    const jobMin = job.expectedBudgetMin ? Number(job.expectedBudgetMin) : 0;
    const jobMax = job.expectedBudgetMax ? Number(job.expectedBudgetMax) : Number.MAX_SAFE_INTEGER;
    const talentMin = talent.budgetMin;
    const talentMax = talent.budgetMax;

    // Perfect fit: talent range is within job budget range
    if (talentMin >= jobMin && talentMax <= jobMax) return this.WEIGHTS.budget;

    // Over budget: talent min is higher than job max
    if (talentMin > jobMax) {
      const overflowRatio = jobMax / talentMin;
      return Math.max(0, overflowRatio * this.WEIGHTS.budget - this.WEIGHTS.budget * 0.2);
    }

    // Under budget/meeting criteria partially
    return this.WEIGHTS.budget * 0.8;
  }

  private static scoreLocation(job: Job, talent: ScorableTalent): number {
    const jobMode = job.workMode; // 'on-site', 'remote', 'hybrid'
    const talentModes = talent.workModePreferences; // ['remote', 'hybrid', 'onsite']

    const normalizedJobMode = jobMode === 'on-site' ? 'onsite' : jobMode;
    const modeMatch = talentModes.includes(normalizedJobMode);

    if (modeMatch) {
      // If it's on-site or hybrid, also check location overlap
      if (normalizedJobMode !== 'remote') {
        const jobLoc = (job.city || job.location || '').toLowerCase();
        const talentLoc = (talent.city || talent.location || '').toLowerCase();
        if (jobLoc && talentLoc && (jobLoc.includes(talentLoc) || talentLoc.includes(jobLoc))) {
          return this.WEIGHTS.location;
        }
        return this.WEIGHTS.location * 0.6; // Mode matches but location differs
      }
      return this.WEIGHTS.location;
    }

    return 0;
  }

  private static getMatchLabel(score: number): MatchResult['matchLabel'] {
    if (score >= 90) return 'Excellent Match';
    if (score >= 75) return 'Strong Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Partial Match';
    return 'Weak Match';
  }

  private static generateReasons(
    _job: Job,
    _talent: ScorableTalent,
    breakdown: MatchResult['breakdown'],
  ): MatchResult['reasons'] {
    const strengths: string[] = [];
    const gaps: string[] = [];

    if (breakdown.skills >= this.WEIGHTS.skills * 0.8) strengths.push('Strong skill overlap');
    else if (breakdown.skills < this.WEIGHTS.skills * 0.4) gaps.push('Skill set mismatch');

    if (breakdown.experience >= this.WEIGHTS.experience)
      strengths.push('Meets experience requirements');
    else if (breakdown.experience < this.WEIGHTS.experience * 0.5)
      gaps.push('Insufficient experience');

    if (breakdown.role >= this.WEIGHTS.roleSimilarity) strengths.push('Role similarity');

    if (breakdown.budget >= this.WEIGHTS.budget) strengths.push('Fits budget requirements');
    else if (breakdown.budget < this.WEIGHTS.budget * 0.5)
      gaps.push('Expected compensation exceeds budget');

    if (breakdown.availability >= this.WEIGHTS.availability)
      strengths.push('Immediate availability');

    if (breakdown.location >= this.WEIGHTS.location) strengths.push('Preferred work mode match');

    return { strengths, gaps };
  }
}
