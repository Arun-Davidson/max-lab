import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface JobSavedAttributes {
  id: number;
  candidateProfileId: number;
  jobId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobSavedCreationAttributes extends Optional<
  JobSavedAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

class JobSaved
  extends Model<JobSavedAttributes, JobSavedCreationAttributes>
  implements JobSavedAttributes
{
  public id!: number;
  public candidateProfileId!: number;
  public jobId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

JobSaved.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    candidateProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'candidate_profile_id',
      references: {
        model: 'candidate_profile',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    jobId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'job_id',
      references: {
        model: 'job',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'saved_job',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['candidate_profile_id', 'job_id'],
      },
    ],
  },
);

export default JobSaved;
