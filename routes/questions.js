import express from 'express';
import { QuestionModel } from '../models/questionModel.js';
import { CancerTypeModel } from '../models/cancerTypeModel.js';

const router = express.Router();
const questionModel = new QuestionModel();
const cancerTypeModel = new CancerTypeModel();

/**
 * GET /api/questions/cancer-types
 * Returns all cancer types with localized fields
 * Query params: lang (en, zh, ms, ta)
 */
router.get('/cancer-types', async (req, res) => {
    try {
        const { lang = 'en' } = req.query;
        const cancerTypes = await cancerTypeModel.getAllCancerTypesLocalized(lang);
        res.json({ success: true, data: cancerTypes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/questions/cancer-types/:id
 * Returns a specific cancer type with localized fields
 * Query params: lang (en, zh, ms, ta)
 */
router.get('/cancer-types/:id', async (req, res) => {
    try {
        const { lang = 'en' } = req.query;
        const cancerType = await cancerTypeModel.getCancerTypeLocalized(req.params.id, lang);
        
        if (!cancerType) {
            return res.status(404).json({ success: false, error: 'Cancer type not found' });
        }
        
        res.json({ success: true, data: cancerType });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/questions
 * Returns questions (optionally filtered by cancer type, age, and language)
 * Query params: 
 *   - cancerType: filter by cancer type
 *   - age: filter by user age (excludes questions with minAge > age)
 *   - lang: language for localized fields (en, zh, ms, ta)
 */
router.get('/', async (req, res) => {
    try {
        const { age, cancerType, lang = 'en' } = req.query;
        const userAge = age ? parseInt(age) : null;
        
        // Get localized questions
        const questions = await questionModel.getQuestionsLocalized(
            cancerType || null,
            lang,
            userAge
        );
        
        res.json({ success: true, data: questions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/questions/all
 * Returns all questions with all language fields (for admin or advanced use)
 */
router.get('/all', async (req, res) => {
    try {
        const { age, cancerType } = req.query;
        let questions = await questionModel.getAllQuestions(age ? parseInt(age) : null);
        
        if (cancerType) {
            questions = questions.filter(q => 
                q.cancerType && 
                q.cancerType.toLowerCase() === cancerType.toLowerCase()
            );
        }
        
        res.json({ success: true, data: questions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/questions/by-assessment
 * Returns questions for a given assessmentId using the Assignments model.
 * Query params:
 *   - assessmentId: required (e.g. colorectal, breast, generic)
 *   - age: optional user age for minAge filtering
 *   - lang: language for localized fields (en, zh, ms, ta)
 */
router.get('/by-assessment', async (req, res) => {
    try {
        const { assessmentId, age, lang = 'en' } = req.query;

        if (!assessmentId) {
            return res.status(400).json({ 
                success: false, 
                error: 'assessmentId is required' 
            });
        }

        const userAge = age ? parseInt(age) : null;
        const questions = await questionModel.getQuestionsForAssessment(
            assessmentId,
            lang,
            userAge
        );

        res.json({ success: true, data: questions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/questions/:id
 * Returns a specific question by ID with localized fields
 * Query params: lang (en, zh, ms, ta)
 */
router.get('/:id', async (req, res) => {
    try {
        const { lang = 'en' } = req.query;
        const question = await questionModel.getQuestionById(req.params.id);
        
        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }
        
        // Return localized version
        const localizedQuestion = {
            id: question.id,
            prompt: question[`prompt_${lang}`] || question.prompt_en,
            weight: question.weight,
            yesValue: question.yesValue,
            noValue: question.noValue,
            category: question.category,
            explanation: question[`explanation_${lang}`] || question.explanation_en,
            cancerType: question.cancerType,
            minAge: question.minAge
        };
        
        res.json({ success: true, data: localizedQuestion });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export { router as questionsRouter };
