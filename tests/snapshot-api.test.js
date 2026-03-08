/**
 * API tests for the assessments snapshot feature:
 * - GET /api/assessments-snapshot endpoint
 * - Cancer type mutations auto-update the snapshot
 * Run: NODE_ENV=test node --test tests/snapshot-api.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown, getSuperAdminToken } from './helpers/setup.js';

const SNAPSHOT_PATH = path.join(process.cwd(), 'data', 'assessments-snapshot.json');

describe('GET /api/assessments-snapshot', () => {
    before(async () => {
        await setup();
        // Remove snapshot so we test the 404 case first
        try { await fs.unlink(SNAPSHOT_PATH); } catch {}
    });
    after(async () => {
        try { await fs.unlink(SNAPSHOT_PATH); } catch {}
        await teardown();
    });

    it('returns 404 when snapshot file does not exist', async () => {
        const res = await request(app).get('/api/assessments-snapshot');
        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.body.success, false);
    });

    it('returns 200 with snapshot data after snapshot is created', async () => {
        // Create snapshot by importing model
        const { CancerTypeModel } = await import('../models/cancerTypeModel.js');
        const model = new CancerTypeModel();
        await model.writeAssessmentsSnapshot();

        const res = await request(app).get('/api/assessments-snapshot');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.data.length > 0);
    });
});

describe('Cancer type mutations auto-update snapshot', () => {
    const token = getSuperAdminToken();

    before(async () => {
        await setup();
        try { await fs.unlink(SNAPSHOT_PATH); } catch {}
    });
    after(async () => {
        try { await fs.unlink(SNAPSHOT_PATH); } catch {}
        await teardown();
    });

    it('POST /api/admin/cancer-types creates snapshot', async () => {
        const res = await request(app)
            .post('/api/admin/cancer-types')
            .set('Authorization', `Bearer ${token}`)
            .send({ id: 'snapshot-test', name_en: 'Snapshot Test' });
        assert.strictEqual(res.status, 200);

        const raw = await fs.readFile(SNAPSHOT_PATH, 'utf8');
        const snapshot = JSON.parse(raw);
        assert.strictEqual(snapshot.success, true);
        assert.ok(snapshot.data.some(ct => ct.id === 'snapshot-test'));
    });

    it('PUT /api/admin/cancer-types/:id updates snapshot', async () => {
        const res = await request(app)
            .put('/api/admin/cancer-types/snapshot-test')
            .set('Authorization', `Bearer ${token}`)
            .send({ name_en: 'Snapshot Test Updated' });
        assert.strictEqual(res.status, 200);

        const raw = await fs.readFile(SNAPSHOT_PATH, 'utf8');
        const snapshot = JSON.parse(raw);
        const ct = snapshot.data.find(c => c.id === 'snapshot-test');
        assert.strictEqual(ct.name, 'Snapshot Test Updated');
    });

    it('DELETE /api/admin/cancer-types/:id updates snapshot', async () => {
        const res = await request(app)
            .delete('/api/admin/cancer-types/snapshot-test')
            .set('Authorization', `Bearer ${token}`);
        assert.strictEqual(res.status, 200);

        const raw = await fs.readFile(SNAPSHOT_PATH, 'utf8');
        const snapshot = JSON.parse(raw);
        assert.ok(!snapshot.data.some(ct => ct.id === 'snapshot-test'));
    });

    it('PUT /api/admin/cancer-types/reorder updates snapshot', async () => {
        // Get current cancer types
        const list = await request(app)
            .get('/api/admin/cancer-types')
            .set('Authorization', `Bearer ${token}`);
        const ids = list.body.data.map(ct => ct.id);

        if (ids.length >= 2) {
            // Reverse order
            const reversed = [...ids].reverse();
            const res = await request(app)
                .put('/api/admin/cancer-types/reorder')
                .set('Authorization', `Bearer ${token}`)
                .send({ orderedIds: reversed });
            assert.strictEqual(res.status, 200);

            const raw = await fs.readFile(SNAPSHOT_PATH, 'utf8');
            const snapshot = JSON.parse(raw);
            assert.strictEqual(snapshot.data[0].id, reversed[0]);
        }
    });
});
