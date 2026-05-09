/**
 * fixAllForeignKeys.ts
 * --------------------
 * Comprehensive fix for the FK violation on POST /coding/tests.
 *
 * The error  "insert or update on table \"coding_test_problem\" violates
 * foreign key constraint \"coding_test_problem_test_id_fkey\""  means
 * the DB-level constraint still references the wrong parent table
 * (schedule_candidate) instead of coding_test.
 *
 * This script:
 *   1. Shows the current FK state for both tables (diagnosis).
 *   2. Drops the stale coding_test_problem_test_id_fkey constraint.
 *   3. Removes orphaned rows that would block re-adding the constraint.
 *   4. Recreates the constraint pointing to coding_test(id) ON DELETE CASCADE.
 *   5. Does the same for the submission.test_id → coding_test(id) FK.
 *   6. Prints a final verification table.
 *
 * Run once:
 *   npx ts-node --transpile-only src/scripts/fixAllForeignKeys.ts
 */

import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root (two levels above src/scripts/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import sequelize from '../db/sequelize';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Return every FK constraint for the given table, showing the referenced table. */
async function inspectFKs(tableName: string): Promise<any[]> {
  const [rows] = await sequelize.query(`
    SELECT
      tc.constraint_name,
      kcu.column_name         AS fk_column,
      ccu.table_name          AS references_table,
      ccu.column_name         AS references_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema   = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema   = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name      = '${tableName}'
    ORDER BY tc.constraint_name;
  `);
  return rows as any[];
}

/** Drop a constraint only if it exists. */
async function dropConstraintIfExists(
  table: string,
  constraint: string,
  t: any,
): Promise<void> {
  await sequelize.query(
    `ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraint};`,
    { transaction: t },
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function fix() {
  await sequelize.authenticate();
  console.log('✓ Connected to DB\n');

  // ── DIAGNOSIS ──────────────────────────────────────────────────────────────
  console.log('=== CURRENT FK STATE: coding_test_problem ===');
  const ctpFKsBefore = await inspectFKs('coding_test_problem');
  console.log(
    ctpFKsBefore.length
      ? JSON.stringify(ctpFKsBefore, null, 2)
      : '  (no FK constraints found)',
  );

  console.log('\n=== CURRENT FK STATE: submission ===');
  const subFKsBefore = await inspectFKs('submission');
  console.log(
    subFKsBefore.length
      ? JSON.stringify(subFKsBefore, null, 2)
      : '  (no FK constraints found)',
  );

  // ── FIX 1: coding_test_problem.test_id → coding_test(id) ──────────────────
  console.log('\n─── Fix 1: coding_test_problem.test_id ───');
  await sequelize.transaction(async (t) => {
    // Drop whatever constraint exists on test_id (right or wrong table)
    console.log('  Dropping coding_test_problem_test_id_fkey (if exists)...');
    await dropConstraintIfExists('coding_test_problem', 'coding_test_problem_test_id_fkey', t);
    console.log('  ✓ Dropped');

    // Remove orphaned rows whose test_id has no match in coding_test
    console.log('  Deleting orphaned rows from coding_test_problem...');
    const [orphans] = await sequelize.query(
      `DELETE FROM coding_test_problem
         WHERE test_id NOT IN (SELECT id FROM coding_test)
         RETURNING id, test_id;`,
      { transaction: t },
    );
    console.log(`  ✓ Removed ${(orphans as any[]).length} orphaned row(s)`);

    // Recreate correct FK
    console.log('  Adding correct FK: coding_test_problem.test_id → coding_test(id) ON DELETE CASCADE...');
    await sequelize.query(
      `ALTER TABLE coding_test_problem
         ADD CONSTRAINT coding_test_problem_test_id_fkey
         FOREIGN KEY (test_id)
         REFERENCES coding_test(id)
         ON DELETE CASCADE;`,
      { transaction: t },
    );
    console.log('  ✓ Correct FK added');
  });

  // ── FIX 2: submission.test_id → coding_test(id) ────────────────────────────
  console.log('\n─── Fix 2: submission.test_id ───');
  await sequelize.transaction(async (t) => {
    console.log('  Dropping submission_test_id_fkey (if exists)...');
    await dropConstraintIfExists('submission', 'submission_test_id_fkey', t);
    console.log('  ✓ Dropped');

    // Only delete rows where test_id IS set but points nowhere (nullable column)
    console.log('  Deleting orphaned rows from submission...');
    const [orphans] = await sequelize.query(
      `DELETE FROM submission
         WHERE test_id IS NOT NULL
           AND test_id NOT IN (SELECT id FROM coding_test)
         RETURNING id, test_id;`,
      { transaction: t },
    );
    console.log(`  ✓ Removed ${(orphans as any[]).length} orphaned row(s)`);

    console.log('  Adding correct FK: submission.test_id → coding_test(id) ON DELETE SET NULL...');
    await sequelize.query(
      `ALTER TABLE submission
         ADD CONSTRAINT submission_test_id_fkey
         FOREIGN KEY (test_id)
         REFERENCES coding_test(id)
         ON DELETE SET NULL;`,
      { transaction: t },
    );
    console.log('  ✓ Correct FK added');
  });

  // ── VERIFICATION ───────────────────────────────────────────────────────────
  console.log('\n=== VERIFIED FK STATE AFTER FIX: coding_test_problem ===');
  const ctpFKsAfter = await inspectFKs('coding_test_problem');
  console.log(JSON.stringify(ctpFKsAfter, null, 2));

  console.log('\n=== VERIFIED FK STATE AFTER FIX: submission ===');
  const subFKsAfter = await inspectFKs('submission');
  console.log(JSON.stringify(subFKsAfter, null, 2));

  // Quick sanity check
  const ctpOk = ctpFKsAfter.some(
    (r) => r.constraint_name === 'coding_test_problem_test_id_fkey' && r.references_table === 'coding_test',
  );
  const subOk = subFKsAfter.some(
    (r) => r.constraint_name === 'submission_test_id_fkey' && r.references_table === 'coding_test',
  );

  if (ctpOk && subOk) {
    console.log('\n✅ All FK constraints now correctly reference coding_test.');
    console.log('   POST /coding/tests should work without FK violations.');
  } else {
    if (!ctpOk) console.warn('\n⚠️  coding_test_problem FK still looks wrong — check output above.');
    if (!subOk) console.warn('\n⚠️  submission FK still looks wrong — check output above.');
  }

  await sequelize.close();
}

fix().catch((err) => {
  console.error('\n❌ Fix failed:', err.message);
  console.error(err);
  process.exit(1);
});
