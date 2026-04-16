import express from 'express';
import { AssessmentModel } from '../models/assessmentModel.js';
import { CancerTypeModel } from '../models/cancerTypeModel.js';
import { calculateRiskScore } from '../controllers/riskCalculator.js';
import emailService from '../services/emailService.js';
import { validateAssessment, validateSendResults } from '../middleware/validateAssessment.js';
import { assessmentSubmitLimiter } from '../middleware/rateLimiter.js';
import { isValidEmail } from '../utils/email.js';

const router = express.Router();
const assessmentModel = new AssessmentModel();
const cancerTypeModel = new CancerTypeModel();

/**
 * POST /api/assessments
 * Submit a new risk assessment
 */
router.post('/', assessmentSubmitLimiter, validateAssessment, async (req, res) => {
    try {
        const { userData, answers } = req.body;

        // Validate input
        if (!userData || !answers) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing userData or answers' 
            });
        }

        // Load assessment configuration for demographic risk settings
        const assessmentId = userData.assessmentType || 'colorectal';
        let assessmentConfig = null;
        try {
            assessmentConfig = await cancerTypeModel.getAssessmentConfig(assessmentId);
        } catch (err) {
            console.warn('Failed to load assessment config, using defaults:', err);
        }

        // For generic, build a per-cancer config map so each cancer type's
        // bucket gets its own familyWeight/age/ethnicity boost (matches the
        // client-side display in uiController._calculateAndDisplay). Without
        // this, the stored score would silently disagree with what the
        // participant saw on screen.
        let cancerConfigsByType = null;
        if (assessmentId === 'generic') {
            try {
                const allCts = await cancerTypeModel.getAllCancerTypes();
                cancerConfigsByType = {};
                for (const ct of allCts) {
                    const id = (ct.id || '').toLowerCase();
                    if (!id || id === 'generic') continue;
                    cancerConfigsByType[id] = {
                        familyWeight: parseFloat(ct.familyWeight) || 0,
                        ageRiskThreshold: parseInt(ct.ageRiskThreshold) || 0,
                        ageRiskWeight: parseFloat(ct.ageRiskWeight) || 0,
                        ethnicityRisk: {
                            chinese: parseFloat(ct.ethnicityRisk_chinese) || 0,
                            malay: parseFloat(ct.ethnicityRisk_malay) || 0,
                            indian: parseFloat(ct.ethnicityRisk_indian) || 0,
                            caucasian: parseFloat(ct.ethnicityRisk_caucasian) || 0,
                            others: parseFloat(ct.ethnicityRisk_others) || 0
                        }
                    };
                }
            } catch (err) {
                console.warn('Failed to load per-cancer configs for generic, falling back to single config:', err);
            }
        }

        // Calculate risk score with assessment configuration
        const riskResult = calculateRiskScore(userData, answers, assessmentId, assessmentConfig, cancerConfigsByType);

        // Store assessment (anonymous - no PII)
        const assessment = await assessmentModel.createAssessment({
            age: userData.age,
            gender: userData.gender,
            familyHistory: userData.familyHistory,
            assessmentType: userData.assessmentType || 'colorectal', // Add cancer type
            riskScore: riskResult.totalScore,
            riskLevel: riskResult.riskLevel,
            categoryRisks: riskResult.categoryRisks,
            questionsAnswers: answers, // Store detailed questions and answers as JSON
            timestamp: new Date().toISOString()
        });

        const isHighRisk = riskResult.riskLevel === 'HIGH';

        const responseData = {
            assessmentId: assessment.id,
            riskScore: riskResult.totalScore,
            riskLevel: riskResult.riskLevel,
            isHighRisk,
            categoryRisks: riskResult.categoryRisks,
            recommendations: riskResult.recommendations
        };

        // Add cancer-specific scores for Generic Assessment
        if (userData.assessmentType === 'generic' && riskResult.cancerTypeScores) {
            responseData.cancerTypeScores = riskResult.cancerTypeScores;
        }

        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /api/assessments/send-results
 * Send assessment results to user via email
 */
router.post('/send-results', assessmentSubmitLimiter, validateSendResults, async (req, res) => {
    try {
       let { contact, riskScore, riskLevel, userData, categoryRisks, recommendations, assessmentType, cancerTypeScores } = req.body;

        if (!contact) {
            return res.status(400).json({
                success: false,
                error: 'Email address is required'
            });
        }

        // Validate email format via the shared helper in utils/email.js
        if (!isValidEmail(contact)) {
            return res.status(400).json({
                success: false,
                error: 'Please enter a valid email address'
            });
        }

        // Parse recommendations if they're stringified
        if (typeof recommendations === 'string') {
            try {
                recommendations = JSON.parse(recommendations);
            } catch (e) {
                console.warn('Could not parse recommendations string:', e);
            }
        }

        // Send email using existing email service
        await emailService.sendAssessmentResults(contact, {
            riskScore,
            riskLevel,
            userData,
            categoryRisks,
            recommendations,
            assessmentType,
            cancerTypeScores
        });

        res.json({
            success: true,
            message: `Results sent successfully`
        });
    } catch (error) {
        console.error('Error sending results:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/assessments/stats
 * Get aggregate statistics (for analytics - no PII)
 */
router.get('/stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
        const isValidDate = (d) => ISO_DATE_RE.test(d) && !isNaN(new Date(d).getTime());
        if (startDate && !isValidDate(startDate)) {
            return res.status(400).json({ success: false, error: 'Invalid startDate format. Expected YYYY-MM-DD.' });
        }
        if (endDate && !isValidDate(endDate)) {
            return res.status(400).json({ success: false, error: 'Invalid endDate format. Expected YYYY-MM-DD.' });
        }
        const stats = await assessmentModel.getStatistics({
            startDate: startDate || null,
            endDate: endDate || null,
        });
        // Remove raw assessment rows from public endpoint to prevent quasi-PII exposure
        const { rawRows, ...publicStats } = stats;
        res.json({ success: true, data: publicStats });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export { router as assessmentsRouter };

