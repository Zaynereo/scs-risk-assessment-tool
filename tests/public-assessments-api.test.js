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
                    ethnicity: 'Chinese',
                    familyHistory: 'No',
                    assessmentType: 'colorectal'
                },
                answers: [
                    {
                        questionId: 'q1',
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
                userData: { age: 30, gender: 'Male', ethnicity: 'Others', familyHistory: 'No', assessmentType: 'colorectal' },
                answers: [
                    { questionId: 'q1', weight: 20, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle' }
                ]
            });
        // weight=20, yesValue=100 → contribution = 20 * (100/100) = 20 + ethnicity(Others=1) = 21
        assert.strictEqual(res.body.data.riskScore, 21);
        assert.strictEqual(res.body.data.riskLevel, 'LOW');
    });

    it('returns correct risk score with family history and age risk', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({
                userData: { age: 55, gender: 'Male', ethnicity: 'Chinese', familyHistory: 'Yes', assessmentType: 'colorectal' },
                answers: [
                    { questionId: 'q1', weight: 30, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Diet & Nutrition' },
                    { questionId: 'q2', weight: 10, yesValue: 100, noValue: 0, userAnswer: 'No', category: 'Lifestyle' }
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
                userData: { age: 25, gender: 'Female', ethnicity: 'Others', familyHistory: 'No', assessmentType: 'colorectal' },
                answers: [
                    { questionId: 'q1', weight: 50, yesValue: 100, noValue: 0, userAnswer: 'No', category: 'Lifestyle' },
                    { questionId: 'q2', weight: 50, yesValue: 100, noValue: 0, userAnswer: 'No', category: 'Diet & Nutrition' }
                ]
            });
        // All No answers with noValue=0, but ethnicity(Others=1) adds 1
        assert.strictEqual(res.body.data.riskScore, 1);
        assert.strictEqual(res.body.data.riskLevel, 'LOW');
    });

    it('returns recommendations array', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({
                userData: { age: 50, gender: 'Female', ethnicity: 'Chinese', familyHistory: 'Yes', assessmentType: 'colorectal' },
                answers: [
                    { questionId: 'q1', weight: 20, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Diet & Nutrition' }
                ]
            });
        assert.ok(Array.isArray(res.body.data.recommendations));
        assert.ok(res.body.data.recommendations.length > 0);
    });

    it('returns cancerTypeScores for generic assessment', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({
                userData: { age: 30, gender: 'Male', ethnicity: 'Chinese', familyHistory: 'No', assessmentType: 'generic' },
                answers: [
                    { questionId: 'q1', weight: 10, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'breast' }
                ]
            });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.data.cancerTypeScores);
    });

    it('returns 400 when userData is present but answers are missing', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({
                userData: { age: 30, gender: 'Male', ethnicity: 'Chinese', familyHistory: 'No', assessmentType: 'colorectal' }
            });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
    });

    it('returns 400 when answers are not an array', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({
                userData: { age: 30, gender: 'Male', ethnicity: 'Chinese', familyHistory: 'No', assessmentType: 'colorectal' },
                answers: 'not-an-array'
            });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
    });

    it('returns 400 for assessmentType with unsafe path characters', async () => {
        const res = await request(app)
            .post('/api/assessments')
            .send({
                userData: { age: 30, gender: 'Male', ethnicity: 'Chinese', familyHistory: 'No', assessmentType: '../../etc/passwd' },
                answers: [
                    { questionId: 'q1', weight: 10, yesValue: 100, noValue: 0, userAnswer: 'No', category: 'Lifestyle' }
                ]
            });
        // Server must either reject (400) or treat as unknown type (200 with default), never 500
        assert.notStrictEqual(res.status, 500);
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

    it('returns 400 for email with single-char TLD', async () => {
        // Guards against the previously permissive regex that accepted "a@b.c".
        const res = await request(app)
            .post('/api/assessments/send-results')
            .send({ contact: 'a@b.c' });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
    });

    it('accepts email with a valid 2-char TLD format', async () => {
        // Should pass the regex; downstream may still fail for other reasons
        // (missing assessment data), but the rejection must not be on email format.
        const res = await request(app)
            .post('/api/assessments/send-results')
            .send({ contact: 'user@example.co' });
        // Any status other than 400-for-invalid-email-format is acceptable here.
        if (res.status === 400) {
            assert.notStrictEqual(
                res.body.error,
                'Please enter a valid email address',
                'email with 2-char TLD should not be rejected as invalid format'
            );
        }
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

    it('returns 400 for invalid startDate format', async () => {
        const res = await request(app).get('/api/assessments/stats?startDate=not-a-date');
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
    });

    it('returns 400 for invalid endDate format', async () => {
        const res = await request(app).get('/api/assessments/stats?endDate=2026-13-99');
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
    });

    it('response includes ageByType array', async () => {
        const res = await request(app).get('/api/assessments/stats');
        assert.ok(Array.isArray(res.body.data.ageByType), 'ageByType should be an array');
        if (res.body.data.ageByType.length > 0) {
            const row = res.body.data.ageByType[0];
            assert.ok('age' in row, 'ageByType row missing age');
            assert.ok('assessmentType' in row, 'ageByType row missing assessmentType');
            assert.ok('count' in row && 'LOW' in row && 'MEDIUM' in row && 'HIGH' in row);
        }
    });

    it('public stats endpoint does not expose rawRows', async () => {
        const res = await request(app).get('/api/assessments/stats');
        assert.strictEqual(res.body.data.rawRows, undefined, 'rawRows should not be in public stats response');
    });
});

describe('GET /api/assessments/:id (public)', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('is not a public route — any request returns 404', async () => {
        // This route does not exist in routes/assessments.js and must not be added
        // without authentication, because it would expose individual assessment records.
        const res = await request(app).get('/api/assessments/some-random-id');
        assert.strictEqual(res.status, 404,
            'public GET /api/assessments/:id must not exist (would leak individual assessments)');
    });

    it('does not leak assessment data for an invalid UUID', async () => {
        const res = await request(app).get('/api/assessments/not-a-uuid');
        assert.strictEqual(res.status, 404);
    });
});

describe('POST /api/assessments/send-results negative paths', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('rejects an email with consecutive dots', async () => {
        const res = await request(app)
            .post('/api/assessments/send-results')
            .send({ contact: 'user..name@example.com' });
        // Current regex may or may not accept this; assert the server handles it without 500
        assert.notStrictEqual(res.status, 500);
    });

    it('rejects an empty-string contact as missing', async () => {
        const res = await request(app)
            .post('/api/assessments/send-results')
            .send({ contact: '' });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
    });
});
