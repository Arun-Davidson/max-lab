'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add view_count to candidate_profile
    await queryInterface.addColumn('candidate_profile', 'view_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // 2. Create profile_view table
    await queryInterface.createTable('profile_view', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      candidate_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'candidate_profile',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      viewer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'business_users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add index for faster querying
    await queryInterface.addIndex('profile_view', ['candidate_profile_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('profile_view');
    await queryInterface.removeColumn('candidate_profile', 'view_count');
  },
};
