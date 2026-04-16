/**
 * Tests for server.js public endpoints:
 * - POST /api/admin/login
 * - POST /api/admin/forgot-password
 * - POST /api/admin/reset-password
 * - GET /api/theme
 * - GET /api/pdpa
 * Run: NODE_ENV=test node --test tests/auth-and-public.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown } from './helpers/setup.js';
import { AdminModel } from '../models/adminModel.js';

describe('POST /api/admin/login', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 400 if email or password missing', async () => {
        const res = await request(app)
            .post('/api/admin/login')
            .send({});
        assert.strictEqual(res.status, 400);
    });

    it('returns 401 for invalid credentials', async () => {
        const res = await request(app)
            .post('/api/admin/login')
            .send({ email: 'admin@scs.com', password: 'wrongpassword' });
        assert.strictEqual(res.status, 401);
    });

    it('returns token for valid credentials', async () => {
        const res = await request(app)
            .post('/api/admin/login')
            .send({ email: 'admin@scs.com', password: 'Admin@1234' });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.token);
        assert.strictEqual(res.body.admin.email, 'admin@scs.com');
        assert.strictEqual(res.body.admin.role, 'super_admin');
        assert.ok(!res.body.admin.password, 'password should not be returned');
    });
});

describe('POST /api/admin/forgot-password', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 400 if email missing', async () => {
        const res = await request(app)
            .post('/api/admin/forgot-password')
            .send({});
        assert.strictEqual(res.status, 400);
    });

    it('returns 400 for email with single-char TLD', async () => {
        // Guards against the previously permissive regex that accepted "a@b.c".
        const res = await request(app)
            .post('/api/admin/forgot-password')
            .send({ email: 'a@b.c' });
        assert.strictEqual(res.status, 400);
    });

    it('returns success even for non-existent email (prevents enumeration)', async () => {
        const res = await request(app)
            .post('/api/admin/forgot-password')
            .send({ email: 'nonexistent@test.com' });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.message);
    });

    it('returns success for valid email', async () => {
        const res = await request(app)
            .post('/api/admin/forgot-password')
            .send({ email: 'admin@scs.com' });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.message);
    });
});

describe('POST /api/admin/reset-password', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 400 if token or newPassword missing', async () => {
        const res = await request(app)
            .post('/api/admin/reset-password')
            .send({});
        assert.strictEqual(res.status, 400);
    });

    it('returns 400 if password too short', async () => {
        const res = await request(app)
            .post('/api/admin/reset-password')
            .send({ token: 'fake-token', newPassword: '123' });
        assert.strictEqual(res.status, 400);
    });

    it('returns 400 for invalid/expired token', async () => {
        const res = await request(app)
            .post('/api/admin/reset-password')
            .send({ token: 'invalid-token', newPassword: 'newpass123' });
        assert.strictEqual(res.status, 400);
    });

    it('prevents reset token reuse after successful reset', async () => {
        const adminModel = new AdminModel();
        const token = await adminModel.createResetToken('admin@scs.com');

        // First reset should succeed
        const res1 = await request(app)
            .post('/api/admin/reset-password')
            .send({ token, newPassword: 'NewPass1!' });
        assert.strictEqual(res1.status, 200);

        // Second reset with same token should fail
        const res2 = await request(app)
            .post('/api/admin/reset-password')
            .send({ token, newPassword: 'AnotherPass2!' });
        assert.strictEqual(res2.status, 400);
    });
});

describe('GET /api/theme', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 200 with theme object', async () => {
        const res = await request(app).get('/api/theme');
        assert.strictEqual(res.status, 200);
        assert.ok(typeof res.body === 'object');
    });
});

describe('GET /api/pdpa', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 200 with PDPA config', async () => {
        const res = await request(app).get('/api/pdpa');
        assert.strictEqual(res.status, 200);
        assert.ok(typeof res.body === 'object');
    });
});

