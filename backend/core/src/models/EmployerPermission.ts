import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface EmployerPermissionAttributes {
  id: number;
  employerId: number;
  canPostJob: boolean;
  canBrowseTalent: boolean;
  canManageBench: boolean;
  canCreateBench: boolean;
  plan: 'free' | 'basic' | 'pro';
  upgradedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployerPermissionCreationAttributes extends Optional<
  EmployerPermissionAttributes,
  | 'id'
  | 'canPostJob'
  | 'canBrowseTalent'
  | 'canManageBench'
  | 'canCreateBench'
  | 'plan'
  | 'upgradedAt'
  | 'createdAt'
  | 'updatedAt'
> {}

class EmployerPermission
  extends Model<EmployerPermissionAttributes, EmployerPermissionCreationAttributes>
  implements EmployerPermissionAttributes
{
  public id!: number;
  public employerId!: number;
  public canPostJob!: boolean;
  public canBrowseTalent!: boolean;
  public canManageBench!: boolean;
  public canCreateBench!: boolean;
  public plan!: 'free' | 'basic' | 'pro';
  public upgradedAt!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

EmployerPermission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    employerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'business_users', key: 'id' },
      onDelete: 'CASCADE',
      field: 'employer_id',
    },
    canPostJob: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'can_post_job',
    },
    canBrowseTalent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'can_browse_talent',
    },
    canManageBench: {
      type: DataTypes.BOOLEAN,
      defaultValue: true, // Employers can manage bench by default
      allowNull: false,
      field: 'can_manage_bench',
    },
    canCreateBench: {
      type: DataTypes.BOOLEAN,
      defaultValue: true, // Employers can create bench by default
      allowNull: false,
      field: 'can_create_bench',
    },
    plan: {
      type: DataTypes.ENUM('free', 'basic', 'pro'),
      defaultValue: 'free',
      allowNull: false,
    },
    upgradedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'upgraded_at',
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
    tableName: 'employer_permissions',
    underscored: true,
    indexes: [{ fields: ['employer_id'], unique: true }, { fields: ['plan'] }],
  },
);

export default EmployerPermission;
