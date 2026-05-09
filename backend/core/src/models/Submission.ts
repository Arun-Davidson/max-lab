import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface SubmissionAttributes {
  id: number;
  userId: number;
  testId: number | null;
  problemId: number;
  code: string;
  languageId: number;
  status: string;
  results: any | null;
  openaiReview: string | null;
  aiImprovedCode: string | null;
  grade: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SubmissionCreationAttributes extends Optional<
  SubmissionAttributes,
  'id' | 'testId' | 'results' | 'openaiReview' | 'aiImprovedCode' | 'grade' | 'createdAt' | 'updatedAt'
> {}

class Submission
  extends Model<SubmissionAttributes, SubmissionCreationAttributes>
  implements SubmissionAttributes
{
  declare id: number;
  declare userId: number;
  declare testId: number | null;
  declare problemId: number;
  declare code: string;
  declare languageId: number;
  declare status: string;
  declare results: any | null;
  declare openaiReview: string | null;
  declare aiImprovedCode: string | null;
  declare grade: number | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Submission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    testId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'coding_test',
        key: 'id',
      },
    },
    problemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'problem',
        key: 'id',
      },
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    languageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
    },
    results: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    openaiReview: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    aiImprovedCode: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    grade: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'submission',
    underscored: true,
  },
);

export default Submission;
