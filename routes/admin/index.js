import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { QuestionModel } from '../../models/questionModel.js';
import { AssessmentModel } from '../../models/assessmentModel.js';
import { CancerTypeModel } from '../../models/cancerTypeModel.js';
import { AdminModel } from '../../models/adminModel.js';
import { SettingsModel } from '../../models/settingsModel.js';

import { createAuthRouter } from './auth.js';
import { createAdminUsersRouter } from './adminUsers.js';
import { createCancerTypesRouter } from './cancerTypes.js';
import { createQuestionsRouter } from './questions.js';
import { createAssessmentsRouter } from './assessments.js';
import { createAppearanceRouter } from './appearance.js';
import { createPdpaRouter } from './pdpa.js';
import { createTranslationsRouter } from './translations.js';
import { getQuizWeightTarget, computeGenericWeightValidity } from '../../controllers/riskCalculator.js';
import { requireSuperAdmin } from '../../middleware/auth.js';
import emailService from '../../services/emailService.js';

// ---- Shared setup ----

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const assetsDir = path.join(projectRoot, 'public', 'assets');

// ---- Model instances ----

const questionModel = new QuestionModel();
const assessmentModel = new AssessmentModel();
const cancerTypeModel = new CancerTypeModel();
const adminModel = new AdminModel();
const settingsModel = new SettingsModel();

// ---- Multer config ----

const ALLOWED_ASSET_FOLDERS = ['backgrounds', 'mascots', 'music', 'cancer-cards', 'logos'];
const uploadTempDir = path.join(assetsDir, '_upload');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdirSync(uploadTempDir, { recursive: true });
        cb(null, uploadTempDir);
    },
    filename: (req, file, cb) => {
        const base = path.basename(file.originalname, path.extname(file.originalname));
        const ext = (path.extname(file.originalname) || '').toLowerCase() || '.png';
        const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${safe}${ext}`);
    }
});
const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp3'
];
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and audio files are allowed.'));
        }
    }
});

// ---- Shared helpers ----

const SCREEN_KEYS = ['landing', 'cancerSelection', 'onboarding', 'game', 'results'];

function normalizePartnerLogos(theme) {
    const str = (v) => (typeof v === 'string' ? v : '');
    if (Array.isArray(theme.partnerLogos)) {
        return theme.partnerLogos.map(str).map(s => s.trim()).filter(Boolean);
    }
    // Legacy: migrate single-string partnerLogo into an array
    const legacy = str(theme.partnerLogo).trim();
    return legacy ? [legacy] : [];
}

function normalizeTheme(theme) {
    if (!theme || typeof theme !== 'object') theme = {};
    const str = (v) => (typeof v === 'string' ? v : '');
    const num = (v, def) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : def; };
    const screens = {};
    SCREEN_KEYS.forEach(key => {
        const s = theme.screens && theme.screens[key];
        screens[key] = {
            backgroundImage: str(s && s.backgroundImage),
            backgroundMusic: str(s && s.backgroundMusic),
            backgroundOpacity: num(s && s.backgroundOpacity, 1)
        };
    });
    return {
        screens,
        mascotMale: str(theme.mascotMale),
        mascotFemale: str(theme.mascotFemale),
        mascotMaleGood: str(theme.mascotMaleGood),
        mascotFemaleGood: str(theme.mascotFemaleGood),
        mascotMaleShocked: str(theme.mascotMaleShocked),
        mascotFemaleShocked: str(theme.mascotFemaleShocked),
        appLogo: str(theme.appLogo),
        gameLogo: str(theme.gameLogo),
        partnerLogos: normalizePartnerLogos(theme),
        binIcon: str(theme.binIcon),
        pinboardIcon: str(theme.pinboardIcon)
    };
}

async function listAssetPaths(folder) {
    const base = path.join(assetsDir, folder);
    let entries = [];
    try {
        entries = await fsp.readdir(base, { withFileTypes: true });
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
        return [];
    }
    const files = entries.filter(d => d.isFile()).map(d => `assets/${folder}/${d.name}`);
    return files.sort();
}

// ---- Mount sub-routers ----

router.use('/', createAuthRouter({ adminModel }));
router.use('/', createAdminUsersRouter({ adminModel, requireSuperAdmin, emailService }));
router.use('/', createCancerTypesRouter({ cancerTypeModel, questionModel, computeGenericWeightValidity, getQuizWeightTarget }));
router.use('/', createQuestionsRouter({ questionModel }));
router.use('/', createAssessmentsRouter({ assessmentModel, questionModel }));
router.use('/', createAppearanceRouter({ settingsModel, assetsDir, upload, normalizeTheme, listAssetPaths, ALLOWED_ASSET_FOLDERS, SCREEN_KEYS }));
router.use('/', createPdpaRouter({ settingsModel }));
router.use('/', createTranslationsRouter({ settingsModel }));

// ---- Error handler (catches multer errors etc.) ----

router.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    let status = 500;
    let message = 'Upload failed';
    if (err.code === 'LIMIT_FILE_SIZE') {
        status = 413;
        message = 'File too large (max 10MB)';
    } else if (err.message && err.message.includes('Invalid file type')) {
        status = 400;
        message = err.message;
    }
    res.status(status).json({ success: false, error: message });
});

export { router as adminRouter, normalizeTheme };
