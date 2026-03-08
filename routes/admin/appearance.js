import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

export function createAppearanceRouter({ themePath, assetsDir, upload, normalizeTheme, listAssetPaths, ALLOWED_ASSET_FOLDERS, SCREEN_KEYS }) {
    const router = express.Router();

    // ---- Theme ----

    router.get('/theme', async (req, res) => {
        try {
            const raw = await fsp.readFile(themePath, 'utf8');
            const theme = JSON.parse(raw);
            res.json(normalizeTheme(theme));
        } catch (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).json({ success: false, error: 'Theme not found' });
            }
            res.status(500).json({ success: false, error: err.message });
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
                const raw = await fsp.readFile(themePath, 'utf8');
                existing = JSON.parse(raw) || {};
            } catch (e) {
                if (e.code !== 'ENOENT') throw e;
            }
            const screens = theme.screens && typeof theme.screens === 'object' ? theme.screens : {};
            const mascotKeys = ['mascotMale', 'mascotFemale', 'mascotMaleGood', 'mascotFemaleGood', 'mascotMaleShocked', 'mascotFemaleShocked'];
            const out = { screens: {} };
            mascotKeys.forEach(k => {
                out[k] = str(theme[k] !== undefined && theme[k] !== null ? theme[k] : existing[k]);
            });
            SCREEN_KEYS.forEach(key => {
                const s = screens[key];
                const ex = existing.screens && existing.screens[key];
                out.screens[key] = {
                    backgroundImage: str(s && s.backgroundImage !== undefined ? s.backgroundImage : (ex && ex.backgroundImage)),
                    backgroundMusic: str(s && s.backgroundMusic !== undefined ? s.backgroundMusic : (ex && ex.backgroundMusic)),
                    backgroundOpacity: num(s && s.backgroundOpacity, num(ex && ex.backgroundOpacity, 1))
                };
            });
            await fsp.writeFile(themePath, JSON.stringify(out, null, 2), 'utf8');
            console.log('[Theme] Saved to:', themePath);
            res.json({ success: true, theme: out, savedPath: themePath });
        } catch (err) {
            console.error('[Theme] Save failed:', err.message);
            res.status(500).json({ success: false, error: err.message });
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
            const [bg, mascot, music, cancerCards] = await Promise.all([
                listAssetPaths('backgrounds'),
                listAssetPaths('mascots'),
                listAssetPaths('music'),
                listAssetPaths('cancer-cards')
            ]);
            res.json({ paths: [...bg, ...mascot, ...music, ...cancerCards], backgrounds: bg, mascots: mascot, music, cancerCards });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
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
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            res.status(500).json({ success: false, error: err.message });
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
            res.status(500).json({ success: false, error: err.message || 'Delete failed' });
        }
    });

    return router;
}
