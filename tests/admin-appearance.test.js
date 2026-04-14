/**
 * Admin Appearance (Theme & Assets) API tests
 * Run: NODE_ENV=test node --test tests/admin-appearance.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { normalizeTheme } from '../routes/admin/index.js';
import { setup, teardown, getSuperAdminToken } from './helpers/setup.js';

describe('Admin Appearance API', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    const token = getSuperAdminToken();

    describe('GET /api/admin/theme', () => {
        it('returns 200 with normalized theme', async () => {
            const res = await request(app)
                .get('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.ok(res.body.screens);
            assert.ok('landing' in res.body.screens);
            assert.ok('cancerSelection' in res.body.screens);
            assert.ok('onboarding' in res.body.screens);
            assert.ok('game' in res.body.screens);
            assert.ok('results' in res.body.screens);
        });

        it('each screen has backgroundImage, backgroundMusic, backgroundOpacity', async () => {
            const res = await request(app)
                .get('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`);
            const landing = res.body.screens.landing;
            assert.ok('backgroundImage' in landing);
            assert.ok('backgroundMusic' in landing);
            assert.ok('backgroundOpacity' in landing);
        });
    });

    describe('PUT /api/admin/theme', () => {
        it('saves theme and returns success', async () => {
            const res = await request(app)
                .put('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    mascotMale: 'assets/mascots/male.png',
                    screens: {
                        landing: {
                            backgroundImage: 'assets/backgrounds/test.png',
                            backgroundOpacity: 0.8
                        }
                    }
                });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });

        it('clamps opacity to 0-1 range', async () => {
            const res = await request(app)
                .put('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    screens: {
                        landing: { backgroundOpacity: 5.0 }
                    }
                });
            assert.strictEqual(res.status, 200);
            // Verify the saved opacity was clamped
            const get = await request(app)
                .get('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`);
            assert.ok(get.body.screens.landing.backgroundOpacity <= 1);
        });

        it('accepts partnerLogos array and round-trips through GET', async () => {
            const logos = ['assets/logos/a.png', 'assets/logos/b.png', 'assets/logos/c.png'];
            const put = await request(app)
                .put('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`)
                .send({ partnerLogos: logos });
            assert.strictEqual(put.status, 200);
            const get = await request(app)
                .get('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`);
            assert.deepStrictEqual(get.body.partnerLogos, logos);
        });

        it('filters empty strings and coerces non-strings in partnerLogos', async () => {
            const put = await request(app)
                .put('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`)
                .send({ partnerLogos: ['assets/logos/x.png', '', '   ', null, 123, 'assets/logos/y.png'] });
            assert.strictEqual(put.status, 200);
            const get = await request(app)
                .get('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`);
            assert.deepStrictEqual(get.body.partnerLogos, ['assets/logos/x.png', 'assets/logos/y.png']);
        });

        it('normalizeTheme migrates legacy partnerLogo string to partnerLogos array', () => {
            const result = normalizeTheme({ partnerLogo: 'assets/logos/legacy.png' });
            assert.deepStrictEqual(result.partnerLogos, ['assets/logos/legacy.png']);
            assert.ok(!('partnerLogo' in result), 'single-string partnerLogo must not leak into output');
        });

        it('normalizeTheme prefers partnerLogos array over legacy partnerLogo when both present', () => {
            const result = normalizeTheme({
                partnerLogo: 'assets/logos/legacy.png',
                partnerLogos: ['assets/logos/new.png']
            });
            assert.deepStrictEqual(result.partnerLogos, ['assets/logos/new.png']);
        });

        it('normalizeTheme returns empty partnerLogos array for empty input', () => {
            const result = normalizeTheme({});
            assert.deepStrictEqual(result.partnerLogos, []);
        });

        it('rejects non-array partnerLogos with 400', async () => {
            const res = await request(app)
                .put('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`)
                .send({ partnerLogos: 'not-an-array' });
            assert.strictEqual(res.status, 400);
        });

        it('rejects partnerLogos with path traversal attempt', async () => {
            const res = await request(app)
                .put('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`)
                .send({ partnerLogos: ['assets/../server.js'] });
            assert.strictEqual(res.status, 400);
        });

        it('rejects partnerLogos entry not prefixed with assets/', async () => {
            const res = await request(app)
                .put('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`)
                .send({ partnerLogos: ['http://evil.example.com/logo.png'] });
            assert.strictEqual(res.status, 400);
        });

        it('rejects partnerLogos exceeding the 20-entry cap', async () => {
            const tooMany = Array.from({ length: 21 }, (_, i) => `assets/logos/${i}.png`);
            const res = await request(app)
                .put('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`)
                .send({ partnerLogos: tooMany });
            assert.strictEqual(res.status, 400);
        });

        it('returns partnerLogos as an array even when unset', async () => {
            const put = await request(app)
                .put('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`)
                .send({ partnerLogos: [] });
            assert.strictEqual(put.status, 200);
            const get = await request(app)
                .get('/api/admin/theme')
                .set('Authorization', `Bearer ${token}`);
            assert.ok(Array.isArray(get.body.partnerLogos));
            assert.strictEqual(get.body.partnerLogos.length, 0);
        });
    });

    describe('GET /api/admin/assets', () => {
        it('returns 200 with grouped asset lists', async () => {
            const res = await request(app)
                .get('/api/admin/assets')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.body.paths));
            assert.ok(Array.isArray(res.body.backgrounds));
            assert.ok(Array.isArray(res.body.mascots));
            assert.ok(Array.isArray(res.body.music));
        });

        it('returns 400 for invalid folder filter', async () => {
            const res = await request(app)
                .get('/api/admin/assets?folder=invalid')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 400);
        });
    });

    describe('DELETE /api/admin/assets', () => {
        it('returns 400 for path traversal attempt', async () => {
            const res = await request(app)
                .delete('/api/admin/assets')
                .set('Authorization', `Bearer ${token}`)
                .send({ path: 'assets/../server.js' });
            assert.strictEqual(res.status, 400);
        });

        it('returns 400 for invalid asset path', async () => {
            const res = await request(app)
                .delete('/api/admin/assets')
                .set('Authorization', `Bearer ${token}`)
                .send({ path: 'not-assets/file.png' });
            assert.strictEqual(res.status, 400);
        });
    });
});
