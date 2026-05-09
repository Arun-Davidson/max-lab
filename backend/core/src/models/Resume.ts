import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';
import CandidateProfile from './CandidateProfile';

// Resume attributes interface
export interface ResumeAttributes {
  id: number;
  candidateProfileId: number;
  filePath: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  isDefault: boolean;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface ResumeCreationAttributes extends Optional<
  ResumeAttributes,
  'id' | 'isDefault' | 'uploadedAt' | 'createdAt' | 'updatedAt'
> {}

// Resume model class
class Resume extends Model<ResumeAttributes, ResumeCreationAttributes> implements ResumeAttributes {
  public id!: number;
  public candidateProfileId!: number;
  public filePath!: string;
  public originalName!: string;
  public fileSize!: number;
  public mimeType!: string;
  public isDefault!: boolean;
  public uploadedAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly candidateProfile?: CandidateProfile;
}

Resume.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Path to the resume file on disk or cloud storage',
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Original filename as uploaded by the user',
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'File size in bytes',
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      // Relaxing validation to allow more types that might be sent by mobile browsers
      // common ones: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
      // but mobile might send generic application/octet-stream
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this is the default resume for the candidate',
    },
    uploadedAt: {
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
    tableName: 'resume',
    indexes: [{ fields: ['candidate_profile_id'] }, { fields: ['uploaded_at'] }],
  },
);

export default Resume;
