import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

// Skill attributes interface
export interface SkillAttributes {
  id: number;
  name: string;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface SkillCreationAttributes extends Optional<
  SkillAttributes,
  'id' | 'category' | 'createdAt' | 'updatedAt'
> {}

// Skill model class
class Skill extends Model<SkillAttributes, SkillCreationAttributes> implements SkillAttributes {
  public id!: number;
  public name!: string;
  public category!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Skill.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Optional skill category (e.g., Programming Languages, Frameworks, Tools)',
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
    tableName: 'skill',
    indexes: [{ fields: ['name'], unique: true }, { fields: ['category'] }],
  },
);

export default Skill;
