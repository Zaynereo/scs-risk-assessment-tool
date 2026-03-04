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

import { createAuthRouter } from './auth.js';
import { createAdminUsersRouter } from './adminUsers.js';
import { createCancerTypesRouter } from './cancerTypes.js';
import { createQuestionsRouter } from './questions.js';
import { createAssessmentsRouter } from './assessments.js';
import { createAppearanceRouter } from './appearance.js';
import { createPdpaRouter } from './pdpa.js';

// ---- Shared setup ----

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const assessmentsCsvPath = path.join(projectRoot, 'data', 'assessments.csv');
const themePath = path.resolve(projectRoot, 'data', 'theme.json');
const pdpaPath = path.resolve(projectRoot, 'data', 'pdpa.json');
const assetsDir = path.join(projectRoot, 'assets');

// ---- Model instances ----

const questionModel = new QuestionModel();
const assessmentModel = new AssessmentModel();
const cancerTypeModel = new CancerTypeModel();
const adminModel = new AdminModel();

// ---- Multer config ----

const ALLOWED_ASSET_FOLDERS = ['backgrounds', 'mascots', 'music', 'cancer-cards'];
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
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ---- Shared middleware ----

const requireSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Super admin access required' });
    }
    next();
};

// ---- Shared helpers ----

const WEIGHT_TOLERANCE = 1;
const SCREEN_KEYS = ['landing', 'cancerSelection', 'onboarding', 'game', 'results'];

function computeGenericWeightValidity(assignments) {
    const weightByTarget = {};
    for (const a of assignments) {
        const target = (a.targetCancerType || '').toLowerCase().trim();
        if (!target) continue;
        if (!weightByTarget[target]) weightByTarget[target] = { totalWeight: 0, isValid: false };
        weightByTarget[target].totalWeight += parseFloat(a.weight) || 0;
    }
    for (const target of Object.keys(weightByTarget)) {
        const sum = weightByTarget[target].totalWeight;
        weightByTarget[target].isValid = Math.abs(sum - 100) <= WEIGHT_TOLERANCE;
    }
    const hasAssignments = assignments.length > 0;
    const everyTargetValid = Object.keys(weightByTarget).length === 0
        ? !hasAssignments
        : Object.values(weightByTarget).every(v => v.isValid);
    const isValid = hasAssignments && everyTargetValid;
    return { weightByTarget, targetCount: Object.keys(weightByTarget).length, isValid };
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
        mascotFemaleShocked: str(theme.mascotFemaleShocked)
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
router.use('/', createAdminUsersRouter({ adminModel, requireSuperAdmin }));
router.use('/', createCancerTypesRouter({ cancerTypeModel, questionModel, computeGenericWeightValidity, WEIGHT_TOLERANCE }));
router.use('/', createQuestionsRouter({ questionModel }));
router.use('/', createAssessmentsRouter({ assessmentModel, questionModel, assessmentsCsvPath }));
router.use('/', createAppearanceRouter({ themePath, assetsDir, upload, normalizeTheme, listAssetPaths, ALLOWED_ASSET_FOLDERS, SCREEN_KEYS, projectRoot }));
router.use('/', createPdpaRouter({ pdpaPath }));

// ---- Error handler (catches multer errors etc.) ----

router.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large (max 10MB)'
        : (err.message || 'Upload failed');
    res.status(500).json({ success: false, error: message });
});

export { router as adminRouter };
