import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';
import EmployerProfile from './EmployerProfile';

// BenchResource attributes interface
export interface BenchResourceAttributes {
  id: number;
  employerProfileId: number;
  resourceName: string;
  currentRole: string;
  designation: string | null;
  totalExperience: number;
  employeeId: string;
  refCode: string | null;
  email: string | null;
  technicalSkills: string[];
  professionalSummary: string | null;
  hourlyRate: number;
  currency: string;
  availableFrom: Date;
  minimumContractDuration: number; // in months
  deploymentPreference: string[];
  location: string | null;
  category: string | null;
  certifications: string[] | null;
  resumePath: string | null;
  resumeOriginalName: string | null;
  requireNonSolicitation: boolean;
  availableForDeployment: Date | null;
  isActive: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface BenchResourceCreationAttributes extends Optional<
  BenchResourceAttributes,
  | 'id'
  | 'email'
  | 'designation'
  | 'refCode'
  | 'professionalSummary'
  | 'location'
  | 'category'
  | 'certifications'
  | 'resumePath'
  | 'resumeOriginalName'
  | 'isActive'
  | 'viewCount'
  | 'createdAt'
  | 'updatedAt'
> {}

// BenchResource model class
class BenchResource
  extends Model<BenchResourceAttributes, BenchResourceCreationAttributes>
  implements BenchResourceAttributes
{
  declare id: number;
  declare employerProfileId: number;
  declare resourceName: string;
  declare currentRole: string;
  declare designation: string | null;
  declare totalExperience: number;
  declare employeeId: string;
  declare refCode: string | null;
  declare email: string | null;
  declare technicalSkills: string[];
  declare professionalSummary: string | null;
  declare hourlyRate: number;
  declare currency: string;
  declare availableFrom: Date;
  declare minimumContractDuration: number;
  declare deploymentPreference: string[];
  declare location: string | null;
  declare category: string | null;
  declare certifications: string[] | null;
  declare resumePath: string | null;
  declare resumeOriginalName: string | null;
  declare requireNonSolicitation: boolean;
  declare isActive: boolean;
  declare availableForDeployment: Date | null;
  declare viewCount: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Associations
  public readonly employerProfile?: EmployerProfile;
}

BenchResource.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    employerProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employer_profile',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    availableForDeployment: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when resource becomes available for deployment',
    },
    resourceName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Internal name of the resource',
    },
    currentRole: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Current role/position of the resource',
    },
    designation: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Official designation',
    },
    totalExperience: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Total years of experience',
    },
    employeeId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Employee ID or reference code',
    },
    refCode: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Additional reference code',
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    technicalSkills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      comment: 'Array of technical skills',
    },
    professionalSummary: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Professional summary/bio',
    },
    hourlyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Hourly rate (client billable)',
      validate: {
        min: 0,
      },
    },
    currency: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'USD',
      comment: 'Currency code (USD, INR, EUR, etc.)',
    },
    availableFrom: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Date when resource becomes available',
    },
    minimumContractDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Minimum contract duration in months',
      validate: {
        min: 1,
      },
    },
    deploymentPreference: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Geographic location/city',
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Professional category (e.g., Software Engineering)',
    },
    certifications: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'Professional certifications',
    },
    resumePath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Path to uploaded resume file',
    },
    resumeOriginalName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Original filename of the uploaded resume',
    },
    requireNonSolicitation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether a non-solicitation agreement is required',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Soft delete flag',
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'bench_resource',
    underscored: true,
    indexes: [
      { fields: ['employer_profile_id'] },
      { fields: ['is_active'] },
      { fields: ['employee_id'] },
      { fields: ['deployment_preference'] },
      { fields: ['available_from'] },
      { fields: ['location'] },
      { fields: ['category'] },
      { name: 'bench_resource_skills_gin', fields: ['technical_skills'], using: 'GIN' },
    ],
  },
);

export default BenchResource;
