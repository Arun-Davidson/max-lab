/**
 * fixCodingTestFk.ts
 * ------------------
 * The coding_test_problem.test_id FK was created pointing to the wrong table
 * (schedule_candidate instead of coding_test). This script drops the bad
 * constraint and creates the correct one.
 *
 * Run ONCE with:
 *   npx ts-node --transpile-only src/scripts/fixCodingTestFk.ts
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import sequelize from '../db/sequelize';

async function fix() {
  await sequelize.authenticate();
  console.log('✓ DB connected\n');

  await sequelize.transaction(async (t) => {
    // 1. Drop the stale FK that points to schedule_candidate
    console.log('Dropping stale FK constraint coding_test_problem_test_id_fkey...');
    await sequelize.query(
      `ALTER TABLE coding_test_problem
         DROP CONSTRAINT IF EXISTS coding_test_problem_test_id_fkey;`,
      { transaction: t },
    );
    console.log('✓ Dropped\n');

    // 2. Delete orphaned rows whose test_id doesn't exist in coding_test
    console.log('Cleaning up orphaned rows in coding_test_problem...');
    const [deleted] = await sequelize.query(
      `DELETE FROM coding_test_problem
        WHERE test_id NOT IN (SELECT id FROM coding_test)
        RETURNING id, test_id;`,
      { transaction: t },
    );
    console.log(`✓ Removed ${(deleted as any[]).length} orphaned row(s)\n`);

    // 3. Recreate it pointing to the correct table
    console.log('Adding correct FK constraint (coding_test_problem.test_id → coding_test.id)...');
    await sequelize.query(
      `ALTER TABLE coding_test_problem
         ADD CONSTRAINT coding_test_problem_test_id_fkey
         FOREIGN KEY (test_id)
         REFERENCES coding_test(id)
         ON DELETE CASCADE;`,
      { transaction: t },
    );
    console.log('✓ Correct FK created\n');
  });

  // Verify
  const [result] = await sequelize.query(`
    SELECT
      tc.constraint_name,
      kcu.column_name  AS fk_column,
      ccu.table_name   AS references_table,
      ccu.column_name  AS references_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema   = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema   = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'coding_test_problem';
  `);

  console.log('=== Updated FK constraints ===');
  console.log(JSON.stringify(result, null, 2));

  await sequelize.close();
  console.log('\n✅ Migration complete. The /coding/tests endpoint should work now.');
}

fix().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
