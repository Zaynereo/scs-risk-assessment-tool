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
            res.status(500).json({ success: false, error: error.message });
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
            res.status(500).json({ success: false, error: error.message });
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
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
}
