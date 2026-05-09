import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';
import bcrypt from 'bcrypt';

// User attributes interface
export interface UserAttributes {
  id: number;
  uuid: string;
  email: string;
  role: string | null;
  firstName: string;
  lastName: string;
  passwordHash: string | null;
  status: 'active' | 'locked' | 'registered';
  admin: boolean;
  language: string;
  timezone: string;
  authSourceId: number | null;
  avatar: string | null;
  loginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface UserCreationAttributes extends Optional<
  UserAttributes,
  | 'id'
  | 'uuid'
  | 'passwordHash'
  | 'status'
  | 'admin'
  | 'language'
  | 'timezone'
  | 'authSourceId'
  | 'avatar'
  | 'loginAttempts'
  | 'lockedUntil'
  | 'lastLoginAt'
  | 'lastLoginIp'
  | 'createdAt'
  | 'updatedAt'
> {}

// User model class
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare uuid: string;
  declare email: string;
  declare role: string | null;
  declare firstName: string;
  declare lastName: string;
  declare passwordHash: string | null;
  declare status: 'active' | 'locked' | 'registered';
  declare admin: boolean;
  declare language: string;
  declare timezone: string;
  declare authSourceId: number | null;
  declare avatar: string | null;
  declare loginAttempts: number;
  declare lockedUntil: Date | null;
  declare lastLoginAt: Date | null;
  declare lastLoginIp: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Instance methods
  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public async validatePassword(password: string): Promise<boolean> {
    const hash = this.passwordHash || this.get('passwordHash') || this.get('password_hash' as any);

    if (!hash) {
      console.warn('Password validation failed: No password hash found for user', this.id);
      return false;
    }

    return bcrypt.compare(password, hash as string);
  }

  public async setPassword(password: string): Promise<void> {
    this.passwordHash = await bcrypt.hash(password, 10);
    this.setDataValue('passwordHash', this.passwordHash);
    this.setDataValue('password_hash' as any, this.passwordHash);
  }

  public isLocked(): boolean {
    return this.status === 'locked' || (!!this.lockedUntil && this.lockedUntil > new Date());
  }

  public toJSON(): Omit<UserAttributes, 'passwordHash'> {
    const values = { ...this.get() } as UserAttributes;
    const { passwordHash, ...rest } = values;
    return rest;
  }
}

User.init(
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
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    role: {
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
    authSourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // TODO: Add foreign key constraint when AuthSource model is implemented
      // references: {
      //   model: 'auth_sources',
      //   key: 'id',
      // },
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
    tableName: 'users',
    indexes: [
      { fields: ['uuid'], unique: true },
      { fields: ['email'], unique: true },
      { fields: ['status'] },
      { fields: ['admin'] },
    ],
  },
);

export default User;
