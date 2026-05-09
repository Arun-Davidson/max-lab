/**
 * seedProblems.ts
 * ---------------
 * Reads starter-code JSON files from stater_code/ and upserts
 * Problem + Testcase rows into the database.
 *
 * Run with:
 *   npx ts-node src/scripts/seedProblems.ts
 */

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import sequelize from '../db/sequelize';
import { Problem, Testcase } from '../models';

interface StarterCodeMap {
  javascript?: string;
  python?: string;
  java?: string;
  cpp?: string;
  c?: string;
  typescript?: string;
  go?: string;
  [key: string]: string | undefined;
}

interface TestCaseRaw {
  input: string;
  expected_output: string;
}

interface ProblemRaw {
  id: number;
  title: string;
  difficulty: string;
  description: string;
  examples?: any[];
  constraints?: string[];
  test_cases: TestCaseRaw[];
  starter_code: StarterCodeMap;
}

const STATER_CODE_DIR = path.resolve(__dirname, '../../stater_code');

async function seed() {
  await sequelize.authenticate();
  console.log('✓ DB connected');

  const files = ['easy.json', 'medium.json', 'hard.json'];
  let totalProblems = 0;
  let totalTestcases = 0;

  for (const file of files) {
    const filePath = path.join(STATER_CODE_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠  File not found: ${filePath}, skipping.`);
      continue;
    }

    const raw: ProblemRaw[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const difficulty = file.replace('.json', '') as 'easy' | 'medium' | 'hard';

    for (const p of raw) {
      // Find or create by title + difficulty
      const [prob] = await Problem.findOrCreate({
        where: { title: p.title, difficulty },
        defaults: {
          title: p.title,
          difficulty,
          description: p.description,
          tags: [],
          baseCode: p.starter_code,
          examples: p.examples || [],
          constraints: p.constraints || [],
          test_cases: p.test_cases || [],
        },
      });

      // Always update baseCode + description in case JSON changed
      await prob.update({
        description: p.description,
        baseCode: p.starter_code,
        examples: p.examples || [],
        constraints: p.constraints || [],
        test_cases: p.test_cases || [],
      });

      // Seed test cases — clear old ones then re-insert to keep in sync
      await Testcase.destroy({ where: { problemId: prob.id } });

      const testcaseRows = p.test_cases.map((tc, idx) => ({
        problemId: prob.id,
        input: tc.input,
        expectedOutput: tc.expected_output,
        // First 2 are visible (sample), the rest are hidden
        isHidden: idx >= 2,
      }));

      await Testcase.bulkCreate(testcaseRows);
      totalTestcases += testcaseRows.length;
      totalProblems++;
    }

    console.log(`✓ Seeded ${raw.length} ${difficulty} problems`);
  }

  console.log(`\n✅ Done! Seeded ${totalProblems} problems and ${totalTestcases} test cases.`);
  await sequelize.close();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
