/**
 * Admin Cancer Types API tests
 * Run: NODE_ENV=test node --test tests/admin-cancer-types.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown, getSuperAdminToken } from './helpers/setup.js';

describe('Admin Cancer Types API', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    const token = getSuperAdminToken();

    describe('GET /api/admin/cancer-types', () => {
        it('returns 200 with array of cancer types', async () => {
            const res = await request(app)
                .get('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(Array.isArray(res.body.data));
        });

        it('each cancer type has questionCount and totalWeight', async () => {
            const res = await request(app)
                .get('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`);
            if (res.body.data.length > 0) {
                const ct = res.body.data[0];
                assert.ok('questionCount' in ct);
                assert.ok('totalWeight' in ct);
                assert.ok('isValid' in ct);
            }
        });

        it('each cancer type has visible property', async () => {
            const res = await request(app)
                .get('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            if (res.body.data.length > 0) {
                assert.ok('visible' in res.body.data[0], 'visible property should be present');
            }
        });
    });

    describe('GET /api/admin/cancer-types/:id', () => {
        it('returns 404 for nonexistent ID', async () => {
            const res = await request(app)
                .get('/api/admin/cancer-types/nonexistent-id')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 404);
        });

        it('returns cancer type with questions array for valid ID', async () => {
            // Get a real ID first
            const list = await request(app)
                .get('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`);
            if (list.body.data.length > 0) {
                const id = list.body.data[0].id;
                const res = await request(app)
                    .get(`/api/admin/cancer-types/${id}`)
                    .set('Authorization', `Bearer ${token}`);
                assert.strictEqual(res.status, 200);
                assert.ok(Array.isArray(res.body.data.questions));
            }
        });
    });

    describe('POST /api/admin/cancer-types', () => {
        it('returns 400 if ID missing', async () => {
            const res = await request(app)
                .post('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`)
                .send({ name_en: 'Test Cancer' });
            assert.strictEqual(res.status, 400);
        });

        it('creates a new cancer type', async () => {
            const res = await request(app)
                .post('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`)
                .send({ id: 'test-cancer', name_en: 'Test Cancer Type', description_en: 'A test cancer', familyLabel_en: 'Family history' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });

        it('new cancer type defaults to visible=false', async () => {
            const res = await request(app)
                .post('/api/admin/cancer-types')
                .set('Authorization', `Bearer ${token}`)
                .send({ id: 'test-hidden-default', name_en: 'Hidden Default Test', description_en: 'Test desc', familyLabel_en: 'Family test' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.visible, false, 'new cancer type should default to hidden');
        });
    });

    describe('PUT /api/admin/cancer-types/:id', () => {
        it('updates cancer type metadata', async () => {
            const res = await request(app)
                .put('/api/admin/cancer-types/test-cancer')
                .set('Authorization', `Bearer ${token}`)
                .send({ name_en: 'Updated Test Cancer' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });

        it('partial PUT preserves multilang fields not in payload', async () => {
            // Seed all 4 language columns.
            await request(app)
                .put('/api/admin/cancer-types/test-cancer')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name_en: 'English Name',
                    name_zh: '中文名',
                    name_ms: 'Nama BM',
                    name_ta: 'தமிழ் பெயர்'
                });

            // Update only name_en.
            await request(app)
                .put('/api/admin/cancer-types/test-cancer')
                .set('Authorization', `Bearer ${token}`)
                .send({ name_en: 'Updated English Only' });

            // Other three languages must be preserved by COALESCE.
            const res = await request(app)
                .get('/api/admin/cancer-types/test-cancer')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.name_en, 'Updated English Only');
            assert.strictEqual(res.body.data.name_zh, '中文名');
            assert.strictEqual(res.body.data.name_ms, 'Nama BM');
            assert.strictEqual(res.body.data.name_ta, 'தமிழ் பெயர்');
        });

        it('partial PUT preserves recommendations when not in payload', async () => {
            // Seed recommendations via their own PUT.
            const seedRecs = [
                {
                    trigger: 'always',
                    title: { en: 'Rec 1', zh: '建议1', ms: 'Cad 1', ta: 'பரிந்துரை 1' },
                    actions: [
                        { en: 'Action A', zh: '行动A', ms: 'Tindakan A', ta: 'செயல் A' }
                    ]
                }
            ];
            await request(app)
                .put('/api/admin/cancer-types/test-cancer')
                .set('Authorization', `Bearer ${token}`)
                .send({ recommendations: seedRecs });

            // Update only a text field — no recommendations key in body.
            await request(app)
                .put('/api/admin/cancer-types/test-cancer')
                .set('Authorization', `Bearer ${token}`)
                .send({ name_en: 'Preserve Recs Test' });

            // Recommendations must still be intact.
            const res = await request(app)
                .get('/api/admin/cancer-types/test-cancer')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.name_en, 'Preserve Recs Test');
            assert.ok(Array.isArray(res.body.data.recommendations));
            assert.strictEqual(res.body.data.recommendations.length, 1);
            assert.strictEqual(res.body.data.recommendations[0].title.en, 'Rec 1');
            assert.strictEqual(res.body.data.recommendations[0].actions[0].zh, '行动A');
        });

        it('explicit empty string in PUT clears the field (semantic lock-in)', async () => {
            // Seed a non-empty value.
            await request(app)
                .put('/api/admin/cancer-types/test-cancer')
                .set('Authorization', `Bearer ${token}`)
                .send({ description_zh: '原中文描述' });

            let res = await request(app)
                .get('/api/admin/cancer-types/test-cancer')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.body.data.description_zh, '原中文描述');

            // Deliberately clear via explicit empty string — must NOT be
            // silently preserved (i.e. we are NOT normalizing "" to null).
            await request(app)
                .put('/api/admin/cancer-types/test-cancer')
                .set('Authorization', `Bearer ${token}`)
                .send({ description_zh: '' });

            res = await request(app)
                .get('/api/admin/cancer-types/test-cancer')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.body.data.description_zh, '', 'explicit empty string must clear the field, not be preserved');
        });
    });

    describe('PUT /api/admin/cancer-types/generic strips demographic fields', () => {
        it('ignores familyWeight/age/ethnicity on generic PUT — dormant DB values preserved', async () => {
            // Capture current generic demographics
            const before = await request(app)
                .get('/api/admin/cancer-types/generic')
                .set('Authorization', `Bearer ${token}`);
            const originalFamily = before.body.data.familyWeight;
            const originalAgeWeight = before.body.data.ageRiskWeight;
            const originalEthOthers = before.body.data.ethnicityRisk_others;

            // Attempt to overwrite with different values — must be silently dropped.
            await request(app)
                .put('/api/admin/cancer-types/generic')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    familyWeight: '99',
                    ageRiskWeight: '99',
                    ethnicityRisk_others: '99'
                });

            const after = await request(app)
                .get('/api/admin/cancer-types/generic')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(after.body.data.familyWeight, originalFamily);
            assert.strictEqual(after.body.data.ageRiskWeight, originalAgeWeight);
            assert.strictEqual(after.body.data.ethnicityRisk_others, originalEthOthers);
        });

        it('still lets a specific cancer type update its demographics', async () => {
            const res = await request(app)
                .put('/api/admin/cancer-types/breast')
                .set('Authorization', `Bearer ${token}`)
                .send({ familyWeight: '17' });
            assert.strictEqual(res.status, 200);

            const after = await request(app)
                .get('/api/admin/cancer-types/breast')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(String(after.body.data.familyWeight), '17');
        });
    });

    describe('PATCH /api/admin/cancer-types/:id/visibility', () => {
        it('returns 400 if visible is not boolean', async () => {
            const res = await request(app)
                .patch('/api/admin/cancer-types/colorectal/visibility')
                .set('Authorization', `Bearer ${token}`)
                .send({ visible: 'yes' });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
        });

        it('hides a cancer type', async () => {
            const res = await request(app)
                .patch('/api/admin/cancer-types/colorectal/visibility')
                .set('Authorization', `Bearer ${token}`)
                .send({ visible: false });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.visible, false);
        });

        it('shows a cancer type', async () => {
            const res = await request(app)
                .patch('/api/admin/cancer-types/colorectal/visibility')
                .set('Authorization', `Bearer ${token}`)
                .send({ visible: true });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.visible, true);
        });
    });

    describe('DELETE /api/admin/cancer-types/:id', () => {
        it('deletes cancer type and associated questions', async () => {
            const res = await request(app)
                .delete('/api/admin/cancer-types/test-cancer')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });

        it('deletes test-hidden-default cancer type', async () => {
            const res = await request(app)
                .delete('/api/admin/cancer-types/test-hidden-default')
                .set('Authorization', `Bearer ${token}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });
    });
});
