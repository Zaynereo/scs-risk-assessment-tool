/**
 * Concurrency smoke test: 10 parallel POST /api/admin/question-bank calls with
 * unique IDs must all succeed. Verifies the route/model handle interleaved
 * awaits without id collision, lost writes, or unhandled rejections.
 * Run: NODE_ENV=test node --test tests/admin-questions-concurrency.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown, getSuperAdminToken } from './helpers/setup.js';

describe('Admin question-bank concurrency', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    const token = getSuperAdminToken();

    it('10 parallel POSTs with unique IDs all succeed', async () => {
        const ids = Array.from({ length: 10 }, (_, i) => `concurrent-q-${i.toString().padStart(3, '0')}`);

        const payloads = ids.map(id => ({
            id,
            prompt_en: `Concurrent question ${id}`,
            prompt_zh: '',
            prompt_ms: '',
            prompt_ta: '',
            explanationYes_en: '',
            explanationYes_zh: '',
            explanationYes_ms: '',
            explanationYes_ta: '',
            explanationNo_en: '',
            explanationNo_zh: '',
            explanationNo_ms: '',
            explanationNo_ta: ''
        }));

        const results = await Promise.all(
            payloads.map(p =>
                request(app)
                    .post('/api/admin/question-bank')
                    .set('Authorization', `Bearer ${token}`)
                    .send(p)
            )
        );

        for (const [i, res] of results.entries()) {
            assert.strictEqual(res.status, 200, `POST ${i} failed: ${JSON.stringify(res.body)}`);
            assert.strictEqual(res.body.success, true, `POST ${i} was not successful`);
        }

        // Verify all 10 are actually present in the bank
        const list = await request(app)
            .get('/api/admin/question-bank')
            .set('Authorization', `Bearer ${token}`);
        assert.strictEqual(list.status, 200);
        for (const id of ids) {
            assert.ok(
                list.body.data.some(q => q.id === id),
                `bank should contain ${id} after concurrent inserts`
            );
        }
    });

    it('parallel POSTs with the same ID surface exactly one success', async () => {
        const duplicateId = 'concurrent-dup-id';
        const payload = {
            id: duplicateId,
            prompt_en: 'Race on same id',
            prompt_zh: '', prompt_ms: '', prompt_ta: '',
            explanationYes_en: '', explanationYes_zh: '', explanationYes_ms: '', explanationYes_ta: '',
            explanationNo_en: '', explanationNo_zh: '', explanationNo_ms: '', explanationNo_ta: ''
        };

        const results = await Promise.all([
            request(app).post('/api/admin/question-bank').set('Authorization', `Bearer ${token}`).send(payload),
            request(app).post('/api/admin/question-bank').set('Authorization', `Bearer ${token}`).send(payload),
            request(app).post('/api/admin/question-bank').set('Authorization', `Bearer ${token}`).send(payload)
        ]);

        const successCount = results.filter(r => r.status === 200 && r.body.success).length;
        const failureCount = results.filter(r => r.status >= 400).length;

        assert.strictEqual(successCount, 1,
            `exactly one of three concurrent duplicate POSTs must succeed, got ${successCount}`);
        assert.strictEqual(successCount + failureCount, 3,
            'every request must be accounted for');
    });
});
