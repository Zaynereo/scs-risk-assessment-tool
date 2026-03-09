import express from 'express';

export function createAssessmentsRouter({ assessmentModel, questionModel }) {
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
     * Export assessments as CSV generated from DB
     * NOTE: This must be defined BEFORE /:id/assignments to avoid matching "export" as :id
     */
    router.get('/assessments/export', async (req, res) => {
        try {
            const assessments = await assessmentModel.getAllAssessments();

            const headers = ['id', 'age', 'gender', 'familyHistory', 'assessmentType', 'riskScore', 'riskLevel', 'categoryRisks', 'questionsAnswers', 'timestamp'];

            const escapeField = (val) => {
                if (val === null || val === undefined) return '';
                const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            };

            const rows = [headers.join(',')];
            for (const a of assessments) {
                rows.push(headers.map(h => escapeField(a[h])).join(','));
            }

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="assessments.csv"');
            res.send(rows.join('\r\n'));
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
     * Replace all assignments for a specific assessment (scoped — other assessments untouched)
     */
    router.put('/assessments/:id/assignments', async (req, res) => {
        try {
            const normalizedId = String(req.params.id).toLowerCase();
            const { assignments } = req.body;

            if (!Array.isArray(assignments)) {
                return res.status(400).json({
                    success: false,
                    error: 'assignments array is required'
                });
            }

            const newAssignments = assignments
                .filter(a => a.questionId)
                .map(a => {
                    const rawTarget = a.targetCancerType || a.cancerType || (normalizedId === 'generic' ? '' : normalizedId);
                    return {
                        questionId: a.questionId,
                        assessmentId: normalizedId,
                        targetCancerType: rawTarget ? String(rawTarget).toLowerCase().trim() : '',
                        weight: a.weight ?? null,
                        yesValue: a.yesValue ?? null,
                        noValue: a.noValue ?? null,
                        category: a.category ?? '',
                        minAge: a.minAge ?? null
                    };
                });

            await questionModel.replaceAssignmentsForAssessment(normalizedId, newAssignments);

            res.json({ success: true, data: { updated: newAssignments.length } });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
}
