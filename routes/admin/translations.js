import express from 'express';
import fsp from 'fs/promises';

export function createTranslationsRouter({ translationsPath, recommendationsPath }) {
    const router = express.Router();

    const LANGS = ['en', 'zh', 'ms', 'ta'];
    const str = (v) => (typeof v === 'string' ? v : '');
    const langObj = (obj) => {
        if (!obj || typeof obj !== 'object') return { en: '', zh: '', ms: '', ta: '' };
        return { en: str(obj.en), zh: str(obj.zh), ms: str(obj.ms), ta: str(obj.ta) };
    };

    // ---- Translations ----

    router.get('/translations', async (req, res) => {
        try {
            const raw = await fsp.readFile(translationsPath, 'utf8');
            res.json({ success: true, data: JSON.parse(raw) });
        } catch (err) {
            if (err.code === 'ENOENT') return res.json({ success: true, data: {} });
            res.status(500).json({ success: false, error: err.message });
        }
    });

    router.put('/translations', async (req, res) => {
        try {
            const body = req.body;
            if (!body || typeof body !== 'object') {
                return res.status(400).json({ success: false, error: 'Invalid translations body' });
            }

            // Normalize: each group is an object of key -> {en,zh,ms,ta}
            const normalized = {};
            for (const [group, keys] of Object.entries(body)) {
                if (!keys || typeof keys !== 'object') continue;
                normalized[group] = {};
                for (const [key, val] of Object.entries(keys)) {
                    normalized[group][key] = langObj(val);
                }
            }

            await fsp.writeFile(translationsPath, JSON.stringify(normalized, null, 2), 'utf8');
            res.json({ success: true, data: normalized });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ---- Recommendations ----

    router.get('/recommendations', async (req, res) => {
        try {
            const raw = await fsp.readFile(recommendationsPath, 'utf8');
            res.json({ success: true, data: JSON.parse(raw) });
        } catch (err) {
            if (err.code === 'ENOENT') return res.json({ success: true, data: {} });
            res.status(500).json({ success: false, error: err.message });
        }
    });

    router.put('/recommendations', async (req, res) => {
        try {
            const body = req.body;
            if (!body || typeof body !== 'object') {
                return res.status(400).json({ success: false, error: 'Invalid recommendations body' });
            }

            // Normalize: each category has title {en,zh,ms,ta} and actions [{en,zh,ms,ta}, ...]
            const normalized = {};
            for (const [category, rec] of Object.entries(body)) {
                if (!rec || typeof rec !== 'object') continue;
                normalized[category] = {
                    title: langObj(rec.title),
                    actions: Array.isArray(rec.actions)
                        ? rec.actions.map(a => langObj(a))
                        : []
                };
            }

            await fsp.writeFile(recommendationsPath, JSON.stringify(normalized, null, 2), 'utf8');
            res.json({ success: true, data: normalized });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    return router;
}
