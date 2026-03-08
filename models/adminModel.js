import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class AdminModel {
  async getAllAdmins() {
    const result = await pool.query(
      'SELECT * FROM admins ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async getAdminById(id) {
    const result = await pool.query(
      'SELECT * FROM admins WHERE id = $1 LIMIT 1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getAdminByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM admins WHERE email = $1 LIMIT 1',
      [email]
    );
    return result.rows[0] || null;
  }

  async verifyPassword(email, password) {
    const admin = await this.getAdminByEmail(email);
    if (!admin) return null;

    const isValid = await bcrypt.compare(password, admin.password);
    return isValid ? admin : null;
  }

  async createAdmin(adminData) {
    const {
      email,
      password,
      role,
      name,
      requirePasswordReset = false
    } = adminData;

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO admins (
        id, email, password, role, name, require_password_reset, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *`,
      [id, email, hashedPassword, role, name, requirePasswordReset]
    );

    return result.rows[0];
  }

  async updateAdmin(id, updateData) {
    const fields = [];
    const values = [];
    let index = 1;

    if (updateData.email !== undefined) {
      fields.push(`email = $${index++}`);
      values.push(updateData.email);
    }

    if (updateData.role !== undefined) {
      fields.push(`role = $${index++}`);
      values.push(updateData.role);
    }

    if (updateData.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(updateData.name);
    }

    if (updateData.requirePasswordReset !== undefined) {
      fields.push(`require_password_reset = $${index++}`);
      values.push(updateData.requirePasswordReset);
    }

    if (updateData.password !== undefined) {
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      fields.push(`password = $${index++}`);
      values.push(hashedPassword);
    }

    if (fields.length === 0) {
      return await this.getAdminById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE admins
       SET ${fields.join(', ')}
       WHERE id = $${index}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async deleteAdmin(id) {
    const result = await pool.query(
      'DELETE FROM admins WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
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
      [email, token, expiresAt]
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
       WHERE email = $2`,
      [hashedPassword, tokenRecord.email]
    );

    await pool.query(
      'DELETE FROM password_reset_tokens WHERE token = $1',
      [token]
    );

    return true;
  }
}