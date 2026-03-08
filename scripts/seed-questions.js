/**
 * Seed script: loads question_bank.csv and assignments.csv into the production database.
 * Replaces ALL existing rows in `questions` and `question_assignments` tables.
 *
 * DEPRECATED: For initial setup only. Do NOT re-run after handover — it will
 * permanently overwrite all Admin Panel changes. Use the Admin Panel's
 * "Download Backup" button in the Question Bank tab to export a backup first.
 *
 * Usage: node scripts/seed-questions.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';
import { parseCSVLine } from '../utils/csv.js';

console.warn(`
╔══════════════════════════════════════════════════════════════════════╗
║  ⚠  DANGER: DESTRUCTIVE OPERATION — READ BEFORE CONTINUING  ⚠       ║
╠══════════════════════════════════════════════════════════════════════╣
║  This script is for INITIAL SETUP ONLY.                              ║
║                                                                      ║
║  Running it will PERMANENTLY OVERWRITE ALL questions and             ║
║  assignments in the database with the contents of data/CSV files.    ║
║  Any changes made via the Admin Panel WILL BE LOST.                  ║
║                                                                      ║
║  If you need a backup first, use the Admin Panel →                   ║
║  Question Bank → "Download Backup" button.                           ║
║                                                                      ║
║  Continuing in 3 seconds… Press Ctrl+C to abort.                    ║
╚══════════════════════════════════════════════════════════════════════╝
`);
await new Promise(resolve => setTimeout(resolve, 3000));

dotenv.config();

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

function loadCSV(filename) {
    const filepath = path.join(DATA_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row = {};
        headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
        return row;
    });
}

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── clear assignments first (FK references questions) ─────────────────
        await client.query('DELETE FROM question_assignments');

        // ── questions ──────────────────────────────────────────────────────────
        const questions = loadCSV('question_bank.csv');
        console.log(`Seeding ${questions.length} questions...`);

        await client.query('DELETE FROM questions');

        for (const q of questions) {
            await client.query(
                `INSERT INTO questions (
                    id, prompt_en, prompt_zh, prompt_ms, prompt_ta,
                    explanationyes_en, explanationyes_zh, explanationyes_ms, explanationyes_ta,
                    explanationno_en, explanationno_zh, explanationno_ms, explanationno_ta
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [
                    q.id,
                    q.prompt_en || '',
                    q.prompt_zh || '',
                    q.prompt_ms || '',
                    q.prompt_ta || '',
                    q.explanationyes_en || '',
                    q.explanationyes_zh || '',
                    q.explanationyes_ms || '',
                    q.explanationyes_ta || '',
                    q.explanationno_en || '',
                    q.explanationno_zh || '',
                    q.explanationno_ms || '',
                    q.explanationno_ta || ''
                ]
            );
        }

        // ── question_assignments ───────────────────────────────────────────────
        const assignments = loadCSV('assignments.csv');
        console.log(`Seeding ${assignments.length} assignments...`);

        for (const a of assignments) {
            await client.query(
                `INSERT INTO question_assignments (
                    questionid, assessmentid, targetcancertype,
                    weight, yesvalue, novalue, category, minage
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [
                    a.questionid,
                    a.assessmentid,
                    a.targetcancertype,
                    a.weight !== '' ? parseFloat(a.weight) : null,
                    a.yesvalue !== '' ? parseFloat(a.yesvalue) : null,
                    a.novalue !== '' ? parseFloat(a.novalue) : null,
                    a.category || '',
                    a.minage !== '' ? parseInt(a.minage) : null
                ]
            );
        }

        await client.query('COMMIT');
        console.log('Done. Database seeded successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seed failed, rolled back:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
