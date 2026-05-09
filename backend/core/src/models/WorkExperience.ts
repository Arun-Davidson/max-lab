import { DataTypes, Model } from 'sequelize';
import sequelize from '../db/sequelize';

class WorkExperience extends Model {}

WorkExperience.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    candidateProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'candidate_profile',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    employmentType: {
      type: DataTypes.ENUM('Full-time', 'Part-time', 'Contract', 'Freelance'),
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true, // null = currently working
    },
    description: {
      type: DataTypes.TEXT,
    },
    location: {
      type: DataTypes.STRING,
    },
  },
  {
    sequelize,
    modelName: 'WorkExperience',
    tableName: 'work_experiences',
    underscored: true,
  },
);

export default WorkExperience;
