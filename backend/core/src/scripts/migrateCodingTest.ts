/**
 * migrateCodingTest.ts
 * --------------------
 * Adds invite columns to the coding_test table.
 * Run ONCE with:
 *   npx ts-node src/scripts/migrateCodingTest.ts
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import sequelize from '../db/sequelize';

async function migrate() {
  await sequelize.authenticate();
  console.log('✓ DB connected');

  const qi = sequelize.getQueryInterface();

  await qi.sequelize.query(`
    ALTER TABLE coding_test
      ADD COLUMN IF NOT EXISTS candidate_email  VARCHAR(255),
      ADD COLUMN IF NOT EXISTS invite_token     VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS invite_sent_at   TIMESTAMPTZ;
  `);

  console.log('✅ Migration complete — invite columns added to coding_test.');
  await sequelize.close();
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
