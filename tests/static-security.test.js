import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown } from './helpers/setup.js';

describe('Static file security', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('should NOT serve .env', async () => {
        const res = await request(app).get('/.env');
        assert.notStrictEqual(res.status, 200);
    });

    it('should NOT serve server.js', async () => {
        const res = await request(app).get('/server.js');
        assert.notStrictEqual(res.status, 200);
    });

    it('should NOT serve package.json', async () => {
        const res = await request(app).get('/package.json');
        assert.notStrictEqual(res.status, 200);
    });

    it('should NOT serve data/admins.json', async () => {
        const res = await request(app).get('/data/admins.json');
        assert.notStrictEqual(res.status, 200);
    });

    it('should serve public index.html', async () => {
        const res = await request(app).get('/index.html');
        assert.strictEqual(res.status, 200);
        assert.ok(res.text.includes('<!DOCTYPE html>'));
    });

    it('should serve public CSS files', async () => {
        const res = await request(app).get('/css/variables.css');
        assert.strictEqual(res.status, 200);
    });
});

describe('Frontend critical file serving', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('should serve controllers/riskCalculator.js (required by uiController.js)', async () => {
        const res = await request(app).get('/controllers/riskCalculator.js');
        assert.strictEqual(res.status, 200, 'public/controllers/riskCalculator.js must be served — uiController.js imports from ../controllers/riskCalculator.js');
        assert.ok(res.text.includes('calculateRiskScore'), 'riskCalculator.js must export calculateRiskScore');
    });

    it('should serve all JS modules imported by main.js', async () => {
        const criticalFiles = [
            '/js/main.js',
            '/js/uiController.js',
            '/js/gameState.js',
            '/js/apiService.js',
            '/js/domElements.js',
            '/js/questionLoader.js',
            '/js/assessmentConfig.js',
            '/js/constants.js',
            '/js/mascotController.js',
            '/js/themeLoader.js',
            '/js/translationService.js',
            '/js/utils/escapeHtml.js',
        ];
        for (const file of criticalFiles) {
            const res = await request(app).get(file);
            assert.strictEqual(res.status, 200, `${file} must be served`);
        }
    });

    it('public riskCalculator.js must match backend version exports', async () => {
        const res = await request(app).get('/controllers/riskCalculator.js');
        assert.ok(res.text.includes('export function calculateRiskScore'), 'must export calculateRiskScore');
        assert.ok(res.text.includes('export function getQuizWeightTarget'), 'must export getQuizWeightTarget');
        assert.ok(res.text.includes('generateRecommendations'), 'must include generateRecommendations');
    });
});
