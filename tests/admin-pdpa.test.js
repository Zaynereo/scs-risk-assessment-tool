/**
 * Admin PDPA Config API tests
 * Run: NODE_ENV=test node --test tests/admin-pdpa.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown, getSuperAdminToken } from './helpers/setup.js';

describe('Admin PDPA API', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    const token = getSuperAdminToken();

    describe('GET /api/admin/pdpa', () => {
        it('returns 200 with PDPA config', async () => {
            const res = await request(app)
                .get('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok('enabled' in res.body.data);
        });

        it('has all language keys in title', async () => {
            const res = await request(app)
                .get('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`);
            const title = res.body.data.title;
            assert.ok('en' in title);
            assert.ok('zh' in title);
            assert.ok('ms' in title);
            assert.ok('ta' in title);
        });
    });

    describe('PUT /api/admin/pdpa', () => {
        it('saves PDPA config', async () => {
            const pdpa = {
                enabled: true,
                title: { en: 'Test Title', zh: '测试', ms: 'Ujian', ta: 'சோதனை' },
                purpose: { en: 'Test purpose', zh: '', ms: '', ta: '' },
                dataCollected: { en: 'Age, gender', zh: '', ms: '', ta: '' },
                checkboxLabel: { en: 'I consent', zh: '', ms: '', ta: '' },
                agreeButtonText: { en: 'I Agree', zh: '', ms: '', ta: '' }
            };
            const res = await request(app)
                .put('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`)
                .send(pdpa);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.enabled, true);
        });

        it('returns updated values on subsequent GET', async () => {
            // First save
            await request(app)
                .put('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    enabled: false,
                    title: { en: 'Changed', zh: '', ms: '', ta: '' },
                    purpose: { en: '', zh: '', ms: '', ta: '' },
                    dataCollected: { en: '', zh: '', ms: '', ta: '' },
                    checkboxLabel: { en: '', zh: '', ms: '', ta: '' },
                    agreeButtonText: { en: '', zh: '', ms: '', ta: '' }
                });
            // Then read
            const res = await request(app)
                .get('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.body.data.enabled, false);
            assert.strictEqual(res.body.data.title.en, 'Changed');
        });

        it('normalizes all language fields', async () => {
            const res = await request(app)
                .put('/api/admin/pdpa')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    enabled: true,
                    title: { en: 'Only EN' },
                    purpose: null,
                    dataCollected: {},
                    checkboxLabel: { en: 'Check' },
                    agreeButtonText: { en: 'Agree' }
                });
            assert.strictEqual(res.status, 200);
            // Missing language keys should default to empty string
            assert.strictEqual(res.body.data.title.zh, '');
            assert.strictEqual(res.body.data.purpose.en, '');
        });
    });
});
