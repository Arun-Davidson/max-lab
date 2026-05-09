import natural from 'natural';

/**
 * Normalizes a list of skills for comparison
 */
export const normalizeSkills = (skills: string[]): string[] => {
  return skills.map((s) => s.trim().toLowerCase()).filter((s) => s !== '');
};

/**
 * Calculates similarity between two titles/roles
 * Uses Jaro-Winkler distance for robust semantic-adjacent matching
 */
export const calculateTitleSimilarity = (jobTitle: string, candidateRole: string): number => {
  if (!jobTitle || !candidateRole) return 0;
  
  const jt = jobTitle.toLowerCase();
  const cr = candidateRole.toLowerCase();
  
  // Exact match
  if (jt === cr) return 1.0;
  
  // High weight for substring matches (e.g., "QA Lead" contains "QA")
  if (jt.includes(cr) || cr.includes(jt)) return 0.8;
  
  // Use Jaro-Winkler for fuzzy overlap
  const distance = natural.JaroWinklerDistance(jt, cr);
  return distance;
};

/**
 * Calculates experience score with strict heuristic rules
 */
export const calculateExperienceScore = (requiredMin: number, actualExp: number): number => {
  if (actualExp >= requiredMin) return 1.0;
  
  // Heuristic: If they have less than 70% of required exp, give 0
  const ratio = actualExp / requiredMin;
  if (ratio < 0.7) return 0;
  
  // Otherwise, penalize linearly but keep it low
  return ratio * 0.5;
};

/**
 * Calculates a match score for a set of skills
 * Ensures that having NO skills results in a 0 score
 */
export const calculateSkillMatchScore = (jobSkills: string[], candidateSkills: string[]): number => {
  if (jobSkills.length === 0) return 0; // Guard against the bug reported by user
  
  const jsSet = new Set(jobSkills.map(s => s.toLowerCase()));
  const matches = candidateSkills.filter(s => jsSet.has(s.toLowerCase())).length;
  
  return matches / jobSkills.length;
};
