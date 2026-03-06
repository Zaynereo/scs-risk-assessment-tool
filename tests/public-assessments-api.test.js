/**
 * API tests for public assessment endpoints (routes/assessments.js)
 * Run: NODE_ENV=test node --test tests/public-assessments-api.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown } from './helpers/setup.js';

describe('POST /api/assessments', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 400 if userData or answers missing', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({});
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
    });

    it('returns 200 with risk result for valid submission', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({
                userData: {
                    age: 30,
                    gender: 'Male',
                    familyHistory: 'No',
                    assessmentType: 'colorectal'
                },
                answers: [
                    {
                        weight: 10,
                        yesValue: 100,
                        noValue: 0,
                        userAnswer: 'Yes',
                        category: 'Lifestyle'
                    }
                ]
            });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.ok('riskScore' in res.body.data);
        assert.ok('riskLevel' in res.body.data);
        assert.ok('recommendations' in res.body.data);
        assert.ok('assessmentId' in res.body.data);
    });

    it('returns recommendations array', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({
                userData: { age: 50, gender: 'Female', familyHistory: 'Yes', assessmentType: 'colorectal' },
                answers: [
                    { weight: 20, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Diet & Nutrition' }
                ]
            });
        assert.ok(Array.isArray(res.body.data.recommendations));
        assert.ok(res.body.data.recommendations.length > 0);
    });

    it('returns cancerTypeScores for generic assessment', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({
                userData: { age: 30, gender: 'Male', familyHistory: 'No', assessmentType: 'generic' },
                answers: [
                    { weight: 10, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'breast' }
                ]
            });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.data.cancerTypeScores);
    });
});

describe('POST /api/assessments/send-results', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 400 if contact missing', async () => {
        const res = await request(app)
            .post('/api/assessments/send-results')
            .send({});
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
    });

    it('returns 400 for invalid email format', async () => {
        const res = await request(app)
            .post('/api/assessments/send-results')
            .send({ contact: 'not-an-email' });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
    });
});

describe('GET /api/assessments/stats', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns 200 with statistics object', async () => {
        const res = await request(app).get('/api/assessments/stats');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.ok('total' in res.body.data);
        assert.ok('riskLevelDistribution' in res.body.data);
    });
});
