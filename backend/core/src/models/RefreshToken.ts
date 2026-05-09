import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface RefreshTokenAttributes {
  id: number;
  userId: number;
  tokenHash: string;
  tokenId: string;
  revoked: boolean;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenCreationAttributes extends Optional<
  RefreshTokenAttributes,
  'id' | 'deviceInfo' | 'ipAddress' | 'createdAt' | 'updatedAt'
> {}

class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  public id!: number;
  public userId!: number;
  public tokenHash!: string;
  public tokenId!: string;
  public revoked!: boolean;
  public deviceInfo!: string | null;
  public ipAddress!: string | null;
  public expiresAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}

RefreshToken.init(
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
    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    tokenId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deviceInfo: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
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
    tableName: 'refresh_tokens',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['token_hash'], unique: true },
      { fields: ['expires_at'] },
    ],
  },
);

export default RefreshToken;
