import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';
import bcrypt from 'bcrypt';

export interface BusinessUserAttributes {
  id: number;
  uuid: string;
  email: string;
  role: 'employer' | 'hr';
  companyName: string;
  companyDetails: string | null;
  companyDocument: string; // mandatory
  firstName: string;
  lastName: string;
  passwordHash: string | null;
  status: 'active' | 'locked' | 'registered';
  admin: boolean; // System admin flag
  language: string;
  timezone: string;
  avatar: string | null;
  loginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessUserCreationAttributes extends Optional<
  BusinessUserAttributes,
  | 'id'
  | 'uuid'
  | 'companyDetails'
  | 'passwordHash'
  | 'status'
  | 'admin'
  | 'language'
  | 'timezone'
  | 'avatar'
  | 'loginAttempts'
  | 'lockedUntil'
  | 'lastLoginAt'
  | 'lastLoginIp'
  | 'createdAt'
  | 'updatedAt'
> {}

class BusinessUser
  extends Model<BusinessUserAttributes, BusinessUserCreationAttributes>
  implements BusinessUserAttributes
{
  declare id: number;
  declare uuid: string;
  declare email: string;
  declare role: 'employer' | 'hr';
  declare companyName: string;
  declare companyDetails: string | null;
  declare companyDocument: string;
  declare firstName: string;
  declare lastName: string;
  declare passwordHash: string | null;
  declare status: 'active' | 'locked' | 'registered';
  declare admin: boolean;
  declare language: string;
  declare timezone: string;
  declare avatar: string | null;
  declare loginAttempts: number;
  declare lockedUntil: Date | null;
  declare lastLoginAt: Date | null;
  declare lastLoginIp: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public async validatePassword(password: string): Promise<boolean> {
    const hash = this.passwordHash || this.getDataValue('passwordHash');
    console.log('Validating business user password. Email:', this.email);
    console.log('Hash from this.passwordHash:', this.passwordHash);
    console.log('Hash from getDataValue:', this.getDataValue('passwordHash'));
    if (!hash) {
      console.log('No hash found for business user');
      return false;
    }
    const result = await bcrypt.compare(password, hash);
    console.log('Bcrypt compare result:', result);
    return result;
  }

  public async setPassword(password: string): Promise<void> {
    this.passwordHash = await bcrypt.hash(password, 10);
  }

  public isLocked(): boolean {
    return this.status === 'locked' || (!!this.lockedUntil && this.lockedUntil > new Date());
  }

  public toJSON(): Omit<BusinessUserAttributes, 'passwordHash'> {
    const values = { ...this.get() } as BusinessUserAttributes;
    const { passwordHash, ...rest } = values;
    return rest;
  }
}

BusinessUser.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    role: {
      type: DataTypes.ENUM('employer', 'hr'),
      allowNull: false,
    },
    companyName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    companyDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    companyDocument: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'locked', 'registered'),
      defaultValue: 'registered',
      allowNull: false,
    },
    admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    language: {
      type: DataTypes.STRING(10),
      defaultValue: 'en',
      allowNull: false,
    },
    timezone: {
      type: DataTypes.STRING(50),
      defaultValue: 'UTC',
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginIp: {
      type: DataTypes.STRING(45),
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
    tableName: 'business_users',
    underscored: true,
    indexes: [
      { fields: ['uuid'], unique: true },
      { fields: ['email'], unique: true },
      { fields: ['role'] },
      { fields: ['status'] },
      { fields: ['admin'] },
    ],
  },
);

export default BusinessUser;
