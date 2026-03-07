/**
 * Admin Question Bank API tests
 * Run: NODE_ENV=test node --test tests/admin-questions.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown, getSuperAdminToken } from './helpers/setup.js';

describe('Admin Question Bank API', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    const token = getSuperAdminToken();

    describe('GET /api/admin/question-bank', () => {
        it('returns 200 with bank view array', async () => {
            const res = await request(app)
                .get('/api/admin/question-bank')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(Array.isArray(res.body.data));
        });
    });

    describe('POST /api/admin/question-bank', () => {
        it('creates a new bank entry', async () => {
            const res = await request(app)
                .post('/api/admin/question-bank')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    id: 'test-q-001',
                    prompt_en: 'Do you smoke?',
                    prompt_zh: '你抽烟吗？',
                    prompt_ms: 'Adakah anda merokok?',
                    prompt_ta: 'நீங்கள் புகைபிடிக்கிறீர்களா?',
                    explanationYes_en: 'Smoking increases cancer risk.',
                    explanationYes_zh: '',
                    explanationYes_ms: '',
                    explanationYes_ta: '',
                    explanationNo_en: '',
                    explanationNo_zh: '',
                    explanationNo_ms: '',
                    explanationNo_ta: ''
                });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });

        it('returns 500 for duplicate ID', async () => {
            const res = await request(app)
                .post('/api/admin/question-bank')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    id: 'test-q-001',
                    prompt_en: 'Duplicate question'
                });
            assert.strictEqual(res.status, 500);
        });
    });

    describe('PUT /api/admin/question-bank/:id', () => {
        it('updates prompts for a bank entry', async () => {
            // Get an existing entry
            const list = await request(app)
                .get('/api/admin/question-bank')
                .set('Authorization', `Bearer ${token}`);
            if (list.body.data.length > 0) {
                const id = list.body.data[0].id;
                const res = await request(app)
                    .put(`/api/admin/question-bank/${id}`)
                    .set('Authorization', `Bearer ${token}`)
                    .send({ prompt_en: 'Updated prompt text' });
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.body.success, true);
            }
        });

        it('returns 500 for nonexistent entry', async () => {
            const res = await request(app)
                .put('/api/admin/question-bank/nonexistent-id')
                .set('Authorization', `Bearer ${token}`)
                .send({ prompt_en: 'Should fail' });
            assert.strictEqual(res.status, 500);
        });
    });
});
