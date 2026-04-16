import express from 'express';

const CANCER_TYPE_FIELDS = [
    'icon', 'name_en', 'name_zh', 'name_ms', 'name_ta',
    'description_en', 'description_zh', 'description_ms', 'description_ta',
    'familyLabel_en', 'familyLabel_zh', 'familyLabel_ms', 'familyLabel_ta',
    'familyWeight', 'genderFilter', 'ageRiskThreshold', 'ageRiskWeight',
    'ethnicityRisk_chinese', 'ethnicityRisk_malay', 'ethnicityRisk_indian',
    'ethnicityRisk_caucasian', 'ethnicityRisk_others',
    'sortOrder', 'sort_order', 'visible', 'recommendations'
];

function extractCancerTypeFields(body) {
    const result = {};
    for (const field of CANCER_TYPE_FIELDS) {
        if (body[field] !== undefined) {
            result[field] = body[field];
        }
    }
    return result;
}

const REQUIRED_EN_FIELDS = [
    { field: 'name_en', label: 'English name' },
    { field: 'description_en', label: 'English description' },
    { field: 'familyLabel_en', label: 'English family history label' }
];

function validateRequiredEn(data, requireAll) {
    const missing = [];
    for (const { field, label } of REQUIRED_EN_FIELDS) {
        if (requireAll) {
            if (!data[field] || !data[field].trim()) missing.push(label);
        } else {
            if (data[field] !== undefined && !data[field].trim()) missing.push(label);
        }
    }
    return missing;
}

function validateRecsEn(recommendations) {
    if (!Array.isArray(recommendations) || recommendations.length === 0) return [];
    const errors = [];
    recommendations.forEach((rec, i) => {
        if (!rec.title || !rec.title.en || !rec.title.en.trim()) {
            errors.push(`Recommendation ${i + 1} title`);
        }
        if (Array.isArray(rec.actions)) {
            rec.actions.forEach((action, j) => {
                const en = typeof action === 'object' ? action.en : action;
                if (!en || !String(en).trim()) {
                    errors.push(`Recommendation ${i + 1}, action ${j + 1}`);
                }
            });
        }
    });
    return errors;
}

function isValidIconPath(icon) {
    if (typeof icon !== 'string') return false;
    if (icon === '') return true;
    return /^(assets\/|\/assets\/|https?:\/\/)/.test(icon);
}

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

            // Build an id→row map so generic validation can use each target
                // cancer's OWN demographic budget (matches the admin editor UI).
            const cancerTypesById = {};
            for (const row of cancerTypes) {
                const key = (row.id || '').toLowerCase();
                if (key && key !== 'generic') cancerTypesById[key] = row;
            }

            const cancerTypesWithStats = cancerTypes.map(ct => {
                const assessmentId = (ct.id || '').toLowerCase();
                const typeAssignments = assignments.filter(a =>
                    a.assessmentId && String(a.assessmentId).toLowerCase() === assessmentId
                );
                const totalWeight = typeAssignments.reduce((sum, a) => {
                    return sum + (parseFloat(a.weight) || 0);
                }, 0);

                const quizTarget = getQuizWeightTarget(ct);
                if (assessmentId === 'generic') {
                    const { weightByTarget, targetCount, isValid } = computeGenericWeightValidity(typeAssignments, ct, cancerTypesById);
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
            res.status(500).json({ success: false, error: 'Internal server error' });
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

            res.json({ success: true, data: reordered });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
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
                // Pass the id→row map so each target group is validated against
                // its own cancer's budget (not the dormant generic row's).
                const allCancerTypes = await cancerTypeModel.getAllCancerTypes();
                const cancerTypesById = {};
                for (const row of allCancerTypes) {
                    const key = (row.id || '').toLowerCase();
                    if (key && key !== 'generic') cancerTypesById[key] = row;
                }
                const { weightByTarget, targetCount, isValid } = computeGenericWeightValidity(assignments, cancerType, cancerTypesById);
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
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    /**
     * POST /api/admin/cancer-types
     * Create a new cancer type
     */
    router.post('/cancer-types', async (req, res) => {
        try {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({ success: false, error: 'Cancer type ID is required' });
            }

            const normalizedId = id.toLowerCase().trim();
            const cancerTypeData = extractCancerTypeFields(req.body);

            const missing = validateRequiredEn(cancerTypeData, true);
            if (missing.length > 0) {
                return res.status(400).json({ success: false, error: `Required: ${missing.join(', ')}` });
            }

            if (cancerTypeData.icon && !isValidIconPath(cancerTypeData.icon)) {
                return res.status(400).json({ success: false, error: 'Invalid icon path' });
            }

            const recErrors = validateRecsEn(cancerTypeData.recommendations);
            if (recErrors.length > 0) {
                return res.status(400).json({ success: false, error: `English required for: ${recErrors.join(', ')}` });
            }

            const cancerType = await cancerTypeModel.createCancerType({
                id: normalizedId,
                ...cancerTypeData
            });


            res.json({ success: true, data: cancerType });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    /**
     * PUT /api/admin/cancer-types/:id
     * Update a cancer type and optionally its questions
     */
    router.put('/cancer-types/:id', async (req, res) => {
        try {
            const cancerTypeData = extractCancerTypeFields(req.body);

            // Generic no longer owns demographic settings — per-cancer scoring
            // reads each specific cancer's own config. Strip those fields on PUT
            // so a stale client payload can't overwrite the dormant DB values.
            if ((req.params.id || '').toLowerCase() === 'generic') {
                delete cancerTypeData.familyWeight;
                delete cancerTypeData.ageRiskThreshold;
                delete cancerTypeData.ageRiskWeight;
                delete cancerTypeData.ethnicityRisk_chinese;
                delete cancerTypeData.ethnicityRisk_malay;
                delete cancerTypeData.ethnicityRisk_indian;
                delete cancerTypeData.ethnicityRisk_caucasian;
                delete cancerTypeData.ethnicityRisk_others;
            }

            const missing = validateRequiredEn(cancerTypeData, false);
            if (missing.length > 0) {
                return res.status(400).json({ success: false, error: `Cannot be empty: ${missing.join(', ')}` });
            }

            if (cancerTypeData.icon && !isValidIconPath(cancerTypeData.icon)) {
                return res.status(400).json({ success: false, error: 'Invalid icon path' });
            }

            if (cancerTypeData.recommendations !== undefined) {
                const recErrors = validateRecsEn(cancerTypeData.recommendations);
                if (recErrors.length > 0) {
                    return res.status(400).json({ success: false, error: `English required for: ${recErrors.join(', ')}` });
                }
            }

            const updatedCancerType = await cancerTypeModel.updateCancerType(req.params.id, cancerTypeData);


            res.json({
                success: true,
                data: updatedCancerType
            });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    /**
     * PATCH /api/admin/cancer-types/:id/visibility
     * Toggle visibility of a cancer type (instant save, no full form submit)
     */
    router.patch('/cancer-types/:id/visibility', async (req, res) => {
        try {
            const { visible } = req.body;
            if (typeof visible !== 'boolean') {
                return res.status(400).json({ success: false, error: 'visible must be a boolean' });
            }
            const updated = await cancerTypeModel.updateCancerType(req.params.id, { visible });

            res.json({ success: true, data: updated });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
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


            res.json({ success: true, message: 'Cancer type and all associated questions deleted' });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    return router;
}
