/**
 * Admin User Management API tests
 * Run: NODE_ENV=test node --test tests/admin-users.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown, getSuperAdminToken, getAdminToken } from './helpers/setup.js';

describe('Admin Users API', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    const superToken = getSuperAdminToken();
    const regularToken = getAdminToken();

    describe('GET /api/admin/admins', () => {
        it('returns 200 and array as super_admin', async () => {
            const res = await request(app)
                .get('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(Array.isArray(res.body.data));
        });

        it('returns 403 as regular admin', async () => {
            const res = await request(app)
                .get('/api/admin/admins')
                .set('Authorization', `Bearer ${regularToken}`);
            assert.strictEqual(res.status, 403);
        });
    });

    describe('POST /api/admin/admins', () => {
        it('creates admin and returns tempPassword as super_admin', async () => {
            const res = await request(app)
                .post('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ email: 'test@scs.com', name: 'Test Admin', role: 'admin' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(res.body.tempPassword);
            assert.ok(res.body.data.id);
        });

        it('returns 400 if email missing', async () => {
            const res = await request(app)
                .post('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ name: 'No Email' });
            assert.strictEqual(res.status, 400);
        });

        it('returns 403 as regular admin', async () => {
            const res = await request(app)
                .post('/api/admin/admins')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ email: 'test2@scs.com', name: 'Test', role: 'admin' });
            assert.strictEqual(res.status, 403);
        });
    });

    describe('PUT /api/admin/admins/:id', () => {
        it('updates admin name as super_admin', async () => {
            // First get the admin id
            const list = await request(app)
                .get('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`);
            const adminId = list.body.data[0].id;

            const res = await request(app)
                .put(`/api/admin/admins/${adminId}`)
                .set('Authorization', `Bearer ${superToken}`)
                .send({ name: 'Updated Name' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });
    });

    describe('GET /api/admin/admins/export', () => {
        it('returns 200 JSON attachment with admins array as super_admin', async () => {
            const res = await request(app)
                .get('/api/admin/admins/export')
                .set('Authorization', `Bearer ${superToken}`);
            assert.strictEqual(res.status, 200);
            assert.ok(res.headers['content-type'].includes('application/json'));
            assert.ok(res.headers['content-disposition'].includes('admin-users-backup-'));
            assert.ok(Array.isArray(res.body.admins));
            assert.ok(typeof res.body.exportedAt === 'string');
            // Passwords must not be included
            res.body.admins.forEach(a => assert.strictEqual(a.password, undefined));
        });

        it('returns 403 as regular admin', async () => {
            const res = await request(app)
                .get('/api/admin/admins/export')
                .set('Authorization', `Bearer ${regularToken}`);
            assert.strictEqual(res.status, 403);
        });

        it('returns 401 without auth token', async () => {
            const res = await request(app)
                .get('/api/admin/admins/export');
            assert.strictEqual(res.status, 401);
        });
    });

    describe('DELETE /api/admin/admins/:id', () => {
        it('returns 400 when deleting self', async () => {
            const res = await request(app)
                .delete('/api/admin/admins/0b2e5cb5-1d56-447d-88d4-d3647d5c96bd')
                .set('Authorization', `Bearer ${superToken}`);
            assert.strictEqual(res.status, 400);
            assert.ok(res.body.error.includes('own account'));
        });

        it('deletes another admin as super_admin', async () => {
            // Create one first
            const created = await request(app)
                .post('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ email: 'delete-me@scs.com', name: 'Delete Me' });
            const newId = created.body.data.id;

            const res = await request(app)
                .delete(`/api/admin/admins/${newId}`)
                .set('Authorization', `Bearer ${superToken}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });
    });
});
