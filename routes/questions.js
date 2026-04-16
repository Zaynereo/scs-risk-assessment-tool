import express from 'express';
import { QuestionModel } from '../models/questionModel.js';
import { CancerTypeModel } from '../models/cancerTypeModel.js';

const router = express.Router();
const questionModel = new QuestionModel();
const cancerTypeModel = new CancerTypeModel();

const VALID_LANGS = ['en', 'zh', 'ms', 'ta'];
function sanitizeLang(lang) {
    return VALID_LANGS.includes(lang) ? lang : 'en';
}

/**
 * GET /api/questions/cancer-types
 * Returns all cancer types with localized fields
 * Query params: lang (en, zh, ms, ta)
 */
router.get('/cancer-types', async (req, res) => {
    try {
        const lang = sanitizeLang(req.query.lang);
        const allCancerTypes = await cancerTypeModel.getAllCancerTypesLocalized(lang);
        const cancerTypes = allCancerTypes.filter(ct => ct.visible !== false);
        res.set('Cache-Control', 'no-cache');
        res.json({ success: true, data: cancerTypes });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/questions/cancer-types/:id
 * Returns a specific cancer type with localized fields
 * Query params: lang (en, zh, ms, ta)
 */
router.get('/cancer-types/:id', async (req, res) => {
    try {
        const lang = sanitizeLang(req.query.lang);
        const cancerType = await cancerTypeModel.getCancerTypeLocalized(req.params.id, lang);

        if (!cancerType || cancerType.visible === false) {
            return res.status(404).json({ success: false, error: 'Cancer type not found' });
        }

        res.set('Cache-Control', 'no-cache');
        res.json({ success: true, data: cancerType });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
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
const VALID_GENDERS = ['male', 'female'];
function sanitizeGender(g) {
    if (!g) return null;
    const v = String(g).toLowerCase();
    return VALID_GENDERS.includes(v) ? v : null;
}

router.get('/by-assessment', async (req, res) => {
    try {
        const { assessmentId, age } = req.query;
        const lang = sanitizeLang(req.query.lang);
        const gender = sanitizeGender(req.query.gender);

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
            userAge,
            gender
        );

        res.set('Cache-Control', 'no-cache');
        res.json({ success: true, data: questions });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export { router as questionsRouter };
