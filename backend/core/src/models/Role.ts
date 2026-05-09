import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface RoleAttributes {
  id: number;
  name: string;
  description: string | null;
  position: number;
  assignable: boolean;
  builtin: number;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleCreationAttributes extends Optional<
  RoleAttributes,
  | 'id'
  | 'description'
  | 'position'
  | 'assignable'
  | 'builtin'
  | 'permissions'
  | 'createdAt'
  | 'updatedAt'
> {}

class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public position!: number;
  public assignable!: boolean;
  public builtin!: number;
  public permissions!: string[];

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Role.init(
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    assignable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    builtin: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: '0=normal, 1=non-member, 2=anonymous',
    },
    permissions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false,
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
    tableName: 'roles',
    indexes: [{ fields: ['name'], unique: true }, { fields: ['builtin'] }],
  },
);

export default Role;
