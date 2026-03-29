import express from 'express';

export function createQuestionsRouter({ questionModel }) {
    const router = express.Router();

    // ==================== QUESTION BANK ENDPOINTS ====================

    /**
     * GET /api/admin/question-bank
     * Get a logical view of the Question Bank with sources
     */
    router.get('/question-bank', async (req, res) => {
        try {
            const bankView = await questionModel.getQuestionBankView();
            res.json({ success: true, data: bankView });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    /**
     * POST /api/admin/question-bank
     * Create a new Question Bank entry
     */
    router.post('/question-bank', async (req, res) => {
        try {
            const {
                id,
                prompt_en, prompt_zh, prompt_ms, prompt_ta,
                explanationYes_en, explanationYes_zh, explanationYes_ms, explanationYes_ta,
                explanationNo_en, explanationNo_zh, explanationNo_ms, explanationNo_ta
            } = req.body;

            const newEntry = await questionModel.createBankQuestion({
                id,
                prompt_en, prompt_zh, prompt_ms, prompt_ta,
                explanationYes_en, explanationYes_zh, explanationYes_ms, explanationYes_ta,
                explanationNo_en, explanationNo_zh, explanationNo_ms, explanationNo_ta
            });

            res.json({ success: true, data: newEntry });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    /**
     * GET /api/admin/question-bank/export
     * Export all questions and assignments as a JSON backup.
     * NOTE: Must be defined BEFORE /question-bank/:id to avoid matching "export" as :id
     */
    router.get('/question-bank/export', async (req, res) => {
        try {
            const [questions, assignments] = await Promise.all([
                questionModel.loadQuestionBank(),
                questionModel.loadAssignments()
            ]);

            const date = new Date().toISOString().slice(0, 10);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="question-bank-backup-${date}.json"`);
            res.send(JSON.stringify({ exportedAt: new Date().toISOString(), questions, assignments }, null, 2));
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    /**
     * PUT /api/admin/question-bank/:id
     * Update prompts/explanations for a Question Bank entry
     */
    router.put('/question-bank/:id', async (req, res) => {
        try {
            const {
                prompt_en, prompt_zh, prompt_ms, prompt_ta,
                explanationYes_en, explanationYes_zh, explanationYes_ms, explanationYes_ta,
                explanationNo_en, explanationNo_zh, explanationNo_ms, explanationNo_ta
            } = req.body;

            const updates = {
                ...(prompt_en !== undefined ? { prompt_en } : {}),
                ...(prompt_zh !== undefined ? { prompt_zh } : {}),
                ...(prompt_ms !== undefined ? { prompt_ms } : {}),
                ...(prompt_ta !== undefined ? { prompt_ta } : {}),
                ...(explanationYes_en !== undefined ? { explanationYes_en } : {}),
                ...(explanationYes_zh !== undefined ? { explanationYes_zh } : {}),
                ...(explanationYes_ms !== undefined ? { explanationYes_ms } : {}),
                ...(explanationYes_ta !== undefined ? { explanationYes_ta } : {}),
                ...(explanationNo_en !== undefined ? { explanationNo_en } : {}),
                ...(explanationNo_zh !== undefined ? { explanationNo_zh } : {}),
                ...(explanationNo_ms !== undefined ? { explanationNo_ms } : {}),
                ...(explanationNo_ta !== undefined ? { explanationNo_ta } : {})
            };

            const updated = await questionModel.updateBankQuestion(req.params.id, updates);
            res.json({ success: true, data: updated });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    /**
     * DELETE /api/admin/question-bank/:id
     * Delete a Question Bank entry (only if it has no assignments)
     */
    router.delete('/question-bank/:id', async (req, res) => {
        try {
            const questionId = req.params.id;

            // Check for active assignments — prevent orphaned references
            const assignments = await questionModel.getAssignmentsForQuestion(questionId);
            if (assignments.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Cannot delete question that has active assignments. Remove all assignments first.'
                });
            }

            await questionModel.deleteBankQuestion(questionId);
            res.json({ success: true, message: 'Question deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    return router;
}
