import pool from '../config/db.js';
export class AssessmentModel {


async createAssessment(assessmentData) {
    try {

        const newAssessment = {
            id: `assessment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...assessmentData
        };

        const result = await pool.query(
            `INSERT INTO assessments (
                id,
                age,
                gender,
                family_history,
                assessment_type,
                risk_score,
                risk_level,
                category_risks,
                questions_answers,
                created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10)
            RETURNING *`,
            [
                newAssessment.id,
                newAssessment.age ?? null,
                newAssessment.gender ?? null,
                newAssessment.familyHistory ?? null,
                newAssessment.assessmentType ?? null,
                newAssessment.riskScore ?? null,
                newAssessment.riskLevel ?? null,
                JSON.stringify(newAssessment.categoryRisks ?? {}),
                JSON.stringify(newAssessment.questionsAnswers ?? []),
                newAssessment.timestamp ?? new Date().toISOString()
            ]
        );


        return this.mapRowToAssessment(result.rows[0]);
    } catch (error) {
        console.error("Assessment insert error:", error);
        throw error;
    }
}





    async getAllAssessments() {
        const result = await pool.query(
            'SELECT * FROM assessments ORDER BY created_at DESC'
        );

        return result.rows.map(row => this.mapRowToAssessment(row));
    }

    async getStatistics({ startDate, endDate } = {}) {
        const params = [];
        const conditions = [];

        if (startDate) {
            params.push(startDate);
            conditions.push(`created_at >= $${params.length}`);
        }
        if (endDate) {
            params.push(endDate);
            conditions.push(`DATE(created_at) <= $${params.length}`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await pool.query(
            `SELECT * FROM assessments ${where} ORDER BY created_at DESC`,
            params
        );
        const assessments = result.rows.map(row => this.mapRowToAssessment(row));

        const totals = {
            count: 0,
            riskScore: 0,
            riskLevels: { LOW: 0, MEDIUM: 0, HIGH: 0 },
        };
        const byCancerTypeMap = {};
        const byAgeMap = {};
        const byGenderMap = {};
        const byFamilyHistoryMap = { true: { count: 0, riskScore: 0, LOW: 0, MEDIUM: 0, HIGH: 0 }, false: { count: 0, riskScore: 0, LOW: 0, MEDIUM: 0, HIGH: 0 } };
        const categoryMap = {};
        const questionMap = {};

        function initGroup() {
            return { count: 0, riskScore: 0, LOW: 0, MEDIUM: 0, HIGH: 0 };
        }
        function roundTwo(n) {
            return Math.round(n * 100) / 100;
        }

        for (const a of assessments) {
            const score = parseFloat(a.riskScore) || 0;
            const rawLevel = (a.riskLevel || '').toUpperCase();
            const level = rawLevel in totals.riskLevels ? rawLevel : 'LOW';
            const type = (a.assessmentType || 'unknown').toLowerCase();
            const age = (a.age !== null && a.age !== undefined && a.age !== '') ? parseInt(a.age) : null;
            const gender = a.gender || 'Unknown';
            const fhKey = String(a.familyHistory) === 'true' ? 'true' : 'false';

            totals.count++;
            totals.riskScore += score;
            totals.riskLevels[level]++;

            if (!byCancerTypeMap[type]) byCancerTypeMap[type] = initGroup();
            byCancerTypeMap[type].count++;
            byCancerTypeMap[type].riskScore += score;
            byCancerTypeMap[type][level]++;

            if (age !== null) {
                if (!byAgeMap[age]) byAgeMap[age] = initGroup();
                byAgeMap[age].count++;
                byAgeMap[age].riskScore += score;
                byAgeMap[age][level]++;
            }

            if (!byGenderMap[gender]) byGenderMap[gender] = initGroup();
            byGenderMap[gender].count++;
            byGenderMap[gender].riskScore += score;
            byGenderMap[gender][level]++;

            byFamilyHistoryMap[fhKey].count++;
            byFamilyHistoryMap[fhKey].riskScore += score;
            byFamilyHistoryMap[fhKey][level]++;

            if (a.categoryRisks && typeof a.categoryRisks === 'object') {
                for (const [cat, contrib] of Object.entries(a.categoryRisks)) {
                    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
                    categoryMap[cat].total += parseFloat(contrib) || 0;
                    categoryMap[cat].count++;
                }
            }

            if (Array.isArray(a.questionsAnswers)) {
                for (const qa of a.questionsAnswers) {
                    const qid = qa.questionId || qa.questionid;
                    if (!qid) continue;
                    if (!questionMap[qid]) {
                        questionMap[qid] = { questionText: qa.questionText || qa.questiontext || '', category: qa.category || '', totalAnswers: 0, yesCount: 0, totalContribution: 0 };
                    }
                    questionMap[qid].totalAnswers++;
                    if ((qa.userAnswer || qa.useranswer) === 'Yes') questionMap[qid].yesCount++;
                    questionMap[qid].totalContribution += parseFloat(qa.riskContribution || qa.riskcontribution) || 0;
                }
            }
        }

        function toGroupStats(g) {
            return { count: g.count, avgRisk: g.count > 0 ? roundTwo(g.riskScore / g.count) : 0, LOW: g.LOW, MEDIUM: g.MEDIUM, HIGH: g.HIGH };
        }

        const byCancerType = Object.entries(byCancerTypeMap)
            .map(([name, g]) => ({ name, ...toGroupStats(g) }))
            .sort((a, b) => b.count - a.count);

        const topCancerType = byCancerType.length > 0 ? { name: byCancerType[0].name, count: byCancerType[0].count } : null;

        const byAge = Object.entries(byAgeMap)
            .map(([age, g]) => ({ age: parseInt(age), ...toGroupStats(g) }))
            .sort((a, b) => a.age - b.age);

        const byGender = Object.entries(byGenderMap)
            .map(([gender, g]) => ({ gender, ...toGroupStats(g) }));

        const byFamilyHistory = [
            { familyHistory: true, ...toGroupStats(byFamilyHistoryMap['true']) },
            { familyHistory: false, ...toGroupStats(byFamilyHistoryMap['false']) },
        ];

        const categoryRisks = Object.entries(categoryMap)
            .map(([category, s]) => ({ category, avgContribution: s.count > 0 ? roundTwo(s.total / s.count) : 0 }))
            .sort((a, b) => b.avgContribution - a.avgContribution);

        const topQuestions = Object.entries(questionMap)
            .map(([questionId, s]) => ({
                questionId,
                questionText: s.questionText,
                category: s.category,
                yesRate: s.totalAnswers > 0 ? roundTwo((s.yesCount / s.totalAnswers) * 100) : 0,
                avgContribution: s.totalAnswers > 0 ? roundTwo(s.totalContribution / s.totalAnswers) : 0
            }))
            .sort((a, b) => b.yesRate - a.yesRate)
            .slice(0, 10);

        return {
            total: totals.count,
            riskLevels: totals.riskLevels,
            avgRiskScore: totals.count > 0 ? roundTwo(totals.riskScore / totals.count) : 0,
            topCancerType,
            byCancerType,
            byAge,
            byGender,
            byFamilyHistory,
            categoryRisks,
            topQuestions,
        };
    }

    mapRowToAssessment(row) {
        return {
            id: row.id,
            age: row.age,
            gender: row.gender,
            familyHistory: row.family_history,
            assessmentType: row.assessment_type,
            riskScore: row.risk_score,
            riskLevel: row.risk_level,
            categoryRisks: row.category_risks || {},
            questionsAnswers: row.questions_answers || [],
            timestamp: row.created_at
        };
    }
}