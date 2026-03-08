import pool from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOT_FILE = path.join(__dirname, '..', 'data', 'assessments-snapshot.json');

export class CancerTypeModel {
    constructor() {
        this.cancerTypes = [];
    }

    async getAllCancerTypes() {
        const result = await pool.query(
            'SELECT * FROM cancer_types ORDER BY id ASC'
        );
        return result.rows;
    }

    async getCancerTypeById(id) {
        const result = await pool.query(
            'SELECT * FROM cancer_types WHERE id = $1 LIMIT 1',
            [id]
        );
        return result.rows[0] || null;
    }

    async createCancerType(cancerTypeData) {
        const result = await pool.query(
            `INSERT INTO cancer_types (
                id, icon,
                name_en, name_zh, name_ms, name_ta,
                description_en, description_zh, description_ms, description_ta,
                familylabel_en, familylabel_zh, familylabel_ms, familylabel_ta,
                familyweight, genderfilter, ageriskthreshold, ageriskweight,
                ethnicityrisk_chinese, ethnicityrisk_malay, ethnicityrisk_indian,
                ethnicityrisk_caucasian, ethnicityrisk_others
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,
                $19,$20,$21,$22,$23
            )
            RETURNING *`,
            [
                cancerTypeData.id,
                cancerTypeData.icon || '🏥',
                cancerTypeData.name_en || '',
                cancerTypeData.name_zh || '',
                cancerTypeData.name_ms || '',
                cancerTypeData.name_ta || '',
                cancerTypeData.description_en || '',
                cancerTypeData.description_zh || '',
                cancerTypeData.description_ms || '',
                cancerTypeData.description_ta || '',
                cancerTypeData.familylabel_en || cancerTypeData.familyLabel_en || '',
                cancerTypeData.familylabel_zh || cancerTypeData.familyLabel_zh || '',
                cancerTypeData.familylabel_ms || cancerTypeData.familyLabel_ms || '',
                cancerTypeData.familylabel_ta || cancerTypeData.familyLabel_ta || '',
                cancerTypeData.familyweight || cancerTypeData.familyWeight || 10,
                cancerTypeData.genderfilter || cancerTypeData.genderFilter || 'all',
                cancerTypeData.ageriskthreshold || cancerTypeData.ageRiskThreshold || 0,
                cancerTypeData.ageriskweight || cancerTypeData.ageRiskWeight || 0,
                cancerTypeData.ethnicityrisk_chinese || cancerTypeData.ethnicityRisk_chinese || 0,
                cancerTypeData.ethnicityrisk_malay || cancerTypeData.ethnicityRisk_malay || 0,
                cancerTypeData.ethnicityrisk_indian || cancerTypeData.ethnicityRisk_indian || 0,
                cancerTypeData.ethnicityrisk_caucasian || cancerTypeData.ethnicityRisk_caucasian || 0,
                cancerTypeData.ethnicityrisk_others || cancerTypeData.ethnicityRisk_others || 0
            ]
        );
        return result.rows[0];
    }

    async updateCancerType(id, updates) {
        const result = await pool.query(
            `UPDATE cancer_types SET
                icon = COALESCE($2, icon),
                name_en = COALESCE($3, name_en),
                name_zh = COALESCE($4, name_zh),
                name_ms = COALESCE($5, name_ms),
                name_ta = COALESCE($6, name_ta),
                description_en = COALESCE($7, description_en),
                description_zh = COALESCE($8, description_zh),
                description_ms = COALESCE($9, description_ms),
                description_ta = COALESCE($10, description_ta),
                familylabel_en = COALESCE($11, familylabel_en),
                familylabel_zh = COALESCE($12, familylabel_zh),
                familylabel_ms = COALESCE($13, familylabel_ms),
                familylabel_ta = COALESCE($14, familylabel_ta),
                familyweight = COALESCE($15, familyweight),
                genderfilter = COALESCE($16, genderfilter),
                ageriskthreshold = COALESCE($17, ageriskthreshold),
                ageriskweight = COALESCE($18, ageriskweight),
                ethnicityrisk_chinese = COALESCE($19, ethnicityrisk_chinese),
                ethnicityrisk_malay = COALESCE($20, ethnicityrisk_malay),
                ethnicityrisk_indian = COALESCE($21, ethnicityrisk_indian),
                ethnicityrisk_caucasian = COALESCE($22, ethnicityrisk_caucasian),
                ethnicityrisk_others = COALESCE($23, ethnicityrisk_others)
             WHERE id = $1
             RETURNING *`,
            [
                id,
                updates.icon,
                updates.name_en,
                updates.name_zh,
                updates.name_ms,
                updates.name_ta,
                updates.description_en,
                updates.description_zh,
                updates.description_ms,
                updates.description_ta,
                updates.familylabel_en ?? updates.familyLabel_en,
                updates.familylabel_zh ?? updates.familyLabel_zh,
                updates.familylabel_ms ?? updates.familyLabel_ms,
                updates.familylabel_ta ?? updates.familyLabel_ta,
                updates.familyweight ?? updates.familyWeight,
                updates.genderfilter ?? updates.genderFilter,
                updates.ageriskthreshold ?? updates.ageRiskThreshold,
                updates.ageriskweight ?? updates.ageRiskWeight,
                updates.ethnicityrisk_chinese ?? updates.ethnicityRisk_chinese,
                updates.ethnicityrisk_malay ?? updates.ethnicityRisk_malay,
                updates.ethnicityrisk_indian ?? updates.ethnicityRisk_indian,
                updates.ethnicityrisk_caucasian ?? updates.ethnicityRisk_caucasian,
                updates.ethnicityrisk_others ?? updates.ethnicityRisk_others
            ]
        );

        if (!result.rows[0]) throw new Error('Cancer type not found');
        return result.rows[0];
    }

    async deleteCancerType(id) {
        const result = await pool.query(
            'DELETE FROM cancer_types WHERE id = $1 RETURNING *',
            [id]
        );
        if (!result.rows[0]) throw new Error('Cancer type not found');
    }

    async reorderCancerTypes(orderedIds) {
        const result = await pool.query(
            'SELECT * FROM cancer_types WHERE id = ANY($1)',
            [orderedIds]
        );
        return result.rows;
    }

    async getAssessmentConfig(id) {
        const ct = await this.getCancerTypeById(id);
        if (!ct) return null;

        return {
            familyWeight: parseFloat(ct.familyweight) || 10,
            ageRiskThreshold: parseInt(ct.ageriskthreshold) || 0,
            ageRiskWeight: parseFloat(ct.ageriskweight) || 0,
            ethnicityRisk: {
                chinese: parseFloat(ct.ethnicityrisk_chinese) || 0,
                malay: parseFloat(ct.ethnicityrisk_malay) || 0,
                indian: parseFloat(ct.ethnicityrisk_indian) || 0,
                caucasian: parseFloat(ct.ethnicityrisk_caucasian) || 0,
                others: parseFloat(ct.ethnicityrisk_others) || 0
            }
        };
    }

    async getCancerTypeLocalized(id, lang = 'en') {
        const ct = await this.getCancerTypeById(id);
        if (!ct) return null;

        return {
            id: ct.id,
            icon: ct.icon,
            name: ct[`name_${lang}`] || ct.name_en,
            description: ct[`description_${lang}`] || ct.description_en,
            familyLabel: ct[`familylabel_${lang}`] || ct.familylabel_en,
            familyWeight: parseFloat(ct.familyweight) || 10,
            genderFilter: ct.genderfilter || 'all',
            ageRiskThreshold: parseInt(ct.ageriskthreshold) || 0,
            ageRiskWeight: parseFloat(ct.ageriskweight) || 0,
            ethnicityRisk: {
                chinese: parseFloat(ct.ethnicityrisk_chinese) || 0,
                malay: parseFloat(ct.ethnicityrisk_malay) || 0,
                indian: parseFloat(ct.ethnicityrisk_indian) || 0,
                caucasian: parseFloat(ct.ethnicityrisk_caucasian) || 0,
                others: parseFloat(ct.ethnicityrisk_others) || 0
            }
        };
    }

    async getAllCancerTypesLocalized(lang = 'en') {
        const rows = await this.getAllCancerTypes();
        return rows.map(ct => ({
            id: ct.id,
            icon: ct.icon,
            name: ct[`name_${lang}`] || ct.name_en,
            description: ct[`description_${lang}`] || ct.description_en,
            familyLabel: ct[`familylabel_${lang}`] || ct.familylabel_en,
            familyWeight: parseFloat(ct.familyweight) || 10,
            genderFilter: ct.genderfilter || 'all',
            ageRiskThreshold: parseInt(ct.ageriskthreshold) || 0,
            ageRiskWeight: parseFloat(ct.ageriskweight) || 0,
            ethnicityRisk: {
                chinese: parseFloat(ct.ethnicityrisk_chinese) || 0,
                malay: parseFloat(ct.ethnicityrisk_malay) || 0,
                indian: parseFloat(ct.ethnicityrisk_indian) || 0,
                caucasian: parseFloat(ct.ethnicityrisk_caucasian) || 0,
                others: parseFloat(ct.ethnicityrisk_others) || 0
            }
        }));
    }

    async writeAssessmentsSnapshot() {
        const data = await this.getAllCancerTypesLocalized('en');
        await fs.writeFile(SNAPSHOT_FILE, JSON.stringify({ success: true, data }, null, 2));
    }

    async ensureSnapshot() {
        try {
            await fs.access(SNAPSHOT_FILE);
        } catch {
            await this.writeAssessmentsSnapshot();
        }
    }
}