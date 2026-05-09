import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface CodingTestAttributes {
  id: number;
  interviewerId: number;
  title: string;
  totalTime: number; // in minutes
  difficultyDistribution: any | null; // e.g., { easy: 2, medium: 1, hard: 0 }
  status: 'draft' | 'active' | 'completed';
  // Invite fields
  candidateEmail: string | null;
  inviteToken: string | null;
  inviteExpiresAt: Date | null;
  inviteSentAt: Date | null;
  startedAt: Date | null;
  submittedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CodingTestCreationAttributes extends Optional<
  CodingTestAttributes,
  | 'id'
  | 'status'
  | 'candidateEmail'
  | 'inviteToken'
  | 'inviteExpiresAt'
  | 'inviteSentAt'
  | 'startedAt'
  | 'submittedAt'
  | 'createdAt'
  | 'updatedAt'
> {}

class CodingTest
  extends Model<CodingTestAttributes, CodingTestCreationAttributes>
  implements CodingTestAttributes
{
  declare id: number;
  declare interviewerId: number;
  declare title: string;
  declare totalTime: number;
  declare difficultyDistribution: any;
  declare status: 'draft' | 'active' | 'completed';
  declare candidateEmail: string | null;
  declare inviteToken: string | null;
  declare inviteExpiresAt: Date | null;
  declare inviteSentAt: Date | null;
  declare startedAt: Date | null;
  declare submittedAt: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CodingTest.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    interviewerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    totalTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
    },
    difficultyDistribution: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: { easy: 0, medium: 0, hard: 0 },
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'completed'),
      allowNull: false,
      defaultValue: 'draft',
    },
    candidateEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'candidate_email',
    },
    inviteToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'invite_token',
    },
    inviteExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'invite_expires_at',
    },
    inviteSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'invite_sent_at',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'started_at',
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'submitted_at',
    },
  },
  {
    sequelize,
    tableName: 'coding_test',
    underscored: true,
  },
);

export default CodingTest;
