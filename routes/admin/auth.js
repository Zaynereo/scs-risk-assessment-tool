import express from 'express';
import jwt from 'jsonwebtoken';

/**
 * Public auth routes (no authenticateToken middleware).
 * Mounted BEFORE the authenticated admin router in server.js.
 */
export function createPublicAuthRouter({ adminModel, emailService }) {
    const router = express.Router();

    router.post('/login', async (req, res) => {
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

    router.post('/forgot-password', async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }

            try {
                const resetToken = await adminModel.createResetToken(email);

                try {
                    await emailService.sendPasswordResetEmail(email, resetToken);
                    console.log(`✓ Password reset email sent to ${email}`);
                } catch (emailError) {
                    console.error('Email sending failed:', emailError);

                    if (process.env.NODE_ENV !== 'production') {
                        const PORT = process.env.PORT || 3000;
                        console.log(`Password reset link: http://localhost:${PORT}/resetPassword.html?token=${resetToken}`);
                    }
                }

                res.json({
                    message: 'If an account exists with this email, a password reset link has been sent.'
                });
            } catch (error) {
                console.log(`Password reset attempted for non-existent email: ${email}`);
                res.json({
                    message: 'If an account exists with this email, a password reset link has been sent.'
                });
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
        }
    });

    router.post('/reset-password', async (req, res) => {
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

    return router;
}

/**
 * Authenticated admin routes (behind authenticateToken middleware).
 */
export function createAuthRouter({ adminModel }) {
    const router = express.Router();

    /**
     * GET /api/admin/me
     * Get current admin's profile
     */
    router.get('/me', async (req, res) => {
        try {
            const admin = await adminModel.getAdminById(req.user.id);
            if (!admin) {
                return res.status(404).json({ success: false, error: 'Admin not found' });
            }

            const { password, ...adminWithoutPassword } = admin;
            res.json({ success: true, data: adminWithoutPassword });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/admin/change-password
     * Change current admin's password
     */
    router.post('/change-password', async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password and new password are required'
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'New password must be at least 6 characters'
                });
            }

            if (currentPassword === newPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'New password must be different from current password'
                });
            }

            await adminModel.changePassword(req.user.id, currentPassword, newPassword);
            res.json({ success: true, message: 'Password changed successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
}
