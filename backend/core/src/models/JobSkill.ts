import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

// JobSkill attributes interface
export interface JobSkillAttributes {
  id: number;
  jobId: number;
  skillId: number;
  required: boolean;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface JobSkillCreationAttributes extends Optional<
  JobSkillAttributes,
  'id' | 'required' | 'proficiencyLevel' | 'createdAt' | 'updatedAt'
> {}

// JobSkill junction model class
class JobSkill
  extends Model<JobSkillAttributes, JobSkillCreationAttributes>
  implements JobSkillAttributes
{
  public id!: number;
  public jobId!: number;
  public skillId!: number;
  public required!: boolean;
  public proficiencyLevel!: 'beginner' | 'intermediate' | 'advanced' | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

JobSkill.init(
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
    required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this skill is required or nice-to-have',
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
    tableName: 'job_skill',
    indexes: [
      { fields: ['job_id', 'skill_id'], unique: true },
      { fields: ['job_id'] },
      { fields: ['skill_id'] },
    ],
  },
);

export default JobSkill;
