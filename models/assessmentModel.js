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

    async getStatistics() {
        const assessments = await this.getAllAssessments();

        const total = assessments.length;
        const riskLevels = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        const ages = {};
        const assessmentTypes = {};
        const typeStats = {};

        assessments.forEach((assessment) => {
            const assessmentType = assessment.assessmentType || 'colorectal';

            if (!typeStats[assessmentType]) {
                typeStats[assessmentType] = {
                    count: 0,
                    totalRiskScore: 0,
                    riskLevels: { LOW: 0, MEDIUM: 0, HIGH: 0 },
                    ages: {}
                };
            }

            typeStats[assessmentType].count++;
            typeStats[assessmentType].totalRiskScore += (parseFloat(assessment.riskScore) || 0);

            if (assessment.riskLevel) {
                typeStats[assessmentType].riskLevels[assessment.riskLevel] =
                    (typeStats[assessmentType].riskLevels[assessment.riskLevel] || 0) + 1;
            }

            const age = assessment.age || 'unknown';
            typeStats[assessmentType].ages[age] = (typeStats[assessmentType].ages[age] || 0) + 1;

            if (assessment.riskLevel) {
                riskLevels[assessment.riskLevel] =
                    (riskLevels[assessment.riskLevel] || 0) + 1;
            }

            ages[age] = (ages[age] || 0) + 1;
            assessmentTypes[assessmentType] =
                (assessmentTypes[assessmentType] || 0) + 1;
        });

        const averageRiskScoreByType = {};
        Object.keys(typeStats).forEach(type => {
            const stats = typeStats[type];
            averageRiskScoreByType[type] =
                stats.count > 0
                    ? Math.round((stats.totalRiskScore / stats.count) * 100) / 100
                    : 0;
        });

        const avgRiskScore = total > 0
            ? assessments.reduce((sum, a) => sum + (parseFloat(a.riskScore) || 0), 0) / total
            : 0;

        return {
            total,
            averageRiskScore: Math.round(avgRiskScore * 100) / 100,
            averageRiskScoreByType,
            riskLevelDistribution: riskLevels,
            ageDistribution: ages,
            assessmentTypeDistribution: assessmentTypes,
            typeStats
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