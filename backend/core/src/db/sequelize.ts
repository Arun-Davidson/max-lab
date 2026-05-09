import { Sequelize } from 'sequelize';
import config from '../config';
import logger from '../config/logger';
import pg from 'pg'; // for vercel
// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  username: config.postgres.username,
  password: config.postgres.password,
  dialectModule: pg,
  logging: config.postgres.logging ? (sql: string) => logger.debug(sql) : false,
  pool: {
    // max: 20,
    // min: 5,
    // acquire: 60000,
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: config.postgres.ssl?.enabled
    ? {
      ssl: {
        require: true,
        rejectUnauthorized: true,
        ca: config.postgres.ssl.ca,
      },
    }
    : {},
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
  benchmark: config.env === 'development',
});

// Test connection
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connection established successfully');
  } catch (error) {
    logger.error('Unable to connect to PostgreSQL database:', error);
    throw error;
  }
};

// Sync models (use migrations in production)
export const syncModels = async (force = false): Promise<void> => {
  try {
    // Import all models to register them with Sequelize
    const { initAssociations } = await import('../models');

    // Initialize model associations
    initAssociations();

    // For development: sync without foreign key constraints first, then add them
    // This avoids table creation order issues
    logger.info('Creating database schema...');

    // Cleanup orphaned profiles and legacy constraints that might block FK constraints in development
    if (config.env === 'development') {
      try {
        // Drop legacy constraints if they exist (pointing to 'users' table instead of 'candidates'/'business_users')
        await sequelize.query(
          'ALTER TABLE candidate_profile DROP CONSTRAINT IF EXISTS candidate_profile_user_id_fkey',
        );
        await sequelize.query(
          'ALTER TABLE employer_profile DROP CONSTRAINT IF EXISTS employer_profile_user_id_fkey',
        );
        await sequelize.query(
          'ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey',
        );
        // Allow candidates to create mock tests — drop FK pointing to the legacy 'users' table
        await sequelize.query(
          'ALTER TABLE coding_test DROP CONSTRAINT IF EXISTS coding_test_interviewer_id_fkey',
        );
        logger.info('Dropped legacy foreign key constraints');

        await sequelize.query(
          'DELETE FROM candidate_profile WHERE user_id NOT IN (SELECT id FROM candidates)',
        );
        logger.info('Cleaned up orphaned candidate profiles');

        await sequelize.query(
          'DELETE FROM employer_profile WHERE user_id NOT IN (SELECT id FROM business_users)',
        );
        logger.info('Cleaned up orphaned employer profiles');
      } catch (error) {
        // Table might not exist yet or other SQL error - ignore and let sync handle it
        logger.debug('Skipping profile cleanup, table might not exist yet or error occurred');
      }
    }

    // Sync database schema with alter mode in development
    // await sequelize.sync({
    // force,
    // force: true,
    // alter: config.env === 'development',
    // Note: Sequelize will handle foreign key creation order automatically
    // });

    logger.info('Database models synchronized');
  } catch (error) {
    logger.error('Error synchronizing database models:', error);
    throw error;
  }
};

export default sequelize;
