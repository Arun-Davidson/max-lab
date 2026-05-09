import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface EmailVerificationAttributes {
  id: number;
  email: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailVerificationCreationAttributes extends Optional<
  EmailVerificationAttributes,
  'id' | 'verified' | 'createdAt' | 'updatedAt'
> {}

class EmailVerification
  extends Model<EmailVerificationAttributes, EmailVerificationCreationAttributes>
  implements EmailVerificationAttributes
{
  public id!: number;
  public email!: string;
  public otp!: string;
  public expiresAt!: Date;
  public verified!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  public isValid(): boolean {
    return !this.verified && !this.isExpired();
  }
}

EmailVerification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    otp: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'email_verification',
    indexes: [{ fields: ['email'] }, { fields: ['otp'] }, { fields: ['expires_at'] }],
  },
);

export default EmailVerification;
