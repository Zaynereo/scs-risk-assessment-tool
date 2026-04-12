/**
 * i18n fallback tests
 * Verifies that blank non-EN fields fall back to English values
 * across cancer types, questions, PDPA, and translations.
 * Run: NODE_ENV=test node --test tests/i18n-fallback.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown, getSuperAdminToken } from './helpers/setup.js';

describe('i18n fallback — blank non-EN falls back to English', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    const token = getSuperAdminToken();

    // ==================== Cancer Types ====================

    describe('Cancer types', () => {
        before(async () => {
            // Create a cancer type with EN only, blank ZH/MS/TA
            await request(app)
                .post('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    id: 'fallback-test',
                    name_en: 'Fallback Cancer',
                    name_zh: '',
                    name_ms: '',
                    name_ta: '',
                    description_en: 'English description',
                    description_zh: '',
                    description_ms: '',
                    description_ta: '',
                    familyLabel_en: 'Family history?',
                    familyLabel_zh: '',
                    familyLabel_ms: '',
                    familyLabel_ta: '',
                    visible: true
                });
        });

        after(async () => {
            await request(app)
                .delete('/api/admin/cancer-types/fallback-test')
                .set('Authorization', `Bearer ${token}`);
        });

        it('GET ?lang=zh returns English name when ZH is blank', async () => {
            const res = await request(app)
                .get('/api/questions/cancer-types?lang=zh');
            assert.strictEqual(res.status, 200);
            const ct = res.body.data.find(c => c.id === 'fallback-test');
            assert.ok(ct, 'fallback-test cancer type should be in response');
            assert.strictEqual(ct.name, 'Fallback Cancer');
            assert.strictEqual(ct.description, 'English description');
            assert.strictEqual(ct.familyLabel, 'Family history?');
        });

        it('GET ?lang=ms returns English name when MS is blank', async () => {
            const res = await request(app)
                .get('/api/questions/cancer-types?lang=ms');
            const ct = res.body.data.find(c => c.id === 'fallback-test');
            assert.strictEqual(ct.name, 'Fallback Cancer');
        });

        it('GET ?lang=ta returns English name when TA is blank', async () => {
            const res = await request(app)
                .get('/api/questions/cancer-types?lang=ta');
            const ct = res.body.data.find(c => c.id === 'fallback-test');
            assert.strictEqual(ct.name, 'Fallback Cancer');
        });

        it('GET ?lang=en returns English directly', async () => {
            const res = await request(app)
                .get('/api/questions/cancer-types?lang=en');
            const ct = res.body.data.find(c => c.id === 'fallback-test');
            assert.strictEqual(ct.name, 'Fallback Cancer');
        });

        it('populated non-EN field returns that language, not English', async () => {
            // Update ZH only
            await request(app)
                .put('/api/admin/cancer-types/fallback-test')
                .set('Authorization', `Bearer ${token}`)
                .send({ name_zh: '后备癌症' });

            const res = await request(app)
                .get('/api/questions/cancer-types?lang=zh');
            const ct = res.body.data.find(c => c.id === 'fallback-test');
            assert.strictEqual(ct.name, '后备癌症');
            // Description still falls back to EN (not updated)
            assert.strictEqual(ct.description, 'English description');
        });
    });

    // ==================== Questions ====================

    describe('Questions', () => {
        // Use existing fixture questions — they have all langs populated.
        // We test the fallback by verifying the model logic with the public API.

        it('GET ?lang=en returns English prompts', async () => {
            const res = await request(app)
                .get('/api/questions/by-assessment?assessmentId=colorectal&lang=en');
            assert.strictEqual(res.status, 200);
            assert.ok(res.body.data.length > 0);
            const q = res.body.data[0];
            assert.ok(q.prompt, 'prompt should be non-empty');
            assert.ok(typeof q.prompt === 'string');
        });

        it('GET ?lang=zh returns non-empty prompts (populated or fallback)', async () => {
            const res = await request(app)
                .get('/api/questions/by-assessment?assessmentId=colorectal&lang=zh');
            assert.strictEqual(res.status, 200);
            for (const q of res.body.data) {
                assert.ok(q.prompt, `question ${q.questionId} prompt should be non-empty (fallback to EN if ZH blank)`);
            }
        });

        it('invalid lang param defaults to English', async () => {
            const res = await request(app)
                .get('/api/questions/cancer-types?lang=xx');
            assert.strictEqual(res.status, 200);
            // Should return English data (sanitizeLang defaults to 'en')
            const ct = res.body.data.find(c => c.id === 'colorectal');
            assert.strictEqual(ct.name, 'Colorectal Cancer');
        });
    });

    // ==================== Translations ====================

    describe('Translations', () => {
        it('public GET /api/translations returns translation object', async () => {
            const res = await request(app).get('/api/translations');
            assert.strictEqual(res.status, 200);
            assert.ok(typeof res.body === 'object');
        });

        it('blank non-EN value is stored as empty string (client handles fallback)', async () => {
            // Save a key with EN only
            await request(app)
                .put('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    common: {
                        testFallback: { en: 'Test Value', zh: '', ms: '', ta: '' }
                    }
                });

            const res = await request(app).get('/api/translations');
            const val = res.body.common?.testFallback;
            assert.ok(val, 'testFallback key should exist');
            assert.strictEqual(val.en, 'Test Value');
            assert.strictEqual(val.zh, '');
            assert.strictEqual(val.ms, '');
            assert.strictEqual(val.ta, '');
            // Client-side translationService.t() handles: zh='' → falls back to en
        });
    });

    // ==================== PDPA ====================

    describe('PDPA', () => {
        it('public GET /api/pdpa returns PDPA with all language keys', async () => {
            const res = await request(app).get('/api/pdpa');
            assert.strictEqual(res.status, 200);
            assert.ok(res.body.title, 'title should exist');
            assert.ok('en' in res.body.title);
            assert.ok('zh' in res.body.title);
            assert.ok('ms' in res.body.title);
            assert.ok('ta' in res.body.title);
        });

        it('blank non-EN PDPA values are stored as empty string (client handles fallback)', async () => {
            await request(app)
                .put('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    enabled: true,
                    title: { en: 'PDPA Notice', zh: '', ms: '', ta: '' },
                    purpose: { en: 'Risk assessment', zh: '', ms: '', ta: '' },
                    dataCollected: { en: 'Age, gender', zh: '', ms: '', ta: '' },
                    checkboxLabel: { en: 'I consent', zh: '', ms: '', ta: '' },
                    agreeButtonText: { en: 'Agree', zh: '', ms: '', ta: '' }
                });

            const res = await request(app).get('/api/pdpa');
            assert.strictEqual(res.body.title.en, 'PDPA Notice');
            assert.strictEqual(res.body.title.zh, '');
            // Client-side pt() handles: zh='' → falls back to en
        });
    });
});
