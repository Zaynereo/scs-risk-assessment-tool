import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { escapeCSVField, parseCSVLine } from '../utils/csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Dedicated Question Bank CSV – content only (no scoring)
const QUESTION_BANK_FILE = path.join(__dirname, '..', 'data', 'question_bank.csv');
// Dedicated Assignments CSV – scoring/usage layer
const ASSIGNMENTS_FILE = path.join(__dirname, '..', 'data', 'assignments.csv');

/**
 * Question Model (MVC Pattern)
 * Handles all question data operations using question_bank.csv + assignments.csv.
 *
 * Multi-Language Schema (question_bank.csv):
 * - prompt_en/zh/ms/ta: Question text in each language
 * - explanationYes_en/zh/ms/ta: Explanation shown when user answers Yes
 * - explanationNo_en/zh/ms/ta: Explanation shown when user answers No
 *
 * Scoring Schema (assignments.csv - Percentage-Based Weighting):
 * - weight: Percentage contribution of this question to total risk (0-100)
 * - yesValue: Percentage of weight added when answering Yes (0-100)
 * - noValue: Percentage of weight added when answering No (0-100)
 */
export class QuestionModel {
    constructor() {}

    /**
     * Load assignments from assignments.csv.
     */
    async loadAssignments() {
        const data = await fs.readFile(ASSIGNMENTS_FILE, 'utf-8');
        return this.parseAssignmentsCSV(data);
    }

    async saveAssignments(assignments) {
        await fs.mkdir(path.dirname(ASSIGNMENTS_FILE), { recursive: true });
        const csvContent = this.assignmentsToCSV(assignments);
        await fs.writeFile(ASSIGNMENTS_FILE, csvContent);
    }

    /**
     * Load Question Bank entries from question_bank.csv.
     */
    async loadQuestionBank() {
        const data = await fs.readFile(QUESTION_BANK_FILE, 'utf-8');
        return this.parseCSV(data);
    }

    async saveQuestionBank(bankEntries) {
        await fs.mkdir(path.dirname(QUESTION_BANK_FILE), { recursive: true });
        const csvContent = this.questionBankToCSV(bankEntries);
        await fs.writeFile(QUESTION_BANK_FILE, csvContent);
    }

    /**
     * Parse CSV text into question objects with canonical header mapping.
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length <= 1) return [];

        const rawHeaders = parseCSVLine(lines[0]);
        const normalizeHeader = (h) => String(h || '')
            .replace(/^\uFEFF/, '')
            .trim();

        const headerToCanonical = (h) => {
            const key = normalizeHeader(h).toLowerCase();

            // ID mappings
            if (key === 'id' || key === 'qid' || key === 'questionid' || key === 'question_id') return 'id';

            // Multi-language prompt mappings
            if (key === 'prompt' || key === 'prompt_en' || key === 'question' || key === 'questiontext' || key === 'question_text') return 'prompt_en';
            if (key === 'prompt_zh') return 'prompt_zh';
            if (key === 'prompt_ms') return 'prompt_ms';
            if (key === 'prompt_ta') return 'prompt_ta';

            // Scoring fields
            if (key === 'weight' || key === 'questionweight' || key === 'question_weight') return 'weight';
            if (key === 'yesvalue' || key === 'yes_value' || key === 'yesrisk') return 'yesValue';
            if (key === 'novalue' || key === 'no_value' || key === 'norisk') return 'noValue';

            // Category
            if (key === 'category' || key === 'section') return 'category';

            // Multi-language explanation mappings (Yes/No per answer)
            if (key === 'explanationyes_en' || key === 'explanationyes') return 'explanationYes_en';
            if (key === 'explanationyes_zh') return 'explanationYes_zh';
            if (key === 'explanationyes_ms') return 'explanationYes_ms';
            if (key === 'explanationyes_ta') return 'explanationYes_ta';
            if (key === 'explanationno_en' || key === 'explanationno') return 'explanationNo_en';
            if (key === 'explanationno_zh') return 'explanationNo_zh';
            if (key === 'explanationno_ms') return 'explanationNo_ms';
            if (key === 'explanationno_ta') return 'explanationNo_ta';
            // Backward compat: old single explanation -> explanationYes
            if (key === 'explanation' || key === 'explanation_en' || key === 'rationale') return 'explanationYes_en';
            if (key === 'explanation_zh') return 'explanationYes_zh';
            if (key === 'explanation_ms') return 'explanationYes_ms';
            if (key === 'explanation_ta') return 'explanationYes_ta';

            // Cancer type and age
            if (key === 'cancertype' || key === 'cancer_type') return 'cancerType';
            if (key === 'minage' || key === 'min_age' || key === 'minimumage' || key === 'minimum_age') return 'minAge';

            return normalizeHeader(h);
        };

        const headers = rawHeaders.map(headerToCanonical);
        const questions = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = parseCSVLine(lines[i]);
            if (values.length >= headers.length) {
                const question = {};
                headers.forEach((header, index) => {
                    question[header] = values[index] ?? '';
                });

                // Ensure canonical keys exist
                question.id = question.id ?? '';
                question.prompt_en = question.prompt_en ?? '';
                question.prompt_zh = question.prompt_zh ?? '';
                question.prompt_ms = question.prompt_ms ?? '';
                question.prompt_ta = question.prompt_ta ?? '';
                question.weight = question.weight ?? '';
                question.yesValue = question.yesValue ?? '';
                question.noValue = question.noValue ?? '';
                question.category = question.category ?? '';
                question.explanationYes_en = question.explanationYes_en ?? '';
                question.explanationYes_zh = question.explanationYes_zh ?? '';
                question.explanationYes_ms = question.explanationYes_ms ?? '';
                question.explanationYes_ta = question.explanationYes_ta ?? '';
                question.explanationNo_en = question.explanationNo_en ?? '';
                question.explanationNo_zh = question.explanationNo_zh ?? '';
                question.explanationNo_ms = question.explanationNo_ms ?? '';
                question.explanationNo_ta = question.explanationNo_ta ?? '';
                question.cancerType = question.cancerType ?? '';
                question.minAge = question.minAge ?? '';

                questions.push(question);
            }
        }

        return questions;
    }

    /**
     * Convert assignments array to CSV string.
     */
    assignmentsToCSV(assignments) {
        const headers = [
            'questionId',
            'assessmentId',
            'targetCancerType',
            'weight',
            'yesValue',
            'noValue',
            'category',
            'minAge',
            'isActive'
        ];

        if (!assignments || assignments.length === 0) {
            return headers.join(',') + '\n';
        }

        const csvLines = [headers.join(',')];

        assignments.forEach(a => {
            const values = headers.map(header => {
                const value = a[header] ?? '';
                return escapeCSVField(value);
            });
            csvLines.push(values.join(','));
        });

        return csvLines.join('\n') + '\n';
    }

    /**
     * Convert Question Bank entries to CSV string (content-only fields)
     */
    questionBankToCSV(bankEntries) {
        const headers = [
            'id',
            'prompt_en', 'prompt_zh', 'prompt_ms', 'prompt_ta',
            'explanationYes_en', 'explanationYes_zh', 'explanationYes_ms', 'explanationYes_ta',
            'explanationNo_en', 'explanationNo_zh', 'explanationNo_ms', 'explanationNo_ta'
        ];

        if (!bankEntries || bankEntries.length === 0) {
            return headers.join(',') + '\n';
        }

        const csvLines = [headers.join(',')];

        bankEntries.forEach(entry => {
            const values = headers.map(header => {
                const value = entry[header] || '';
                return escapeCSVField(value);
            });
            csvLines.push(values.join(','));
        });

        return csvLines.join('\n') + '\n';
    }

    /**
     * Parse assignments.csv into assignment objects.
     */
    parseAssignmentsCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length <= 1) return [];

        const rawHeaders = parseCSVLine(lines[0]);
        const normalizeHeader = (h) => String(h || '')
            .replace(/^\uFEFF/, '')
            .trim();

        const headers = rawHeaders.map(normalizeHeader);
        const assignments = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = parseCSVLine(lines[i]);
            if (values.length >= headers.length) {
                const a = {};
                headers.forEach((header, index) => {
                    a[header] = values[index] ?? '';
                });

                assignments.push(a);
            }
        }

        return assignments;
    }

    /**
     * Get assignments for a given assessmentId from assignments.csv.
     * This is the scoring/usage layer that joins with Question Bank.
     */
    async getAssignmentsForAssessment(assessmentId, userAge = null) {
        if (!assessmentId) return [];

        const normalizedId = String(assessmentId).toLowerCase();
        const assignments = await this.loadAssignments();

        let filtered = assignments.filter(a =>
            a.assessmentId && String(a.assessmentId).toLowerCase() === normalizedId &&
            (a.isActive === undefined || a.isActive === '' || a.isActive === '1')
        );

        if (userAge !== null) {
            filtered = filtered.filter(a => {
                if (a.minAge && String(a.minAge).trim() !== '') {
                    const minAge = parseInt(a.minAge);
                    if (!isNaN(minAge) && userAge < minAge) {
                        return false;
                    }
                }
                return true;
            });
        }

        return filtered;
    }

    /**
     * Build questions for a given assessment using the Assignments model.
     *
     * This is a higher-level helper that:
     * - Loads assignments for the assessment
     * - Joins them with Question Bank entries (CSV-backed)
     * - Returns localized question objects suitable for the quiz API
     */
    async getQuestionsForAssessment(assessmentId, lang = 'en', userAge = null) {
        if (!assessmentId) return [];

        const assignments = await this.getAssignmentsForAssessment(assessmentId, userAge);
        if (assignments.length === 0) {
            return [];
        }

        // Load Question Bank entries (content layer)
        const bankEntries = await this.loadQuestionBank();
        const bankById = new Map(bankEntries.map(q => [q.id, q]));

        return assignments.map(assign => {
            const bank = bankById.get(assign.questionId) || {};

            const prompt =
                bank[`prompt_${lang}`] || bank.prompt_en || '';
            const explanationYes =
                bank[`explanationYes_${lang}`] || bank.explanationYes_en || '';
            const explanationNo =
                bank[`explanationNo_${lang}`] || bank.explanationNo_en || '';

            return {
                id: assign.questionId,
                prompt,
                weight: assign.weight,
                yesValue: assign.yesValue,
                noValue: assign.noValue,
                category: assign.category,
                explanationYes,
                explanationNo,
                cancerType: assign.targetCancerType,
                targetCancerType: assign.targetCancerType,
                minAge: assign.minAge
            };
        });
    }

    /**
     * Delete all assignments for a given assessmentId (used when deleting a cancer type).
     */
    async deleteAssignmentsByAssessmentId(assessmentId) {
        const assignments = await this.loadAssignments();
        const filtered = assignments.filter(a =>
            String(a.assessmentId).toLowerCase() !== String(assessmentId).toLowerCase()
        );
        await this.saveAssignments(filtered);
    }

    /**
     * Get a logical Question Bank view with sources (from assignments.csv).
     * Used by admin Question Bank endpoints.
     */
    async getQuestionBankView() {
        const bankEntries = await this.loadQuestionBank();
        const bankMap = new Map(bankEntries.map(q => [q.id, { ...q, sources: [] }]));

        // Use assignments.csv to determine where questions are used
        const assignments = await this.loadAssignments();
        assignments.forEach(a => {
            if (!a.questionId) return;
            if (!bankMap.has(a.questionId)) {
                bankMap.set(a.questionId, {
                    id: a.questionId,
                    prompt_en: '',
                    prompt_zh: '',
                    prompt_ms: '',
                    prompt_ta: '',
                    explanationYes_en: '',
                    explanationYes_zh: '',
                    explanationYes_ms: '',
                    explanationYes_ta: '',
                    explanationNo_en: '',
                    explanationNo_zh: '',
                    explanationNo_ms: '',
                    explanationNo_ta: '',
                    sources: []
                });
            }
            const entry = bankMap.get(a.questionId);
            entry.sources.push({
                type: a.assessmentId === 'generic' ? 'generic' : 'specific',
                cancerType: a.targetCancerType || a.assessmentId || ''
            });
        });

        return Array.from(bankMap.values());
    }

    /**
     * Create a new Question Bank entry (content-only, no scoring).
     */
    async createBankQuestion(data) {
        const bankEntries = await this.loadQuestionBank();
        if (bankEntries.find(q => q.id === data.id)) {
            throw new Error('Question Bank entry with this ID already exists');
        }

        const newEntry = {
            id: data.id,
            prompt_en: data.prompt_en || '',
            prompt_zh: data.prompt_zh || '',
            prompt_ms: data.prompt_ms || '',
            prompt_ta: data.prompt_ta || '',
            explanationYes_en: data.explanationYes_en || '',
            explanationYes_zh: data.explanationYes_zh || '',
            explanationYes_ms: data.explanationYes_ms || '',
            explanationYes_ta: data.explanationYes_ta || '',
            explanationNo_en: data.explanationNo_en || '',
            explanationNo_zh: data.explanationNo_zh || '',
            explanationNo_ms: data.explanationNo_ms || '',
            explanationNo_ta: data.explanationNo_ta || ''
        };

        bankEntries.push(newEntry);
        await this.saveQuestionBank(bankEntries);
        return newEntry;
    }

    /**
     * Update an existing Question Bank entry (content-only).
     */
    async updateBankQuestion(id, updates) {
        const bankEntries = await this.loadQuestionBank();
        const index = bankEntries.findIndex(q => q.id === id);
        if (index === -1) {
            throw new Error('Question Bank entry not found');
        }

        bankEntries[index] = {
            ...bankEntries[index],
            ...updates
        };

        await this.saveQuestionBank(bankEntries);
        return bankEntries[index];
    }
}
