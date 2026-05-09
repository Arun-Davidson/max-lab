import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface AuditLogAttributes {
  id: number;
  userId: number | null;
  action: string;
  auditable_type: string;
  auditableId: number | null;
  changes: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditLogCreationAttributes extends Optional<
  AuditLogAttributes,
  'id' | 'userId' | 'auditableId' | 'changes' | 'ipAddress' | 'userAgent' | 'createdAt'
> {}

class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  public id!: number;
  public userId!: number | null;
  public action!: string;
  public auditable_type!: string;
  public auditableId!: number | null;
  public changes!: Record<string, any> | null;
  public ipAddress!: string | null;
  public userAgent!: string | null;

  public readonly createdAt!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    auditable_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    auditableId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    changes: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['auditable_type', 'auditable_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] },
    ],
  },
);

export default AuditLog;
