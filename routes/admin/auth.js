import express from 'express';

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
