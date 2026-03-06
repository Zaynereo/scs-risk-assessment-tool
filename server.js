import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fsp from 'fs/promises';
import dotenv from 'dotenv';
import { questionsRouter } from './routes/questions.js';
import { assessmentsRouter } from './routes/assessments.js';
import { adminRouter, normalizeTheme } from './routes/admin/index.js';
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

// Serve static files (frontend)
app.use(express.static('.'));

// Login endpoint (PUBLIC)
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const admin = await adminModel.verifyPassword(email, password);

        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ 
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Forgot password endpoint (PUBLIC)
app.post('/api/admin/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        try {
            const resetToken = await adminModel.createResetToken(email);
            
            // Try to send email
            try {
                await emailService.sendPasswordResetEmail(email, resetToken);
                console.log(`✓ Password reset email sent to ${email}`);
            } catch (emailError) {
                console.error('Email sending failed:', emailError);
                
                // In development, still show the link in console
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`Password reset link: http://localhost:${PORT}/reset-password.html?token=${resetToken}`);
                }
            }
            
            res.json({ 
                message: 'If an account exists with this email, a password reset link has been sent.'
            });
        } catch (error) {
            // Admin not found - still return success to prevent email enumeration
            console.log(`Password reset attempted for non-existent email: ${email}`);
            res.json({ 
                message: 'If an account exists with this email, a password reset link has been sent.'
            });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        // Always return success to prevent email enumeration
        res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    }
});

// Reset password endpoint (PUBLIC)
app.post('/api/admin/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        await adminModel.resetPassword(token, newPassword);

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(400).json({ message: error.message });
    }
});

// Authentication middleware (PROTECT ADMIN API)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Super Admin middleware (only for super admin routes)
const requireSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Super admin access required' });
    }
    next();
};

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
app.use('/api/admin', authenticateToken, adminRouter);

// Serve admin.html for /admin and /admin/... paths
app.get('/admin*', (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

// Start server (skip when imported for testing)
const themePath = path.join(__dirname, 'data', 'theme.json');
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
        console.log(`📁 Theme file: ${path.resolve(themePath)}`);
    });
}

export { app, requireSuperAdmin };