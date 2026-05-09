import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';
import Resume from './Resume';

// ResumeAnalysis attributes interface
export interface ResumeAnalysisAttributes {
  id: number;
  resumeId: number;
  extractedText: string;
  parsedSkills: string[]; // JSON array stored as JSONB
  experienceYears: number | null;
  educationLevel: string | null;
  contactInfo: {
    email?: string;
    phone?: string;
    linkedin?: string;
  } | null;
  completenessScore: number; // 0-100
  lastAnalyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface ResumeAnalysisCreationAttributes extends Optional<
  ResumeAnalysisAttributes,
  | 'id'
  | 'experienceYears'
  | 'educationLevel'
  | 'contactInfo'
  | 'completenessScore'
  | 'lastAnalyzedAt'
  | 'createdAt'
  | 'updatedAt'
> {}

// ResumeAnalysis model class
class ResumeAnalysis
  extends Model<ResumeAnalysisAttributes, ResumeAnalysisCreationAttributes>
  implements ResumeAnalysisAttributes
{
  public id!: number;
  public resumeId!: number;
  public extractedText!: string;
  public parsedSkills!: string[];
  public experienceYears!: number | null;
  public educationLevel!: string | null;
  public contactInfo!: { email?: string; phone?: string; linkedin?: string } | null;
  public completenessScore!: number;
  public lastAnalyzedAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly resume?: Resume;
}

ResumeAnalysis.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    resumeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'resume',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    extractedText: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Full text extracted from resume file',
    },
    parsedSkills: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of extracted skills from resume',
    },
    experienceYears: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: true,
      comment: 'Total years of work experience calculated',
    },
    educationLevel: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Highest education level (e.g., High School, Bachelor, Master, PhD)',
    },
    contactInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Extracted contact information (email, phone, linkedin)',
    },
    completenessScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
      comment: 'Resume completeness score 0-100',
    },
    lastAnalyzedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
    tableName: 'resume_analysis',
    indexes: [
      { fields: ['resume_id'] },
      { fields: ['last_analyzed_at'] },
      { fields: ['completeness_score'] },
    ],
  },
);

export default ResumeAnalysis;
