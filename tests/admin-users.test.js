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
        it('creates admin successfully as super_admin', async () => {
            const res = await request(app)
                .post('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ email: 'test@scs.com', name: 'Test Admin', role: 'admin' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(res.body.data.id);
            // tempPassword should not be exposed in response
            assert.strictEqual(res.body.data.tempPassword, undefined);
        });

        it('does not expose temp password in API response', async () => {
            const res = await request(app)
                .post('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ email: 'random1@scs.com', name: 'Random 1', role: 'admin' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            // tempPassword should NOT be in the response (security fix)
            assert.strictEqual(res.body.data.tempPassword, undefined);
        });

        it('returns 400 if email missing', async () => {
            const res = await request(app)
                .post('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ name: 'No Email' });
            assert.strictEqual(res.status, 400);
        });

        it('returns 400 for email with single-char TLD', async () => {
            // Guards against the previously permissive regex that accepted "a@b.c".
            const res = await request(app)
                .post('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ email: 'a@b.c', name: 'Bad TLD', role: 'admin' });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
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

        it('returns 400 for empty name', async () => {
            const list = await request(app)
                .get('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`);
            const adminId = list.body.data[0].id;

            const res = await request(app)
                .put(`/api/admin/admins/${adminId}`)
                .set('Authorization', `Bearer ${superToken}`)
                .send({ name: '   ' });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
        });

        it('returns 400 for invalid email format', async () => {
            const list = await request(app)
                .get('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`);
            const adminId = list.body.data[0].id;

            const res = await request(app)
                .put(`/api/admin/admins/${adminId}`)
                .set('Authorization', `Bearer ${superToken}`)
                .send({ email: 'not-an-email' });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
        });

        it('ignores role update from a non-super-admin (regular admin)', async () => {
            // Regular admin can update own profile but cannot change role.
            // Route silently drops the role field (adminUsers.js line 120 guards it).
            const list = await request(app)
                .get('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`);
            const regularAdmin = list.body.data.find(a => a.role === 'admin');
            assert.ok(regularAdmin, 'fixture should have at least one regular admin');

            // Forge a regular-admin token whose id matches the existing regular admin
            // so the route's "update own profile" check allows the PUT through.
            const jwt = (await import('jsonwebtoken')).default;
            const selfToken = jwt.sign(
                { id: regularAdmin.id, email: regularAdmin.email, role: 'admin' },
                process.env.JWT_SECRET || 'test-only-secret-not-for-production'
            );

            const res = await request(app)
                .put(`/api/admin/admins/${regularAdmin.id}`)
                .set('Authorization', `Bearer ${selfToken}`)
                .send({ name: 'New Name', role: 'super_admin' });
            assert.strictEqual(res.status, 200);
            // role must NOT have been escalated
            assert.strictEqual(res.body.data.role, 'admin',
                'regular admin must not be able to escalate to super_admin');
        });

        it('returns 400 for invalid role value (super_admin updating another admin)', async () => {
            const list = await request(app)
                .get('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`);
            const target = list.body.data.find(a => a.role === 'admin');
            assert.ok(target, 'fixture should have at least one regular admin');

            const res = await request(app)
                .put(`/api/admin/admins/${target.id}`)
                .set('Authorization', `Bearer ${superToken}`)
                .send({ role: 'not-a-real-role' });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.ok(res.body.error.includes('Invalid role'));
        });

        it('email collision with another admin returns an error (currently 500)', async () => {
            // Seed a second admin to collide with
            const create = await request(app)
                .post('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ email: 'collide-target@scs.com', name: 'Collide Target', role: 'admin' });
            assert.strictEqual(create.status, 200);

            const list = await request(app)
                .get('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`);
            const self = list.body.data.find(a => a.role === 'super_admin');

            const res = await request(app)
                .put(`/api/admin/admins/${self.id}`)
                .set('Authorization', `Bearer ${superToken}`)
                .send({ email: 'collide-target@scs.com' });
            // TODO: route/adminUsers.js does not include 'Email already in use' in its
            // knownErrors whitelist, so this currently returns 500. Ideally it should
            // be a 400. Locking in current behavior here — fix the mapping separately.
            assert.strictEqual(res.status, 500);
            assert.strictEqual(res.body.success, false);
        });

        it('PUT with empty body is a no-op and returns 200 with unchanged admin', async () => {
            const list = await request(app)
                .get('/api/admin/admins')
                .set('Authorization', `Bearer ${superToken}`);
            const target = list.body.data.find(a => a.role === 'admin');
            assert.ok(target);

            const res = await request(app)
                .put(`/api/admin/admins/${target.id}`)
                .set('Authorization', `Bearer ${superToken}`)
                .send({});
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.id, target.id);
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
