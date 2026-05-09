import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';
import Job from './Job';
import CandidateProfile from './CandidateProfile';

// JobMatch attributes interface
export interface JobMatchAttributes {
  id: number;
  jobId: number;
  candidateProfileId: number;
  overallScore: number; // 0-100 composite score
  skillsScore: number; // 0-100
  experienceScore: number; // 0-100
  locationScore: number; // 0-100
  salaryScore: number; // 0-100
  semanticScore: number | null; // 0-100, optional advanced feature
  ranking: number | null; // Position in ranked list for this job
  matchExplanation: {
    skillsMatch: {
      matched: string[];
      missing: string[];
      percentage: number;
    };
    experienceMatch: {
      candidateYears: number;
      requiredYears: number;
      score: number;
    };
    locationMatch: {
      compatible: boolean;
      reason: string;
    };
    salaryMatch: {
      within_range: boolean;
      candidate_expectation: number | null;
      job_range: { min: number | null; max: number | null };
    };
  } | null;
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface JobMatchCreationAttributes extends Optional<
  JobMatchAttributes,
  'id' | 'semanticScore' | 'ranking' | 'matchExplanation' | 'computedAt' | 'createdAt' | 'updatedAt'
> {}

// JobMatch model class
class JobMatch
  extends Model<JobMatchAttributes, JobMatchCreationAttributes>
  implements JobMatchAttributes
{
  public id!: number;
  public jobId!: number;
  public candidateProfileId!: number;
  public overallScore!: number;
  public skillsScore!: number;
  public experienceScore!: number;
  public locationScore!: number;
  public salaryScore!: number;
  public semanticScore!: number | null;
  public ranking!: number | null;
  public matchExplanation!: JobMatchAttributes['matchExplanation'];
  public computedAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly job?: Job;
  public readonly candidateProfile?: CandidateProfile;
}

JobMatch.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    jobId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'job',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    candidateProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'candidate_profile',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    overallScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
      comment: 'Composite match score 0-100',
    },
    skillsScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
    },
    experienceScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
    },
    locationScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
    },
    salaryScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
    },
    semanticScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
      comment: 'Semantic similarity score (advanced AI feature)',
    },
    ranking: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Position in ranked candidate list for this job',
    },
    matchExplanation: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Detailed explanation of match score factors',
    },
    computedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When this match was computed (for cache invalidation)',
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
    tableName: 'job_match',
    indexes: [
      { fields: ['job_id', 'overall_score'] }, // For finding top candidates for a job
      { fields: ['candidate_profile_id', 'overall_score'] }, // For finding top jobs for a candidate
      { fields: ['computed_at'] }, // For cache invalidation
      { fields: ['job_id', 'candidate_profile_id'], unique: true }, // Prevent duplicates
    ],
  },
);

export default JobMatch;
