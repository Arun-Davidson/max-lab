import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';
import BusinessUser from './BusinessUser';

// EmployerProfile attributes interface
export interface EmployerProfileAttributes {
  id: number;
  userId: number;
  companyName: string;
  industry: string | null;
  location: string | null;
  companySize: string | null;
  website: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface EmployerProfileCreationAttributes extends Optional<
  EmployerProfileAttributes,
  | 'id'
  | 'industry'
  | 'location'
  | 'companySize'
  | 'website'
  | 'description'
  | 'createdAt'
  | 'updatedAt'
> {}

// EmployerProfile model class
class EmployerProfile
  extends Model<EmployerProfileAttributes, EmployerProfileCreationAttributes>
  implements EmployerProfileAttributes
{
  declare id: number;
  declare userId: number;
  declare companyName: string;
  declare industry: string | null;
  declare location: string | null;
  declare companySize: string | null;
  declare website: string | null;
  declare description: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Associations
  public readonly businessUser?: BusinessUser;
}

EmployerProfile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'business_users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    companyName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    industry: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    companySize: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']],
      },
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'employer_profile',
    indexes: [
      { fields: ['user_id'], unique: true },
      { fields: ['company_name'] },
      { fields: ['industry'] },
    ],
  },
);

export default EmployerProfile;
