/**
 * Admin Questions & Question Bank API tests
 * Run: NODE_ENV=test node --test tests/admin-questions.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown, getSuperAdminToken } from './helpers/setup.js';

describe('Admin Questions API', () => {
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
    });

    describe('GET /api/admin/questions', () => {
        it('returns 200 with questions array', async () => {
            const res = await request(app)
                .get('/api/admin/questions')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(Array.isArray(res.body.data));
        });
    });

    describe('POST /api/admin/questions/bulk', () => {
        it('returns 400 if questions array empty', async () => {
            const res = await request(app)
                .post('/api/admin/questions/bulk')
                .set('Authorization', `Bearer ${token}`)
                .send({ questions: [] });
            assert.strictEqual(res.status, 400);
        });

        it('returns 400 if questions not an array', async () => {
            const res = await request(app)
                .post('/api/admin/questions/bulk')
                .set('Authorization', `Bearer ${token}`)
                .send({ questions: 'not-array' });
            assert.strictEqual(res.status, 400);
        });
    });

    describe('POST /api/admin/questions (single)', () => {
        it('creates a new question', async () => {
            const res = await request(app)
                .post('/api/admin/questions')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    cancerType: 'colorectal',
                    prompt_en: 'Test single question',
                    weight: '5',
                    yesValue: '100',
                    noValue: '0',
                    category: 'Lifestyle'
                });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(res.body.data.id);
        });
    });

    describe('GET /api/admin/questions/:id', () => {
        it('returns 404 for nonexistent question', async () => {
            const res = await request(app)
                .get('/api/admin/questions/nonexistent-id')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.success, false);
        });

        it('returns question for valid ID', async () => {
            // Get a valid ID first
            const list = await request(app)
                .get('/api/admin/questions')
                .set('Authorization', `Bearer ${token}`);
            if (list.body.data.length > 0) {
                const id = list.body.data[0].id;
                const res = await request(app)
                    .get(`/api/admin/questions/${id}`)
                    .set('Authorization', `Bearer ${token}`);
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.body.success, true);
                assert.strictEqual(res.body.data.id, id);
            }
        });
    });

    describe('PUT /api/admin/questions/:id', () => {
        it('updates an existing question', async () => {
            const list = await request(app)
                .get('/api/admin/questions')
                .set('Authorization', `Bearer ${token}`);
            if (list.body.data.length > 0) {
                const id = list.body.data[0].id;
                const res = await request(app)
                    .put(`/api/admin/questions/${id}`)
                    .set('Authorization', `Bearer ${token}`)
                    .send({ weight: '15' });
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.body.success, true);
            }
        });
    });

    describe('DELETE /api/admin/questions/:id', () => {
        it('deletes a question', async () => {
            // Create a question to delete
            const createRes = await request(app)
                .post('/api/admin/questions')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    cancerType: 'colorectal',
                    prompt_en: 'Question to delete',
                    weight: '1',
                    yesValue: '100',
                    noValue: '0',
                    category: 'Lifestyle'
                });
            const id = createRes.body.data.id;

            const res = await request(app)
                .delete(`/api/admin/questions/${id}`)
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);

            // Confirm it's gone
            const getRes = await request(app)
                .get(`/api/admin/questions/${id}`)
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(getRes.status, 404);
        });
    });
});
