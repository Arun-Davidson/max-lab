import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface EmployerShortlistAttributes {
  id: number;
  jobId: number;
  talentId: number;       // candidateProfile.userId (for 'candidate') or benchResource.id (for 'bench')
  talentSource: 'candidate' | 'bench';
  employerProfileId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployerShortlistCreationAttributes
  extends Optional<EmployerShortlistAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class EmployerShortlist
  extends Model<EmployerShortlistAttributes, EmployerShortlistCreationAttributes>
  implements EmployerShortlistAttributes
{
  public id!: number;
  public jobId!: number;
  public talentId!: number;
  public talentSource!: 'candidate' | 'bench';
  public employerProfileId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

EmployerShortlist.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    jobId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'job', key: 'id' },
      onDelete: 'CASCADE',
    },
    talentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    talentSource: {
      type: DataTypes.ENUM('candidate', 'bench'),
      allowNull: false,
    },
    employerProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'employer_profile', key: 'id' },
      onDelete: 'CASCADE',
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
    tableName: 'employer_shortlist',
    indexes: [
      // Prevent duplicate shortlists for the same talent on the same job
      {
        unique: true,
        fields: ['job_id', 'talent_id', 'talent_source'],
      },
      { fields: ['job_id'] },
      { fields: ['employer_profile_id'] },
    ],
  },
);

export default EmployerShortlist;
