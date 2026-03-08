import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fsp from 'fs/promises';
import dotenv from 'dotenv';
import { authenticateToken } from './middleware/auth.js';
import { questionsRouter } from './routes/questions.js';
import { assessmentsRouter } from './routes/assessments.js';
import { adminRouter, normalizeTheme } from './routes/admin/index.js';
import { createPublicAuthRouter } from './routes/admin/auth.js';
import { AdminModel } from './models/adminModel.js';
import { CancerTypeModel } from './models/cancerTypeModel.js';
import emailService from './services/emailService.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const adminModel = new AdminModel();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public/ only (not the project root)
app.use(express.static(path.join(__dirname, 'public')));

// Public theme (user-facing app)
app.get('/api/theme', async (req, res) => {
    try {
        const themePath = path.join(__dirname, 'data', 'theme.json');
        const raw = await fsp.readFile(themePath, 'utf8');
        const theme = JSON.parse(raw);
        res.json(normalizeTheme(theme));
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.json(normalizeTheme({}));
        }
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
        const pdpaPath = path.join(__dirname, 'data', 'pdpa.json');
        const raw = await fsp.readFile(pdpaPath, 'utf8');
        const pdpa = JSON.parse(raw);
        res.json(pdpa);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.json({ enabled: false });
        }
        res.status(500).json({ error: err.message });
    }
});

// Public translations (user-facing app)
app.get('/api/translations', async (req, res) => {
    try {
        const translationsPath = path.join(__dirname, 'data', 'ui_translations.json');
        const raw = await fsp.readFile(translationsPath, 'utf8');
        res.json(JSON.parse(raw));
    } catch (err) {
        if (err.code === 'ENOENT') return res.json({});
        res.status(500).json({ error: err.message });
    }
});

// Public recommendations (user-facing app)
app.get('/api/recommendations', async (req, res) => {
    try {
        const recPath = path.join(__dirname, 'data', 'recommendations.json');
        const raw = await fsp.readFile(recPath, 'utf8');
        res.json(JSON.parse(raw));
    } catch (err) {
        if (err.code === 'ENOENT') return res.json({});
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
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 API available at http://localhost:${PORT}/api`);
        console.log(`👤 Default admin: admin@scs.com / admin123`);

        // Generate assessments snapshot if it doesn't exist
        const cancerTypeModel = new CancerTypeModel();
        await cancerTypeModel.ensureSnapshot();

        // Verify email service
        await emailService.verifyConnection();
        const themePath = path.join(__dirname, 'data', 'theme.json');
        console.log(`📁 Theme file: ${path.resolve(themePath)}`);
    });
}

export { app };
