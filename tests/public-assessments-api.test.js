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

    it('returns correct calculated risk score for single answer', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({
                userData: { age: 30, gender: 'Male', familyHistory: 'No', assessmentType: 'colorectal' },
                answers: [
                    { weight: 20, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle' }
                ]
            });
        // weight=20, yesValue=100 → contribution = 20 * (100/100) = 20
        assert.strictEqual(res.body.data.riskScore, 20);
        assert.strictEqual(res.body.data.riskLevel, 'LOW');
    });

    it('returns correct risk score with family history and age risk', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({
                userData: { age: 55, gender: 'Male', familyHistory: 'Yes', assessmentType: 'colorectal' },
                answers: [
                    { weight: 30, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Diet & Nutrition' },
                    { weight: 10, yesValue: 100, noValue: 0, userAnswer: 'No', category: 'Lifestyle' }
                ]
            });
        // familyHistory=Yes adds familyWeight (fixture default), quiz answer 30% Yes = 30
        // Age and ethnicity contributions depend on fixture cancer type config
        assert.strictEqual(res.body.data.success !== false, true);
        assert.ok(res.body.data.riskScore >= 30, `Score should be at least 30 (quiz=30 + familyHistory), got ${res.body.data.riskScore}`);
    });

    it('returns zero score when all answers are No with noValue=0', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({
                userData: { age: 25, gender: 'Female', familyHistory: 'No', assessmentType: 'colorectal' },
                answers: [
                    { weight: 50, yesValue: 100, noValue: 0, userAnswer: 'No', category: 'Lifestyle' },
                    { weight: 50, yesValue: 100, noValue: 0, userAnswer: 'No', category: 'Diet & Nutrition' }
                ]
            });
        assert.strictEqual(res.body.data.riskScore, 0);
        assert.strictEqual(res.body.data.riskLevel, 'LOW');
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

    it('returns 200 with new statistics shape', async () => {
        const res = await request(app).get('/api/assessments/stats');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        const d = res.body.data;
        assert.ok('total' in d, 'missing total');
        assert.ok('riskLevels' in d, 'missing riskLevels');
        assert.ok('avgRiskScore' in d, 'missing avgRiskScore');
        assert.ok('byCancerType' in d, 'missing byCancerType');
        assert.ok('byAge' in d, 'missing byAge');
        assert.ok('byGender' in d, 'missing byGender');
        assert.ok('byFamilyHistory' in d, 'missing byFamilyHistory');
        assert.ok('categoryRisks' in d, 'missing categoryRisks');
        assert.ok('topQuestions' in d, 'missing topQuestions');
    });

    it('riskLevels has LOW MEDIUM HIGH counts', async () => {
        const res = await request(app).get('/api/assessments/stats');
        const rl = res.body.data.riskLevels;
        assert.ok('LOW' in rl && 'MEDIUM' in rl && 'HIGH' in rl);
        // fixture: 2 LOW, 1 MEDIUM, 1 HIGH
        assert.strictEqual(rl.LOW, 2);
        assert.strictEqual(rl.MEDIUM, 1);
        assert.strictEqual(rl.HIGH, 1);
    });

    it('byCancerType entries have risk level breakdown', async () => {
        const res = await request(app).get('/api/assessments/stats');
        const ct = res.body.data.byCancerType;
        assert.ok(Array.isArray(ct));
        const colorectal = ct.find(t => t.name === 'colorectal');
        assert.ok(colorectal, 'colorectal entry missing');
        assert.ok('LOW' in colorectal && 'MEDIUM' in colorectal && 'HIGH' in colorectal);
        assert.strictEqual(colorectal.count, 3); // a1, a3, a4
    });

    it('topQuestions has yes rate', async () => {
        const res = await request(app).get('/api/assessments/stats');
        const qs = res.body.data.topQuestions;
        assert.ok(Array.isArray(qs));
        if (qs.length > 0) {
            assert.ok('yesRate' in qs[0]);
            assert.ok('avgContribution' in qs[0]);
        }
    });

    it('date filter: startDate excludes older records', async () => {
        // Only records from Feb 2026 onwards (a2, a3, a4)
        const res = await request(app).get('/api/assessments/stats?startDate=2026-02-01');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.data.total, 3);
    });

    it('date filter: endDate excludes newer records', async () => {
        // Only records up to Jan 2026 (a1 only)
        const res = await request(app).get('/api/assessments/stats?endDate=2026-01-31');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.data.total, 1);
    });

    it('date filter: combined startDate + endDate filters correctly', async () => {
        // Only records in Feb 2026 (a2: Feb 10, a3: Feb 20)
        const res = await request(app).get('/api/assessments/stats?startDate=2026-02-01&endDate=2026-02-28');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.data.total, 2);
    });
});
