/**
 * Admin Assessments & Assignments API tests
 * Run: NODE_ENV=test node --test tests/admin-assessments.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown, getSuperAdminToken } from './helpers/setup.js';

describe('Admin Assessments API', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    const token = getSuperAdminToken();

    describe('GET /api/admin/assessments', () => {
        it('returns 200 with assessments array', async () => {
            const res = await request(app)
                .get('/api/admin/assessments')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(Array.isArray(res.body.data));
        });
    });

    describe('GET /api/admin/assessments/:id/assignments', () => {
        it('returns 200 with assignments for a cancer type', async () => {
            // Get a real cancer type id first
            const types = await request(app)
                .get('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`);
            if (types.body.data.length > 0) {
                const id = types.body.data[0].id;
                const res = await request(app)
                    .get(`/api/admin/assessments/${id}/assignments`)
                    .set('Authorization', `Bearer ${token}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.body.success, true);
                assert.ok(Array.isArray(res.body.data));
            }
        });
    });

    describe('PUT /api/admin/assessments/:id/assignments', () => {
        it('returns 400 if assignments not an array', async () => {
            const res = await request(app)
                .put('/api/admin/assessments/test/assignments')
                .set('Authorization', `Bearer ${token}`)
                .send({ assignments: 'not-array' });
            assert.strictEqual(res.status, 400);
        });

        it('saves assignments successfully', async () => {
            const res = await request(app)
                .put('/api/admin/assessments/test-assessment/assignments')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    assignments: [{
                        questionId: 'q1',
                        weight: '50',
                        yesValue: '100',
                        noValue: '0',
                        category: 'Lifestyle',
                        minAge: ''
                    }]
                });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.updated, 1);
        });
    });

    describe('GET /api/admin/assessments/export', () => {
        it('returns 200 CSV attachment from DB', async () => {
            const res = await request(app)
                .get('/api/admin/assessments/export')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.ok(res.headers['content-type'].includes('text/csv'));
            assert.ok(res.headers['content-disposition'].includes('attachment'));
        });

        it('returns 401 without auth token', async () => {
            const res = await request(app)
                .get('/api/admin/assessments/export');
            assert.strictEqual(res.status, 401);
        });
    });
});
