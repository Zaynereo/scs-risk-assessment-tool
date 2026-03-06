import express from 'express';

export function createAdminUsersRouter({ adminModel, requireSuperAdmin }) {
    const router = express.Router();

    /**
     * GET /api/admin/admins
     * Get all admin users (super admin only)
     */
    router.get('/admins', requireSuperAdmin, async (req, res) => {
        try {
            const admins = await adminModel.getAllAdmins();
            res.json({ success: true, data: admins });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/admin/admins
     * Create a new admin user (super admin only)
     */
    router.post('/admins', requireSuperAdmin, async (req, res) => {
        try {
            const { email, name, role } = req.body;

            if (!email || !name) {
                return res.status(400).json({
                    success: false,
                    error: 'Email, and name are required'
                });
            }

            const admin = await adminModel.createAdmin({
                email,
                name,
                role: role || 'admin'
            });

            res.json({
                success: true,
                data: admin,
                tempPassword: admin.tempPassword
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/admin/admins/:id/role
     * Update an admin's role
     */
    router.put('/admins/:id/role', requireSuperAdmin, async (req, res) => {
        try {
            const { role } = req.body;

            if (!['admin', 'super_admin'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role. Must be "admin" or "super_admin"'
                });
            }

            const admin = await adminModel.updateAdmin(req.params.id, { role });
            res.json({ success: true, data: admin });
        } catch (error) {
            const status = error.message.includes('Cannot demote') ? 400 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/admin/admins/:id
     * Update an admin's details (super admin only, or self)
     */
    router.put('/admins/:id', async (req, res) => {
        try {
            if (req.params.id !== req.user.id && req.user.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    error: 'You can only update your own profile'
                });
            }

            const { name, email, role } = req.body;
            const updates = {};

            if (name) updates.name = name;
            if (email) updates.email = email;

            // Allow role updates only for super admins
            if (role && req.user.role === 'super_admin') {
                if (!['admin', 'super_admin'].includes(role)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid role. Must be "admin" or "super_admin"'
                    });
                }

                updates.role = role;
            }
            const admin = await adminModel.updateAdmin(req.params.id, updates);
            res.json({ success: true, data: admin });
        } catch (error) {
            const status = error.message.includes('Cannot demote') ? 400 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/admin/admins/:id
     * Delete an admin user (super admin only)
     */
    router.delete('/admins/:id', requireSuperAdmin, async (req, res) => {
        try {
            if (req.params.id === req.user.id) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete your own account'
                });
            }

            await adminModel.deleteAdmin(req.params.id);
            res.json({ success: true, message: 'Admin deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
}
