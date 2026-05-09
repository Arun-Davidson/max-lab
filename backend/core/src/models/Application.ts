import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../db/sequelize';
import CandidateProfile from './CandidateProfile';
import Job from './Job';
import Resume from './Resume';

// Application attributes interface
export interface ApplicationAttributes {
  id: number;
  candidateProfileId: number | null;
  benchResourceId: number | null;
  jobId: number;
  resumeId: number | null;
  coverLetter: string | null;
  status:
    | 'pending'
    | 'reviewed'
    | 'shortlisted'
    | 'rejected'
    | 'interview'
    | 'offered'
    | 'accepted'
    | 'selected';
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface ApplicationCreationAttributes extends Optional<
  ApplicationAttributes,
  | 'id'
  | 'candidateProfileId'
  | 'benchResourceId'
  | 'resumeId'
  | 'coverLetter'
  | 'status'
  | 'appliedAt'
  | 'createdAt'
  | 'updatedAt'
> {}

// Application model class
class Application
  extends Model<ApplicationAttributes, ApplicationCreationAttributes>
  implements ApplicationAttributes
{
  public id!: number;
  public candidateProfileId!: number | null;
  public benchResourceId!: number | null;
  public jobId!: number;
  public resumeId!: number | null;
  public coverLetter!: string | null;
  public status!:
    | 'pending'
    | 'reviewed'
    | 'shortlisted'
    | 'rejected'
    | 'interview'
    | 'offered'
    | 'accepted'
    | 'selected';
  public appliedAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly candidateProfile?: CandidateProfile;
  public readonly benchResource?: any; // Avoid circular dep if needed
  public readonly job?: Job;
  public readonly resume?: Resume;
}

Application.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    candidateProfileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'candidate_profile',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    benchResourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'bench_resource',
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
    resumeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'resume',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    coverLetter: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'reviewed',
        'shortlisted',
        'rejected',
        'interview',
        'offered',
        'accepted',
        'selected',
      ),
      allowNull: false,
      defaultValue: 'pending',
    },
    appliedAt: {
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
    tableName: 'application',
    indexes: [
      {
        fields: ['candidate_profile_id', 'job_id'],
        unique: true,
        where: { candidate_profile_id: { [Op.ne]: null } },
      },
      {
        fields: ['bench_resource_id', 'job_id'],
        unique: true,
        where: { bench_resource_id: { [Op.ne]: null } },
      },
      { fields: ['candidate_profile_id'] },
      { fields: ['bench_resource_id'] },
      { fields: ['job_id'] },
      { fields: ['status'] },
      { fields: ['applied_at'] },
    ],
  },
);

export default Application;
