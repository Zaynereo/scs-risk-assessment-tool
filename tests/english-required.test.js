/**
 * English-required validation tests
 * Verifies that admin endpoints reject saves when ANY English field is blank.
 * Run: NODE_ENV=test node --test tests/english-required.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown, getSuperAdminToken } from './helpers/setup.js';

describe('English-required validation', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    const token = getSuperAdminToken();

    // ==================== Cancer Types ====================

    const FULL_CT = {
        id: 'test-en-valid',
        name_en: 'Test Cancer',
        description_en: 'A test cancer type',
        familyLabel_en: 'Family history of test cancer'
    };

    describe('POST /api/admin/cancer-types', () => {
        it('rejects when name_en is missing', async () => {
            const res = await request(app)
                .post('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...FULL_CT, id: 'test-no-en', name_en: undefined });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.toLowerCase().includes('english name'));
        });

        it('rejects when description_en is missing', async () => {
            const res = await request(app)
                .post('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...FULL_CT, id: 'test-no-desc', description_en: '' });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.toLowerCase().includes('english description'));
        });

        it('rejects when familyLabel_en is missing', async () => {
            const res = await request(app)
                .post('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...FULL_CT, id: 'test-no-fam', familyLabel_en: '' });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.toLowerCase().includes('family'));
        });

        it('rejects when name_en is whitespace only', async () => {
            const res = await request(app)
                .post('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...FULL_CT, id: 'test-ws', name_en: '   ' });
            assert.strictEqual(res.status, 400);
        });

        it('reports all missing EN fields at once', async () => {
            const res = await request(app)
                .post('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`)
                .send({ id: 'test-all-empty', name_en: '', description_en: '', familyLabel_en: '' });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.toLowerCase().includes('english name'));
            assert.ok(res.body.error.toLowerCase().includes('english description'));
            assert.ok(res.body.error.toLowerCase().includes('family'));
        });

        it('accepts when all EN fields are provided', async () => {
            const res = await request(app)
                .post('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`)
                .send(FULL_CT);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });
    });

    describe('PUT /api/admin/cancer-types/:id', () => {
        it('rejects when name_en is explicitly emptied', async () => {
            const res = await request(app)
                .put('/api/admin/cancer-types/test-en-valid')
                .set('Authorization', `Bearer ${token}`)
                .send({ name_en: '' });
            assert.strictEqual(res.status, 400);
        });

        it('rejects when description_en is explicitly emptied', async () => {
            const res = await request(app)
                .put('/api/admin/cancer-types/test-en-valid')
                .set('Authorization', `Bearer ${token}`)
                .send({ description_en: '' });
            assert.strictEqual(res.status, 400);
        });

        it('allows partial update without EN fields in payload', async () => {
            const res = await request(app)
                .put('/api/admin/cancer-types/test-en-valid')
                .set('Authorization', `Bearer ${token}`)
                .send({ name_zh: '中文名' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });

        it('allows update when EN fields are non-empty', async () => {
            const res = await request(app)
                .put('/api/admin/cancer-types/test-en-valid')
                .set('Authorization', `Bearer ${token}`)
                .send({ name_en: 'Updated', description_en: 'Updated desc', familyLabel_en: 'Updated label' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });
    });

    // ==================== Recommendations EN ====================

    describe('Recommendation EN validation', () => {
        it('rejects when rec title EN is empty', async () => {
            const res = await request(app)
                .put('/api/admin/cancer-types/test-en-valid')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    recommendations: [{
                        trigger: 'always',
                        title: { en: '', zh: '标题' },
                        actions: [{ en: 'Action', zh: '' }]
                    }]
                });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.toLowerCase().includes('recommendation 1 title'));
        });

        it('rejects when rec action EN is empty', async () => {
            const res = await request(app)
                .put('/api/admin/cancer-types/test-en-valid')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    recommendations: [{
                        trigger: 'always',
                        title: { en: 'Title', zh: '' },
                        actions: [{ en: '', zh: '行动' }]
                    }]
                });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.toLowerCase().includes('action 1'));
        });

        it('reports multiple rec errors at once', async () => {
            const res = await request(app)
                .put('/api/admin/cancer-types/test-en-valid')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    recommendations: [
                        { trigger: 'always', title: { en: '' }, actions: [{ en: '' }] },
                        { trigger: 'always', title: { en: '' }, actions: [] }
                    ]
                });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('Recommendation 1 title'));
            assert.ok(res.body.error.includes('Recommendation 2 title'));
        });

        it('accepts when all rec EN fields are filled', async () => {
            const res = await request(app)
                .put('/api/admin/cancer-types/test-en-valid')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    recommendations: [{
                        trigger: 'always',
                        title: { en: 'Eat more vegetables', zh: '' },
                        actions: [{ en: 'Add greens to meals', zh: '' }]
                    }]
                });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });

        it('accepts empty recommendations array (no recs to validate)', async () => {
            const res = await request(app)
                .put('/api/admin/cancer-types/test-en-valid')
                .set('Authorization', `Bearer ${token}`)
                .send({ recommendations: [] });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });
    });

    // ==================== Question Bank ====================

    const FULL_Q = {
        id: 'test-q-en-valid',
        prompt_en: 'Do you exercise regularly?',
        explanationYes_en: 'Exercise reduces cancer risk.',
        explanationNo_en: 'Lack of exercise increases risk.'
    };

    describe('POST /api/admin/question-bank', () => {
        it('rejects when prompt_en is missing', async () => {
            const res = await request(app)
                .post('/api/admin/question-bank')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...FULL_Q, id: 'test-q-no-p', prompt_en: '' });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.toLowerCase().includes('prompt'));
        });

        it('rejects when explanationYes_en is missing', async () => {
            const res = await request(app)
                .post('/api/admin/question-bank')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...FULL_Q, id: 'test-q-no-ey', explanationYes_en: '' });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.toLowerCase().includes('yes'));
        });

        it('rejects when explanationNo_en is missing', async () => {
            const res = await request(app)
                .post('/api/admin/question-bank')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...FULL_Q, id: 'test-q-no-en2', explanationNo_en: '' });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.toLowerCase().includes('no'));
        });

        it('reports all missing EN fields at once', async () => {
            const res = await request(app)
                .post('/api/admin/question-bank')
                .set('Authorization', `Bearer ${token}`)
                .send({ id: 'test-q-all-empty', prompt_en: '', explanationYes_en: '', explanationNo_en: '' });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.toLowerCase().includes('prompt'));
            assert.ok(res.body.error.toLowerCase().includes('yes'));
            assert.ok(res.body.error.toLowerCase().includes('no'));
        });

        it('accepts when all EN fields are provided', async () => {
            const res = await request(app)
                .post('/api/admin/question-bank')
                .set('Authorization', `Bearer ${token}`)
                .send(FULL_Q);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });
    });

    describe('PUT /api/admin/question-bank/:id', () => {
        it('rejects when prompt_en is explicitly emptied', async () => {
            const res = await request(app)
                .put('/api/admin/question-bank/test-q-en-valid')
                .set('Authorization', `Bearer ${token}`)
                .send({ prompt_en: '' });
            assert.strictEqual(res.status, 400);
        });

        it('rejects when explanationYes_en is explicitly emptied', async () => {
            const res = await request(app)
                .put('/api/admin/question-bank/test-q-en-valid')
                .set('Authorization', `Bearer ${token}`)
                .send({ explanationYes_en: '' });
            assert.strictEqual(res.status, 400);
        });

        it('allows partial update without EN fields in payload', async () => {
            const res = await request(app)
                .put('/api/admin/question-bank/test-q-en-valid')
                .set('Authorization', `Bearer ${token}`)
                .send({ prompt_zh: '你经常锻炼吗？' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });
    });

    // ==================== PDPA ====================

    const FULL_PDPA = {
        enabled: true,
        title: { en: 'PDPA Notice' },
        purpose: { en: 'To assess cancer risk' },
        dataCollected: { en: 'Age, gender, health data' },
        checkboxLabel: { en: 'I consent to data collection' },
        agreeButtonText: { en: 'I Agree' }
    };

    describe('PUT /api/admin/pdpa', () => {
        it('rejects when title.en is missing', async () => {
            const res = await request(app)
                .put('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...FULL_PDPA, title: { zh: '测试' } });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('Title'));
        });

        it('rejects when purpose.en is missing', async () => {
            const res = await request(app)
                .put('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...FULL_PDPA, purpose: { en: '' } });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('Purpose'));
        });

        it('rejects when dataCollected.en is missing', async () => {
            const res = await request(app)
                .put('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...FULL_PDPA, dataCollected: {} });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('Data Collected'));
        });

        it('rejects when checkboxLabel.en is missing', async () => {
            const res = await request(app)
                .put('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...FULL_PDPA, checkboxLabel: { en: '' } });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('Checkbox'));
        });

        it('rejects when agreeButtonText.en is missing', async () => {
            const res = await request(app)
                .put('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`)
                .send({ ...FULL_PDPA, agreeButtonText: null });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('Agree'));
        });

        it('reports all missing EN fields at once', async () => {
            const res = await request(app)
                .put('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    enabled: true,
                    title: {}, purpose: {}, dataCollected: {},
                    checkboxLabel: {}, agreeButtonText: {}
                });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('Title'));
            assert.ok(res.body.error.includes('Purpose'));
            assert.ok(res.body.error.includes('Data Collected'));
            assert.ok(res.body.error.includes('Checkbox'));
            assert.ok(res.body.error.includes('Agree'));
        });

        it('accepts when all EN fields are provided', async () => {
            const res = await request(app)
                .put('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`)
                .send(FULL_PDPA);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });
    });

    // ==================== Translations ====================

    describe('PUT /api/admin/translations', () => {
        it('rejects when a key has empty en value', async () => {
            const res = await request(app)
                .put('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    landing: {
                        landingTitle: { en: '', zh: '标题', ms: 'Tajuk', ta: 'தலைப்பு' }
                    }
                });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('landing.landingTitle'));
        });

        it('rejects when multiple keys have empty en values', async () => {
            const res = await request(app)
                .put('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    landing: {
                        landingTitle: { en: '', zh: '标题' },
                        landingSubtitle: { en: '', zh: '副标题' }
                    }
                });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('landing.landingTitle'));
            assert.ok(res.body.error.includes('landing.landingSubtitle'));
        });

        it('rejects when en is whitespace only', async () => {
            const res = await request(app)
                .put('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    common: {
                        loading: { en: '   ' }
                    }
                });
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('common.loading'));
        });

        it('accepts when all keys have non-empty en values', async () => {
            const res = await request(app)
                .put('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    landing: {
                        landingTitle: { en: 'Valid Title', zh: '', ms: '', ta: '' }
                    }
                });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });

        it('empty body is still accepted (no keys to validate)', async () => {
            const res = await request(app)
                .put('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`)
                .send({});
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });
    });

    // ==================== Cleanup ====================

    describe('Cleanup', () => {
        it('removes test cancer type', async () => {
            await request(app)
                .delete('/api/admin/cancer-types/test-en-valid')
                .set('Authorization', `Bearer ${token}`);
        });

        it('removes test question', async () => {
            await request(app)
                .delete('/api/admin/question-bank/test-q-en-valid')
                .set('Authorization', `Bearer ${token}`);
        });
    });
});
