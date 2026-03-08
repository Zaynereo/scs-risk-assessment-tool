import pool from '../config/db.js';

export class QuestionModel {
    constructor() {}

    async loadAssignments() {
        const result = await pool.query(
            'SELECT * FROM question_assignments ORDER BY id ASC'
        );
        return result.rows;
    }

    async saveAssignments(assignments) {
        await pool.query('DELETE FROM question_assignments');

        for (const a of assignments) {
            await pool.query(
                `INSERT INTO question_assignments (
                    questionid, assessmentid, targetcancertype,
                    weight, yesvalue, novalue, category, minage, isactive
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [
                    a.questionId ?? a.questionid,
                    a.assessmentId ?? a.assessmentid,
                    a.targetCancerType ?? a.targetcancertype,
                    a.weight ?? null,
                    a.yesValue ?? a.yesvalue ?? null,
                    a.noValue ?? a.novalue ?? null,
                    a.category ?? '',
                    a.minAge ?? a.minage ?? null,
                    a.isActive ?? a.isactive ?? true
                ]
            );
        }
    }

    async loadQuestionBank() {
        const result = await pool.query(
            'SELECT * FROM questions ORDER BY id ASC'
        );
        return result.rows;
    }

    async saveQuestionBank(bankEntries) {
        await pool.query('DELETE FROM questions');

        for (const q of bankEntries) {
            await pool.query(
                `INSERT INTO questions (
                    id, prompt_en, prompt_zh, prompt_ms, prompt_ta,
                    explanationyes_en, explanationyes_zh, explanationyes_ms, explanationyes_ta,
                    explanationno_en, explanationno_zh, explanationno_ms, explanationno_ta
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [
                    q.id,
                    q.prompt_en || '',
                    q.prompt_zh || '',
                    q.prompt_ms || '',
                    q.prompt_ta || '',
                    q.explanationyes_en ?? q.explanationYes_en ?? '',
                    q.explanationyes_zh ?? q.explanationYes_zh ?? '',
                    q.explanationyes_ms ?? q.explanationYes_ms ?? '',
                    q.explanationyes_ta ?? q.explanationYes_ta ?? '',
                    q.explanationno_en ?? q.explanationNo_en ?? '',
                    q.explanationno_zh ?? q.explanationNo_zh ?? '',
                    q.explanationno_ms ?? q.explanationNo_ms ?? '',
                    q.explanationno_ta ?? q.explanationNo_ta ?? ''
                ]
            );
        }
    }

    async getAssignmentsForAssessment(assessmentId, userAge = null) {
        if (!assessmentId) return [];

        const params = [String(assessmentId).toLowerCase()];
        let sql = `
            SELECT * FROM question_assignments
            WHERE lower(assessmentid) = $1
              AND coalesce(isactive, true) = true
        `;

        if (userAge !== null) {
            sql += ` AND (minage IS NULL OR minage <= $2)`;
            params.push(userAge);
        }

        const result = await pool.query(sql, params);
        return result.rows;
    }

    async getQuestionsForAssessment(assessmentId, lang = 'en', userAge = null) {
        if (!assessmentId) return [];

        const assignments = await this.getAssignmentsForAssessment(assessmentId, userAge);
        if (assignments.length === 0) return [];

        const bankEntries = await this.loadQuestionBank();
        const bankById = new Map(bankEntries.map(q => [q.id, q]));

        return assignments.map(assign => {
            const bank = bankById.get(assign.questionid) || {};

            const prompt = bank[`prompt_${lang}`] || bank.prompt_en || '';
            const explanationYes = bank[`explanationyes_${lang}`] || bank.explanationyes_en || '';
            const explanationNo = bank[`explanationno_${lang}`] || bank.explanationno_en || '';

            return {
                id: assign.questionid,
                prompt,
                weight: assign.weight,
                yesValue: assign.yesvalue,
                noValue: assign.novalue,
                category: assign.category,
                explanationYes,
                explanationNo,
                cancerType: assign.targetcancertype,
                targetCancerType: assign.targetcancertype,
                minAge: assign.minage
            };
        });
    }

    async deleteAssignmentsByAssessmentId(assessmentId) {
        await pool.query(
            'DELETE FROM question_assignments WHERE lower(assessmentid) = lower($1)',
            [assessmentId]
        );
    }

    async getQuestionBankView() {
        const bankEntries = await this.loadQuestionBank();
        const bankMap = new Map(bankEntries.map(q => [q.id, { ...q, sources: [] }]));

        const assignments = await this.loadAssignments();
        assignments.forEach(a => {
            if (!a.questionid) return;

            if (!bankMap.has(a.questionid)) {
                bankMap.set(a.questionid, {
                    id: a.questionid,
                    prompt_en: '',
                    prompt_zh: '',
                    prompt_ms: '',
                    prompt_ta: '',
                    explanationyes_en: '',
                    explanationyes_zh: '',
                    explanationyes_ms: '',
                    explanationyes_ta: '',
                    explanationno_en: '',
                    explanationno_zh: '',
                    explanationno_ms: '',
                    explanationno_ta: '',
                    sources: []
                });
            }

            const entry = bankMap.get(a.questionid);
            entry.sources.push({
                type: a.assessmentid === 'generic' ? 'generic' : 'specific',
                cancerType: a.targetcancertype || a.assessmentid || ''
            });
        });

        return Array.from(bankMap.values());
    }

    async createBankQuestion(data) {
        const result = await pool.query(
            `INSERT INTO questions (
                id, prompt_en, prompt_zh, prompt_ms, prompt_ta,
                explanationyes_en, explanationyes_zh, explanationyes_ms, explanationyes_ta,
                explanationno_en, explanationno_zh, explanationno_ms, explanationno_ta
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            RETURNING *`,
            [
                data.id,
                data.prompt_en || '',
                data.prompt_zh || '',
                data.prompt_ms || '',
                data.prompt_ta || '',
                data.explanationyes_en ?? data.explanationYes_en ?? '',
                data.explanationyes_zh ?? data.explanationYes_zh ?? '',
                data.explanationyes_ms ?? data.explanationYes_ms ?? '',
                data.explanationyes_ta ?? data.explanationYes_ta ?? '',
                data.explanationno_en ?? data.explanationNo_en ?? '',
                data.explanationno_zh ?? data.explanationNo_zh ?? '',
                data.explanationno_ms ?? data.explanationNo_ms ?? '',
                data.explanationno_ta ?? data.explanationNo_ta ?? ''
            ]
        );

        return result.rows[0];
    }

    async updateBankQuestion(id, updates) {
        const result = await pool.query(
            `UPDATE questions SET
                prompt_en = COALESCE($2, prompt_en),
                prompt_zh = COALESCE($3, prompt_zh),
                prompt_ms = COALESCE($4, prompt_ms),
                prompt_ta = COALESCE($5, prompt_ta),
                explanationyes_en = COALESCE($6, explanationyes_en),
                explanationyes_zh = COALESCE($7, explanationyes_zh),
                explanationyes_ms = COALESCE($8, explanationyes_ms),
                explanationyes_ta = COALESCE($9, explanationyes_ta),
                explanationno_en = COALESCE($10, explanationno_en),
                explanationno_zh = COALESCE($11, explanationno_zh),
                explanationno_ms = COALESCE($12, explanationno_ms),
                explanationno_ta = COALESCE($13, explanationno_ta)
             WHERE id = $1
             RETURNING *`,
            [
                id,
                updates.prompt_en,
                updates.prompt_zh,
                updates.prompt_ms,
                updates.prompt_ta,
                updates.explanationyes_en ?? updates.explanationYes_en,
                updates.explanationyes_zh ?? updates.explanationYes_zh,
                updates.explanationyes_ms ?? updates.explanationYes_ms,
                updates.explanationyes_ta ?? updates.explanationYes_ta,
                updates.explanationno_en ?? updates.explanationNo_en,
                updates.explanationno_zh ?? updates.explanationNo_zh,
                updates.explanationno_ms ?? updates.explanationNo_ms,
                updates.explanationno_ta ?? updates.explanationNo_ta
            ]
        );

        if (!result.rows[0]) throw new Error('Question Bank entry not found');
        return result.rows[0];
    }
}