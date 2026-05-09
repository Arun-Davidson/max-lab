/**
 * NLP Helper Utilities for Resume Parsing and Text Analysis
 */

import natural from 'natural';

/**
 * Normalize text for analysis
 */
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s.-]/g, ' ') // Remove special chars except dots and hyphens
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
};

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
export const levenshteinDistance = (str1: string, str2: string): number => {
  return natural.LevenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
};

/**
 * Fuzzy match two strings (returns true if distance <= threshold)
 */
export const fuzzyMatch = (str1: string, str2: string, threshold: number = 2): boolean => {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  const similarity = 1 - distance / maxLen;
  return similarity >= 1 - threshold / maxLen;
};

/**
 * Extract keywords using TF-IDF
 */
export const extractKeywords = (text: string, topN: number = 20): string[] => {
  const TfIdf = natural.TfIdf;
  const tfidf = new TfIdf();

  tfidf.addDocument(text);

  const keywords: { term: string; score: number }[] = [];
  tfidf.listTerms(0).forEach((item: any) => {
    if (item.term.length > 2) {
      // Filter out very short terms
      keywords.push({ term: item.term, score: item.tfidf });
    }
  });

  // Sort by TF-IDF score and return top N
  return keywords
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((k) => k.term);
};

/**
 * Parse date range and calculate duration in years
 * Supports formats: "Jan 2020 - Present", "2018-2020", "01/2019 - 12/2021"
 */
export const parseDateRange = (
  dateString: string,
): { start: Date | null; end: Date | null; years: number } => {
  const normalized = dateString.trim();

  // Handle "Present" or "Current"
  const endDate = /present|current/i.test(normalized) ? new Date() : null;

  // Try to extract date patterns
  const patterns = [
    // "Jan 2020 - Dec 2022"
    /(\w{3,9})\s+(\d{4})\s*-\s*(\w{3,9})\s+(\d{4})/i,
    // "01/2020 - 12/2022"
    /(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{4})/,
    // "2020 - 2022"
    /(\d{4})\s*-\s*(\d{4})/,
    // "Jan 2020 - Present"
    /(\w{3,9})\s+(\d{4})\s*-\s*(?:present|current)/i,
  ];

  let startDate: Date | null = null;
  let calculatedEndDate: Date | null = endDate;
  let durationYears = 0;

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      if (pattern.source.includes('(\\\\d{4})\\\\s*-\\\\s*(\\\\d{4})')) {
        // Year range: "2020 - 2022"
        startDate = new Date(parseInt(match[1]), 0);
        calculatedEndDate = endDate || new Date(parseInt(match[2]), 11);
      } else if (match[1] && match[2]) {
        // Month Year format
        const monthNames = [
          'jan',
          'feb',
          'mar',
          'apr',
          'may',
          'jun',
          'jul',
          'aug',
          'sep',
          'oct',
          'nov',
          'dec',
        ];
        const startMonth = monthNames.indexOf(match[1].toLowerCase().substring(0, 3));
        const startYear = parseInt(match[2]);
        startDate = new Date(startYear, startMonth >= 0 ? startMonth : 0);

        if (match[3] && match[4] && !endDate) {
          const endMonth = monthNames.indexOf(match[3].toLowerCase().substring(0, 3));
          const endYear = parseInt(match[4]);
          calculatedEndDate = new Date(endYear, endMonth >= 0 ? endMonth : 11);
        } else {
          calculatedEndDate = endDate || new Date();
        }
      }
      break;
    }
  }

  if (startDate && calculatedEndDate) {
    const diffMs = calculatedEndDate.getTime() - startDate.getTime();
    durationYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  }

  return {
    start: startDate,
    end: calculatedEndDate,
    years: Math.max(0, Math.round(durationYears * 10) / 10), // Round to 1 decimal
  };
};

/**
 * Extract all date ranges from text and sum total experience
 */
export const calculateTotalExperience = (text: string): number => {
  // Look for common experience patterns
  const lines = text.split('\n');
  let totalYears = 0;
  const dateRanges: string[] = [];

  // Find lines that look like date ranges
  lines.forEach((line) => {
    // Match patterns like "Jan 2020 - Dec 2022"
    if (/\d{4}/.test(line) && /-/.test(line)) {
      dateRanges.push(line);
    }
  });

  // Parse each date range and sum
  dateRanges.forEach((range) => {
    const { years } = parseDateRange(range);
    totalYears += years;
  });

  return Math.round(totalYears * 10) / 10; // Round to 1 decimal
};

/**
 * Extract education level from text
 */
export const extractEducationLevel = (text: string): string | null => {
  const normalizedText = text.toLowerCase();

  const levels = [
    { keywords: ['phd', 'ph.d', 'doctorate', 'doctoral'], level: 'PhD' },
    { keywords: ['master', 'ms', 'm.s', 'mba', 'm.b.a', 'msc', 'm.sc'], level: 'Master' },
    {
      keywords: [
        'bachelor',
        'bs',
        'b.s',
        'ba',
        'b.a',
        'bsc',
        'b.sc',
        'be',
        'b.e',
        'btech',
        'b.tech',
      ],
      level: 'Bachelor',
    },
    { keywords: ['associate', 'as', 'a.s', 'aa', 'a.a'], level: 'Associate' },
    { keywords: ['high school', 'secondary school', 'diploma'], level: 'High School' },
  ];

  for (const { keywords, level } of levels) {
    if (keywords.some((keyword) => normalizedText.includes(keyword))) {
      return level;
    }
  }

  return null;
};

/**
 * Extract contact information from text
 */
export const extractContactInfo = (
  text: string,
): { email?: string; phone?: string; linkedin?: string } => {
  const result: { email?: string; phone?: string; linkedin?: string } = {};

  // Email pattern
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // Phone pattern (various formats)
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0];
  }

  // LinkedIn URL
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) {
    result.linkedin = linkedinMatch[0];
  }

  return result;
};

/**
 * Tokenize text into words
 */
export const tokenize = (text: string): string[] => {
  const tokenizer = new natural.WordTokenizer();
  return tokenizer.tokenize(text.toLowerCase()) || [];
};

/**
 * Remove stopwords from token array
 */
export const removeStopwords = (tokens: string[]): string[] => {
  const stopwords = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'he',
    'in',
    'is',
    'it',
    'its',
    'of',
    'on',
    'that',
    'the',
    'to',
    'was',
    'will',
    'with',
  ]);

  return tokens.filter((token) => token.length > 2 && !stopwords.has(token));
};
