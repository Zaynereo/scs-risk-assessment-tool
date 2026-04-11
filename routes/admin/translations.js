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

            // Normalize incoming patch: each group is an object of key -> {en,zh,ms,ta}
            const patch = {};
            for (const [group, keys] of Object.entries(body)) {
                if (!keys || typeof keys !== 'object') continue;
                patch[group] = {};
                for (const [key, val] of Object.entries(keys)) {
                    patch[group][key] = langObj(val);
                }
            }

            // Deep-merge with existing DB state: groups and keys not in the patch
            // are preserved. Within a patched key, the whole {en,zh,ms,ta} object
            // is the unit of replacement (normalized via langObj above).
            // Callers that want to overwrite the full blob can still send every
            // group/key in one request — merge is idempotent over full payloads.
            const current = (await settingsModel.getTranslations()) || {};
            const merged = { ...current };
            for (const [group, keys] of Object.entries(patch)) {
                merged[group] = { ...(current[group] || {}), ...keys };
            }

            await settingsModel.setTranslations(merged);
            res.json({ success: true, data: merged });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    return router;
}
