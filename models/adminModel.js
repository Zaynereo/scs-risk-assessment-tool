import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

function stripPassword(admin) {
    if (!admin) return admin;
    const { password, ...rest } = admin;
    return rest;
}

function mapRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        email: row.email,
        password: row.password,
        role: row.role,
        name: row.name,
        requirePasswordReset: row.require_password_reset,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export class AdminModel {
    async getAllAdmins() {
        const result = await pool.query(
            'SELECT * FROM admins ORDER BY created_at DESC'
        );
        return result.rows.map(r => stripPassword(mapRow(r)));
    }

    async getAdminById(id) {
        const result = await pool.query(
            'SELECT * FROM admins WHERE id = $1 LIMIT 1',
            [id]
        );
        return mapRow(result.rows[0]) || null;
    }

    async getAdminByEmail(email) {
        const result = await pool.query(
            'SELECT * FROM admins WHERE LOWER(email) = LOWER($1) LIMIT 1',
            [email]
        );
        return mapRow(result.rows[0]) || null;
    }

    async verifyPassword(email, password) {
        const admin = await this.getAdminByEmail(email);
        if (!admin) return null;

        const isValid = await bcrypt.compare(password, admin.password);
        if (!isValid) return null;

        return stripPassword(admin);
    }

    async createAdmin(adminData) {
        const { email, role, name } = adminData;
        let { password } = adminData;
        let tempPassword = null;

        if (!['admin', 'super_admin'].includes(role)) {
            throw new Error('Invalid role. Must be "admin" or "super_admin"');
        }

        const existingAdmin = await this.getAdminByEmail(email);
        if (existingAdmin) {
            throw new Error('Admin with this email already exists');
        }

        if (!password) {
            tempPassword = '123456';
            password = tempPassword;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();

        const result = await pool.query(
            `INSERT INTO admins (
                id, email, password, role, name, require_password_reset, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING *`,
            [id, email.toLowerCase(), hashedPassword, role, name, !!tempPassword]
        );

        const admin = stripPassword(mapRow(result.rows[0]));
        if (tempPassword) {
            return { ...admin, tempPassword };
        }
        return admin;
    }

    async updateAdmin(id, updates) {
        const current = await this.getAdminById(id);
        if (!current) {
            throw new Error('Admin not found');
        }

        // Prevent demoting the last super admin
        if (updates.role && updates.role !== current.role && current.role === 'super_admin') {
            const countResult = await pool.query(
                "SELECT COUNT(*) FROM admins WHERE role = 'super_admin'"
            );
            if (parseInt(countResult.rows[0].count) <= 1) {
                throw new Error('Cannot demote the last super admin');
            }
        }

        // Don't allow email update if it conflicts with another admin
        if (updates.email && updates.email.toLowerCase() !== current.email.toLowerCase()) {
            const emailExists = await pool.query(
                'SELECT id FROM admins WHERE LOWER(email) = LOWER($1) AND id != $2 LIMIT 1',
                [updates.email, id]
            );
            if (emailExists.rows.length > 0) {
                throw new Error('Email already in use by another admin');
            }
        }

        const fields = [];
        const values = [];
        let idx = 1;

        if (updates.email !== undefined) {
            fields.push(`email = $${idx++}`);
            values.push(updates.email.toLowerCase());
        }
        if (updates.role !== undefined) {
            fields.push(`role = $${idx++}`);
            values.push(updates.role);
        }
        if (updates.name !== undefined) {
            fields.push(`name = $${idx++}`);
            values.push(updates.name);
        }
        if (updates.requirePasswordReset !== undefined) {
            fields.push(`require_password_reset = $${idx++}`);
            values.push(updates.requirePasswordReset);
        }
        if (updates.password !== undefined) {
            const hashedPassword = await bcrypt.hash(updates.password, 10);
            fields.push(`password = $${idx++}`);
            values.push(hashedPassword);
        }

        if (fields.length === 0) {
            return stripPassword(current);
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await pool.query(
            `UPDATE admins SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        return stripPassword(mapRow(result.rows[0]));
    }

    async deleteAdmin(id) {
        const admin = await this.getAdminById(id);
        if (!admin) {
            throw new Error('Admin not found');
        }

        // Prevent deleting the last super admin
        if (admin.role === 'super_admin') {
            const countResult = await pool.query(
                "SELECT COUNT(*) FROM admins WHERE role = 'super_admin'"
            );
            if (parseInt(countResult.rows[0].count) <= 1) {
                throw new Error('Cannot delete the last super admin');
            }
        }

        await pool.query('DELETE FROM admins WHERE id = $1', [id]);
        return true;
    }

    async changePassword(adminId, currentPassword, newPassword) {
        const admin = await this.getAdminById(adminId);
        if (!admin) {
            throw new Error('Admin not found');
        }

        const isValid = await bcrypt.compare(currentPassword, admin.password);
        if (!isValid) {
            throw new Error('Current password is incorrect');
        }

        await this.updateAdmin(adminId, {
            password: newPassword,
            requirePasswordReset: false
        });

        return true;
    }

    async createResetToken(email) {
        const admin = await this.getAdminByEmail(email);
        if (!admin) {
            throw new Error('Admin not found');
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await pool.query(
            `INSERT INTO password_reset_tokens (email, token, expires_at, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [email.toLowerCase(), token, expiresAt]
        );

        return token;
    }

    async verifyResetToken(token) {
        const result = await pool.query(
            `SELECT * FROM password_reset_tokens
             WHERE token = $1 AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`,
            [token]
        );

        return result.rows[0] || null;
    }

    async resetPassword(token, newPassword) {
        const tokenRecord = await this.verifyResetToken(token);
        if (!tokenRecord) {
            throw new Error('Invalid or expired reset token');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `UPDATE admins
             SET password = $1, require_password_reset = false, updated_at = NOW()
             WHERE LOWER(email) = LOWER($2)`,
            [hashedPassword, tokenRecord.email]
        );

        await pool.query(
            'DELETE FROM password_reset_tokens WHERE token = $1',
            [token]
        );

        return true;
    }
}
