import express from 'express';
import fs from 'fs';

export function createAssessmentsRouter({ assessmentModel, questionModel, assessmentsCsvPath }) {
    const router = express.Router();

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
     * GET /api/admin/assessments/export
     * Export assessments as CSV file
     * NOTE: This must be defined BEFORE /:id/assignments to avoid matching "export" as :id
     */
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

    /**
     * GET /api/admin/assessments/:id/assignments
     * Get assignments for a specific assessment
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
     * Update scoring-related fields for assignments in an assessment
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

    return router;
}
