/**
 * Admin Appearance (Theme & Assets) API tests
 * Run: NODE_ENV=test node --test tests/admin-appearance.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
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
