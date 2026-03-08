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
