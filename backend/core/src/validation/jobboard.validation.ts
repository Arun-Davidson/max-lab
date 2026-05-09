import Joi from 'joi';

// Password validation regex: min 8 chars, at least one uppercase, one lowercase, one number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const candidateRegistrationSchema = Joi.object({
  // User fields
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().pattern(passwordRegex).required().messages({
    'string.pattern.base':
      'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
    'any.required': 'Password is required',
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Confirm password must match password',
    'any.required': 'Confirm password is required',
  }),
  firstName: Joi.string().min(1).max(100).required().messages({
    'string.min': 'First name must be at least 1 character',
    'string.max': 'First name cannot exceed 100 characters',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Last name must be at least 1 character',
    'string.max': 'Last name cannot exceed 100 characters',
    'any.required': 'Last name is required',
  }),

  // Contact & Location
  mobileNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid mobile number',
      'any.required': 'Mobile number is required',
    }),
  city: Joi.string().max(100).optional().allow(null, ''),
  country: Joi.string().max(100).optional().allow(null, ''),
  location: Joi.string().max(255).optional().allow(null, ''),

  // Candidate Type & Role
  candidateType: Joi.string()
    .valid('Full-Time Job Seeker', 'Contract / Freelance', 'Hybrid Professional')
    .required()
    .messages({
      'any.required': 'Candidate type is required',
    }),
  primaryJobRole: Joi.string().max(255).required().messages({
    'any.required': 'Primary job role is required',
  }),


  // Skills & Experience
  bio: Joi.string().max(5000).optional().allow(null, ''),
  yearsExperience: Joi.number().integer().min(0).max(70).required().messages({
    'any.required': 'Total experience is required',
  }),
  primarySkills: Joi.array().items(Joi.string().max(100)).min(1).required().messages({
    'array.min': 'At least one primary skill is required',
    'any.required': 'Primary skills are required',
  }),
  secondarySkills: Joi.array().items(Joi.string().max(100)).optional().default([]),

  // Work Preferences
  preferredWorkType: Joi.array()
    .items(Joi.string().valid('remote', 'hybrid', 'onsite'))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one preferred work type is required',
      'any.required': 'Preferred work type is required',
    }),
  preferredJobLocations: Joi.array().items(Joi.string().max(100)).optional().default([]),

  // Salary Expectations
  expectedSalaryMin: Joi.number().min(0).required().messages({
    'any.required': 'Minimum expected salary is required',
  }),
  expectedSalaryMax: Joi.number().min(Joi.ref('expectedSalaryMin')).required().messages({
    'number.min': 'Maximum salary must be greater than or equal to minimum salary',
    'any.required': 'Maximum expected salary is required',
  }),
  hourlyRateMin: Joi.number().integer().min(0).optional().allow(null),
  hourlyRateMax: Joi.number().integer().min(0).optional().allow(null),

  // Availability
  availableIn: Joi.string().valid('Immediate', '15 Days', '30 Days').default('Immediate'),
  availableToJoin: Joi.string().max(100).required().messages({
    'any.required': 'Available to join date is required',
  }),

  // Additional Info
  englishProficiency: Joi.string().valid('Basic', 'Professional', 'Fluent', 'Native').optional(),
  headline: Joi.string().max(255).optional().allow(null, ''),
  resourceType: Joi.string().max(255).optional().allow(null, ''),

  // Consent & Features
  acceptedTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must accept the terms and conditions',
    'any.required': 'You must accept the terms and conditions',
  }),
  acceptedPrivacyPolicy: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must accept the privacy policy',
    'any.required': 'You must accept the privacy policy',
  }),
  enableAiMatching: Joi.boolean().default(false),
  takeSkillAssessment: Joi.boolean().default(false),
  scheduleAiInterview: Joi.boolean().default(false),

  // Skills (legacy field for backward compatibility)
  skills: Joi.array().items(Joi.string().max(100)).optional().default([]),
});

export const employerRegistrationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().pattern(passwordRegex).required().messages({
    'string.pattern.base':
      'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  companyName: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Company name must be at least 1 character',
    'string.max': 'Company name cannot exceed 255 characters',
    'any.required': 'Company name is required',
  }),
  industry: Joi.string().max(100).optional().allow(null, ''),
  location: Joi.string().max(255).optional().allow(null, ''),
  companySize: Joi.string()
    .valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')
    .optional()
    .allow(null, ''),
  website: Joi.string().uri().max(500).optional().allow(null, ''),
  description: Joi.string().max(5000).optional().allow(null, ''),
});

export const updateCandidateProfileSchema = Joi.object({
  // User fields
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional(),
  email: Joi.string().email().optional(),

  // Contact & Location
  mobileNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  location: Joi.string().max(255).optional().allow(null, ''),
  city: Joi.string().max(100).optional().allow(null, ''),
  country: Joi.string().max(100).optional().allow(null, ''),

  // Candidate Type & Role
  candidateType: Joi.string()
    .valid('Full-Time Job Seeker', 'Contract / Freelance', 'Hybrid Professional')
    .optional(),
  primaryJobRole: Joi.string().max(255).optional().allow(null, ''),


  // Skills & Experience
  bio: Joi.string().max(5000).optional().allow(null, ''),
  yearsExperience: Joi.number().integer().min(0).max(70).optional().allow(null),
  primarySkills: Joi.array().items(Joi.string().max(100)).optional(),
  secondarySkills: Joi.array().items(Joi.string().max(100)).optional(),
  skills: Joi.array().items(Joi.string().max(100)).optional(), // Legacy field

  // Work Preferences
  preferredWorkType: Joi.array()
    .items(Joi.string().valid('remote', 'hybrid', 'onsite'))
    .optional(),
  preferredJobLocations: Joi.array().items(Joi.string().max(100)).optional(),

  // Salary Expectations
  expectedSalaryMin: Joi.number().min(0).optional().allow(null),
  expectedSalaryMax: Joi.number().min(0).optional().allow(null),
  hourlyRateMin: Joi.number().integer().min(0).optional().allow(null),
  hourlyRateMax: Joi.number().integer().min(0).optional().allow(null),
  currency: Joi.string().max(30).optional().allow(null, ''),

  // Availability
  availableIn: Joi.string().valid('Immediate', '15 Days', '30 Days').optional(),
  availableToJoin: Joi.string().max(100).optional().allow(null, ''),

  // Additional Info
  englishProficiency: Joi.string().valid('Basic', 'Professional', 'Fluent', 'Native').optional(),
  headline: Joi.string().max(255).optional().allow(null, ''),
  resourceType: Joi.string().max(255).optional().allow(null, ''),

  // Consent & Features
  enableAiMatching: Joi.boolean().optional(),
  takeSkillAssessment: Joi.boolean().optional(),
  scheduleAiInterview: Joi.boolean().optional(),

  // Work Experiences, Projects, and Certifications
  workExperiences: Joi.array()
    .items(
      Joi.object({
        id: Joi.any().optional(),
        companyName: Joi.string().required(),
        role: Joi.string().required(),
        employmentType: Joi.string()
          .valid('Full-time', 'Part-time', 'Contract', 'Freelance')
          .required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().optional().allow(null),
        description: Joi.string().optional().allow(null, ''),
        location: Joi.string().optional().allow(null, ''),
      }),
    )
    .optional(),
  projects: Joi.array()
    .items(
      Joi.object({
        id: Joi.any().optional(),
        title: Joi.string().required(),
        description: Joi.string().optional().allow(null, ''),
        techStack: Joi.array().items(Joi.string()).optional(),
        projectUrl: Joi.string().uri().optional().allow(null, ''),
        isFeatured: Joi.boolean().default(false),
      }),
    )
    .optional(),
  certifications: Joi.array()
    .items(
      Joi.object({
        id: Joi.any().optional(),
        name: Joi.string().required(),
        issuedBy: Joi.string().optional().allow(null, ''),
        issueDate: Joi.date().optional().allow(null),
        expiryDate: Joi.date().optional().allow(null),
        credentialUrl: Joi.string().uri().optional().allow(null, ''),
      }),
    )
    .optional(),
}).unknown(true);

export const updateEmployerProfileSchema = Joi.object({
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional(),
  email: Joi.string().email().optional(),
  companyName: Joi.string().min(1).max(255).optional(),
  industry: Joi.string().max(100).optional().allow(null, ''),
  location: Joi.string().max(255).optional().allow(null, ''),
  companySize: Joi.string()
    .valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')
    .optional()
    .allow(null, ''),
  website: Joi.string().uri().max(500).optional().allow(null, ''),
  description: Joi.string().max(5000).optional().allow(null, ''),
  companyDetails: Joi.string().max(5000).optional().allow(null, ''),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  password: Joi.string().pattern(passwordRegex).required().messages({
    'string.pattern.base':
      'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
    'any.required': 'Password is required',
  }),
});

// Job Management Validation Schemas

// export const createJobSchema = Joi.object({
//   title: Joi.string().min(1).max(255).required().messages({
//     'string.min': 'Job title must be at least 1 character',
//     'string.max': 'Job title cannot exceed 255 characters',
//     'any.required': 'Job title is required',
//   }),
//   description: Joi.string().min(10).max(10000).required().messages({
//     'string.min': 'Job description must be at least 10 characters',
//     'string.max': 'Job description cannot exceed 10000 characters',
//     'any.required': 'Job description is required',
//   }),
//   category: Joi.string().max(100).optional().allow(null, ''),
//   location: Joi.string().max(255).optional().allow(null, ''),
//   employmentType: Joi.string()
//     .valid('full-time', 'part-time', 'contract', 'remote', 'hybrid', 'onsite')
//     .required()
//     .messages({
//       'any.required': 'Employment type is required',
//       'any.only': 'Employment type must be one of: full-time, part-time, contract, remote, hybrid, onsite',
//     }),
//   salaryMin: Joi.number().min(0).optional().allow(null).messages({
//     'number.min': 'Minimum salary must be a positive number',
//   }),
//   salaryMax: Joi.number()
//     .min(Joi.ref('salaryMin'))
//     .optional()
//     .allow(null)
//     .messages({
//       'number.min': 'Maximum salary must be greater than or equal to minimum salary',
//     }),
//   currency: Joi.string().max(10).default('USD').optional(),
//   skills: Joi.array().items(Joi.string().max(100)).optional().default([]),
//   aiMatchingEnabled: Joi.boolean().optional().default(false),
// });
export const createJobSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),

  description: Joi.string().min(10).max(10000).required(),

  category: Joi.string().max(100).optional().allow(null, ''),
  role: Joi.string().max(100).optional().allow(null, ''),
  location: Joi.string().max(255).optional().allow(null, ''),
  city: Joi.string().max(255).optional().allow(null, ''),
  state: Joi.string().max(255).optional().allow(null, ''),
  country: Joi.string().max(255).optional().allow(null, ''),
  experienceLevel: Joi.string().max(100).optional().allow(null, ''),
  employmentType: Joi.string()
    .valid('full-time', 'part-time', 'contract', 'internship', 'freelance')
    .required(),

  workMode: Joi.string()
    .valid('on-site', 'onsite', 'remote', 'hybrid')
    .optional()
    .default('on-site'),

  minExperience: Joi.number().integer().min(0).optional().allow(null),
  maxExperience: Joi.number().integer().min(Joi.ref('minExperience')).optional().allow(null),

  fresherAllowed: Joi.boolean().optional().default(false),

  salaryMin: Joi.number().min(0).optional().allow(null),
  salaryMax: Joi.number().min(Joi.ref('salaryMin')).optional().allow(null),

  salaryType: Joi.string()
    .valid('fixed-range', 'negotiable', 'not-disclosed')
    .optional()
    .default('not-disclosed'),

  currency: Joi.string().max(10).optional().default('USD'),

  duration: Joi.number().integer().min(1).optional().allow(null),
  durationUnit: Joi.string().valid('weeks', 'months', 'years').optional().allow(null),
  paymentType: Joi.string().valid('fixed', 'hourly', 'monthly').optional().allow(null),
  expectedBudgetMin: Joi.number().min(0).optional().allow(null),
  expectedBudgetMax: Joi.number().min(Joi.ref('expectedBudgetMin')).optional().allow(null),
  openToBenchResources: Joi.boolean().optional().default(false),
  certifications: Joi.array().items(Joi.string()).optional().allow(null),
  numberOfOpenings: Joi.number().integer().min(1).optional().default(1),

  mltipleLocationsAllowed: Joi.boolean().optional().default(false),

  jobVisibility: Joi.string().valid('public', 'private', 'all').optional().default('public'),

  urgency: Joi.string().valid('normal', 'urgent', 'critical').optional().default('normal'),

  enableAiTalentMatching: Joi.boolean().optional().default(false),
  aiMatchingEnabled: Joi.boolean().optional().default(false),
  autoScreenCandidates: Joi.boolean().optional().default(false),
  enableSkillAssessment: Joi.boolean().optional().default(false),
  scheduleAIInterviews: Joi.boolean().optional().default(false),

  healthInsurance: Joi.boolean().optional().allow(null),
  ESOPs: Joi.boolean().optional().allow(null),
  performanceBonus: Joi.boolean().optional().allow(null),
  remoteAllowance: Joi.boolean().optional().allow(null),

  educationQualification: Joi.string().max(255).optional().allow(null, ''),
  languagesKnown: Joi.string().max(255).optional().allow(null, ''),

  equalOpportunityEmployer: Joi.boolean().optional().default(false),
  dataPrivacyPolicies: Joi.boolean().optional().default(false),
  termsAndConditions: Joi.boolean().optional().default(false),

  expiresAt: Joi.date().optional().allow(null),
  startDate: Joi.date().optional().allow(null),

  testType: Joi.string().optional().allow(null, ''),
  difficultyLevel: Joi.string().optional().allow(null, ''),
  timeLimit: Joi.number().integer().optional().allow(null),
  autoRejectBelowScore: Joi.number().integer().optional().allow(null),
  interviewType: Joi.string().optional().allow(null, ''),
  aiEvaluationCriteria: Joi.array().items(Joi.string()).optional().allow(null),
  autoAdvanceScore: Joi.number().integer().optional().allow(null),

  skills: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().required(),
        proficiencyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
      }),
    )
    .optional()
    .default([]),

  niceToHaveSkills: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().required(),
        proficiencyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
      }),
    )
    .optional()
    .default([]),
});

// export const updateJobSchema = Joi.object({
//   title: Joi.string().min(1).max(255).optional(),
//   description: Joi.string().min(10).max(10000).optional(),
//   category: Joi.string().max(100).optional().allow(null, ''),
//   location: Joi.string().max(255).optional().allow(null, ''),
//   employmentType: Joi.string()
//     .valid('full-time', 'part-time', 'contract', 'remote', 'hybrid', 'onsite')
//     .optional(),
//   salaryMin: Joi.number().min(0).optional().allow(null),
//   salaryMax: Joi.number().min(0).optional().allow(null),
//   currency: Joi.string().max(10).optional(),
//   skills: Joi.array().items(Joi.string().max(100)).optional(),
//   aiMatchingEnabled: Joi.boolean().optional(),
//   status: Joi.string().valid('draft', 'published', 'closed').optional(),
// });

export const updateJobSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().min(10).max(10000).optional(),
  experienceLevel: Joi.string().max(100).optional().allow(null, ''),

  category: Joi.string().max(100).optional().allow(null, ''),
  role: Joi.string().max(100).optional().allow(null, ''),
  location: Joi.string().max(255).optional().allow(null, ''),
  city: Joi.string().max(255).optional().allow(null, ''),
  state: Joi.string().max(255).optional().allow(null, ''),
  country: Joi.string().max(255).optional().allow(null, ''),

  employmentType: Joi.string()
    .valid('full-time', 'part-time', 'contract', 'internship', 'freelance')
    .optional(),

  workMode: Joi.string().valid('on-site', 'onsite', 'remote', 'hybrid').optional(),

  minExperience: Joi.number().integer().min(0).optional().allow(null),
  maxExperience: Joi.number().integer().min(0).optional().allow(null),

  fresherAllowed: Joi.boolean().optional(),

  salaryMin: Joi.number().min(0).optional().allow(null),
  salaryMax: Joi.number().min(0).optional().allow(null),

  salaryType: Joi.string().valid('fixed-range', 'negotiable', 'not-disclosed').optional(),

  currency: Joi.string().max(10).optional(),

  duration: Joi.number().integer().min(1).optional().allow(null),
  durationUnit: Joi.string().valid('weeks', 'months', 'years').optional().allow(null),
  paymentType: Joi.string().valid('fixed', 'hourly', 'monthly').optional().allow(null),
  expectedBudgetMin: Joi.number().min(0).optional().allow(null),
  expectedBudgetMax: Joi.number().min(Joi.ref('expectedBudgetMin')).optional().allow(null),
  openToBenchResources: Joi.boolean().optional(),
  certifications: Joi.array().items(Joi.string()).optional().allow(null),
  numberOfOpenings: Joi.number().integer().min(1).optional(),

  mltipleLocationsAllowed: Joi.boolean().optional(),

  jobVisibility: Joi.string().valid('public', 'private', 'all').optional(),

  urgency: Joi.string().valid('normal', 'urgent', 'critical').optional(),

  enableAiTalentMatching: Joi.boolean().optional(),
  aiMatchingEnabled: Joi.boolean().optional(),
  autoScreenCandidates: Joi.boolean().optional(),
  enableSkillAssessment: Joi.boolean().optional(),
  scheduleAIInterviews: Joi.boolean().optional(),

  healthInsurance: Joi.boolean().optional().allow(null),
  ESOPs: Joi.boolean().optional().allow(null),
  performanceBonus: Joi.boolean().optional().allow(null),
  remoteAllowance: Joi.boolean().optional().allow(null),

  educationQualification: Joi.string().max(255).optional().allow(null, ''),
  languagesKnown: Joi.string().max(255).optional().allow(null, ''),

  equalOpportunityEmployer: Joi.boolean().optional(),
  dataPrivacyPolicies: Joi.boolean().optional(),
  termsAndConditions: Joi.boolean().optional(),

  expiresAt: Joi.date().optional().allow(null),
  startDate: Joi.date().optional().allow(null),

  testType: Joi.string().optional().allow(null, ''),
  difficultyLevel: Joi.string().optional().allow(null, ''),
  timeLimit: Joi.number().integer().optional().allow(null),
  autoRejectBelowScore: Joi.number().integer().optional().allow(null),
  interviewType: Joi.string().optional().allow(null, ''),
  aiEvaluationCriteria: Joi.array().items(Joi.string()).optional().allow(null),
  autoAdvanceScore: Joi.number().integer().optional().allow(null),

  status: Joi.string().valid('draft', 'published', 'closed').optional(),

  skills: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().required(),
        proficiencyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
      }),
    )
    .optional(),

  niceToHaveSkills: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().required(),
        proficiencyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
      }),
    )
    .optional(),
});

export const jobQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  category: Joi.string().max(100).optional(),
  location: Joi.string().max(255).optional(),
  employmentType: Joi.alternatives()
    .try(
      Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'freelance'),
      Joi.array().items(
        Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'freelance'),
      ),
    )
    .optional(),
  id: Joi.number().integer().min(1).optional(),
  status: Joi.string().valid('draft', 'published', 'closed').optional(),
  jobVisibility: Joi.string().valid('public', 'private', 'all').optional(),
  workMode: Joi.string().valid('on-site', 'remote', 'hybrid').optional(),
  experienceLevel: Joi.string().max(100).optional(),
  salaryMin: Joi.number().min(0).optional(),
  salaryMax: Joi.number().min(0).optional(),
  skills: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
  keyword: Joi.string().max(255).optional(),
  title: Joi.string().max(255).optional(),
});

export const applyJobSchema = Joi.object({
  coverLetter: Joi.string().max(5000).optional().allow(null, '').messages({
    'string.max': 'Cover letter cannot exceed 5000 characters',
  }),
});

// Bench Resource Validation Schemas
export const benchResourceSchema = Joi.object({
  resourceName: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Resource name must be at least 1 character',
    'any.required': 'Resource name is required',
  }),
  currentRole: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Current role is required',
  }),
  email: Joi.string().email().optional().allow(null, ''),
  designation: Joi.string().max(255).optional().allow(null, ''),
  totalExperience: Joi.alternatives()
    .try(Joi.number().min(0).max(50), Joi.string())
    .required()
    .messages({
      'any.required': 'Total experience is required',
    }),
  employeeId: Joi.string().min(1).max(100).optional().allow(null, ''),
  refCode: Joi.string().max(100).optional().allow(null, ''),
  technicalSkills: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().max(100)),
      Joi.string(), // Allow string for multipart form data
    )
    .required()
    .messages({
      'any.required': 'Technical skills are required',
    }),
  professionalSummary: Joi.string().max(5000).optional().allow(null, ''),
  hourlyRate: Joi.number().min(0).required().messages({
    'any.required': 'Hourly rate is required',
    'number.min': 'Hourly rate must be positive',
  }),
  currency: Joi.string().max(50).default('USD'),
  availableFrom: Joi.date().optional(),
  availableForDeployment: Joi.date().optional(),
  minimumContractDuration: Joi.alternatives()
    .try(Joi.number().integer().min(1), Joi.string())
    .required()
    .messages({
      'any.required': 'Minimum contract duration is required',
    }),
  deploymentPreference: Joi.alternatives()
    .try(Joi.array().items(Joi.string().max(50)), Joi.string())
    .required()
    .messages({
      'any.required': 'Deployment preference is required',
    }),
  requireNonSolicitation: Joi.boolean().optional().default(false),
  location: Joi.string().max(255).optional().allow(null, ''),
  category: Joi.string().max(100).optional().allow(null, ''),
  certifications: Joi.alternatives()
    .try(Joi.array().items(Joi.string().max(100)), Joi.string())
    .optional()
    .default([]),
});

export const updateBenchResourceSchema = Joi.object({
  resourceName: Joi.string().min(1).max(255).optional(),
  currentRole: Joi.string().min(1).max(255).optional(),
  email: Joi.string().email().optional().allow(null, ''),
  designation: Joi.string().max(255).optional().allow(null, ''),
  totalExperience: Joi.alternatives().try(Joi.number().min(0).max(50), Joi.string()).optional(),
  employeeId: Joi.string().min(1).max(100).optional().allow(null, ''),
  refCode: Joi.string().max(100).optional().allow(null, ''),
  technicalSkills: Joi.alternatives()
    .try(Joi.array().items(Joi.string().max(100)), Joi.string())
    .optional(),
  professionalSummary: Joi.string().max(5000).optional().allow(null, ''),
  hourlyRate: Joi.number().min(0).optional(),
  currency: Joi.string().max(50).optional(),
  availableFrom: Joi.date().optional(),
  availableForDeployment: Joi.date().optional(),
  minimumContractDuration: Joi.alternatives()
    .try(Joi.number().integer().min(1), Joi.string())
    .optional(),
  deploymentPreference: Joi.alternatives()
    .try(Joi.array().items(Joi.string().max(50)), Joi.string())
    .optional(),
  requireNonSolicitation: Joi.boolean().optional(),
  location: Joi.string().max(255).optional().allow(null, ''),
  category: Joi.string().max(100).optional().allow(null, ''),
  certifications: Joi.alternatives()
    .try(Joi.array().items(Joi.string().max(100)), Joi.string())
    .optional(),
});

// Talent Search Validation Schema
export const talentSearchSchema = Joi.object({
  jobTitle: Joi.string().max(255).optional(),
  category: Joi.string().max(100).optional(),
  skills: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
  experienceMin: Joi.number().min(0).optional(),
  experienceMax: Joi.number().min(0).optional(),
  certifications: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
  workMode: Joi.string().valid('remote', 'hybrid', 'onsite').optional(),
  location: Joi.string().max(255).optional(),
  budgetMin: Joi.number().min(0).optional(),
  budgetMax: Joi.number().min(0).optional(),
  currency: Joi.string().max(10).default('INR'),
  type: Joi.string().valid('candidate', 'bench', 'all').default('all'),
  openToBenchResources: Joi.number().valid(0, 1).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().max(255).optional(),
});
