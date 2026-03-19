import express from 'express';

export function createTranslationsRouter({ settingsModel }) {
    const router = express.Router();

    const str = (v) => (typeof v === 'string' ? v : '');
    const langObj = (obj) => {
        if (!obj || typeof obj !== 'object') return { en: '', zh: '', ms: '', ta: '' };
        return { en: str(obj.en), zh: str(obj.zh), ms: str(obj.ms), ta: str(obj.ta) };
    };

    // ---- Translations ----

    router.get('/translations', async (req, res) => {
        try {
            const data = await settingsModel.getTranslations();
            res.json({ success: true, data });
        } catch (err) {
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

            await settingsModel.setTranslations(normalized);
            res.json({ success: true, data: normalized });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    return router;
}
