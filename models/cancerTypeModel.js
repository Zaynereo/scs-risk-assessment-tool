import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { escapeCSVField, parseCSVLine } from '../utils/csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'cancer_types.csv');
const SNAPSHOT_FILE = path.join(__dirname, '..', 'data', 'assessments-snapshot.json');

/**
 * Cancer Type Model (MVC Pattern)
 * Handles all cancer type configuration data operations
 * Uses CSV format for consistency with questions data
 * 
 * Schema:
 * - id: Unique identifier (e.g., "colorectal", "breast")
 * - icon: Card image URL (http/https/, relative path, or data URI) or legacy emoji
 * - name_en/zh/ms/ta: Display name in each language
 * - description_en/zh/ms/ta: Card description in each language
 * - familyLabel_en/zh/ms/ta: Family history question label in each language
 * - familyWeight: Risk weight for family history
 * - genderFilter: "all", "male", or "female" - controls who sees this assessment
 * - ageRiskThreshold: Age at which additional risk applies
 * - ageRiskWeight: Risk weight % added if user is >= threshold age
 * - ethnicityRisk_*: Risk weight % for each ethnicity (0 = no extra risk)
 */
export class CancerTypeModel {
    constructor() {
        this.cancerTypes = [];
        this.loadCancerTypes();
    }

    async loadCancerTypes() {
        try {
            const data = await fs.readFile(DATA_FILE, 'utf-8');
            this.cancerTypes = this.parseCSV(data);
        } catch (error) {
            // If file doesn't exist, initialize with empty array
            this.cancerTypes = [];
            await this.saveCancerTypes();
        }
    }

    async saveCancerTypes() {
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
        const csvContent = this.cancerTypesToCSV();
        await fs.writeFile(DATA_FILE, csvContent);
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length <= 1) return [];

        const rawHeaders = parseCSVLine(lines[0]);
        const normalizeHeader = (h) => String(h || '')
            .replace(/^\uFEFF/, '')
            .trim();

        const headers = rawHeaders.map(normalizeHeader);
        const cancerTypes = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = parseCSVLine(lines[i]);
            if (values.length >= headers.length) {
                const cancerType = {};
                headers.forEach((header, index) => {
                    cancerType[header] = values[index] ?? '';
                });
                cancerTypes.push(cancerType);
            }
        }

        return cancerTypes;
    }

    cancerTypesToCSV() {
        const headers = [
            'id', 'icon',
            'name_en', 'name_zh', 'name_ms', 'name_ta',
            'description_en', 'description_zh', 'description_ms', 'description_ta',
            'familyLabel_en', 'familyLabel_zh', 'familyLabel_ms', 'familyLabel_ta',
            'familyWeight', 'genderFilter', 'ageRiskThreshold', 'ageRiskWeight',
            'ethnicityRisk_chinese', 'ethnicityRisk_malay', 'ethnicityRisk_indian',
            'ethnicityRisk_caucasian', 'ethnicityRisk_others'
        ];

        if (this.cancerTypes.length === 0) {
            return headers.join(',') + '\n';
        }

        const csvLines = [headers.join(',')];

        this.cancerTypes.forEach(cancerType => {
            const values = headers.map(header => {
                let value = cancerType[header] || '';
                return escapeCSVField(value);
            });
            csvLines.push(values.join(','));
        });

        return csvLines.join('\n') + '\n';
    }

    async getAllCancerTypes() {
        await this.loadCancerTypes();
        return [...this.cancerTypes];
    }

    async getCancerTypeById(id) {
        await this.loadCancerTypes();
        return this.cancerTypes.find(ct => ct.id === id);
    }

    async createCancerType(cancerTypeData) {
        await this.loadCancerTypes();

        // Check if ID already exists
        if (this.cancerTypes.find(ct => ct.id === cancerTypeData.id)) {
            throw new Error('Cancer type with this ID already exists');
        }

        const newCancerType = {
            id: cancerTypeData.id,
            icon: cancerTypeData.icon || '🏥',
            name_en: cancerTypeData.name_en || '',
            name_zh: cancerTypeData.name_zh || '',
            name_ms: cancerTypeData.name_ms || '',
            name_ta: cancerTypeData.name_ta || '',
            description_en: cancerTypeData.description_en || '',
            description_zh: cancerTypeData.description_zh || '',
            description_ms: cancerTypeData.description_ms || '',
            description_ta: cancerTypeData.description_ta || '',
            familyLabel_en: cancerTypeData.familyLabel_en || '',
            familyLabel_zh: cancerTypeData.familyLabel_zh || '',
            familyLabel_ms: cancerTypeData.familyLabel_ms || '',
            familyLabel_ta: cancerTypeData.familyLabel_ta || '',
            familyWeight: cancerTypeData.familyWeight || '10',
            genderFilter: cancerTypeData.genderFilter || 'all',
            ageRiskThreshold: cancerTypeData.ageRiskThreshold || '0',
            ageRiskWeight: cancerTypeData.ageRiskWeight || '0',
            ethnicityRisk_chinese: cancerTypeData.ethnicityRisk_chinese || '0',
            ethnicityRisk_malay: cancerTypeData.ethnicityRisk_malay || '0',
            ethnicityRisk_indian: cancerTypeData.ethnicityRisk_indian || '0',
            ethnicityRisk_caucasian: cancerTypeData.ethnicityRisk_caucasian || '0',
            ethnicityRisk_others: cancerTypeData.ethnicityRisk_others || '0'
        };

        this.cancerTypes.push(newCancerType);
        await this.saveCancerTypes();
        return newCancerType;
    }

    async updateCancerType(id, updates) {
        await this.loadCancerTypes();
        const index = this.cancerTypes.findIndex(ct => ct.id === id);
        if (index === -1) throw new Error('Cancer type not found');

        // Don't allow changing the ID
        const { id: _, ...updateData } = updates;
        this.cancerTypes[index] = { ...this.cancerTypes[index], ...updateData };
        await this.saveCancerTypes();
        return this.cancerTypes[index];
    }

    async deleteCancerType(id) {
        await this.loadCancerTypes();
        const initialLength = this.cancerTypes.length;
        this.cancerTypes = this.cancerTypes.filter(ct => ct.id !== id);

        if (this.cancerTypes.length === initialLength) {
            throw new Error('Cancer type not found');
        }

        await this.saveCancerTypes();
    }

    async reorderCancerTypes(orderedIds) {
        await this.loadCancerTypes();
        const byId = new Map(this.cancerTypes.map(ct => [ct.id, ct]));

        // Validate all IDs exist
        for (const id of orderedIds) {
            if (!byId.has(id)) throw new Error(`Cancer type "${id}" not found`);
        }

        // Build reordered list; append any IDs not in orderedIds at the end
        const reordered = orderedIds.map(id => byId.get(id));
        for (const ct of this.cancerTypes) {
            if (!orderedIds.includes(ct.id)) reordered.push(ct);
        }

        this.cancerTypes = reordered;
        await this.saveCancerTypes();
        return this.cancerTypes;
    }

    /**
     * Get assessment config for risk calculation (used by assessment submission route)
     */
    async getAssessmentConfig(id) {
        const cancerType = await this.getCancerTypeById(id);
        if (!cancerType) return null;
        return {
            familyWeight: parseFloat(cancerType.familyWeight) || 10,
            ageRiskThreshold: parseInt(cancerType.ageRiskThreshold) || 0,
            ageRiskWeight: parseFloat(cancerType.ageRiskWeight) || 0,
            ethnicityRisk: {
                chinese: parseFloat(cancerType.ethnicityRisk_chinese) || 0,
                malay: parseFloat(cancerType.ethnicityRisk_malay) || 0,
                indian: parseFloat(cancerType.ethnicityRisk_indian) || 0,
                caucasian: parseFloat(cancerType.ethnicityRisk_caucasian) || 0,
                others: parseFloat(cancerType.ethnicityRisk_others) || 0
            }
        };
    }

    /**
     * Get cancer type with localized fields for a specific language
     */
    async getCancerTypeLocalized(id, lang = 'en') {
        const cancerType = await this.getCancerTypeById(id);
        if (!cancerType) return null;

        return {
            id: cancerType.id,
            icon: cancerType.icon,
            name: cancerType[`name_${lang}`] || cancerType.name_en,
            description: cancerType[`description_${lang}`] || cancerType.description_en,
            familyLabel: cancerType[`familyLabel_${lang}`] || cancerType.familyLabel_en,
            familyWeight: parseFloat(cancerType.familyWeight) || 10,
            genderFilter: cancerType.genderFilter || 'all',
            ageRiskThreshold: parseInt(cancerType.ageRiskThreshold) || 0,
            ageRiskWeight: parseFloat(cancerType.ageRiskWeight) || 0,
            ethnicityRisk: {
                chinese: parseFloat(cancerType.ethnicityRisk_chinese) || 0,
                malay: parseFloat(cancerType.ethnicityRisk_malay) || 0,
                indian: parseFloat(cancerType.ethnicityRisk_indian) || 0,
                caucasian: parseFloat(cancerType.ethnicityRisk_caucasian) || 0,
                others: parseFloat(cancerType.ethnicityRisk_others) || 0
            }
        };
    }

    /**
     * Get all cancer types with localized fields for a specific language
     */
    async getAllCancerTypesLocalized(lang = 'en') {
        await this.loadCancerTypes();
        return this.cancerTypes.map(ct => ({
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
            }
        }));
    }

    /**
     * Write a snapshot of all cancer types (localized for 'en') to a JSON file.
     * Used as a frontend fallback when the API is unavailable.
     */
    async writeAssessmentsSnapshot() {
        const data = await this.getAllCancerTypesLocalized('en');
        await fs.writeFile(SNAPSHOT_FILE, JSON.stringify({ success: true, data }, null, 2));
    }

    /**
     * Generate the snapshot file if it doesn't exist yet (called on server startup).
     */
    async ensureSnapshot() {
        try {
            await fs.access(SNAPSHOT_FILE);
        } catch {
            await this.writeAssessmentsSnapshot();
        }
    }
}
