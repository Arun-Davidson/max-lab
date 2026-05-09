'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('problem', 'examples', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn('problem', 'constraints', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn('problem', 'test_cases', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('problem', 'examples');
    await queryInterface.removeColumn('problem', 'constraints');
    await queryInterface.removeColumn('problem', 'test_cases');
  },
};
