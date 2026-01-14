import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { QuestionModel } from '../models/questionModel.js';
import { AssessmentModel } from '../models/assessmentModel.js';

const router = express.Router();
const questionModel = new QuestionModel();
const assessmentModel = new AssessmentModel();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assessmentsCsvPath = path.join(__dirname, '..', 'data', 'assessments.csv');

/**
 * GET /api/admin/questions
 * Get all questions (for admin management)
 */
router.get('/questions', async (req, res) => {
    try {
        const questions = await questionModel.getAllQuestions();
        res.json({ success: true, data: questions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/questions
 * Create a new question
 */
router.post('/questions', async (req, res) => {
    try {
        const question = await questionModel.createQuestion(req.body);
        res.json({ success: true, data: question });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/questions/bulk
 * Create multiple questions with duplicate detection and cancer type merging
 */
router.post('/questions/bulk', async (req, res) => {
    try {
        const { questions } = req.body;
        
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Questions array is required and must not be empty' 
            });
        }

        const result = await questionModel.bulkCreateQuestions(questions);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/admin/questions/:id
 * Update a question
 */
router.put('/questions/:id', async (req, res) => {
    try {
        const question = await questionModel.updateQuestion(req.params.id, req.body);
        res.json({ success: true, data: question });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/admin/questions/:id
 * Delete a question
 */
router.delete('/questions/:id', async (req, res) => {
    try {
        await questionModel.deleteQuestion(req.params.id);
        res.json({ success: true, message: 'Question deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/assessments
 * Get all assessments (for analytics)
 */
router.get('/assessments', async (req, res) => {
    try {
        const assessments = await assessmentModel.getAllAssessments();
        res.json({ success: true, data: assessments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/assessments/export', (req, res) => {
    try {
        if (!fs.existsSync(assessmentsCsvPath)) {
            return res.status(404).json({ success: false, error: 'Assessments file not found' });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="assessments.csv"');

        fs.createReadStream(assessmentsCsvPath).pipe(res);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export { router as adminRouter };
