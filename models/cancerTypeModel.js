import pool from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOT_FILE = path.join(__dirname, '..', 'data', 'assessments-snapshot.json');

function mapRow(ct) {
    if (!ct) return null;
    return {
        id: ct.id,
        icon: ct.icon,
        name_en: ct.name_en,
        name_zh: ct.name_zh,
        name_ms: ct.name_ms,
        name_ta: ct.name_ta,
        description_en: ct.description_en,
        description_zh: ct.description_zh,
        description_ms: ct.description_ms,
        description_ta: ct.description_ta,
        familyLabel_en: ct.familylabel_en,
        familyLabel_zh: ct.familylabel_zh,
        familyLabel_ms: ct.familylabel_ms,
        familyLabel_ta: ct.familylabel_ta,
        familyWeight: ct.familyweight,
        genderFilter: ct.genderfilter,
        ageRiskThreshold: ct.ageriskthreshold,
        ageRiskWeight: ct.ageriskweight,
        ethnicityRisk_chinese: ct.ethnicityrisk_chinese,
        ethnicityRisk_malay: ct.ethnicityrisk_malay,
        ethnicityRisk_indian: ct.ethnicityrisk_indian,
        ethnicityRisk_caucasian: ct.ethnicityrisk_caucasian,
        ethnicityRisk_others: ct.ethnicityrisk_others,
        sortOrder: ct.sort_order,
        visible: ct.visible === false || ct.visible === 'false' ? false : true,
        recommendations: ct.recommendations || []
    };
}

export class CancerTypeModel {
    async getAllCancerTypes() {
        const result = await pool.query(
            'SELECT * FROM cancer_types ORDER BY sort_order ASC, id ASC'
        );
        return result.rows.map(mapRow);
    }

    async getCancerTypeById(id) {
        const result = await pool.query(
            'SELECT * FROM cancer_types WHERE id = $1 LIMIT 1',
            [id]
        );
        return mapRow(result.rows[0]) || null;
    }

    async createCancerType(cancerTypeData) {
        // Check for duplicate ID
        const existing = await this.getCancerTypeById(cancerTypeData.id);
        if (existing) {
            throw new Error('Cancer type with this ID already exists');
        }

        const result = await pool.query(
            `INSERT INTO cancer_types (
                id, icon,
                name_en, name_zh, name_ms, name_ta,
                description_en, description_zh, description_ms, description_ta,
                familylabel_en, familylabel_zh, familylabel_ms, familylabel_ta,
                familyweight, genderfilter, ageriskthreshold, ageriskweight,
                ethnicityrisk_chinese, ethnicityrisk_malay, ethnicityrisk_indian,
                ethnicityrisk_caucasian, ethnicityrisk_others,
                sort_order, visible, recommendations
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,
                $19,$20,$21,$22,$23,$24,$25,$26::jsonb
            )
            RETURNING *`,
            [
                cancerTypeData.id,
                cancerTypeData.icon || '',
                cancerTypeData.name_en || '',
                cancerTypeData.name_zh || '',
                cancerTypeData.name_ms || '',
                cancerTypeData.name_ta || '',
                cancerTypeData.description_en || '',
                cancerTypeData.description_zh || '',
                cancerTypeData.description_ms || '',
                cancerTypeData.description_ta || '',
                cancerTypeData.familyLabel_en ?? cancerTypeData.familylabel_en ?? '',
                cancerTypeData.familyLabel_zh ?? cancerTypeData.familylabel_zh ?? '',
                cancerTypeData.familyLabel_ms ?? cancerTypeData.familylabel_ms ?? '',
                cancerTypeData.familyLabel_ta ?? cancerTypeData.familylabel_ta ?? '',
                cancerTypeData.familyWeight ?? cancerTypeData.familyweight ?? 10,
                cancerTypeData.genderFilter ?? cancerTypeData.genderfilter ?? 'all',
                cancerTypeData.ageRiskThreshold ?? cancerTypeData.ageriskthreshold ?? 0,
                cancerTypeData.ageRiskWeight ?? cancerTypeData.ageriskweight ?? 0,
                cancerTypeData.ethnicityRisk_chinese ?? cancerTypeData.ethnicityrisk_chinese ?? 0,
                cancerTypeData.ethnicityRisk_malay ?? cancerTypeData.ethnicityrisk_malay ?? 0,
                cancerTypeData.ethnicityRisk_indian ?? cancerTypeData.ethnicityrisk_indian ?? 0,
                cancerTypeData.ethnicityRisk_caucasian ?? cancerTypeData.ethnicityrisk_caucasian ?? 0,
                cancerTypeData.ethnicityRisk_others ?? cancerTypeData.ethnicityrisk_others ?? 0,
                cancerTypeData.sortOrder ?? cancerTypeData.sort_order ?? 0,
                cancerTypeData.visible !== undefined ? cancerTypeData.visible : false,
                JSON.stringify(cancerTypeData.recommendations || [])
            ]
        );
        return mapRow(result.rows[0]);
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
                ethnicityrisk_others = COALESCE($23, ethnicityrisk_others),
                recommendations = COALESCE($24::jsonb, recommendations),
                visible = COALESCE($25, visible)
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
                updates.familyLabel_en ?? updates.familylabel_en,
                updates.familyLabel_zh ?? updates.familylabel_zh,
                updates.familyLabel_ms ?? updates.familylabel_ms,
                updates.familyLabel_ta ?? updates.familylabel_ta,
                updates.familyWeight ?? updates.familyweight,
                updates.genderFilter ?? updates.genderfilter,
                updates.ageRiskThreshold ?? updates.ageriskthreshold,
                updates.ageRiskWeight ?? updates.ageriskweight,
                updates.ethnicityRisk_chinese ?? updates.ethnicityrisk_chinese,
                updates.ethnicityRisk_malay ?? updates.ethnicityrisk_malay,
                updates.ethnicityRisk_indian ?? updates.ethnicityrisk_indian,
                updates.ethnicityRisk_caucasian ?? updates.ethnicityrisk_caucasian,
                updates.ethnicityRisk_others ?? updates.ethnicityrisk_others,
                updates.recommendations != null ? JSON.stringify(updates.recommendations) : null,
                updates.visible
            ]
        );

        if (!result.rows[0]) throw new Error('Cancer type not found');
        return mapRow(result.rows[0]);
    }

    async deleteCancerType(id) {
        const result = await pool.query(
            'DELETE FROM cancer_types WHERE id = $1 RETURNING *',
            [id]
        );
        if (!result.rows[0]) throw new Error('Cancer type not found');
    }

    async reorderCancerTypes(orderedIds) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (let i = 0; i < orderedIds.length; i++) {
                await client.query(
                    'UPDATE cancer_types SET sort_order = $1 WHERE id = $2',
                    [i, orderedIds[i]]
                );
            }
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        const result = await pool.query(
            'SELECT * FROM cancer_types ORDER BY sort_order ASC, id ASC'
        );
        return result.rows.map(mapRow);
    }

    async getAssessmentConfig(id) {
        const ct = await this.getCancerTypeById(id);
        if (!ct) return null;

        return {
            familyWeight: parseFloat(ct.familyWeight) || 10,
            ageRiskThreshold: parseInt(ct.ageRiskThreshold) || 0,
            ageRiskWeight: parseFloat(ct.ageRiskWeight) || 0,
            ethnicityRisk: {
                chinese: parseFloat(ct.ethnicityRisk_chinese) || 0,
                malay: parseFloat(ct.ethnicityRisk_malay) || 0,
                indian: parseFloat(ct.ethnicityRisk_indian) || 0,
                caucasian: parseFloat(ct.ethnicityRisk_caucasian) || 0,
                others: parseFloat(ct.ethnicityRisk_others) || 0
            },
            recommendations: ct.recommendations || []
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
            familyLabel: ct[`familyLabel_${lang}`] || ct.familyLabel_en,
            familyWeight: parseFloat(ct.familyWeight) || 10,
            genderFilter: ct.genderFilter || 'all',
            ageRiskThreshold: parseInt(ct.ageRiskThreshold) || 0,
            ageRiskWeight: parseFloat(ct.ageRiskWeight) || 0,
            ethnicityRisk: {
                chinese: parseFloat(ct.ethnicityRisk_chinese) || 0,
                malay: parseFloat(ct.ethnicityRisk_malay) || 0,
                indian: parseFloat(ct.ethnicityRisk_indian) || 0,
                caucasian: parseFloat(ct.ethnicityRisk_caucasian) || 0,
                others: parseFloat(ct.ethnicityRisk_others) || 0
            },
            visible: ct.visible
        };
    }

    async getAllCancerTypesLocalized(lang = 'en') {
        const rows = await this.getAllCancerTypes();
        return rows.map(ct => ({
            id: ct.id,
            icon: ct.icon,
            name: ct[`name_${lang}`] || ct.name_en,
            description: ct[`description_${lang}`] || ct.description_en,
            familyLabel: ct[`familyLabel_${lang}`] || ct.familyLabel_en,
            familyWeight: parseFloat(ct.familyWeight) || 10,
            genderFilter: ct.genderFilter || 'all',
            ageRiskThreshold: parseInt(ct.ageRiskThreshold) || 0,
            ageRiskWeight: parseFloat(ct.ageRiskWeight) || 0,
            ethnicityRisk: {
                chinese: parseFloat(ct.ethnicityRisk_chinese) || 0,
                malay: parseFloat(ct.ethnicityRisk_malay) || 0,
                indian: parseFloat(ct.ethnicityRisk_indian) || 0,
                caucasian: parseFloat(ct.ethnicityRisk_caucasian) || 0,
                others: parseFloat(ct.ethnicityRisk_others) || 0
            },
            visible: ct.visible
        }));
    }

    async writeAssessmentsSnapshot() {
        const allData = await this.getAllCancerTypesLocalized('en');
        const data = allData.filter(ct => ct.visible !== false);
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
