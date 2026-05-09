// import { DataTypes, Model, Optional } from 'sequelize';
// import sequelize from '../db/sequelize';

// // CandidateSkill attributes interface
// export interface CandidateSkillAttributes {
//   id: number;
//   candidateProfileId: number;
//   skillId: number;
//   proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
//   createdAt: Date;
//   updatedAt: Date;
// }

// // Optional fields for creation
// export interface CandidateSkillCreationAttributes
//   extends Optional<CandidateSkillAttributes, 'id' | 'proficiencyLevel' | 'createdAt' | 'updatedAt'> {}

// // CandidateSkill junction model class
// class CandidateSkill
//   extends Model<CandidateSkillAttributes, CandidateSkillCreationAttributes>
//   implements CandidateSkillAttributes
// {
//   public id!: number;
//   public candidateProfileId!: number;
//   public skillId!: number;
//   public proficiencyLevel!: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;

//   public readonly createdAt!: Date;
//   public readonly updatedAt!: Date;
// }

// CandidateSkill.init(
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       autoIncrement: true,
//       primaryKey: true,
//     },
//     candidateProfileId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//       references: {
//         model: 'candidate_profile',
//         key: 'id',
//       },
//       onDelete: 'CASCADE',
//     },
//     skillId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//       references: {
//         model: 'skill',
//         key: 'id',
//       },
//       onDelete: 'CASCADE',
//     },
//     proficiencyLevel: {
//       type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
//       allowNull: true,
//     },
//     createdAt: {
//       type: DataTypes.DATE,
//       allowNull: false,
//     },
//     updatedAt: {
//       type: DataTypes.DATE,
//       allowNull: false,
//     },
//   },
//   {
//     sequelize,
//     tableName: 'candidate_skill',
//     indexes: [
//       { fields: ['candidate_profile_id', 'skill_id'], unique: true },
//       { fields: ['candidate_profile_id'] },
//       { fields: ['skill_id'] },
//     ],
//   },
// );

// export default CandidateSkill;

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize';

export interface CandidateSkillAttributes {
  id: number;
  candidateProfileId: number;
  skillId: number;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateSkillCreationAttributes extends Optional<
  CandidateSkillAttributes,
  'id' | 'proficiencyLevel' | 'createdAt' | 'updatedAt'
> {}

class CandidateSkill
  extends Model<CandidateSkillAttributes, CandidateSkillCreationAttributes>
  implements CandidateSkillAttributes
{
  // Use 'declare' here to add types only (no runtime field emitted)
  declare id: number;
  declare candidateProfileId: number;
  declare skillId: number;
  declare proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

CandidateSkill.init(
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
    skillId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'skill',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    proficiencyLevel: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
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
    tableName: 'candidate_skill',
    indexes: [
      { fields: ['candidate_profile_id', 'skill_id'], unique: true },
      { fields: ['candidate_profile_id'] },
      { fields: ['skill_id'] },
    ],
  },
);

export default CandidateSkill;
