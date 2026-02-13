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
import { adminRouter } from './routes/admin.js';
import { AdminModel } from './models/adminModel.js';

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

// // Mock admin user (for testing)
// const adminUser = {
//     id: 1,
//     username: 'admin',
//     password: 'password'
// };

// // Login endpoint (PUBLIC)
// app.post('/api/admin/login', async (req, res) => {
//     try {
//         const { username, password } = req.body;

//         if (username === adminUser.username && password === adminUser.password) {
//             const token = jwt.sign(
//                 { id: adminUser.id, username: adminUser.username },
//                 process.env.JWT_SECRET || 'your-secret-key',
//                 { expiresIn: '24h' }
//             );

//             res.json({ token });
//         } else {
//             res.status(401).json({ message: 'Invalid credentials' });
//         }
//     } catch (error) {
//         console.error('Login error:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

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

        const resetToken = await adminModel.createResetToken(email);

        // In production, send this via email
        // For development, return it in the response
        console.log(`Password reset token for ${email}: ${resetToken}`);
        console.log(`Reset URL: http://localhost:${PORT}/resetPassword.html?token=${resetToken}`);

        res.json({ 
            message: 'If an account exists with this email, a password reset link has been sent.',
            // Remove this in production
            resetToken,
            resetUrl: `http://localhost:${PORT}/resetPassword.html?token=${resetToken}`
        });
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

// Public theme (user-facing app) — normalize so all keys always present
const THEME_SCREEN_KEYS = ['landing', 'cancerSelection', 'onboarding', 'game', 'results'];
function normalizeTheme(theme) {
    if (!theme || typeof theme !== 'object') theme = {};
    const str = (v) => (typeof v === 'string' ? v : '');
    const num = (v, def) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : def; };
    const screens = {};
    THEME_SCREEN_KEYS.forEach(key => {
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

// API Routes
app.use('/api/questions', questionsRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/admin', authenticateToken, adminRouter);

// Serve admin.html for /admin and /admin/... paths
app.get('/admin*', (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

// Start server
const themePath = path.join(__dirname, 'data', 'theme.json');
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
    console.log(`👤 Default admin: admin@scs.com / admin123`);
    console.log(`📁 Theme file: ${path.resolve(themePath)}`);
});

export { requireSuperAdmin };