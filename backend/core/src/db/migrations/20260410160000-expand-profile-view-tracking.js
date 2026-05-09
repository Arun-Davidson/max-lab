'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add view_count to bench_resource
    await queryInterface.addColumn('bench_resource', 'view_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // 2. Modify profile_view to support bench resources
    // First, make candidate_profile_id nullable
    await queryInterface.changeColumn('profile_view', 'candidate_profile_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'candidate_profile',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });

    // Add bench_resource_id
    await queryInterface.addColumn('profile_view', 'bench_resource_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'bench_resource',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });

    // Add index for bench_resource_id
    await queryInterface.addIndex('profile_view', ['bench_resource_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('profile_view', ['bench_resource_id']);
    await queryInterface.removeColumn('profile_view', 'bench_resource_id');
    
    // Reverting candidate_profile_id to non-nullable might fail if nulls were introduced
    // So we just leave it nullable in down for safety or delete null rows first
    await queryInterface.changeColumn('profile_view', 'candidate_profile_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    
    await queryInterface.removeColumn('bench_resource', 'view_count');
  },
};
