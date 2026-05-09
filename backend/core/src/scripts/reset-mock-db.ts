import sequelize from '../db/sequelize';

async function resetMockDb() {
  try {
    console.log('--- Starting Mock Test System Reset ---');
    await sequelize.authenticate();
    
    // Drop tables in order of dependency
    console.log('Dropping table "submission"...');
    await sequelize.query('DROP TABLE IF EXISTS submission CASCADE');
    
    console.log('Dropping table "coding_test_problem"...');
    await sequelize.query('DROP TABLE IF EXISTS coding_test_problem CASCADE');
    
    console.log('Dropping table "coding_test"...');
    await sequelize.query('DROP TABLE IF EXISTS coding_test CASCADE');
    
    console.log('✅ Tables dropped successfully.');
    console.log('The system will recreate them automatically on the next server restart.');
  } catch (err) {
    console.error('❌ Failed to reset tables:', err);
  } finally {
    await sequelize.close();
  }
}

resetMockDb();
