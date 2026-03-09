import pool from '../config/db.js';

function mapAssignment(row) {
    if (!row) return null;
    return {
        id: row.id,
        questionId: row.questionid,
        assessmentId: row.assessmentid,
        targetCancerType: row.targetcancertype,
        weight: row.weight,
        yesValue: row.yesvalue,
        noValue: row.novalue,
        category: row.category,
        minAge: row.minage
    };
}

function mapBankQuestion(row) {
    if (!row) return null;
    return {
        id: row.id,
        prompt_en: row.prompt_en,
        prompt_zh: row.prompt_zh,
        prompt_ms: row.prompt_ms,
        prompt_ta: row.prompt_ta,
        explanationYes_en: row.explanationyes_en,
        explanationYes_zh: row.explanationyes_zh,
        explanationYes_ms: row.explanationyes_ms,
        explanationYes_ta: row.explanationyes_ta,
        explanationNo_en: row.explanationno_en,
        explanationNo_zh: row.explanationno_zh,
        explanationNo_ms: row.explanationno_ms,
        explanationNo_ta: row.explanationno_ta
    };
}

export class QuestionModel {
    constructor() {}

    async loadAssignments() {
        const result = await pool.query(
            'SELECT * FROM question_assignments ORDER BY id ASC'
        );
        return result.rows.map(mapAssignment);
    }

    async replaceAssignmentsForAssessment(assessmentId, assignments) {
        const normalizedId = String(assessmentId).toLowerCase();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                'DELETE FROM question_assignments WHERE lower(assessmentid) = lower($1)',
                [normalizedId]
            );

            for (const a of assignments) {
                await client.query(
                    `INSERT INTO question_assignments (
                        questionid, assessmentid, targetcancertype,
                        weight, yesvalue, novalue, category, minage
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                    [
                        a.questionId ?? a.questionid,
                        a.assessmentId ?? a.assessmentid ?? normalizedId,
                        a.targetCancerType ?? a.targetcancertype,
                        a.weight ?? null,
                        a.yesValue ?? a.yesvalue ?? null,
                        a.noValue ?? a.novalue ?? null,
                        a.category ?? '',
                        a.minAge ?? a.minage ?? null
                    ]
                );
            }

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async loadQuestionBank() {
        const result = await pool.query(
            'SELECT * FROM questions ORDER BY id ASC'
        );
        return result.rows.map(mapBankQuestion);
    }

    async saveQuestionBank(bankEntries) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM questions');

            for (const q of bankEntries) {
                await client.query(
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
                        q.explanationYes_en ?? q.explanationyes_en ?? '',
                        q.explanationYes_zh ?? q.explanationyes_zh ?? '',
                        q.explanationYes_ms ?? q.explanationyes_ms ?? '',
                        q.explanationYes_ta ?? q.explanationyes_ta ?? '',
                        q.explanationNo_en ?? q.explanationno_en ?? '',
                        q.explanationNo_zh ?? q.explanationno_zh ?? '',
                        q.explanationNo_ms ?? q.explanationno_ms ?? '',
                        q.explanationNo_ta ?? q.explanationno_ta ?? ''
                    ]
                );
            }

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async getAssignmentsForAssessment(assessmentId, userAge = null) {
        if (!assessmentId) return [];

        const params = [String(assessmentId).toLowerCase()];
        let sql = `
            SELECT * FROM question_assignments
            WHERE lower(assessmentid) = $1
        `;

        if (userAge !== null) {
            sql += ` AND (minage IS NULL OR minage <= $2)`;
            params.push(userAge);
        }

        const result = await pool.query(sql, params);
        return result.rows.map(mapAssignment);
    }

    async getQuestionsForAssessment(assessmentId, lang = 'en', userAge = null) {
        if (!assessmentId) return [];

        const assignments = await this.getAssignmentsForAssessment(assessmentId, userAge);
        if (assignments.length === 0) return [];

        const bankEntries = await this.loadQuestionBank();
        const bankById = new Map(bankEntries.map(q => [q.id, q]));

        return assignments.map(assign => {
            const bank = bankById.get(assign.questionId) || {};

            const prompt = bank[`prompt_${lang}`] || bank.prompt_en || '';
            const explanationYes = bank[`explanationYes_${lang}`] || bank.explanationYes_en || '';
            const explanationNo = bank[`explanationNo_${lang}`] || bank.explanationNo_en || '';

            return {
                id: assign.questionId,
                prompt,
                weight: assign.weight,
                yesValue: assign.yesValue,
                noValue: assign.noValue,
                category: assign.category,
                explanationYes,
                explanationNo,
                cancerType: assign.targetCancerType,
                targetCancerType: assign.targetCancerType,
                minAge: assign.minAge
            };
        });
    }

    async getAssignmentsForQuestion(questionId) {
        const result = await pool.query(
            'SELECT * FROM question_assignments WHERE questionid = $1',
            [questionId]
        );
        return result.rows.map(mapAssignment);
    }

    async deleteBankQuestion(id) {
        const result = await pool.query(
            'DELETE FROM questions WHERE id = $1 RETURNING *',
            [id]
        );
        if (!result.rows[0]) throw new Error('Question Bank entry not found');
        return mapBankQuestion(result.rows[0]);
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
            if (!a.questionId) return;

            if (!bankMap.has(a.questionId)) {
                bankMap.set(a.questionId, {
                    id: a.questionId,
                    prompt_en: '',
                    prompt_zh: '',
                    prompt_ms: '',
                    prompt_ta: '',
                    explanationYes_en: '',
                    explanationYes_zh: '',
                    explanationYes_ms: '',
                    explanationYes_ta: '',
                    explanationNo_en: '',
                    explanationNo_zh: '',
                    explanationNo_ms: '',
                    explanationNo_ta: '',
                    sources: []
                });
            }

            const entry = bankMap.get(a.questionId);
            entry.sources.push({
                type: a.assessmentId === 'generic' ? 'generic' : 'specific',
                cancerType: a.targetCancerType || a.assessmentId || '',
                category: a.category || ''
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
                data.explanationYes_en ?? data.explanationyes_en ?? '',
                data.explanationYes_zh ?? data.explanationyes_zh ?? '',
                data.explanationYes_ms ?? data.explanationyes_ms ?? '',
                data.explanationYes_ta ?? data.explanationyes_ta ?? '',
                data.explanationNo_en ?? data.explanationno_en ?? '',
                data.explanationNo_zh ?? data.explanationno_zh ?? '',
                data.explanationNo_ms ?? data.explanationno_ms ?? '',
                data.explanationNo_ta ?? data.explanationno_ta ?? ''
            ]
        );

        return mapBankQuestion(result.rows[0]);
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
                updates.explanationYes_en ?? updates.explanationyes_en,
                updates.explanationYes_zh ?? updates.explanationyes_zh,
                updates.explanationYes_ms ?? updates.explanationyes_ms,
                updates.explanationYes_ta ?? updates.explanationyes_ta,
                updates.explanationNo_en ?? updates.explanationno_en,
                updates.explanationNo_zh ?? updates.explanationno_zh,
                updates.explanationNo_ms ?? updates.explanationno_ms,
                updates.explanationNo_ta ?? updates.explanationno_ta
            ]
        );

        if (!result.rows[0]) throw new Error('Question Bank entry not found');
        return mapBankQuestion(result.rows[0]);
    }
}
