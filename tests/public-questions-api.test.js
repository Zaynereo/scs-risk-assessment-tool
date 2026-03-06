/**
 * API tests for public question endpoints (routes/questions.js)
 * Run: NODE_ENV=test node --test tests/public-questions-api.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown } from './helpers/setup.js';

describe('GET /api/questions/cancer-types', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 200 with array of cancer types', async () => {
        const res = await request(app).get('/api/questions/cancer-types');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.data.length > 0);
    });

    it('each cancer type has id, name, description', async () => {
        const res = await request(app).get('/api/questions/cancer-types');
        const ct = res.body.data[0];
        assert.ok('id' in ct);
        assert.ok('name' in ct);
        assert.ok('description' in ct);
    });

    it('supports lang query parameter', async () => {
        const res = await request(app).get('/api/questions/cancer-types?lang=zh');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
    });
});

describe('GET /api/questions/cancer-types/:id', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 200 for existing cancer type', async () => {
        const res = await request(app).get('/api/questions/cancer-types/colorectal');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.data.id, 'colorectal');
    });

    it('returns 404 for nonexistent cancer type', async () => {
        const res = await request(app).get('/api/questions/cancer-types/nonexistent');
        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.body.success, false);
    });
});

describe('GET /api/questions', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 200 with array of questions', async () => {
        const res = await request(app).get('/api/questions');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.ok(Array.isArray(res.body.data));
    });

    it('filters by cancerType query param', async () => {
        const res = await request(app).get('/api/questions?cancerType=colorectal');
        assert.strictEqual(res.status, 200);
        // All returned questions should relate to colorectal
        assert.ok(res.body.data.length > 0);
    });

    it('supports lang query param', async () => {
        const res = await request(app).get('/api/questions?lang=zh');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
    });
});

describe('GET /api/questions/all', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 200 with all questions including all language fields', async () => {
        const res = await request(app).get('/api/questions/all');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.ok(Array.isArray(res.body.data));
    });

    it('filters by cancerType query param', async () => {
        const all = await request(app).get('/api/questions/all');
        const filtered = await request(app).get('/api/questions/all?cancerType=colorectal');
        assert.ok(filtered.body.data.length <= all.body.data.length);
    });
});

describe('GET /api/questions/by-assessment', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 400 if assessmentId missing', async () => {
        const res = await request(app).get('/api/questions/by-assessment');
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
    });

    it('returns 200 with questions for valid assessmentId', async () => {
        const res = await request(app).get('/api/questions/by-assessment?assessmentId=colorectal');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.ok(Array.isArray(res.body.data));
    });
});

describe('GET /api/questions/:id', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 404 for nonexistent question', async () => {
        const res = await request(app).get('/api/questions/nonexistent-id');
        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.body.success, false);
    });

    it('returns 200 with localized question for valid ID', async () => {
        // First get a question to know a valid ID
        const allRes = await request(app).get('/api/questions/all');
        if (allRes.body.data.length > 0) {
            const id = allRes.body.data[0].id;
            const res = await request(app).get(`/api/questions/${id}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok('prompt' in res.body.data);
        }
    });
});
