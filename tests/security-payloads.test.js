/**
 * Smoke tests firing canonical SQL-injection and XSS payloads at public POST
 * endpoints. The server must not 500, and payloads must round-trip as literal
 * strings (not interpreted as SQL). Guards against regressions that introduce
 * string concatenation into SQL or unescaped output.
 * Run: NODE_ENV=test node --test tests/security-payloads.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown } from './helpers/setup.js';

const SQL_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE admins; --",
    "1' UNION SELECT NULL, NULL, NULL --"
];
const XSS_PAYLOADS = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '"><svg/onload=alert(1)>'
];

describe('Security payload smoke tests', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    describe('POST /api/assessments', () => {
        for (const payload of SQL_PAYLOADS) {
            it(`handles SQL payload in ethnicity field: ${payload}`, async () => {
                const res = await request(app)
                    .post('/api/assessments')
                    .send({
                        userData: {
                            age: 30, gender: 'Male',
                            ethnicity: payload,
                            familyHistory: 'No',
                            assessmentType: 'colorectal'
                        },
                        answers: [
                            { questionId: 'q1', weight: 10, yesValue: 100, noValue: 0, userAnswer: 'No', category: 'Lifestyle' }
                        ]
                    });
                assert.notStrictEqual(res.status, 500, `SQL payload should not cause 500. Got ${res.status}. Body: ${JSON.stringify(res.body)}`);
                // admins table must still exist — drop payload must not execute
                const healthCheck = await request(app).get('/api/assessments/stats');
                assert.strictEqual(healthCheck.status, 200, 'admins table should survive drop attempt');
            });
        }

        for (const payload of XSS_PAYLOADS) {
            it(`handles XSS payload in gender field: ${payload}`, async () => {
                const res = await request(app)
                    .post('/api/assessments')
                    .send({
                        userData: {
                            age: 30, gender: payload, ethnicity: 'Chinese',
                            familyHistory: 'No', assessmentType: 'colorectal'
                        },
                        answers: [
                            { questionId: 'q1', weight: 10, yesValue: 100, noValue: 0, userAnswer: 'No', category: 'Lifestyle' }
                        ]
                    });
                assert.notStrictEqual(res.status, 500);
                // Response must not reflect the raw script tag — it should be either rejected
                // or JSON-encoded (which neutralizes it). JSON responses escape < automatically.
                const raw = JSON.stringify(res.body);
                if (payload.includes('<script>')) {
                    assert.ok(!raw.includes('<script>alert(1)</script>') || raw.includes('\\u003cscript'),
                        'raw script tag must not appear unescaped in response');
                }
            });
        }
    });

    describe('POST /api/assessments/send-results', () => {
        for (const payload of SQL_PAYLOADS) {
            it(`rejects SQL payload in contact field: ${payload}`, async () => {
                const res = await request(app)
                    .post('/api/assessments/send-results')
                    .send({ contact: payload });
                // Payload is not a valid email — must be rejected as 400, not 500
                assert.strictEqual(res.status, 400, `Expected 400 invalid-email, got ${res.status}`);
                assert.strictEqual(res.body.success, false);
            });
        }
    });

    describe('POST /api/admin/login', () => {
        for (const payload of SQL_PAYLOADS) {
            it(`does not authenticate with SQL payload in email: ${payload}`, async () => {
                const res = await request(app)
                    .post('/api/admin/login')
                    .send({ email: payload, password: 'anything' });
                // Must fail auth (400 invalid email or 401 invalid credentials), never 500, never 200
                assert.ok([400, 401].includes(res.status),
                    `Expected 400 or 401 for SQL payload, got ${res.status}`);
                assert.notStrictEqual(res.body.success, true);
            });
        }
    });

    describe('POST /api/admin/forgot-password', () => {
        for (const payload of SQL_PAYLOADS) {
            it(`handles SQL payload in email without 500: ${payload}`, async () => {
                const res = await request(app)
                    .post('/api/admin/forgot-password')
                    .send({ email: payload });
                // Enumeration-safe: either 400 invalid-email or 200 generic message
                assert.ok([200, 400].includes(res.status),
                    `Expected 200 or 400 for SQL payload, got ${res.status}`);
            });
        }
    });
});
