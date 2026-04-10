/**
 * Admin Auth & Password API tests
 * Run: NODE_ENV=test node --test tests/admin-auth.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown, getSuperAdminToken } from './helpers/setup.js';

describe('Admin Auth API', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    const token = getSuperAdminToken();

    describe('GET /api/admin/me', () => {
        it('returns 200 with valid token', async () => {
            const res = await request(app)
                .get('/api/admin/me')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(res.body.data.email);
        });

        it('returns user data without password field', async () => {
            const res = await request(app)
                .get('/api/admin/me')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.body.data.password, undefined);
            assert.ok(res.body.data.id);
            assert.ok(res.body.data.role);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/admin/me');
            assert.strictEqual(res.status, 401);
        });

        it('returns 403 with invalid token', async () => {
            const res = await request(app)
                .get('/api/admin/me')
                .set('Authorization', 'Bearer invalidtoken123');
            assert.strictEqual(res.status, 403);
        });
    });

    describe('POST /api/admin/change-password', () => {
        it('returns 400 if passwords missing', async () => {
            const res = await request(app)
                .post('/api/admin/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({});
            assert.strictEqual(res.status, 400);
        });

        it('returns 400 if new password too short', async () => {
            const res = await request(app)
                .post('/api/admin/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'Admin@1234', newPassword: '12345' });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('8 characters'));
        });

        it('returns 400 if new password same as current', async () => {
            const res = await request(app)
                .post('/api/admin/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'Admin@1234', newPassword: 'Admin@1234' });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('different'));
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .post('/api/admin/change-password')
                .send({ currentPassword: 'Admin@1234', newPassword: 'newpass123' });
            assert.strictEqual(res.status, 401);
        });
    });

    describe('POST /api/admin/reset-password', () => {
        it('returns 400 when token or newPassword missing', async () => {
            const res = await request(app)
                .post('/api/admin/reset-password')
                .send({});
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
        });

        it('returns 400 for weak new password', async () => {
            const res = await request(app)
                .post('/api/admin/reset-password')
                .send({ token: 'anytoken', newPassword: 'short' });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('8 characters'));
        });

        it('returns 400 for invalid (never-issued) token', async () => {
            const res = await request(app)
                .post('/api/admin/reset-password')
                .send({ token: 'definitely-not-a-real-token', newPassword: 'StrongP@ss123' });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.ok(res.body.error.includes('Invalid or expired reset token'));
        });

        it('returns 400 for expired token', async () => {
            // Seed an expired token directly into the mock pool
            const { default: pool } = await import('../config/db.js');
            const crypto = await import('node:crypto');
            const rawToken = 'expired-test-token-abc123';
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago

            await pool.query(
                `INSERT INTO password_reset_tokens (email, token, expires_at, created_at)
                 VALUES ($1, $2, $3, NOW())`,
                ['admin@scs.com', tokenHash, pastDate]
            );

            const res = await request(app)
                .post('/api/admin/reset-password')
                .send({ token: rawToken, newPassword: 'StrongP@ss123' });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.ok(res.body.error.includes('Invalid or expired reset token'));
        });
    });
});
