import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface CodingTestProblemAttributes {
  id: number;
  testId: number;
  problemId: number;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CodingTestProblemCreationAttributes extends Optional<
  CodingTestProblemAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

class CodingTestProblem
  extends Model<CodingTestProblemAttributes, CodingTestProblemCreationAttributes>
  implements CodingTestProblemAttributes
{
  declare id: number;
  declare testId: number;
  declare problemId: number;
  declare order: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CodingTestProblem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    testId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'coding_test',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'coding_test_problem',
    underscored: true,
  },
);

export default CodingTestProblem;
