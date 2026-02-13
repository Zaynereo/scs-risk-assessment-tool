import express from 'express';
import { AssessmentModel } from '../models/assessmentModel.js';
import { CancerTypeModel } from '../models/cancerTypeModel.js';
import { calculateRiskScore } from '../controllers/riskCalculator.js';

const router = express.Router();
const assessmentModel = new AssessmentModel();
const cancerTypeModel = new CancerTypeModel();

/**
 * POST /api/assessments
 * Submit a new risk assessment
 */
router.post('/', async (req, res) => {
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
            const cancerType = await cancerTypeModel.getCancerTypeById(assessmentId);
            if (cancerType) {
                assessmentConfig = {
                    familyWeight: parseFloat(cancerType.familyWeight) || 10,
                    ageRiskThreshold: parseInt(cancerType.ageRiskThreshold) || 0,
                    ageRiskWeight: parseFloat(cancerType.ageRiskWeight) || 0,
                    ethnicityRisk: {
                        chinese: parseFloat(cancerType.ethnicityRisk_chinese) || 1.0,
                        malay: parseFloat(cancerType.ethnicityRisk_malay) || 1.0,
                        indian: parseFloat(cancerType.ethnicityRisk_indian) || 1.0,
                        caucasian: parseFloat(cancerType.ethnicityRisk_caucasian) || 1.0,
                        others: parseFloat(cancerType.ethnicityRisk_others) || 1.0
                    }
                };
            }
        } catch (err) {
            console.warn('Failed to load assessment config, using defaults:', err);
        }

        // Calculate risk score with assessment configuration
        const riskResult = calculateRiskScore(userData, answers, assessmentId, assessmentConfig);

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

        const responseData = {
            assessmentId: assessment.id,
            riskScore: riskResult.totalScore,
            riskLevel: riskResult.riskLevel,
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
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/assessments/stats
 * Get aggregate statistics (for analytics - no PII)
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await assessmentModel.getStatistics();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export { router as assessmentsRouter };

