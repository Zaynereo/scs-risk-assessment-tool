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
                .send({ currentPassword: 'admin123', newPassword: '12345' });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('6 characters'));
        });

        it('returns 400 if new password same as current', async () => {
            const res = await request(app)
                .post('/api/admin/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'admin123', newPassword: 'admin123' });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('different'));
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .post('/api/admin/change-password')
                .send({ currentPassword: 'admin123', newPassword: 'newpass123' });
            assert.strictEqual(res.status, 401);
        });
    });
});
