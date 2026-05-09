import sequelize from '../db/sequelize';

async function dropFk() {
  try {
    await sequelize.authenticate();
    await sequelize.query(
      'ALTER TABLE coding_test DROP CONSTRAINT IF EXISTS coding_test_interviewer_id_fkey',
    );
    console.log('✅ Dropped coding_test_interviewer_id_fkey successfully.');
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    await sequelize.close();
  }
}

dropFk();
