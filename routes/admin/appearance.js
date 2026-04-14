import express from 'express';
import fs from 'fs';
import path from 'path';

export function createAppearanceRouter({ settingsModel, assetsDir, upload, normalizeTheme, listAssetPaths, ALLOWED_ASSET_FOLDERS, SCREEN_KEYS }) {
    const router = express.Router();

    // ---- Theme ----

    router.get('/theme', async (req, res) => {
        try {
            const theme = await settingsModel.getTheme();
            res.json(normalizeTheme(theme));
        } catch (err) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.put('/theme', async (req, res) => {
        try {
            const theme = req.body;
            if (!theme || typeof theme !== 'object') {
                return res.status(400).json({ success: false, error: 'Invalid theme body' });
            }
            const str = (v) => (typeof v === 'string' ? v : '');
            const num = (v, def) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : def; };

            let existing = {};
            try {
                existing = await settingsModel.getTheme();
            } catch (e) { /* use empty default */ }

            const screens = theme.screens && typeof theme.screens === 'object' ? theme.screens : {};
            const stringKeys = ['mascotMale', 'mascotFemale', 'mascotMaleGood', 'mascotFemaleGood', 'mascotMaleShocked', 'mascotFemaleShocked', 'appLogo', 'gameLogo', 'binIcon', 'pinboardIcon'];
            const out = { screens: {} };
            stringKeys.forEach(k => {
                out[k] = str(theme[k] !== undefined && theme[k] !== null ? theme[k] : existing[k]);
            });

            // partnerLogos is an array; validate when caller provides it, otherwise preserve existing.
            const MAX_PARTNER_LOGOS = 20;
            const MAX_ASSET_PATH_LEN = 500;
            const isValidAssetPath = (s) => typeof s === 'string'
                && s.length > 0 && s.length <= MAX_ASSET_PATH_LEN
                && s.startsWith('assets/')
                && !s.includes('..');

            if (theme.partnerLogos !== undefined) {
                if (!Array.isArray(theme.partnerLogos)) {
                    return res.status(400).json({ success: false, error: 'partnerLogos must be an array' });
                }
                const cleaned = theme.partnerLogos.map(str).map(s => s.trim()).filter(Boolean);
                if (cleaned.length > MAX_PARTNER_LOGOS) {
                    return res.status(400).json({ success: false, error: `partnerLogos accepts at most ${MAX_PARTNER_LOGOS} entries` });
                }
                for (const p of cleaned) {
                    if (!isValidAssetPath(p)) {
                        return res.status(400).json({ success: false, error: 'Each partner logo must be an assets/ path under 500 characters' });
                    }
                }
                out.partnerLogos = cleaned;
            } else if (Array.isArray(existing.partnerLogos)) {
                out.partnerLogos = existing.partnerLogos.map(str).map(s => s.trim()).filter(Boolean);
            } else if (typeof existing.partnerLogo === 'string' && existing.partnerLogo.trim()) {
                out.partnerLogos = [existing.partnerLogo.trim()];
            } else {
                out.partnerLogos = [];
            }
            SCREEN_KEYS.forEach(key => {
                const s = screens[key];
                const ex = existing.screens && existing.screens[key];
                out.screens[key] = {
                    backgroundImage: str(s && s.backgroundImage !== undefined ? s.backgroundImage : (ex && ex.backgroundImage)),
                    backgroundMusic: str(s && s.backgroundMusic !== undefined ? s.backgroundMusic : (ex && ex.backgroundMusic)),
                    backgroundOpacity: num(s && s.backgroundOpacity, num(ex && ex.backgroundOpacity, 1))
                };
            });
            await settingsModel.setTheme(out);
            res.json({ success: true, theme: out });
        } catch (err) {
            console.error('[Theme] Save failed:', err.message);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    // ---- Assets ----

    router.get('/assets', async (req, res) => {
        try {
            const folder = (req.query.folder || '').toString().trim();
            if (folder) {
                if (!ALLOWED_ASSET_FOLDERS.includes(folder)) {
                    return res.status(400).json({ success: false, error: 'Invalid folder' });
                }
                const paths = await listAssetPaths(folder);
                return res.json({ paths });
            }
            const [bg, mascot, music, cancerCards, logos] = await Promise.all([
                listAssetPaths('backgrounds'),
                listAssetPaths('mascots'),
                listAssetPaths('music'),
                listAssetPaths('cancer-cards'),
                listAssetPaths('logos')
            ]);
            res.json({ paths: [...bg, ...mascot, ...music, ...cancerCards, ...logos], backgrounds: bg, mascots: mascot, music, cancerCards, logos });
        } catch (err) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.post('/assets/upload', upload.single('file'), (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }
            const folder = (req.body.folder || 'backgrounds').toString();
            const sub = ALLOWED_ASSET_FOLDERS.includes(folder) ? folder : 'backgrounds';
            const targetDir = path.join(assetsDir, sub);
            fs.mkdirSync(targetDir, { recursive: true });
            const targetPath = path.join(targetDir, req.file.filename);
            fs.renameSync(req.file.path, targetPath);
            const relativePath = `assets/${sub}/${req.file.filename}`;
            res.json({ success: true, path: relativePath });
        } catch (err) {
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (cleanupErr) {
                    console.error('[Appearance] Temp file cleanup failed:', cleanupErr.message);
                }
            }
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.delete('/assets', async (req, res) => {
        try {
            const relativePath = (req.body.path || req.query.path || '').toString().trim();
            if (!relativePath || !relativePath.startsWith('assets/')) {
                return res.status(400).json({ success: false, error: 'Invalid asset path' });
            }
            const normalized = path.normalize(relativePath).replace(/\\/g, '/');
            if (normalized.indexOf('..') !== -1 || !normalized.startsWith('assets/')) {
                return res.status(400).json({ success: false, error: 'Invalid asset path' });
            }
            const relativeToAssets = normalized.slice('assets/'.length);
            const fullPath = path.join(assetsDir, relativeToAssets);
            if (!fullPath.startsWith(assetsDir + path.sep)) {
                return res.status(400).json({ success: false, error: 'Asset path outside assets directory' });
            }
            if (!fs.existsSync(fullPath)) {
                return res.status(404).json({ success: false, error: 'Asset not found' });
            }
            fs.unlinkSync(fullPath);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    return router;
}