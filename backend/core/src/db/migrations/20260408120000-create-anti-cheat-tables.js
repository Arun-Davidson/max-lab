'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // We execute the raw SQL from the anti-cheat backend's schema.sql
    // to guarantee 100% parity with the standalone service tables and stored procedures.
    
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Sessions table
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY,
          candidate_id VARCHAR(255) NOT NULL,
          job_id VARCHAR(255),
          started_at TIMESTAMP DEFAULT NOW(),
          ended_at TIMESTAMP,
          status VARCHAR(50) DEFAULT 'active'
        );
      `, { transaction });

      // 2. Violations table
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS violations (
          id SERIAL PRIMARY KEY,
          session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
          type VARCHAR(100) NOT NULL,
          question_id VARCHAR(100),
          timestamp TIMESTAMP DEFAULT NOW(),
          meta JSONB
        );
      `, { transaction });

      // 3. Recordings table (streaming-ready)
      await queryInterface.sequelize.query(`
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
      `, { transaction });

      // 4. Recording chunks table (chunk streaming architecture)
      await queryInterface.sequelize.query(`
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
      `, { transaction });

      // 5. Indexes for efficient chunk retrieval by session
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_chunks_session ON recording_chunks(session_id);
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_chunks_recording ON recording_chunks(recording_id);
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_chunks_sequence ON recording_chunks(session_id, chunk_index);
      `, { transaction });

      // 6. PlpgSQL function to validate chunk sequence integrity
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION validate_chunk_sequence(p_session_id UUID)
        RETURNS TABLE (
          missing_chunks INTEGER[],
          duplicate_chunks INTEGER[],
          is_valid BOOLEAN
        ) AS $$
        DECLARE
          v_expected INTEGER := 0;
          v_missing INTEGER[];
          v_duplicates INTEGER[];
          v_recording_id INTEGER;
          chunk_index INTEGER;
          chunk_id INTEGER;
        BEGIN
          -- Get the recording ID for this session
          SELECT id INTO v_recording_id 
          FROM recordings 
          WHERE session_id = p_session_id 
          ORDER BY started_at DESC 
          LIMIT 1;

          IF v_recording_id IS NULL THEN
            RETURN QUERY SELECT ARRAY[]::INTEGER[], ARRAY[]::INTEGER[], FALSE;
            RETURN;
          END IF;

          -- Check for missing and duplicate chunks
          FOR chunk_index, chunk_id IN 
            SELECT rc.chunk_index, rc.id FROM recording_chunks rc
            WHERE rc.recording_id = v_recording_id 
            ORDER BY rc.chunk_index
          LOOP
            IF chunk_index > v_expected THEN
              -- Missing chunks detected
              v_missing := array_append(v_missing, v_expected);
              v_expected := v_expected + 1;
              WHILE v_expected < chunk_index LOOP
                v_missing := array_append(v_missing, v_expected);
                v_expected := v_expected + 1;
              END LOOP;
              v_expected := v_expected + 1;
            ELSIF chunk_index = v_expected THEN
              v_expected := v_expected + 1;
            END IF;
          END LOOP;

          -- Check for duplicates (handled separately with GROUP BY)
          SELECT array_agg(rc.chunk_index) INTO v_duplicates
          FROM recording_chunks rc
          WHERE rc.recording_id = v_recording_id
          GROUP BY rc.chunk_index
          HAVING COUNT(*) > 1;

          RETURN QUERY SELECT 
            COALESCE(v_missing, ARRAY[]::INTEGER[]),
            COALESCE(v_duplicates, ARRAY[]::INTEGER[]),
            (v_missing IS NULL OR array_length(v_missing, 1) IS NULL) AS is_valid;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop all created resources recursively
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS validate_chunk_sequence(UUID);`, { transaction });
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS recording_chunks CASCADE;`, { transaction });
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS recordings CASCADE;`, { transaction });
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS violations CASCADE;`, { transaction });
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS sessions CASCADE;`, { transaction });
    });
  }
};
