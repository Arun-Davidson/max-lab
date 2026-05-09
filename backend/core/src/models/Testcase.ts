import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface TestcaseAttributes {
  id: number;
  problemId: number;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestcaseCreationAttributes extends Optional<
  TestcaseAttributes,
  'id' | 'isHidden' | 'createdAt' | 'updatedAt'
> {}

class Testcase
  extends Model<TestcaseAttributes, TestcaseCreationAttributes>
  implements TestcaseAttributes
{
  public id!: number;
  public problemId!: number;
  public input!: string;
  public expectedOutput!: string;
  public isHidden!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Testcase.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    problemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'problem',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    input: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    expectedOutput: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isHidden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'testcase',
    underscored: true,
  },
);

export default Testcase;
