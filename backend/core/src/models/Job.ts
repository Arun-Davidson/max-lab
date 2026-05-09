import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';
import EmployerProfile from './EmployerProfile';

// Job attributes interface
export interface JobAttributes {
  id: number;
  employerProfileId: number;
  title: string;
  description: string;
  role: string | null;
  category: string | null;
  location: string | null;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';
  salaryMin: number | null;
  enableAiTalentMatching: boolean | null;
  autoScreenCandidates: boolean | null;
  enableSkillAssessment: boolean | null;
  scheduleAIInterviews: boolean | null;
  numberOfOpenings: number | null;
  jobVisibility: 'public' | 'private' | 'all';
  dataPrivacyPolicies: boolean | null;
  termsAndConditions: boolean | null;
  languagesKnown: string | null;
  salaryMax: number | null;
  performanceBonus: boolean | null;
  educationQualification: string | null;
  minExperience: number | null;
  fresherAllowed: boolean | null;
  remoteAllowance: boolean | null;
  currency: string;
  duration: number | null;
  durationUnit: 'weeks' | 'months' | 'years' | null;
  paymentType: 'fixed' | 'hourly' | 'monthly' | null;
  expectedBudgetMin: number | null;
  expectedBudgetMax: number | null;
  openToBenchResources: boolean;
  certifications: string[] | null;
  city: string | null;
  mltipleLocationsAllowed: boolean | null;
  state: string | null;
  country: string | null;
  maxExperience: number | null;
  workMode: 'hybrid' | 'on-site' | 'remote';
  status: 'draft' | 'published' | 'closed';
  isActive: boolean;
  urgency: 'normal' | 'urgent' | 'critical';
  healthInsurance: boolean | null;
  ESOPs: boolean | null;
  salaryType: 'fixed-range' | 'negotiable' | 'not-disclosed';
  aiMatchingEnabled: boolean;
  experienceLevel: string | null;
  equalOpportunityEmployer: boolean | null;
  testType: string | null;
  difficultyLevel: string | null;
  timeLimit: number | null;
  autoRejectBelowScore: number | null;
  interviewType: string | null;
  aiEvaluationCriteria: string[] | null;
  autoAdvanceScore: number | null;
  startDate: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface JobCreationAttributes extends Optional<
  JobAttributes,
  | 'id'
  | 'category'
  | 'location'
  | 'salaryMin'
  | 'salaryMax'
  | 'currency'
  | 'minExperience'
  | 'fresherAllowed'
  | 'healthInsurance'
  | 'urgency'
  | 'experienceLevel'
  | 'jobVisibility'
  | 'termsAndConditions'
  | 'dataPrivacyPolicies'
  | 'equalOpportunityEmployer'
  | 'numberOfOpenings'
  | 'scheduleAIInterviews'
  | 'enableSkillAssessment'
  | 'autoScreenCandidates'
  | 'remoteAllowance'
  | 'performanceBonus'
  | 'ESOPs'
  | 'maxExperience'
  | 'languagesKnown'
  | 'salaryType'
  | 'educationQualification'
  | 'mltipleLocationsAllowed'
  | 'status'
  | 'isActive'
  | 'role'
  | 'city'
  | 'enableAiTalentMatching'
  | 'state'
  | 'country'
  | 'duration'
  | 'durationUnit'
  | 'paymentType'
  | 'expectedBudgetMin'
  | 'expectedBudgetMax'
  | 'openToBenchResources'
  | 'certifications'
  | 'workMode'
  | 'aiMatchingEnabled'
  | 'testType'
  | 'difficultyLevel'
  | 'timeLimit'
  | 'autoRejectBelowScore'
  | 'interviewType'
  | 'aiEvaluationCriteria'
  | 'autoAdvanceScore'
  | 'startDate'
  | 'expiresAt'
  | 'createdAt'
  | 'updatedAt'
> {}

// Job model class
class Job extends Model<JobAttributes, JobCreationAttributes> implements JobAttributes {
  public id!: number;
  public employerProfileId!: number;
  public title!: string;
  public equalOpportunityEmployer!: boolean | null;
  public enableAiTalentMatching!: boolean | null;
  public description!: string;
  public category!: string | null;
  public location!: string | null;
  public role!: string | null;
  public city!: string | null;
  public state!: string | null;
  public languagesKnown!: string | null;
  public experienceLevel!: string | null;
  public minExperience!: number | null;
  public maxExperience!: number | null;
  public fresherAllowed!: boolean | null;
  public educationQualification!: string | null;
  public healthInsurance!: boolean | null;
  public urgency!: 'normal' | 'urgent' | 'critical';
  public jobVisibility!: 'public' | 'private' | 'all';
  public termsAndConditions!: boolean | null;
  public dataPrivacyPolicies!: boolean | null;
  public numberOfOpenings!: number | null;
  public scheduleAIInterviews!: boolean | null;
  public enableSkillAssessment!: boolean | null;
  public autoScreenCandidates!: boolean | null;
  public remoteAllowance!: boolean | null;
  public performanceBonus!: boolean | null;
  public ESOPs!: boolean | null;
  public country!: string | null;
  public duration!: number | null;
  public durationUnit!: 'weeks' | 'months' | 'years' | null;
  public paymentType!: 'fixed' | 'hourly' | 'monthly' | null;
  public expectedBudgetMin!: number | null;
  public expectedBudgetMax!: number | null;
  public openToBenchResources!: boolean;
  public certifications!: string[] | null;
  public salaryType!: 'fixed-range' | 'negotiable' | 'not-disclosed';
  public mltipleLocationsAllowed!: boolean | null;
  public workMode!: 'hybrid' | 'on-site' | 'remote';
  public employmentType!: 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';
  public salaryMin!: number | null;
  public salaryMax!: number | null;
  public currency!: string;
  public status!: 'draft' | 'published' | 'closed';
  public isActive!: boolean;
  public aiMatchingEnabled!: boolean;
  public testType!: string | null;
  public difficultyLevel!: string | null;
  public timeLimit!: number | null;
  public autoRejectBelowScore!: number | null;
  public interviewType!: string | null;
  public aiEvaluationCriteria!: string[] | null;
  public autoAdvanceScore!: number | null;
  public startDate!: Date | null;
  public expiresAt!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly employerProfile?: EmployerProfile;
}

Job.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    employerProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employer_profile',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    experienceLevel: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Job category (e.g., Engineering, Marketing, Sales)',
    },
    enableAiTalentMatching: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    autoScreenCandidates: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    equalOpportunityEmployer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    dataPrivacyPolicies: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    termsAndConditions: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    jobVisibility: {
      type: DataTypes.ENUM('public', 'private', 'all'),
      allowNull: false,
      defaultValue: 'public',
    },
    urgency: {
      type: DataTypes.ENUM('normal', 'urgent', 'critical'),
      allowNull: true,
      defaultValue: 'normal',
    },
    enableSkillAssessment: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    scheduleAIInterviews: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    numberOfOpenings: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    role: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Job role (e.g., Software Engineer, Marketing Manager)',
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'City where job is located',
    },
    minExperience: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Minimum experience required in years',
    },
    maxExperience: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum experience required in years',
    },
    fresherAllowed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Whether Fresher is allowed',
    },
    educationQualification: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Education Qualification',
    },
    languagesKnown: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Languages known',
    },
    state: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'State where job is located',
    },
    country: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Country where job is located',
    },
    employmentType: {
      type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'internship', 'freelance'),
      allowNull: false,
      defaultValue: 'full-time',
    },
    workMode: {
      type: DataTypes.ENUM('on-site', 'remote', 'hybrid'),
      allowNull: false,
      defaultValue: 'on-site',
    },
    mltipleLocationsAllowed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Whether multiple locations are allowed',
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration value',
    },
    durationUnit: {
      type: DataTypes.ENUM('weeks', 'months', 'years'),
      allowNull: true,
    },
    paymentType: {
      type: DataTypes.ENUM('fixed', 'hourly', 'monthly'),
      allowNull: true,
    },
    expectedBudgetMin: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Minimum budget range in INR',
    },
    expectedBudgetMax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Maximum budget range in INR',
    },
    openToBenchResources: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this job is open to bench resources',
    },
    certifications: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      comment: 'List of required certifications',
    },
    salaryType: {
      type: DataTypes.ENUM('fixed-range', 'negotiable', 'not-disclosed'),
      allowNull: false,
      defaultValue: 'not-disclosed',
    },
    healthInsurance: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Health Insurance',
    },
    ESOPs: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'ESOPs',
    },
    performanceBonus: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Performance Bonus',
    },
    remoteAllowance: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Remote Allowance',
    },
    salaryMin: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    salaryMax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'USD',
      comment: 'Currency code for salary (e.g., USD, EUR, INR)',
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'closed'),
      allowNull: false,
      defaultValue: 'draft',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Soft delete flag - false means deleted',
    },
    aiMatchingEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether to use AI for candidate matching',
    },
    testType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    difficultyLevel: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timeLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    autoRejectBelowScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    interviewType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aiEvaluationCriteria: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    autoAdvanceScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Job start date',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Job posting expiration date',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'job',
    indexes: [
      { fields: ['employer_profile_id'] },
      { fields: ['status'] },
      { fields: ['employment_type'] },
      { fields: ['category'] },
      { fields: ['expires_at'] },
      { fields: ['is_active'] },
      { fields: ['is_active', 'status'] }, // Composite index for active published jobs
    ],
  },
);

export default Job;
