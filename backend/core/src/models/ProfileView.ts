import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface ProfileViewAttributes {
  id: number;
  candidateProfileId: number | null;
  benchResourceId: number | null;
  viewerId: number; // BusinessUser ID
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileViewCreationAttributes extends Optional<ProfileViewAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class ProfileView extends Model<ProfileViewAttributes, ProfileViewCreationAttributes> implements ProfileViewAttributes {
  public id!: number;
  public candidateProfileId!: number | null;
  public benchResourceId!: number | null;
  public viewerId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProfileView.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    candidateProfileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'candidate_profile',
        key: 'id',
      },
    },
    benchResourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'bench_resource',
        key: 'id',
      },
    },
    viewerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'business_users',
        key: 'id',
      },
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
    tableName: 'profile_view',
    underscored: true,
  },
);

export default ProfileView;
