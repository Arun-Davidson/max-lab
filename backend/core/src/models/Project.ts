import { DataTypes, Model } from 'sequelize';
import sequelize from '../db/sequelize';

class Project extends Model {}

Project.init(
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    techStack: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    projectUrl: {
      type: DataTypes.STRING,
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Project',
    tableName: 'projects',
    underscored: true,
  },
);

export default Project;
