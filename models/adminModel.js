import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AdminModel {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.adminsFile = path.join(this.dataDir, 'admins.json');
        this.resetTokensFile = path.join(this.dataDir, 'reset-tokens.json');
        // Sync init only for first-run bootstrapping (creates files if missing)
        this._ensureDataFilesSync();
    }

    /**
     * One-time sync bootstrap: creates data dir and default files if they don't exist.
     * After construction, all operations use async I/O.
     */
    _ensureDataFilesSync() {
        if (!fsSync.existsSync(this.dataDir)) {
            fsSync.mkdirSync(this.dataDir, { recursive: true });
        }

        if (!fsSync.existsSync(this.adminsFile)) {
            const defaultAdmin = {
                id: uuidv4(),
                email: 'admin@scs.com',
                password: bcrypt.hashSync('admin123', 10),
                role: 'super_admin',
                name: 'Super Admin',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            fsSync.writeFileSync(this.adminsFile, JSON.stringify([defaultAdmin], null, 2));
        }

        if (!fsSync.existsSync(this.resetTokensFile)) {
            fsSync.writeFileSync(this.resetTokensFile, JSON.stringify([], null, 2));
        }
    }

    async readAdmins() {
        const data = await fs.readFile(this.adminsFile, 'utf-8');
        return JSON.parse(data);
    }

    async writeAdmins(admins) {
        await fs.writeFile(this.adminsFile, JSON.stringify(admins, null, 2));
    }

    async readResetTokens() {
        const data = await fs.readFile(this.resetTokensFile, 'utf-8');
        return JSON.parse(data);
    }

    async writeResetTokens(tokens) {
        await fs.writeFile(this.resetTokensFile, JSON.stringify(tokens, null, 2));
    }

    async getAllAdmins() {
        const admins = await this.readAdmins();
        // Remove password from response
        return admins.map(({ password, ...admin }) => admin);
    }

    async getAdminById(id) {
        const admins = await this.readAdmins();
        return admins.find(admin => admin.id === id);
    }

    async getAdminByEmail(email) {
        const admins = await this.readAdmins();
        return admins.find(admin => admin.email.toLowerCase() === email.toLowerCase());
    }

    async createAdmin(adminData) {
        const { email, role, name } = adminData;
        let { password } = adminData;
        let tempPassword = null;

        // Validate role
        if (!['admin', 'super_admin'].includes(role)) {
            throw new Error('Invalid role. Must be "admin" or "super_admin"');
        }

        // Check if email already exists
        const existingAdmin = await this.getAdminByEmail(email);
        if (existingAdmin) {
            throw new Error('Admin with this email already exists');
        }

        const admins = await this.readAdmins();

        if (!password) {
            tempPassword = "123456";
            password = tempPassword;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = {
            id: uuidv4(),
            email: email.toLowerCase(),
            password: hashedPassword,
            role,
            name,
            requirePasswordReset: !!tempPassword,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        admins.push(newAdmin);
        await this.writeAdmins(admins);

        // Return admin without password
        const { password: _, ...adminWithoutPassword } = newAdmin;
        if (tempPassword) {
            return {
                ...adminWithoutPassword,
                tempPassword
            };
        }

        return adminWithoutPassword;
    }

    async updateAdmin(id, updates) {
        const admins = await this.readAdmins();
        const index = admins.findIndex(admin => admin.id === id);

        if (index === -1) {
            throw new Error('Admin not found');
        }

        // Prevent demoting the last super admin
        if (updates.role && updates.role !== admins[index].role && admins[index].role === 'super_admin') {
            const superAdmins = admins.filter(a => a.role === 'super_admin');
            if (superAdmins.length === 1) {
                throw new Error('Cannot demote the last super admin');
            }
        }

        // Don't allow email update if it conflicts with another admin
        if (updates.email && updates.email !== admins[index].email) {
            const emailExists = admins.some(
                admin => admin.id !== id && admin.email.toLowerCase() === updates.email.toLowerCase()
            );
            if (emailExists) {
                throw new Error('Email already in use by another admin');
            }
        }

        // Hash password if it's being updated
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }

        admins[index] = {
            ...admins[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.writeAdmins(admins);

        const { password, ...adminWithoutPassword } = admins[index];
        return adminWithoutPassword;
    }

    async deleteAdmin(id) {
        const admins = await this.readAdmins();
        const index = admins.findIndex(admin => admin.id === id);

        if (index === -1) {
            throw new Error('Admin not found');
        }

        // Prevent deleting the last super admin
        const superAdmins = admins.filter(a => a.role === 'super_admin');
        if (superAdmins.length === 1 && admins[index].role === 'super_admin') {
            throw new Error('Cannot delete the last super admin');
        }

        admins.splice(index, 1);
        await this.writeAdmins(admins);
        return true;
    }

    async verifyPassword(email, password) {
        const admin = await this.getAdminByEmail(email);
        if (!admin) {
            return null;
        }

        const isValid = await bcrypt.compare(password, admin.password);
        if (!isValid) {
            return null;
        }

        const { password: _, ...adminWithoutPassword } = admin;
        return adminWithoutPassword;
    }

    async changePassword(adminId, currentPassword, newPassword) {
        const admin = await this.getAdminById(adminId);
        if (!admin) {
            throw new Error('Admin not found');
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, admin.password);
        if (!isValid) {
            throw new Error('Current password is incorrect');
        }

        // Update password and clear requirePasswordReset flag
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

        const tokens = await this.readResetTokens();

        // Remove any existing tokens for this email
        const filteredTokens = tokens.filter(t => t.email !== email);

        const resetToken = {
            email: email.toLowerCase(),
            token: uuidv4(),
            expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
            createdAt: new Date().toISOString()
        };

        filteredTokens.push(resetToken);
        await this.writeResetTokens(filteredTokens);

        return resetToken.token;
    }

    async verifyResetToken(token) {
        const tokens = await this.readResetTokens();
        const resetToken = tokens.find(t => t.token === token);

        if (!resetToken) {
            return null;
        }

        if (new Date(resetToken.expiresAt) < new Date()) {
            // Token expired, remove it
            await this.writeResetTokens(tokens.filter(t => t.token !== token));
            return null;
        }

        return resetToken;
    }

    async resetPassword(token, newPassword) {
        const resetToken = await this.verifyResetToken(token);
        if (!resetToken) {
            throw new Error('Invalid or expired reset token');
        }

        const admin = await this.getAdminByEmail(resetToken.email);
        if (!admin) {
            throw new Error('Admin not found');
        }

        // Update password
        await this.updateAdmin(admin.id, { password: newPassword });

        // Remove the used token
        const tokens = await this.readResetTokens();
        await this.writeResetTokens(tokens.filter(t => t.token !== token));

        return true;
    }

}
