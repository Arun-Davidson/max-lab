import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import sequelize from '../db/sequelize';

async function check() {
  await sequelize.authenticate();
  const [rows] = await sequelize.query(`
    SELECT tc.table_name, tc.constraint_name, kcu.column_name, ccu.table_name AS ref_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'schedule_candidate';
  `);
  if ((rows as any[]).length === 0) {
    console.log('✅ No stale FKs pointing to schedule_candidate. All clear!');
  } else {
    console.log('⚠️  Still-broken FKs:', JSON.stringify(rows, null, 2));
  }
  await sequelize.close();
}
check().catch(e => { console.error(e.message); process.exit(1); });
