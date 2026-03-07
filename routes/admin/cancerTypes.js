import express from 'express';

export function createCancerTypesRouter({ cancerTypeModel, questionModel, computeGenericWeightValidity, getQuizWeightTarget }) {
    const router = express.Router();

    /**
     * GET /api/admin/cancer-types
     * Get all cancer types with question counts and weights from assignments.csv
     */
    router.get('/cancer-types', async (req, res) => {
        try {
            const cancerTypes = await cancerTypeModel.getAllCancerTypes();
            const assignments = await questionModel.loadAssignments();

            const cancerTypesWithStats = cancerTypes.map(ct => {
                const assessmentId = (ct.id || '').toLowerCase();
                const typeAssignments = assignments.filter(a =>
                    a.assessmentId && String(a.assessmentId).toLowerCase() === assessmentId &&
                    (a.isActive === undefined || a.isActive === '' || a.isActive === '1')
                );
                const totalWeight = typeAssignments.reduce((sum, a) => {
                    return sum + (parseFloat(a.weight) || 0);
                }, 0);

                const quizTarget = getQuizWeightTarget(ct);
                if (assessmentId === 'generic') {
                    const { weightByTarget, targetCount, isValid } = computeGenericWeightValidity(typeAssignments, ct);
                    return {
                        ...ct,
                        questionCount: typeAssignments.length,
                        totalWeight: totalWeight.toFixed(2),
                        quizWeightTarget: quizTarget,
                        targetCount,
                        weightByTarget,
                        isValid
                    };
                }
                return {
                    ...ct,
                    questionCount: typeAssignments.length,
                    totalWeight: totalWeight.toFixed(2),
                    quizWeightTarget: quizTarget,
                    isValid: typeAssignments.length > 0 && Math.round(totalWeight * 100) === Math.round(quizTarget * 100)
                };
            });

            res.json({ success: true, data: cancerTypesWithStats });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/admin/cancer-types/reorder
     * Reorder cancer types by providing an ordered array of IDs
     */
    router.put('/cancer-types/reorder', async (req, res) => {
        try {
            const { orderedIds } = req.body;

            if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
                return res.status(400).json({ success: false, error: 'orderedIds array is required' });
            }

            const reordered = await cancerTypeModel.reorderCancerTypes(orderedIds);
            await cancerTypeModel.writeAssessmentsSnapshot();
            res.json({ success: true, data: reordered });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/admin/cancer-types/:id
     * Get a single cancer type with questions and weight validation
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

            const quizTarget = getQuizWeightTarget(cancerType);
            if (assessmentId === 'generic') {
                const { weightByTarget, targetCount, isValid } = computeGenericWeightValidity(assignments, cancerType);
                return res.json({
                    success: true,
                    data: {
                        ...cancerType,
                        questions: assignments,
                        questionCount: assignments.length,
                        totalWeight: totalWeight.toFixed(2),
                        quizWeightTarget: quizTarget,
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
                    quizWeightTarget: quizTarget,
                    isValid: assignments.length > 0 && Math.round(totalWeight * 100) === Math.round(quizTarget * 100)
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

            const normalizedId = id.toLowerCase().trim();

            const cancerType = await cancerTypeModel.createCancerType({
                id: normalizedId,
                ...cancerTypeData
            });

            await cancerTypeModel.writeAssessmentsSnapshot();
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
            const cancerTypeData = req.body;

            const updatedCancerType = await cancerTypeModel.updateCancerType(req.params.id, cancerTypeData);

            await cancerTypeModel.writeAssessmentsSnapshot();
            res.json({
                success: true,
                data: updatedCancerType
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
            await questionModel.deleteAssignmentsByAssessmentId(req.params.id);
            await cancerTypeModel.deleteCancerType(req.params.id);

            await cancerTypeModel.writeAssessmentsSnapshot();
            res.json({ success: true, message: 'Cancer type and all associated questions deleted' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
}
