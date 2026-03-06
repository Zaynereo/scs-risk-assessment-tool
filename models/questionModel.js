import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { escapeCSVField, parseCSVLine } from '../utils/csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'questions.csv');
const GENERIC_DATA_FILE = path.join(__dirname, '..', 'data', 'cancer_diagnostic_questions.csv');
// Dedicated Question Bank CSV – content only (no scoring)
const QUESTION_BANK_FILE = path.join(__dirname, '..', 'data', 'question_bank.csv');
// Dedicated Assignments CSV – scoring/usage layer
const ASSIGNMENTS_FILE = path.join(__dirname, '..', 'data', 'assignments.csv');

/**
 * Question Model (MVC Pattern)
 * Handles all question data operations
 * Uses CSV format for better version control and human readability
 * 
 * Multi-Language Schema:
 * - prompt_en/zh/ms/ta: Question text in each language
 * - explanationYes_en/zh/ms/ta: Explanation shown when user answers Yes
 * - explanationNo_en/zh/ms/ta: Explanation shown when user answers No
 * 
 * Scoring Schema (Percentage-Based Weighting):
 * - weight: Percentage contribution of this question to total risk (0-100)
 * - yesValue: Percentage of weight added when answering Yes (0-100)
 * - noValue: Percentage of weight added when answering No (0-100)
 */
export class QuestionModel {
    constructor() {
        this.questions = [];
        this.loadQuestions();
    }

    async loadQuestions() {
        try {
            const data = await fs.readFile(DATA_FILE, 'utf-8');
            this.questions = this.parseCSV(data);
        } catch (error) {
            this.questions = this.getDefaultQuestions();
            await this.saveQuestions();
        }
    }

    /**
     * Load generic questions from cancer_diagnostic_questions.csv
     */
    async loadGenericQuestions() {
        try {
            const data = await fs.readFile(GENERIC_DATA_FILE, 'utf-8');
            return this.parseGenericCSV(data);
        } catch (error) {
            console.error('Error loading generic questions:', error);
            return [];
        }
    }

    /**
     * Save an array of generic questions back to cancer_diagnostic_questions.csv
     * @param {Array} questions - Array of generic question objects
     */
    async saveGenericQuestions(questions) {
        await fs.mkdir(path.dirname(GENERIC_DATA_FILE), { recursive: true });
        const csvContent = this.genericQuestionsToCSV(questions);
        await fs.writeFile(GENERIC_DATA_FILE, csvContent);
    }

    async saveQuestions() {
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
        const csvContent = this.questionsToCSV();
        await fs.writeFile(DATA_FILE, csvContent);
    }

    /**
     * Load assignments from assignments.csv.
     * If the file does not exist yet, bootstrap it from existing specific + generic CSVs.
     */
    async loadAssignments() {
        try {
            const data = await fs.readFile(ASSIGNMENTS_FILE, 'utf-8');
            return this.parseAssignmentsCSV(data);
        } catch (error) {
            // Bootstrap assignments from existing CSVs
            const specificQuestions = await this.getAllQuestions();
            const genericQuestions = await this.loadGenericQuestions();

            const assignments = [];

            // Specific assessments: cancerType is both assessmentId and targetCancerType
            specificQuestions.forEach(q => {
                if (!q.id || !q.cancerType) return;
                const assessmentId = String(q.cancerType).toLowerCase();
                assignments.push({
                    questionId: q.id,
                    assessmentId,
                    targetCancerType: assessmentId,
                    weight: q.weight || '',
                    yesValue: q.yesValue || '',
                    noValue: q.noValue || '',
                    category: q.category || '',
                    minAge: q.minAge || '',
                    isActive: '1'
                });
            });

            // Generic assessment: assessmentId = 'generic', targetCancerType from q.cancerType
            genericQuestions.forEach(q => {
                if (!q.id || !q.cancerType) return;
                assignments.push({
                    questionId: q.id,
                    assessmentId: 'generic',
                    targetCancerType: q.cancerType,
                    weight: q.weight || '',
                    yesValue: q.yesValue || '',
                    noValue: q.noValue || '',
                    category: q.category || '',
                    minAge: q.minAge || '',
                    isActive: '1'
                });
            });

            await this.saveAssignments(assignments);
            return assignments;
        }
    }

    async saveAssignments(assignments) {
        await fs.mkdir(path.dirname(ASSIGNMENTS_FILE), { recursive: true });
        const csvContent = this.assignmentsToCSV(assignments);
        await fs.writeFile(ASSIGNMENTS_FILE, csvContent);
    }

    /**
     * Load Question Bank entries from question_bank.csv.
     * If the file does not exist yet, bootstrap it from existing specific + generic CSVs.
     */
    async loadQuestionBank() {
        try {
            const data = await fs.readFile(QUESTION_BANK_FILE, 'utf-8');
            return this.parseCSV(data);
        } catch (error) {
            // Bootstrap Question Bank from existing CSVs (content-only view)
            const specificQuestions = await this.getAllQuestions();
            const genericQuestions = await this.loadGenericQuestions();

            const bankMap = new Map();

            const addToBank = (q) => {
                if (!q.id) return;
                if (!bankMap.has(q.id)) {
                    bankMap.set(q.id, {
                        id: q.id,
                        prompt_en: q.prompt_en || '',
                        prompt_zh: q.prompt_zh || '',
                        prompt_ms: q.prompt_ms || '',
                        prompt_ta: q.prompt_ta || '',
                        explanationYes_en: q.explanationYes_en || '',
                        explanationYes_zh: q.explanationYes_zh || '',
                        explanationYes_ms: q.explanationYes_ms || '',
                        explanationYes_ta: q.explanationYes_ta || '',
                        explanationNo_en: q.explanationNo_en || '',
                        explanationNo_zh: q.explanationNo_zh || '',
                        explanationNo_ms: q.explanationNo_ms || '',
                        explanationNo_ta: q.explanationNo_ta || ''
                    });
                }
            };

            specificQuestions.forEach(q => addToBank(q));
            genericQuestions.forEach(q => addToBank(q));

            const bankEntries = Array.from(bankMap.values());
            await this.saveQuestionBank(bankEntries);
            return bankEntries;
        }
    }

    async saveQuestionBank(bankEntries) {
        await fs.mkdir(path.dirname(QUESTION_BANK_FILE), { recursive: true });
        const csvContent = this.questionBankToCSV(bankEntries);
        await fs.writeFile(QUESTION_BANK_FILE, csvContent);
    }

    /**
     * One-time migration: copy content from questions.csv and cancer_diagnostic_questions.csv
     * into question_bank.csv and assignments.csv. Does not modify or delete the legacy CSVs.
     * Uses unique bank IDs 1..69: 1-25 from questions.csv (specific), 26-69 from cancer_diagnostic_questions.csv (generic).
     */
    async migrateLegacyToBankAndAssignments() {
        const specificQuestions = await this.getAllQuestions();
        const genericQuestions = await this.loadGenericQuestions();

        const bankEntries = [];
        const assignments = [];

        const norm = (v) => (v == null || v === undefined ? '' : String(v).trim().replace(/\r?\n/g, ' ').trim());

        // Bank IDs 1-25: one row per question from questions.csv (specific assessments)
        specificQuestions.forEach((q, index) => {
            const bankId = index + 1;
            bankEntries.push({
                id: bankId,
                prompt_en: norm(q.prompt_en),
                prompt_zh: norm(q.prompt_zh),
                prompt_ms: norm(q.prompt_ms),
                prompt_ta: norm(q.prompt_ta),
                explanationYes_en: norm(q.explanationYes_en),
                explanationYes_zh: norm(q.explanationYes_zh),
                explanationYes_ms: norm(q.explanationYes_ms),
                explanationYes_ta: norm(q.explanationYes_ta),
                explanationNo_en: norm(q.explanationNo_en),
                explanationNo_zh: norm(q.explanationNo_zh),
                explanationNo_ms: norm(q.explanationNo_ms),
                explanationNo_ta: norm(q.explanationNo_ta)
            });
            if (q.cancerType) {
                const aid = String(q.cancerType).toLowerCase();
                assignments.push({
                    questionId: bankId,
                    assessmentId: aid,
                    targetCancerType: aid,
                    weight: norm(q.weight),
                    yesValue: norm(q.yesValue),
                    noValue: norm(q.noValue),
                    category: norm(q.category),
                    minAge: norm(q.minAge),
                    isActive: '1'
                });
            }
        });

        // Bank IDs 26-69: one row per question from cancer_diagnostic_questions.csv (generic assessment)
        genericQuestions.forEach((q, index) => {
            const bankId = 26 + index;
            bankEntries.push({
                id: bankId,
                prompt_en: norm(q.prompt_en),
                prompt_zh: norm(q.prompt_zh),
                prompt_ms: norm(q.prompt_ms),
                prompt_ta: norm(q.prompt_ta),
                explanationYes_en: norm(q.explanationYes_en),
                explanationYes_zh: norm(q.explanationYes_zh),
                explanationYes_ms: norm(q.explanationYes_ms),
                explanationYes_ta: norm(q.explanationYes_ta),
                explanationNo_en: norm(q.explanationNo_en),
                explanationNo_zh: norm(q.explanationNo_zh),
                explanationNo_ms: norm(q.explanationNo_ms),
                explanationNo_ta: norm(q.explanationNo_ta)
            });
            if (q.cancerType) {
                const target = String(q.cancerType).toLowerCase();
                assignments.push({
                    questionId: bankId,
                    assessmentId: 'generic',
                    targetCancerType: target,
                    weight: norm(q.weight),
                    yesValue: norm(q.yesValue),
                    noValue: norm(q.noValue),
                    category: norm(q.category),
                    minAge: norm(q.minAge),
                    isActive: '1'
                });
            }
        });

        await this.saveQuestionBank(bankEntries);
        await this.saveAssignments(assignments);

        return { bankCount: bankEntries.length, assignmentCount: assignments.length };
    }

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
     * Parse generic questions CSV with different field mapping
     */
    parseGenericCSV(csvText) {
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
     * Convert generic questions array to CSV string
     */
    genericQuestionsToCSV(questions) {
        const headers = [
            'id', 
            'prompt_en', 'prompt_zh', 'prompt_ms', 'prompt_ta',
            'weight', 'yesValue', 'noValue', 
            'category', 
            'explanationYes_en', 'explanationYes_zh', 'explanationYes_ms', 'explanationYes_ta',
            'explanationNo_en', 'explanationNo_zh', 'explanationNo_ms', 'explanationNo_ta',
            'cancerType', 'minAge'
        ];

        if (!questions || questions.length === 0) {
            return headers.join(',') + '\n';
        }

        const csvLines = [headers.join(',')];

        questions.forEach(question => {
            const values = headers.map(header => {
                const value = question[header] || '';
                return escapeCSVField(value);
            });
            csvLines.push(values.join(','));
        });

        return csvLines.join('\n') + '\n';
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

    questionsToCSV() {
        const headers = [
            'id', 
            'prompt_en', 'prompt_zh', 'prompt_ms', 'prompt_ta',
            'weight', 'yesValue', 'noValue', 
            'category', 
            'explanationYes_en', 'explanationYes_zh', 'explanationYes_ms', 'explanationYes_ta',
            'explanationNo_en', 'explanationNo_zh', 'explanationNo_ms', 'explanationNo_ta',
            'cancerType', 'minAge'
        ];

        if (this.questions.length === 0) {
            return headers.join(',') + '\n';
        }

        const csvLines = [headers.join(',')];

        this.questions.forEach(question => {
            const values = headers.map(header => {
                let value = question[header] || '';
                return escapeCSVField(value);
            });
            csvLines.push(values.join(','));
        });

        return csvLines.join('\n') + '\n';
    }

    /**
     * Get all questions, optionally filtered by user age
     * Returns questions with all language fields
     */
    async getAllQuestions(userAge = null) {
        await this.loadQuestions();
        let filtered = [...this.questions];

        if (userAge !== null) {
            filtered = filtered.filter(q => {
                if (q.minAge && q.minAge.trim() !== '') {
                    const minAge = parseInt(q.minAge);
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
     * Get all questions for a specific cancer type
     */
    async getQuestionsByCancerType(cancerType, userAge = null) {
        // Handle generic assessment separately
        if (cancerType && cancerType.toLowerCase() === 'generic') {
            const genericQuestions = await this.loadGenericQuestions();
            let filtered = [...genericQuestions];
            
            if (userAge !== null) {
                filtered = filtered.filter(q => {
                    if (q.minAge && q.minAge.trim() !== '') {
                        const minAge = parseInt(q.minAge);
                        if (!isNaN(minAge) && userAge < minAge) {
                            return false;
                        }
                    }
                    return true;
                });
            }
            
            return filtered;
        }
        
        // Handle regular cancer types
        const allQuestions = await this.getAllQuestions(userAge);
        return allQuestions.filter(q => 
            q.cancerType && q.cancerType.toLowerCase() === cancerType.toLowerCase()
        );
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
     * Update a single generic question (in cancer_diagnostic_questions.csv)
     * with new scoring/category fields.
     */
    async updateGenericQuestion(id, updates) {
        const genericQuestions = await this.loadGenericQuestions();
        const index = genericQuestions.findIndex(q => q.id === id);
        if (index === -1) {
            throw new Error('Generic question not found');
        }

        // Merge updates into the existing generic question
        genericQuestions[index] = {
            ...genericQuestions[index],
            ...updates
        };

        await this.saveGenericQuestions(genericQuestions);
        return genericQuestions[index];
    }

    /**
     * Get questions with localized fields for a specific language
     */
    async getQuestionsLocalized(cancerType = null, lang = 'en', userAge = null) {
        let questions = cancerType 
            ? await this.getQuestionsByCancerType(cancerType, userAge)
            : await this.getAllQuestions(userAge);

        return questions.map(q => ({
            id: q.id,
            prompt: q[`prompt_${lang}`] || q.prompt_en,
            weight: q.weight,
            yesValue: q.yesValue,
            noValue: q.noValue,
            category: q.category,
            explanationYes: q[`explanationYes_${lang}`] || q.explanationYes_en,
            explanationNo: q[`explanationNo_${lang}`] || q.explanationNo_en,
            cancerType: q.cancerType,
            minAge: q.minAge
        }));
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

        const normalizedId = String(assessmentId).toLowerCase();

        // Load Question Bank entries (content layer)
        const bankEntries = await this.loadQuestionBank();
        const bankById = new Map(bankEntries.map(q => [q.id, q]));

        // Load underlying CSV rows as fallback for any missing content
        let csvRows = [];
        if (normalizedId === 'generic') {
            csvRows = await this.loadGenericQuestions();
        } else {
            csvRows = await this.getAllQuestions(null);
        }
        const csvById = new Map(csvRows.map(q => [q.id, q]));

        return assignments.map(assign => {
            const bank = bankById.get(assign.questionId) || {};
            const row = csvById.get(assign.questionId) || {};

            const prompt =
                bank[`prompt_${lang}`] || bank.prompt_en ||
                row[`prompt_${lang}`] || row.prompt_en || '';
            const explanationYes =
                bank[`explanationYes_${lang}`] || bank.explanationYes_en ||
                row[`explanationYes_${lang}`] || row.explanationYes_en || '';
            const explanationNo =
                bank[`explanationNo_${lang}`] || bank.explanationNo_en ||
                row[`explanationNo_${lang}`] || row.explanationNo_en || '';

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

    async getQuestionById(id) {
        await this.loadQuestions();
        return this.questions.find(q => q.id === id);
    }

    async createQuestion(questionData) {
        await this.loadQuestions();
        let questionId = questionData.id;
        if (!questionId || questionId.startsWith('question-')) {
            questionId = String(this.getNextQuestionId());
        }

        const newQuestion = {
            id: questionId,
            prompt_en: questionData.prompt_en || questionData.prompt || '',
            prompt_zh: questionData.prompt_zh || '',
            prompt_ms: questionData.prompt_ms || '',
            prompt_ta: questionData.prompt_ta || '',
            weight: questionData.weight || '',
            yesValue: questionData.yesValue ?? '100',
            noValue: questionData.noValue ?? '0',
            category: questionData.category || '',
            explanationYes_en: questionData.explanationYes_en || questionData.explanation_en || questionData.explanation || '',
            explanationYes_zh: questionData.explanationYes_zh || questionData.explanation_zh || '',
            explanationYes_ms: questionData.explanationYes_ms || questionData.explanation_ms || '',
            explanationYes_ta: questionData.explanationYes_ta || questionData.explanation_ta || '',
            explanationNo_en: questionData.explanationNo_en || '',
            explanationNo_zh: questionData.explanationNo_zh || '',
            explanationNo_ms: questionData.explanationNo_ms || '',
            explanationNo_ta: questionData.explanationNo_ta || '',
            cancerType: questionData.cancerType || '',
            minAge: questionData.minAge || ''
        };

        this.questions.push(newQuestion);
        await this.saveQuestions();
        return newQuestion;
    }

    async updateQuestion(id, updates) {
        await this.loadQuestions();
        const index = this.questions.findIndex(q => q.id === id);
        if (index === -1) throw new Error('Question not found');

        // Handle backward compatibility for prompt/explanation fields
        if (updates.prompt && !updates.prompt_en) {
            updates.prompt_en = updates.prompt;
            delete updates.prompt;
        }
        if (updates.explanation && !updates.explanationYes_en) {
            updates.explanationYes_en = updates.explanation;
            delete updates.explanation;
        }

        this.questions[index] = { ...this.questions[index], ...updates };
        await this.saveQuestions();
        return this.questions[index];
    }

    async deleteQuestion(id) {
        await this.loadQuestions();
        this.questions = this.questions.filter(q => q.id !== id);
        await this.saveQuestions();
    }

    /**
     * Delete all questions for a specific cancer type
     */
    async deleteQuestionsByCancerType(cancerType) {
        await this.loadQuestions();
        this.questions = this.questions.filter(q => 
            q.cancerType.toLowerCase() !== cancerType.toLowerCase()
        );
        await this.saveQuestions();
    }

    getNextQuestionId() {
        const numericIds = this.questions
            .map(q => parseInt(q.id))
            .filter(id => !isNaN(id));
    
        if (numericIds.length === 0) {
            return 1;
        }
        return Math.max(...numericIds) + 1;
    }

    /**
     * Bulk create questions with duplicate detection
     */
    async bulkCreateQuestions(newQuestions) {
        await this.loadQuestions();

        let added = 0;
        let nextId = this.getNextQuestionId();

        for (const newQuestion of newQuestions) {
            const questionToAdd = {
                id: String(nextId),
                prompt_en: newQuestion.prompt_en || newQuestion.prompt || '',
                prompt_zh: newQuestion.prompt_zh || '',
                prompt_ms: newQuestion.prompt_ms || '',
                prompt_ta: newQuestion.prompt_ta || '',
                weight: newQuestion.weight || '',
                yesValue: newQuestion.yesValue ?? '100',
                noValue: newQuestion.noValue ?? '0',
                category: newQuestion.category || '',
                explanationYes_en: newQuestion.explanationYes_en || newQuestion.explanation_en || newQuestion.explanation || '',
                explanationYes_zh: newQuestion.explanationYes_zh || newQuestion.explanation_zh || '',
                explanationYes_ms: newQuestion.explanationYes_ms || newQuestion.explanation_ms || '',
                explanationYes_ta: newQuestion.explanationYes_ta || newQuestion.explanation_ta || '',
                explanationNo_en: newQuestion.explanationNo_en || '',
                explanationNo_zh: newQuestion.explanationNo_zh || '',
                explanationNo_ms: newQuestion.explanationNo_ms || '',
                explanationNo_ta: newQuestion.explanationNo_ta || '',
                cancerType: newQuestion.cancerType || '',
                minAge: newQuestion.minAge || ''
            };
            this.questions.push(questionToAdd);
            added++;
            nextId++;
        }

        await this.saveQuestions();
        return {
            added,
            total: newQuestions.length
        };
    }

    /**
     * Bulk update questions (used by cancer type editor)
     */
    async bulkUpdateQuestions(questionsToUpdate) {
        await this.loadQuestions();
        
        let updated = 0;
        for (const updateData of questionsToUpdate) {
            const index = this.questions.findIndex(q => q.id === updateData.id);
            if (index !== -1) {
                // Handle backward compatibility
                if (updateData.prompt && !updateData.prompt_en) {
                    updateData.prompt_en = updateData.prompt;
                    delete updateData.prompt;
                }
                if (updateData.explanation && !updateData.explanationYes_en) {
                    updateData.explanationYes_en = updateData.explanation;
                    delete updateData.explanation;
                }
                
                this.questions[index] = { ...this.questions[index], ...updateData };
                updated++;
            }
        }

        await this.saveQuestions();
        return { updated };
    }

    /**
     * Get a logical Question Bank view with sources (specific/generic CSVs).
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

    /**
     * Sync questions for a cancer type: diffs existing vs incoming and orchestrates delete/update/create.
     * @param {string} cancerTypeId - Cancer type ID
     * @param {Array} questions - New questions array
     * @returns {{ updated: number, added: number, deleted: number }}
     */
    async syncQuestionsForCancerType(cancerTypeId, questions) {
        const result = { updated: 0, added: 0, deleted: 0 };
        const existingQuestions = await this.getQuestionsByCancerType(cancerTypeId);
        const existingIds = new Set(existingQuestions.map(q => q.id));
        const newIds = new Set(questions.filter(q => q.id).map(q => q.id));

        const toDelete = existingQuestions.filter(q => !newIds.has(q.id));
        for (const q of toDelete) {
            await this.deleteQuestion(q.id);
            result.deleted++;
        }

        for (const q of questions) {
            if (q.id && existingIds.has(q.id)) {
                await this.updateQuestion(q.id, { ...q, cancerType: cancerTypeId });
                result.updated++;
            } else {
                await this.createQuestion({ ...q, cancerType: cancerTypeId });
                result.added++;
            }
        }

        return result;
    }

    getDefaultQuestions() {
        return [
            {
                id: '1',
                prompt_en: "I've seen blood in my stool or had a big change in bowel habits, but I haven't seen a doctor.",
                prompt_zh: '我发现大便带血或排便习惯有很大变化，但我还没有去看医生。',
                prompt_ms: "Saya melihat darah dalam najis atau perubahan besar dalam tabiat usus, tetapi saya belum berjumpa doktor.",
                prompt_ta: 'மலத்தில் இரத்தம் அல்லது குடல் பழக்கங்களில் பெரிய மாற்றத்தைக் கண்டேன்- ஆனால் மருத்துவரை சந்திக்கவில்லை.',
                weight: '10.14',
                yesValue: '100',
                noValue: '0',
                category: 'Medical History',
                explanationYes_en: "These are potential warning signs. You must see a doctor to get them checked out.",
                explanationYes_zh: '这些是潜在的警告信号。您必须去看医生进行检查。',
                explanationYes_ms: "Ini adalah tanda amaran yang berpotensi. Anda mesti berjumpa doktor untuk memeriksanya.",
                explanationYes_ta: 'இவை சாத்தியமான எச்சரிக்கை அறிகுறிகள். நீங்கள் மருத்துவரிடம் பரிசோதிக்க வேண்டும்.',
                explanationNo_en: '',
                explanationNo_zh: '',
                explanationNo_ms: '',
                explanationNo_ta: '',
                cancerType: 'Colorectal',
                minAge: ''
            }
        ];
    }
}
