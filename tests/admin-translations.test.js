/**
 * Admin Translations API tests
 * Run: NODE_ENV=test node --test tests/admin-translations.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown, getSuperAdminToken } from './helpers/setup.js';

describe('Admin Translations API', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    const token = getSuperAdminToken();

    // ---- UI Translations ----

    describe('GET /api/admin/translations', () => {
        it('returns 200 with translations data', async () => {
            const res = await request(app)
                .get('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(res.body.data);
            assert.ok(typeof res.body.data === 'object');
        });

        it('contains screen groups with language keys', async () => {
            const res = await request(app)
                .get('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`);
            const data = res.body.data;
            // Fixture has landing, results, common
            assert.ok(data.landing);
            assert.ok(data.landing.landingTitle);
            assert.ok('en' in data.landing.landingTitle);
            assert.ok('zh' in data.landing.landingTitle);
            assert.ok('ms' in data.landing.landingTitle);
            assert.ok('ta' in data.landing.landingTitle);
        });
    });

    describe('PUT /api/admin/translations', () => {
        it('saves translations and returns normalized data', async () => {
            const payload = {
                landing: {
                    landingTitle: { en: 'Updated Title', zh: '更新', ms: 'Dikemas kini', ta: 'புதுப்பிக்கப்பட்டது' }
                },
                common: {
                    loading: { en: 'Loading...', zh: '加载中...', ms: 'Memuatkan...', ta: 'ஏற்றுகிறது...' }
                }
            };
            const res = await request(app)
                .put('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`)
                .send(payload);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.landing.landingTitle.en, 'Updated Title');
        });

        it('returns updated values on subsequent GET', async () => {
            await request(app)
                .put('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    landing: { landingTitle: { en: 'Changed', zh: '', ms: '', ta: '' } }
                });
            const res = await request(app)
                .get('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.body.data.landing.landingTitle.en, 'Changed');
        });

        it('normalizes missing language keys to empty string', async () => {
            const res = await request(app)
                .put('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    landing: { landingTitle: { en: 'Only EN' } }
                });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.landing.landingTitle.zh, '');
            assert.strictEqual(res.body.data.landing.landingTitle.ms, '');
            assert.strictEqual(res.body.data.landing.landingTitle.ta, '');
        });

        it('handles empty object body gracefully', async () => {
            const res = await request(app)
                .put('/api/admin/translations')
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/json')
                .send({});
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            // Empty object produces empty translations
            assert.deepStrictEqual(res.body.data, {});
        });
    });

    describe('GET /api/translations (public)', () => {
        it('returns translations without auth', async () => {
            const res = await request(app).get('/api/translations');
            assert.strictEqual(res.status, 200);
            assert.ok(typeof res.body === 'object');
        });
    });

    // ---- Auth required ----

    describe('Auth protection', () => {
        it('GET /api/admin/translations requires auth', async () => {
            const res = await request(app).get('/api/admin/translations');
            assert.strictEqual(res.status, 401);
        });

        it('PUT /api/admin/translations requires auth', async () => {
            const res = await request(app)
                .put('/api/admin/translations')
                .send({ landing: { title: { en: 'x' } } });
            assert.strictEqual(res.status, 401);
        });
    });
});
