import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

// PasswordReset attributes interface
export interface PasswordResetAttributes {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface PasswordResetCreationAttributes extends Optional<
  PasswordResetAttributes,
  'id' | 'used' | 'createdAt' | 'updatedAt'
> {}

// PasswordReset model class
class PasswordReset
  extends Model<PasswordResetAttributes, PasswordResetCreationAttributes>
  implements PasswordResetAttributes
{
  public id!: number;
  public userId!: number;
  public token!: string;
  public expiresAt!: Date;
  public used!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Check if token is expired
  public isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  // Check if token is valid
  public isValid(): boolean {
    return !this.used && !this.isExpired();
  }
}

PasswordReset.init(
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
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Hashed password reset token',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Token expiration timestamp',
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the token has been used',
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
    tableName: 'password_reset',
    indexes: [
      { fields: ['token'], unique: true },
      { fields: ['user_id'] },
      { fields: ['expires_at'] },
    ],
  },
);

export default PasswordReset;
