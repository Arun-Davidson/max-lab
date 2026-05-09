import { DataTypes, Model } from 'sequelize';
import sequelize from '../db/sequelize';

class Certification extends Model {}

Certification.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    issuedBy: {
      type: DataTypes.STRING,
    },
    issueDate: {
      type: DataTypes.DATEONLY,
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
    },
    credentialUrl: {
      type: DataTypes.STRING,
    },
  },
  {
    sequelize,
    modelName: 'Certification',
    tableName: 'certifications',
    underscored: true,
  },
);

export default Certification;
