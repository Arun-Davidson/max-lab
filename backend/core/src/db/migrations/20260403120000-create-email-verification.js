'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create table if it doesn't exist
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('email_verification')) {
      await queryInterface.createTable('email_verification', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        otp: {
          type: Sequelize.STRING(10),
          allowNull: false,
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        verified: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      });

      await queryInterface.addIndex('email_verification', ['email']);
      await queryInterface.addIndex('email_verification', ['otp']);
      await queryInterface.addIndex('email_verification', ['expires_at']);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('email_verification');
  },
};
