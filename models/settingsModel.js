import pool from '../config/db.js';

export class SettingsModel {
    async get(key) {
        const result = await pool.query(
            'SELECT value FROM settings WHERE key = $1',
            [key]
        );
        return result.rows[0]?.value || null;
    }

    async set(key, value) {
        await pool.query(
            `INSERT INTO settings (key, value, updated_at)
             VALUES ($1, $2::jsonb, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
            [key, JSON.stringify(value)]
        );
        return value;
    }

    async getTheme() {
        return await this.get('theme') || {};
    }

    async setTheme(theme) {
        return await this.set('theme', theme);
    }

    async getPdpa() {
        return await this.get('pdpa') || { enabled: false };
    }

    async setPdpa(pdpa) {
        return await this.set('pdpa', pdpa);
    }

    async getTranslations() {
        return await this.get('ui_translations') || {};
    }

    async setTranslations(translations) {
        return await this.set('ui_translations', translations);
    }

    async getRecommendations() {
        return await this.get('recommendations') || {};
    }

    async setRecommendations(recommendations) {
        return await this.set('recommendations', recommendations);
    }
}
