import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';
import bcrypt from 'bcrypt';

export interface CandidateAttributes {
  id: number;
  uuid: string;
  email: string;
  firstName: string;
  role: string | null;
  lastName: string;
  passwordHash: string | null;
  status: 'active' | 'locked' | 'registered';
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

export interface CandidateCreationAttributes extends Optional<
  CandidateAttributes,
  | 'id'
  | 'uuid'
  | 'passwordHash'
  | 'status'
  | 'role'
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

class Candidate
  extends Model<CandidateAttributes, CandidateCreationAttributes>
  implements CandidateAttributes
{
  declare id: number;
  declare uuid: string;
  declare email: string;
  declare firstName: string;
  declare role: string | null;
  declare lastName: string;
  declare passwordHash: string | null;
  declare status: 'active' | 'locked' | 'registered';
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
    console.log('Validating candidate password. Email:', this.email);
    console.log('Hash from this.passwordHash:', this.passwordHash);
    console.log('Hash from getDataValue:', this.getDataValue('passwordHash'));
    if (!hash) {
      console.log('No hash found for candidate');
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

  public toJSON(): Omit<CandidateAttributes, 'passwordHash'> {
    const values = { ...this.get() } as CandidateAttributes;
    const { passwordHash, ...rest } = values;
    return rest;
  }
}

Candidate.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'candidate',
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
    tableName: 'candidates',
    underscored: true,
    indexes: [
      { fields: ['uuid'], unique: true },
      { fields: ['email'], unique: true },
      { fields: ['status'] },
    ],
  },
);

export default Candidate;
