import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';
import Candidate from './Candidate';

// CandidateProfile attributes interface
export interface CandidateProfileAttributes {
  id: number;
  userId: number;

  // Contact & Location
  mobileNumber: string | null;
  location: string | null;
  city: string | null;
  country: string | null;

  // Candidate Type & Role
  candidateType: 'Full-Time Job Seeker' | 'Contract / Freelance' | 'Hybrid Professional' | '';
  primaryJobRole: string | null;
  availability: 'full-time' | 'freelance' | 'both';

  // Skills & Experience
  bio: string | null;
  yearsExperience: number | null;
  primarySkills: string[] | null;
  secondarySkills: string[] | null;

  // Work Preferences
  preferredWorkType: string[] | null; // remote, hybrid, onsite
  preferredJobLocations: string[] | null;

  // Salary Expectations
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  expectedSalaryMin: string | null;
  expectedSalaryMax: string | null;
  currency: string | null;

  // Availability
  availableIn: 'Immediate' | '15 Days' | '30 Days';
  availableToJoin: string | null;

  // Additional Info
  englishProficiency: 'Basic' | 'Professional' | 'Fluent' | 'Native';
  headline: string;
  resourceType: string;

  // Consent & Features
  acceptedTerms: boolean;
  acceptedPrivacyPolicy: boolean;
  enableAiMatching: boolean;
  takeSkillAssessment: boolean;
  scheduleAiInterview: boolean;

  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface CandidateProfileCreationAttributes extends Optional<
  CandidateProfileAttributes,
  | 'id'
  | 'mobileNumber'
  | 'location'
  | 'city'
  | 'country'
  | 'primaryJobRole'
  | 'bio'
  | 'yearsExperience'
  | 'primarySkills'
  | 'secondarySkills'
  | 'preferredWorkType'
  | 'preferredJobLocations'
  | 'hourlyRateMin'
  | 'hourlyRateMax'
  | 'expectedSalaryMin'
  | 'expectedSalaryMax'
  | 'currency'
  | 'availability'
  | 'availableIn'
  | 'availableToJoin'
  | 'candidateType'
  | 'englishProficiency'
  | 'headline'
  | 'resourceType'
  | 'acceptedTerms'
  | 'acceptedPrivacyPolicy'
  | 'enableAiMatching'
  | 'takeSkillAssessment'
  | 'scheduleAiInterview'
  | 'viewCount'
  | 'createdAt'
  | 'updatedAt'
> {}

// CandidateProfile model class
class CandidateProfile
  extends Model<CandidateProfileAttributes, CandidateProfileCreationAttributes>
  implements CandidateProfileAttributes
{
  declare id: number;
  declare userId: number;

  // Contact & Location
  declare mobileNumber: string | null;
  declare location: string | null;
  declare city: string | null;
  declare country: string | null;

  // Candidate Type & Role
  declare candidateType: 'Full-Time Job Seeker' | 'Contract / Freelance' | 'Hybrid Professional';
  declare primaryJobRole: string | null;
  declare availability: 'full-time' | 'freelance' | 'both';

  // Skills & Experience
  declare bio: string | null;
  declare yearsExperience: number | null;
  declare primarySkills: string[] | null;
  declare secondarySkills: string[] | null;

  // Work Preferences
  declare preferredWorkType: string[] | null;
  declare preferredJobLocations: string[] | null;

  // Salary Expectations
  declare hourlyRateMin: number | null;
  declare hourlyRateMax: number | null;
  declare expectedSalaryMin: string | null;
  declare expectedSalaryMax: string | null;
  declare currency: string | null;

  // Availability
  declare availableIn: 'Immediate' | '15 Days' | '30 Days';
  declare availableToJoin: string | null;

  // Additional Info
  declare englishProficiency: 'Basic' | 'Professional' | 'Fluent' | 'Native';
  declare headline: string;
  declare resourceType: string;

  // Consent & Features
  declare acceptedTerms: boolean;
  declare acceptedPrivacyPolicy: boolean;
  declare enableAiMatching: boolean;
  declare takeSkillAssessment: boolean;
  declare scheduleAiInterview: boolean;

  declare viewCount: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Associations
  public readonly candidate?: Candidate;
}

CandidateProfile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'candidates',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    mobileNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    candidateType: {
      type: DataTypes.ENUM('Full-Time Job Seeker', 'Contract / Freelance', 'Hybrid Professional'),
      allowNull: false,
      defaultValue: 'Full-Time Job Seeker',
    },
    primaryJobRole: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    availability: {
      type: DataTypes.ENUM('full-time', 'freelance', 'both'),
      allowNull: false,
      defaultValue: 'full-time',
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    yearsExperience: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 70,
      },
    },
    primarySkills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    secondarySkills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    preferredWorkType: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    preferredJobLocations: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    hourlyRateMin: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    hourlyRateMax: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    expectedSalaryMin: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    expectedSalaryMax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    availableIn: {
      type: DataTypes.ENUM('Immediate', '15 Days', '30 Days'),
      defaultValue: 'Immediate',
    },
    availableToJoin: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    englishProficiency: {
      type: DataTypes.ENUM('Basic', 'Professional', 'Fluent', 'Native'),
      defaultValue: 'Basic',
    },
    headline: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    resourceType: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    acceptedTerms: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    acceptedPrivacyPolicy: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    enableAiMatching: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    takeSkillAssessment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    scheduleAiInterview: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'candidate_profile',
    indexes: [
      { fields: ['user_id'], unique: true },
      { fields: ['availability'] },
      { fields: ['location'] },
      { fields: ['candidate_type'] },
      { fields: ['city'] },
      { fields: ['country'] },
      { name: 'candidate_profile_primary_skills_gin', fields: ['primary_skills'], using: 'GIN' },
      {
        name: 'candidate_profile_secondary_skills_gin',
        fields: ['secondary_skills'],
        using: 'GIN',
      },
    ],
  },
);

export default CandidateProfile;
