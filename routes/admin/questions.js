import express from 'express';

export function createQuestionsRouter({ questionModel }) {
    const router = express.Router();

    // ==================== QUESTION ENDPOINTS ====================

    /**
     * GET /api/admin/questions
     * Get all questions
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
     * Create multiple questions with duplicate detection
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
                explanation_en, explanation_zh, explanation_ms, explanation_ta
            } = req.body;

            const newEntry = await questionModel.createBankQuestion({
                id,
                prompt_en, prompt_zh, prompt_ms, prompt_ta,
                explanation_en, explanation_zh, explanation_ms, explanation_ta
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
                explanation_en, explanation_zh, explanation_ms, explanation_ta
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

    return router;
}
