import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface ProblemAttributes {
  id: number;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[] | null;
  baseCode: any | null; // JSON object with language-specific templates
  examples: any[] | null;
  constraints: string[] | null;
  test_cases: any[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProblemCreationAttributes extends Optional<
  ProblemAttributes,
  'id' | 'tags' | 'baseCode' | 'examples' | 'constraints' | 'test_cases' | 'createdAt' | 'updatedAt'
> {}

class Problem
  extends Model<ProblemAttributes, ProblemCreationAttributes>
  implements ProblemAttributes
{
  declare id: number;
  declare title: string;
  declare description: string;
  declare difficulty: 'easy' | 'medium' | 'hard';
  declare tags: string[] | null;
  declare baseCode: any | null;
  declare examples: any[] | null;
  declare constraints: string[] | null;
  declare test_cases: any[] | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Problem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    difficulty: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      allowNull: false,
      defaultValue: 'medium',
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    baseCode: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    examples: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    constraints: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    test_cases: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'problem',
    underscored: true,
  },
);

export default Problem;
