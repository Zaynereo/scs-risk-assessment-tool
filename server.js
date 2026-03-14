import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fsp from 'fs/promises';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from './middleware/auth.js';
import { questionsRouter } from './routes/questions.js';
import { assessmentsRouter } from './routes/assessments.js';
import { adminRouter, normalizeTheme } from './routes/admin/index.js';
import { createPublicAuthRouter } from './routes/admin/auth.js';
import { AdminModel } from './models/adminModel.js';
import { CancerTypeModel } from './models/cancerTypeModel.js';
import { SettingsModel } from './models/settingsModel.js';
import emailService from './services/emailService.js';
import { validateEnv } from './utils/validateEnv.js';

// Load environment variables
dotenv.config();
validateEnv();

// Require JWT_SECRET in non-test environments
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
    console.error('FATAL: JWT_SECRET environment variable is required. Set it in your .env file.');
    process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const adminModel = new AdminModel();
const settingsModel = new SettingsModel();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting on auth endpoints (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: { message: 'Too many attempts, please try again later' },
        standardHeaders: true,
        legacyHeaders: false
    });
    app.use('/api/admin/login', authLimiter);
    app.use('/api/admin/forgot-password', authLimiter);
    app.use('/api/admin/reset-password', authLimiter);
}

// Serve static files from public/ only (not the project root)
app.use(express.static(path.join(__dirname, 'public')));

// Public theme (user-facing app)
app.get('/api/theme', async (req, res) => {
    try {
        const theme = await settingsModel.getTheme();
        res.json(normalizeTheme(theme));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Public assessments snapshot (fallback when API is unavailable)
app.get('/api/assessments-snapshot', async (req, res) => {
    try {
        const snapshotPath = path.join(__dirname, 'data', 'assessments-snapshot.json');
        const raw = await fsp.readFile(snapshotPath, 'utf8');
        res.json(JSON.parse(raw));
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.status(404).json({ success: false, error: 'Snapshot not available' });
        }
        res.status(500).json({ success: false, error: err.message });
    }
});

// Public PDPA config (user-facing app)
app.get('/api/pdpa', async (req, res) => {
    try {
        const pdpa = await settingsModel.getPdpa();
        res.json(pdpa);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Public translations (user-facing app)
app.get('/api/translations', async (req, res) => {
    try {
        const translations = await settingsModel.getTranslations();
        res.json(translations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Public recommendations (user-facing app)
app.get('/api/recommendations', async (req, res) => {
    try {
        const recommendations = await settingsModel.getRecommendations();
        res.json(recommendations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API Routes
app.use('/api/questions', questionsRouter);
app.use('/api/assessments', assessmentsRouter);

// Admin auth (public — login, forgot-password, reset-password)
app.use('/api/admin', createPublicAuthRouter({ adminModel, emailService }));

// Admin panel (protected — requires JWT)
app.use('/api/admin', authenticateToken, adminRouter);

// Serve admin.html for /admin and /admin/... paths
app.get('/admin*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server (skip when imported for testing)
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, async() => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`API available at http://localhost:${PORT}/api`);

        // Generate assessments snapshot if it doesn't exist
        const cancerTypeModel = new CancerTypeModel();
        await cancerTypeModel.ensureSnapshot();

        // Verify email service
        await emailService.verifyConnection();
    });
}

export { app };
