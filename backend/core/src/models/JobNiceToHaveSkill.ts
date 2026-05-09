import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

// JobNiceToHaveSkill attributes interface
export interface JobNiceToHaveSkillAttributes {
  id: number;
  jobId: number;
  skillId: number;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface JobNiceToHaveSkillCreationAttributes extends Optional<
  JobNiceToHaveSkillAttributes,
  'id' | 'proficiencyLevel' | 'createdAt' | 'updatedAt'
> {}

// JobNiceToHaveSkill junction model class
class JobNiceToHaveSkill
  extends Model<JobNiceToHaveSkillAttributes, JobNiceToHaveSkillCreationAttributes>
  implements JobNiceToHaveSkillAttributes
{
  public id!: number;
  public jobId!: number;
  public skillId!: number;
  public proficiencyLevel!: 'beginner' | 'intermediate' | 'advanced' | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

JobNiceToHaveSkill.init(
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
    skillId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'skill',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    proficiencyLevel: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: true,
      defaultValue: 'beginner',
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
    tableName: 'job_nice_to_have_skill',
    indexes: [
      { fields: ['job_id', 'skill_id'], unique: true },
      { fields: ['job_id'] },
      { fields: ['skill_id'] },
    ],
  },
);

export default JobNiceToHaveSkill;
