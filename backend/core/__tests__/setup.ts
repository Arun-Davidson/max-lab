// Test setup file - runs before all tests
import { sequelize } from '../src/models';

// Set test environment
process.env.NODE_ENV = 'test';

// Setup: sync database before all tests
//@ts-ignore
beforeAll(async () => {
  try {
    await sequelize.sync({ force: true }); // Reset database for tests
    console.log('Test database synced');
  } catch (error) {
    console.error('Error syncing test database:', error);
    throw error;
  }
});

// Cleanup: close database connection after all tests
//@ts-ignore
afterAll(async () => {
  try {
    await sequelize.close();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Error closing test database:', error);
  }
});
