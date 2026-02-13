import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { QuestionModel } from '../models/questionModel.js';
import { AssessmentModel } from '../models/assessmentModel.js';
import { CancerTypeModel } from '../models/cancerTypeModel.js';
import { AdminModel } from '../models/adminModel.js';

const router = express.Router();
const questionModel = new QuestionModel();
const assessmentModel = new AssessmentModel();
const cancerTypeModel = new CancerTypeModel();
const adminModel = new AdminModel();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assessmentsCsvPath = path.join(__dirname, '..', 'data', 'assessments.csv');

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Super admin access required' });
    }
    next();
};

// ==================== ADMIN MANAGEMENT ENDPOINTS (SUPER ADMIN ONLY) ====================

/**
 * GET /api/admin/admins
 * Get all admin users (super admin only)
 */
router.get('/admins', requireSuperAdmin, async (req, res) => {
    try {
        const admins = await adminModel.getAllAdmins();
        res.json({ success: true, data: admins });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/admins
 * Create a new admin user (super admin only)
 */
router.post('/admins', requireSuperAdmin, async (req, res) => {
    try {
        const { email, name, role } = req.body;

        if (!email || !name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email, and name are required' 
            });
        }

        const admin = await adminModel.createAdmin({ 
            email, 
            name, 
            role: role || 'admin' 
        });

        res.json({ 
                success: true, 
                data: admin,
                tempPassword: admin.tempPassword
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/admin/admins/:id/role
 * Update an admin's role
 */
router.put('/admins/:id/role', requireSuperAdmin, async (req, res) => {
    try {
        const { role } = req.body;

        if (!['admin', 'super_admin'].includes(role)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid role. Must be "admin" or "super_admin"' 
            });
        }

        // Prevent demoting yourself if you're the last super admin
        if (req.params.id === req.user.id && role === 'admin') {
            const allAdmins = await adminModel.getAllAdmins();
            const superAdmins = allAdmins.filter(a => a.role === 'super_admin');
            if (superAdmins.length === 1) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Cannot demote the last super admin' 
                });
            }
        }

        const admin = await adminModel.updateAdmin(req.params.id, { role });
        res.json({ success: true, data: admin });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/admin/admins/:id
 * Update an admin's details (super admin only, or self)
 */
router.put('/admins/:id', async (req, res) => {
    try {
        // Allow users to update themselves, or super admins to update anyone
        if (req.params.id !== req.user.id && req.user.role !== 'super_admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'You can only update your own profile' 
            });
        }

        const { name, email, password, role } = req.body;
        const updates = {};

        if (name) updates.name = name;
        if (email) updates.email = email;
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Password must be at least 6 characters' 
                });
            }
            updates.password = password;
        }
        
        // Allow role updates only for super admins
        if (role && req.user.role === 'super_admin') {
            if (!['admin', 'super_admin'].includes(role)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid role. Must be "admin" or "super_admin"' 
                });
            }
            
            // Prevent demoting yourself if you're the last super admin
            if (req.params.id === req.user.id && role === 'admin') {
                const allAdmins = await adminModel.getAllAdmins();
                const superAdmins = allAdmins.filter(a => a.role === 'super_admin');
                if (superAdmins.length === 1) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Cannot demote the last super admin' 
                    });
                }
            }
            updates.role = role;
        }
        const admin = await adminModel.updateAdmin(req.params.id, updates);
        res.json({ success: true, data: admin });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/admin/admins/:id
 * Delete an admin user (super admin only)
 */
router.delete('/admins/:id', requireSuperAdmin, async (req, res) => {
    try {
        // Prevent deleting yourself
        if (req.params.id === req.user.id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete your own account' 
            });
        }

        await adminModel.deleteAdmin(req.params.id);
        res.json({ success: true, message: 'Admin deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/me
 * Get current admin's profile
 */
router.get('/me', async (req, res) => {
    try {
        const admin = await adminModel.getAdminById(req.user.id);
        if (!admin) {
            return res.status(404).json({ success: false, error: 'Admin not found' });
        }

        const { password, ...adminWithoutPassword } = admin;
        res.json({ success: true, data: adminWithoutPassword });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/change-password
 * Change current admin's password
 */
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'Current password and new password are required' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                error: 'New password must be at least 6 characters' 
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'New password must be different from current password' 
            });
        }

        await adminModel.changePassword(req.user.id, currentPassword, newPassword);
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== CANCER TYPE ENDPOINTS ====================

const WEIGHT_TOLERANCE = 1; // allow sum to be 100 ± this for "valid"

/**
 * For generic assessment assignments: group by targetCancerType, sum weight per target.
 * Returns { weightByTarget: { [target]: { totalWeight, isValid } }, isValid }.
 */
function computeGenericWeightValidity(assignments) {
    const weightByTarget = {};
    for (const a of assignments) {
        const target = (a.targetCancerType || '').toLowerCase().trim();
        if (!target) continue;
        if (!weightByTarget[target]) weightByTarget[target] = { totalWeight: 0, isValid: false };
        weightByTarget[target].totalWeight += parseFloat(a.weight) || 0;
    }
    for (const target of Object.keys(weightByTarget)) {
        const sum = weightByTarget[target].totalWeight;
        weightByTarget[target].isValid = Math.abs(sum - 100) <= WEIGHT_TOLERANCE;
    }
    const hasAssignments = assignments.length > 0;
    const everyTargetValid = Object.keys(weightByTarget).length === 0
        ? !hasAssignments
        : Object.values(weightByTarget).every(v => v.isValid);
    const isValid = hasAssignments && everyTargetValid;
    return { weightByTarget, targetCount: Object.keys(weightByTarget).length, isValid };
}

/**
 * GET /api/admin/cancer-types
 * Get all cancer types with question counts and weights from assignments.csv
 */
router.get('/cancer-types', async (req, res) => {
    try {
        const cancerTypes = await cancerTypeModel.getAllCancerTypes();
        const assignments = await questionModel.loadAssignments();
        
        // Add question count and weight sum per assessment from assignments
        const cancerTypesWithStats = cancerTypes.map(ct => {
            const assessmentId = (ct.id || '').toLowerCase();
            const typeAssignments = assignments.filter(a =>
                a.assessmentId && String(a.assessmentId).toLowerCase() === assessmentId &&
                (a.isActive === undefined || a.isActive === '' || a.isActive === '1')
            );
            const totalWeight = typeAssignments.reduce((sum, a) => {
                return sum + (parseFloat(a.weight) || 0);
            }, 0);
            
            if (assessmentId === 'generic') {
                const { weightByTarget, targetCount, isValid } = computeGenericWeightValidity(typeAssignments);
                return {
                    ...ct,
                    questionCount: typeAssignments.length,
                    totalWeight: totalWeight.toFixed(2),
                    targetCount,
                    weightByTarget,
                    isValid
                };
            }
            return {
                ...ct,
                questionCount: typeAssignments.length,
                totalWeight: totalWeight.toFixed(2),
                isValid: typeAssignments.length > 0 && Math.abs(totalWeight - 100) <= WEIGHT_TOLERANCE
            };
        });
        
        res.json({ success: true, data: cancerTypesWithStats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/cancer-types/:id
 * Get a single cancer type. Questions list comes from assignments.csv (for consistency with cards).
 */
router.get('/cancer-types/:id', async (req, res) => {
    try {
        const cancerType = await cancerTypeModel.getCancerTypeById(req.params.id);
        
        if (!cancerType) {
            return res.status(404).json({ success: false, error: 'Cancer type not found' });
        }
        
        const assessmentId = (req.params.id || '').toLowerCase();
        const assignments = await questionModel.getAssignmentsForAssessment(req.params.id, null);
        const totalWeight = assignments.reduce((sum, a) => sum + (parseFloat(a.weight) || 0), 0);
        
        if (assessmentId === 'generic') {
            const { weightByTarget, targetCount, isValid } = computeGenericWeightValidity(assignments);
            return res.json({
                success: true,
                data: {
                    ...cancerType,
                    questions: assignments,
                    questionCount: assignments.length,
                    totalWeight: totalWeight.toFixed(2),
                    targetCount,
                    weightByTarget,
                    isValid
                }
            });
        }
        
        res.json({
            success: true,
            data: {
                ...cancerType,
                questions: assignments,
                questionCount: assignments.length,
                totalWeight: totalWeight.toFixed(2),
                isValid: assignments.length > 0 && Math.abs(totalWeight - 100) <= WEIGHT_TOLERANCE
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/cancer-types
 * Create a new cancer type
 */
router.post('/cancer-types', async (req, res) => {
    try {
        const { id, ...cancerTypeData } = req.body;
        
        if (!id) {
            return res.status(400).json({ success: false, error: 'Cancer type ID is required' });
        }
        
        // Normalize ID to lowercase
        const normalizedId = id.toLowerCase().trim();
        
        const cancerType = await cancerTypeModel.createCancerType({
            id: normalizedId,
            ...cancerTypeData
        });
        
        res.json({ success: true, data: cancerType });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/admin/cancer-types/:id
 * Update a cancer type and optionally its questions
 */
router.put('/cancer-types/:id', async (req, res) => {
    try {
        const { questions, ...cancerTypeData } = req.body;
        
        // Update cancer type config
        const updatedCancerType = await cancerTypeModel.updateCancerType(req.params.id, cancerTypeData);
        
        let questionsResult = { updated: 0, added: 0, deleted: 0 };
        
        // Update questions if provided
        if (questions && Array.isArray(questions)) {
            const existingQuestions = await questionModel.getQuestionsByCancerType(req.params.id);
            const existingIds = new Set(existingQuestions.map(q => q.id));
            const newIds = new Set(questions.filter(q => q.id).map(q => q.id));
            
            // Find questions to delete (exist in DB but not in new list)
            const toDelete = existingQuestions.filter(q => !newIds.has(q.id));
            for (const q of toDelete) {
                await questionModel.deleteQuestion(q.id);
                questionsResult.deleted++;
            }
            
            // Update existing and create new questions
            for (const q of questions) {
                if (q.id && existingIds.has(q.id)) {
                    // Update existing
                    await questionModel.updateQuestion(q.id, {
                        ...q,
                        cancerType: req.params.id
                    });
                    questionsResult.updated++;
                } else {
                    // Create new
                    await questionModel.createQuestion({
                        ...q,
                        cancerType: req.params.id
                    });
                    questionsResult.added++;
                }
            }
        }
        
        res.json({ 
            success: true, 
            data: updatedCancerType,
            questionsResult
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/admin/cancer-types/:id
 * Delete a cancer type and all its questions
 */
router.delete('/cancer-types/:id', async (req, res) => {
    try {
        // Delete all questions for this cancer type
        await questionModel.deleteQuestionsByCancerType(req.params.id);
        
        // Delete the cancer type itself
        await cancerTypeModel.deleteCancerType(req.params.id);
        
        res.json({ success: true, message: 'Cancer type and all associated questions deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== QUESTION ENDPOINTS ====================

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
 * GET /api/admin/questions/:id
 * Get a specific question by ID
 */
router.get('/questions/:id', async (req, res) => {
    try {
        const question = await questionModel.getQuestionById(req.params.id);

        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }

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

// ==================== QUESTION BANK ENDPOINTS ====================

/**
 * GET /api/admin/question-bank
 * Get a logical view of the Question Bank (content only) with sources.
 * Backed by question_bank.csv plus references from specific & generic CSVs.
 */
router.get('/question-bank', async (req, res) => {
    try {
        const bankView = await questionModel.getQuestionBankView();
        res.json({ success: true, data: bankView });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/question-bank
 * Create a new Question Bank entry (backed by question_bank.csv).
 */
router.post('/question-bank', async (req, res) => {
    try {
        const {
            id,
            prompt_en,
            prompt_zh,
            prompt_ms,
            prompt_ta,
            explanation_en,
            explanation_zh,
            explanation_ms,
            explanation_ta
        } = req.body;

        const newEntry = await questionModel.createBankQuestion({
            id,
            prompt_en,
            prompt_zh,
            prompt_ms,
            prompt_ta,
            explanation_en,
            explanation_zh,
            explanation_ms,
            explanation_ta
        });

        res.json({ success: true, data: newEntry });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/admin/question-bank/:id
 * Update prompts/explanations for a Question Bank entry (question_bank.csv).
 */
router.put('/question-bank/:id', async (req, res) => {
    try {
        const {
            prompt_en,
            prompt_zh,
            prompt_ms,
            prompt_ta,
            explanation_en,
            explanation_zh,
            explanation_ms,
            explanation_ta
        } = req.body;

        const updates = {
            ...(prompt_en !== undefined ? { prompt_en } : {}),
            ...(prompt_zh !== undefined ? { prompt_zh } : {}),
            ...(prompt_ms !== undefined ? { prompt_ms } : {}),
            ...(prompt_ta !== undefined ? { prompt_ta } : {}),
            ...(explanation_en !== undefined ? { explanation_en } : {}),
            ...(explanation_zh !== undefined ? { explanation_zh } : {}),
            ...(explanation_ms !== undefined ? { explanation_ms } : {}),
            ...(explanation_ta !== undefined ? { explanation_ta } : {})
        };

        const updated = await questionModel.updateBankQuestion(req.params.id, updates);
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ASSESSMENT ENDPOINTS ====================

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

/**
 * GET /api/admin/assessments/:id/assignments
 * Get assignments for a specific assessment (CSV-backed).
 */
router.get('/assessments/:id/assignments', async (req, res) => {
    try {
        const { id } = req.params;
        const { age } = req.query;
        const userAge = age ? parseInt(age) : null;

        const assignments = await questionModel.getAssignmentsForAssessment(id, userAge);
        res.json({ success: true, data: assignments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/admin/assessments/:id/assignments
 * Update scoring-related fields for assignments in an assessment.
 * Writes to assignments.csv (scoring/usage layer).
 */
router.put('/assessments/:id/assignments', async (req, res) => {
    try {
        const { id } = req.params;
        const { assignments } = req.body;

        if (!Array.isArray(assignments)) {
            return res.status(400).json({
                success: false,
                error: 'assignments array is required'
            });
        }

        const normalizedId = String(id).toLowerCase();

        // Load all existing assignments
        const allAssignments = await questionModel.loadAssignments();

        // Filter out assignments for this assessment
        const remaining = allAssignments.filter(a =>
            !a.assessmentId || String(a.assessmentId).toLowerCase() !== normalizedId
        );

        // Normalize and add new assignments for this assessment
        const newAssignments = assignments
            .filter(a => a.questionId)
            .map(a => {
                const rawTarget = a.targetCancerType || a.cancerType || (normalizedId === 'generic' ? '' : normalizedId);
                const targetCancerType = rawTarget ? String(rawTarget).toLowerCase().trim() : '';
                return {
                    questionId: a.questionId,
                    assessmentId: normalizedId,
                    targetCancerType,
                    weight: a.weight ?? '',
                    yesValue: a.yesValue ?? '',
                    noValue: a.noValue ?? '',
                    category: a.category ?? '',
                    minAge: a.minAge ?? '',
                    isActive: a.isActive ?? '1'
                };
            });

        const updatedAssignments = [...remaining, ...newAssignments];
        await questionModel.saveAssignments(updatedAssignments);

        res.json({
            success: true,
            data: { updated: newAssignments.length }
        });
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
