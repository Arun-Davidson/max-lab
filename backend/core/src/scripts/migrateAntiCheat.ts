/**
 * migrateAntiCheat.ts
 * -------------------
 * Creates the anti-cheat tables, indexes, and integrity function.
 * Run ONCE with:
 *   npx ts-node src/scripts/migrateAntiCheat.ts
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
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY,
      candidate_id VARCHAR(255) NOT NULL,
      job_id VARCHAR(255),
      started_at TIMESTAMP DEFAULT NOW(),
      ended_at TIMESTAMP,
      status VARCHAR(50) DEFAULT 'active'
    );
  `);

  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS violations (
      id SERIAL PRIMARY KEY,
      session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      question_id VARCHAR(100),
      timestamp TIMESTAMP DEFAULT NOW(),
      meta JSONB
    );
  `);

  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS recordings (
      id SERIAL PRIMARY KEY,
      session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
      file_path VARCHAR(500),
      type VARCHAR(50) DEFAULT 'webcam',
      status VARCHAR(50) DEFAULT 'streaming',
      started_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      total_chunks INTEGER DEFAULT 0
    );
  `);

  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS recording_chunks (
      id SERIAL PRIMARY KEY,
      session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
      recording_id INTEGER REFERENCES recordings(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      size_bytes INTEGER NOT NULL,
      duration_ms INTEGER,
      checksum VARCHAR(64),
      timestamp TIMESTAMP DEFAULT NOW(),
      client_timestamp TIMESTAMP,
      type VARCHAR(50) DEFAULT 'webcam',
      metadata JSONB
    );
  `);

  await qi.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_chunks_session ON recording_chunks(session_id);
  `);

  await qi.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_chunks_recording ON recording_chunks(recording_id);
  `);

  await qi.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_chunks_sequence ON recording_chunks(session_id, chunk_index);
  `);

  await qi.sequelize.query(`
    CREATE OR REPLACE FUNCTION validate_chunk_sequence(p_session_id UUID)
    RETURNS TABLE (
      missing_chunks INTEGER[],
      duplicate_chunks INTEGER[],
      is_valid BOOLEAN
    ) AS $$
    DECLARE
      v_recording_id INTEGER;
    BEGIN
      SELECT id INTO v_recording_id
      FROM recordings
      WHERE session_id = p_session_id
      ORDER BY started_at DESC, id DESC
      LIMIT 1;

      IF v_recording_id IS NULL THEN
        RETURN QUERY SELECT ARRAY[]::INTEGER[], ARRAY[]::INTEGER[], FALSE;
        RETURN;
      END IF;

      RETURN QUERY
      WITH chunk_counts AS (
        SELECT chunk_index, COUNT(*)::int AS occurrences
        FROM recording_chunks
        WHERE recording_id = v_recording_id
        GROUP BY chunk_index
      ),
      missing AS (
        SELECT COALESCE(
          array_agg(generated.chunk_index ORDER BY generated.chunk_index),
          ARRAY[]::INTEGER[]
        ) AS missing_chunks
        FROM generate_series(
          0,
          COALESCE((SELECT MAX(chunk_index) FROM recording_chunks WHERE recording_id = v_recording_id), -1)
        ) AS generated(chunk_index)
        LEFT JOIN chunk_counts cc ON cc.chunk_index = generated.chunk_index
        WHERE cc.chunk_index IS NULL
      ),
      duplicates AS (
        SELECT COALESCE(
          array_agg(chunk_index ORDER BY chunk_index),
          ARRAY[]::INTEGER[]
        ) AS duplicate_chunks
        FROM chunk_counts
        WHERE occurrences > 1
      )
      SELECT
        missing.missing_chunks,
        duplicates.duplicate_chunks,
        (COALESCE(array_length(missing.missing_chunks, 1), 0) = 0
         AND COALESCE(array_length(duplicates.duplicate_chunks, 1), 0) = 0) AS is_valid
      FROM missing, duplicates;
    END;
    $$ LANGUAGE plpgsql;
  `);

  console.log('✅ Anti-cheat migration complete.');
  await sequelize.close();
}

migrate().catch((err) => {
  console.error('❌ Anti-cheat migration failed:', err);
  process.exit(1);
});
