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
            res.status(500).json({ success: false, error: 'Internal server error' });
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

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="assessments.csv"');

            // Stream row-by-row instead of buffering the full CSV in memory.
            // Output is byte-identical to the previous rows.join('\r\n') implementation:
            // header + '\r\n' + row1 + '\r\n' + row2 ... with no trailing newline.
            res.write(headers.join(','));
            for (const a of assessments) {
                res.write('\r\n' + headers.map(h => escapeField(a[h])).join(','));
            }
            res.end();
        } catch (error) {
            // If headers already sent (mid-stream error), we can't send JSON.
            if (res.headersSent) {
                res.end();
                return;
            }
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    /**
     * GET /api/admin/assessments/stats
     * Authenticated admin statistics including rawRows for Cohort Explorer.
     * The public /api/assessments/stats endpoint strips rawRows for PII protection;
     * this admin-only variant returns the full statistics object.
     * NOTE: Must be defined BEFORE /:id/assignments to avoid matching "stats" as :id.
     */
    router.get('/assessments/stats', async (req, res) => {
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
            res.json({ success: true, data: stats });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
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
            res.status(500).json({ success: false, error: 'Internal server error' });
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

            const VALID_CATEGORIES = ['Diet & Nutrition', 'Lifestyle', 'Medical History', 'Family & Genetics', ''];

            const newAssignments = [];
            for (const a of assignments) {
                if (!a.questionId) continue;

                const weight = (a.weight != null && a.weight !== '') ? parseFloat(a.weight) : null;
                const yesValue = (a.yesValue != null && a.yesValue !== '') ? parseFloat(a.yesValue) : null;
                const noValue = (a.noValue != null && a.noValue !== '') ? parseFloat(a.noValue) : null;
                const minAge = (a.minAge != null && a.minAge !== '') ? parseInt(a.minAge) : null;
                const category = a.category ?? '';

                if (weight !== null && (isNaN(weight) || weight < 0 || weight > 100)) {
                    return res.status(400).json({ success: false, error: `Invalid weight for question ${a.questionId}` });
                }
                if (yesValue !== null && (isNaN(yesValue) || yesValue < 0 || yesValue > 100)) {
                    return res.status(400).json({ success: false, error: `Invalid yesValue for question ${a.questionId}` });
                }
                if (noValue !== null && (isNaN(noValue) || noValue < 0 || noValue > 100)) {
                    return res.status(400).json({ success: false, error: `Invalid noValue for question ${a.questionId}` });
                }
                if (minAge !== null && (isNaN(minAge) || minAge < 0)) {
                    return res.status(400).json({ success: false, error: `Invalid minAge for question ${a.questionId}` });
                }
                if (!VALID_CATEGORIES.includes(category)) {
                    return res.status(400).json({ success: false, error: `Invalid category: ${category}` });
                }

                const rawTarget = a.targetCancerType || a.cancerType || (normalizedId === 'generic' ? '' : normalizedId);
                newAssignments.push({
                    questionId: a.questionId,
                    assessmentId: normalizedId,
                    targetCancerType: rawTarget ? String(rawTarget).toLowerCase().trim() : '',
                    weight,
                    yesValue,
                    noValue,
                    category,
                    minAge
                });
            }

            await questionModel.replaceAssignmentsForAssessment(normalizedId, newAssignments);

            res.json({ success: true, data: { updated: newAssignments.length } });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    return router;
}
