import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

// Interview attributes interface
export interface InterviewAttributes {
  id: number;
  candidateProfileId: number;
  jobId: number;
  applicationId: number;
  status: 'pending' | 'scheduled' | 'completed' | 'failed';
  videoUrl: string | null;
  overallScore: number | null;
  resultJson: any | null;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface InterviewCreationAttributes extends Optional<
  InterviewAttributes,
  'id' | 'status' | 'videoUrl' | 'overallScore' | 'resultJson' | 'createdAt' | 'updatedAt'
> {}

// Interview model class
class Interview
  extends Model<InterviewAttributes, InterviewCreationAttributes>
  implements InterviewAttributes
{
  public id!: number;
  public candidateProfileId!: number;
  public jobId!: number;
  public applicationId!: number;
  public status!: 'pending' | 'scheduled' | 'completed' | 'failed';
  public videoUrl!: string | null;
  public overallScore!: number | null;
  public resultJson!: any | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Interview.init(
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
    jobId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'job',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    applicationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'application',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM('pending', 'scheduled', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    videoUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    overallScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    resultJson: {
      type: DataTypes.JSONB,
      allowNull: true,
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
    tableName: 'interview',
    underscored: true,
  },
);

export default Interview;
