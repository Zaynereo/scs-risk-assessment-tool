/**
 * Tests for server.js public endpoints:
 * - POST /api/admin/login
 * - POST /api/admin/forgot-password
 * - POST /api/admin/reset-password
 * - GET /api/theme
 * - GET /api/pdpa
 * - autoCalculateWeights (riskCalculator.js)
 * Run: NODE_ENV=test node --test tests/auth-and-public.test.js
 */

import { describe, it, before, after } from 'node:test';
import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown } from './helpers/setup.js';
import { autoCalculateWeights } from '../controllers/riskCalculator.js';

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
            .send({ email: 'admin@scs.com', password: 'admin123' });
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

// ---- autoCalculateWeights (pure function, untested until now) ----

test('autoCalculateWeights: distributes remaining weight equally', () => {
    const questions = [
        { weight: '60' },
        { weight: '' },
        { weight: '' }
    ];
    const result = autoCalculateWeights(questions);
    assert.strictEqual(result[0].weight, '60');
    assert.strictEqual(parseFloat(result[1].weight), 20);
    assert.strictEqual(parseFloat(result[2].weight), 20);
});

test('autoCalculateWeights: no change when all have weights', () => {
    const questions = [{ weight: '50' }, { weight: '50' }];
    const result = autoCalculateWeights(questions);
    assert.strictEqual(result[0].weight, '50');
    assert.strictEqual(result[1].weight, '50');
});

test('autoCalculateWeights: all empty weights get equal share of 100', () => {
    const questions = [{ weight: '' }, { weight: '' }, { weight: '' }, { weight: '' }];
    const result = autoCalculateWeights(questions);
    result.forEach(q => assert.strictEqual(parseFloat(q.weight), 25));
});
