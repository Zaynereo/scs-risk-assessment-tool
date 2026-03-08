import express from 'express';

export function createPdpaRouter({ settingsModel }) {
    const router = express.Router();

    router.get('/pdpa', async (req, res) => {
        try {
            const pdpa = await settingsModel.getPdpa();
            res.json({ success: true, data: pdpa });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    router.put('/pdpa', async (req, res) => {
        try {
            const body = req.body;
            if (!body || typeof body !== 'object') {
                return res.status(400).json({ success: false, error: 'Invalid PDPA body' });
            }

            const str = (v) => (typeof v === 'string' ? v : '');
            const langObj = (obj) => {
                if (!obj || typeof obj !== 'object') return { en: '', zh: '', ms: '', ta: '' };
                return { en: str(obj.en), zh: str(obj.zh), ms: str(obj.ms), ta: str(obj.ta) };
            };

            const pdpa = {
                enabled: !!body.enabled,
                title: langObj(body.title),
                purpose: langObj(body.purpose),
                dataCollected: langObj(body.dataCollected),
                checkboxLabel: langObj(body.checkboxLabel),
                agreeButtonText: langObj(body.agreeButtonText)
            };

            await settingsModel.setPdpa(pdpa);
            res.json({ success: true, data: pdpa });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    return router;
}
