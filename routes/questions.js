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

export { router as questionsRouter };
