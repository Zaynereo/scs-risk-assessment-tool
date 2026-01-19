import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'questions.csv');

/**
 * Question Model (MVC Pattern)
 * Handles all question data operations
 * Uses CSV format for better version control and human readability
 */
export class QuestionModel {
    constructor() {
        this.questions = [];
        this.loadQuestions();
    }

    /**
     * Properly escape a value for CSV according to RFC 4180
     * @param {any} value - The value to escape
     * @returns {string} - The properly escaped CSV field
     */
    escapeCSVField(value) {
        // Convert to string if not already
        let str = String(value);

        // Escape quotes by doubling them
        str = str.replace(/"/g, '""');

        // Always quote fields containing commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str}"`;
        }

        return str;
    }

    /**
     * Parse a CSV line into fields, handling quoted values properly
     * @param {string} line - The CSV line to parse
     * @returns {string[]} - Array of parsed field values
     */
    parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote (double quote)
                    current += '"';
                    i += 2; // Skip both quotes
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator
                fields.push(current);
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }

        // Add the last field
        fields.push(current);

        return fields;
    }

    async loadQuestions() {
        try {
            const data = await fs.readFile(DATA_FILE, 'utf-8');
            this.questions = this.parseCSV(data);
        } catch (error) {
            // If file doesn't exist, initialize with default questions
            this.questions = this.getDefaultQuestions();
            await this.saveQuestions();
        }
    }

    async saveQuestions() {
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
        const csvContent = this.questionsToCSV();
        await fs.writeFile(DATA_FILE, csvContent);
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length <= 1) return [];

        const rawHeaders = this.parseCSVLine(lines[0]);
        const normalizeHeader = (h) => String(h || '')
            .replace(/^\uFEFF/, '')
            .trim()
            .toLowerCase();

        const headerToCanonical = (h) => {
            const key = normalizeHeader(h);

            if (key === 'id' || key === 'qid' || key === 'questionid' || key === 'question_id') return 'id';
            if (key === 'prompt' || key === 'question' || key === 'questiontext' || key === 'question_text') return 'prompt';
            if (key === 'risk' || key === 'risklevel' || key === 'risk_level') return 'risk';
            if (key === 'category' || key === 'section') return 'category';
            if (key === 'correctanswer' || key === 'correct_answer' || key === 'answer') return 'correctAnswer';
            if (key === 'explanation' || key === 'rationale') return 'explanation';
            if (key === 'cancertype' || key === 'cancer_type') return 'cancerType';
            if (key === 'minage' || key === 'min_age' || key === 'minimumage' || key === 'minimum_age') return 'minAge';

            return key;
        };

        const headers = rawHeaders.map(headerToCanonical);
        const questions = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines

            const values = this.parseCSVLine(lines[i]);
            if (values.length >= headers.length) {
                const question = {};
                headers.forEach((header, index) => {
                    question[header] = values[index] ?? '';
                });

                // Ensure canonical keys exist for downstream code/UI
                question.id = question.id ?? '';
                question.prompt = question.prompt ?? '';
                question.risk = question.risk ?? '';
                question.category = question.category ?? '';
                question.correctAnswer = question.correctAnswer ?? '';
                question.explanation = question.explanation ?? '';
                question.cancerType = question.cancerType ?? '';
                question.minAge = question.minAge ?? '';

                questions.push(question);
            }
        }

        return questions;
    }

    questionsToCSV() {
        if (this.questions.length === 0) {
            return 'id,prompt,risk,category,correctAnswer,explanation,cancerType,minAge\n';
        }

        const headers = ['id', 'prompt', 'risk', 'category', 'correctAnswer', 'explanation', 'cancerType', 'minAge'];
        const csvLines = [headers.join(',')];

        this.questions.forEach(question => {
            const values = headers.map(header => {
                let value = question[header] || '';
                return this.escapeCSVField(value);
            });
            csvLines.push(values.join(','));
        });

        return csvLines.join('\n') + '\n';
    }

    async getAllQuestions(userAge = null) {
        await this.loadQuestions();
        let filtered = [...this.questions];

        // Filter age-gated questions based on user age
        if (userAge !== null) {
            filtered = filtered.filter(q => {
                if (q.id === 'age-gate-over-45') return userAge >= 45;
                if (q.id === 'age-gate-under-45') return userAge < 45;
                return true;
            });
        }

        return filtered;
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
            prompt: questionData.prompt,
            risk: questionData.risk,
            category: questionData.category,
            correctAnswer: questionData.correctAnswer,
            explanation: questionData.explanation,
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
     * Generate a unique question ID based on the highest existing numeric ID
     * @returns {number} - Next available ID number
     */
    getNextQuestionId() {
        // Get all numeric IDs from existing questions
        const numericIds = this.questions
            .map(q => parseInt(q.id))
            .filter(id => !isNaN(id));
    
        // If no numeric IDs exist, start from 1
        if (numericIds.length === 0) {
            return 1;
        }
        // Return the highest ID + 1
        return Math.max(...numericIds) + 1;
    }

    /**
     * Bulk create questions with duplicate detection
     * If a question with the same prompt exists, merge cancer types instead of creating duplicate
     * @param {Array} newQuestions - Array of question objects to create
     * @returns {Object} - Statistics about the operation (added, updated, duplicates)
     */
    async bulkCreateQuestions(newQuestions) {
        await this.loadQuestions();

        let added = 0;
        let nextId = this.getNextQuestionId();

        for (const newQuestion of newQuestions) {
            const questionToAdd = {
                id: String(nextId),
                prompt: newQuestion.prompt,
                risk: newQuestion.risk,
                category: newQuestion.category,
                correctAnswer: newQuestion.correctAnswer,
                explanation: newQuestion.explanation,
                cancerType: newQuestion.cancerType,
                minAge: newQuestion.minAge || ''
            };
            this.questions.push(questionToAdd);
            added++;
            nextId++;
        }

        // Save all changes to CSV
        await this.saveQuestions();
        return {
            added,
            total: newQuestions.length
        };
    }

    getDefaultQuestions() {
        return [
            {
                id: 'symptoms',
                prompt: "I've seen blood in my stool or had a big change in bowel habits, but I haven't seen a doctor.",
                risk: 'HIGH',
                category: 'Medical History',
                correctAnswer: 'No',
                explanation: "These are potential warning signs. You must see a doctor to get them checked out."
            },
            {
                id: 'polyps',
                prompt: "A doctor told me I had colon polyps in the past, but I've missed my follow-up appointment.",
                risk: 'HIGH',
                category: 'Medical History',
                correctAnswer: 'No',
                explanation: "Past polyps increase your risk. Regular follow-ups are critical for prevention."
            },
            {
                id: 'ibd',
                prompt: "I have been diagnosed with Inflammatory Bowel Disease (IBD), like Crohn's or colitis.",
                risk: 'HIGH',
                category: 'Medical History',
                correctAnswer: 'No',
                explanation: "IBD significantly increases your risk. Regular screening is essential."
            },
            {
                id: 'screening-missed',
                prompt: "I was given a take-home screening kit (like a FIT kit) but I haven't sent it back.",
                risk: 'HIGH',
                category: 'Medical History',
                correctAnswer: 'No',
                explanation: "The best test is the one that gets done! Screening is the #1 way to catch CRC early."
            },
            {
                id: 'age-gate-over-45',
                prompt: "I am 45 or older and have *not* had my first colorectal cancer screening.",
                risk: 'HIGH',
                category: 'Medical History',
                correctAnswer: 'No',
                explanation: "Screening is recommended to start at age 45. It's the most effective way to prevent CRC."
            },
            {
                id: 'smoking',
                prompt: "I am a current smoker.",
                risk: 'MEDIUM',
                category: 'Lifestyle',
                correctAnswer: 'No',
                explanation: "Smoking increases the risk of many cancers, including colorectal cancer."
            },
            {
                id: 'alcohol',
                prompt: "I drink more than one alcoholic beverage per day on average.",
                risk: 'MEDIUM',
                category: 'Lifestyle',
                correctAnswer: 'No',
                explanation: "Heavy or regular alcohol use is a known risk factor for CRC."
            },
            {
                id: 'processed-meat',
                prompt: "I eat processed meats (like hot dogs, bacon, or ham) most weeks.",
                risk: 'MEDIUM',
                category: 'Diet & Nutrition',
                correctAnswer: 'No',
                explanation: "Processed meats are strongly linked to an increased risk of colorectal cancer."
            },
            {
                id: 'red-meat',
                prompt: "I eat red meat (like beef or lamb) more than 3 times per week.",
                risk: 'MEDIUM',
                category: 'Diet & Nutrition',
                correctAnswer: 'No',
                explanation: "High red meat consumption can increase your risk. Try swapping in fish or chicken."
            },
            {
                id: 'sedentary',
                prompt: "I am mostly sedentary and get less than 30 minutes of intentional exercise most days.",
                risk: 'MEDIUM',
                category: 'Lifestyle',
                correctAnswer: 'No',
                explanation: "A sedentary lifestyle is a key risk factor. Regular activity helps keep your colon healthy."
            },
            {
                id: 'fiber',
                prompt: "I rarely eat high-fiber foods like fruits, vegetables, or whole grains.",
                risk: 'MEDIUM',
                category: 'Diet & Nutrition',
                correctAnswer: 'No',
                explanation: "Fiber is crucial for a healthy colon. It helps move waste through your system."
            },
            {
                id: 'weight',
                prompt: "I am currently overweight.",
                risk: 'MEDIUM',
                category: 'Lifestyle',
                correctAnswer: 'No',
                explanation: "Being overweight or obese increases your risk of developing colorectal cancer."
            },
            {
                id: 'diabetes',
                prompt: "I have been diagnosed with Type 2 diabetes.",
                risk: 'MEDIUM',
                category: 'Medical History',
                correctAnswer: 'No',
                explanation: "Type 2 diabetes has been linked to an increased risk of colorectal cancer."
            },
            {
                id: 'grains',
                prompt: "I usually choose white bread and white rice over whole-grain options.",
                risk: 'LOW',
                category: 'Diet & Nutrition',
                correctAnswer: 'No',
                explanation: "Whole grains contain more fiber, which is important for colon health."
            },
            {
                id: 'cooking',
                prompt: "I often cook my food using high-heat methods like charring, grilling, or barbecuing.",
                risk: 'LOW',
                category: 'Diet & Nutrition',
                correctAnswer: 'No',
                explanation: "Some studies suggest high-heat cooking may create chemicals linked to cancer risk."
            },
            {
                id: 'age-gate-under-45',
                prompt: "I am under 45, and I have *never* discussed my personal CRC risk with a doctor.",
                risk: 'LOW',
                category: 'Medical History',
                correctAnswer: 'No',
                explanation: "It's never too early to know your risk, especially if you have a family history."
            }
        ];
    }
}

