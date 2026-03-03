/**
 * One-time script: populate question_bank.csv and assignments.csv from
 * questions.csv and cancer_diagnostic_questions.csv. Legacy CSVs are not modified.
 * Run from project root: node scripts/migrate-to-bank-and-assignments.js
 */
import { QuestionModel } from '../models/questionModel.js';

const questionModel = new QuestionModel();

async function run() {
    try {
        const { bankCount, assignmentCount } = await questionModel.migrateLegacyToBankAndAssignments();
        console.log(`Migration complete: ${bankCount} question bank entries, ${assignmentCount} assignments.`);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

run();
