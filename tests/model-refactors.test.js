/**
 * Tests for model-layer refactors:
 * - AdminModel.updateAdmin() last-super-admin guard
 * - CancerTypeModel.getAssessmentConfig()
 * - CancerTypeModel.writeAssessmentsSnapshot() / ensureSnapshot()
 * - QuestionModel.syncQuestionsForCancerType()
 * Run: NODE_ENV=test node --test tests/model-refactors.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { setup, teardown } from './helpers/setup.js';
import { AdminModel } from '../models/adminModel.js';
import { CancerTypeModel } from '../models/cancerTypeModel.js';
import { QuestionModel } from '../models/questionModel.js';

const SNAPSHOT_PATH = path.join(process.cwd(), 'data', 'assessments-snapshot.json');

describe('AdminModel.updateAdmin — last super admin guard', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('throws when demoting the only super_admin', async () => {
        const model = new AdminModel();
        const admins = await model.getAllAdmins();
        const superAdmin = admins.find(a => a.role === 'super_admin');
        assert.ok(superAdmin, 'fixture should have a super_admin');

        await assert.rejects(
            () => model.updateAdmin(superAdmin.id, { role: 'admin' }),
            (err) => {
                assert.ok(err.message.includes('Cannot demote the last super admin'));
                return true;
            }
        );
    });

    it('allows demoting a super_admin when another exists', async () => {
        const model = new AdminModel();
        // Create a second super admin
        const second = await model.createAdmin({
            email: 'second-sa@test.com',
            name: 'Second SA',
            role: 'super_admin',
            password: 'password123'
        });

        // Demoting the second should succeed now
        const updated = await model.updateAdmin(second.id, { role: 'admin' });
        assert.strictEqual(updated.role, 'admin');
    });

    it('allows updating non-role fields without triggering the guard', async () => {
        const model = new AdminModel();
        const admins = await model.getAllAdmins();
        const superAdmin = admins.find(a => a.role === 'super_admin');

        // Updating name should work fine
        const updated = await model.updateAdmin(superAdmin.id, { name: 'New Name' });
        assert.strictEqual(updated.name, 'New Name');
    });
});

describe('CancerTypeModel.getAssessmentConfig', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('returns null for non-existent cancer type', async () => {
        const model = new CancerTypeModel();
        const config = await model.getAssessmentConfig('nonexistent');
        assert.strictEqual(config, null);
    });

    it('returns parsed config with correct fields for existing cancer type', async () => {
        const model = new CancerTypeModel();
        const config = await model.getAssessmentConfig('colorectal');
        assert.ok(config, 'colorectal should exist in fixtures');
        assert.strictEqual(typeof config.familyWeight, 'number');
        assert.strictEqual(typeof config.ageRiskThreshold, 'number');
        assert.strictEqual(typeof config.ageRiskWeight, 'number');
        assert.strictEqual(typeof config.ethnicityRisk, 'object');
        assert.strictEqual(typeof config.ethnicityRisk.chinese, 'number');
        assert.strictEqual(typeof config.ethnicityRisk.malay, 'number');
        assert.strictEqual(typeof config.ethnicityRisk.indian, 'number');
        assert.strictEqual(typeof config.ethnicityRisk.caucasian, 'number');
        assert.strictEqual(typeof config.ethnicityRisk.others, 'number');
    });

    it('returns correct values matching fixture data', async () => {
        const model = new CancerTypeModel();
        // colorectal in fixture: familyWeight=10, ageRiskThreshold=50, ageRiskWeight=5
        const config = await model.getAssessmentConfig('colorectal');
        assert.strictEqual(config.familyWeight, 10);
        assert.strictEqual(config.ageRiskThreshold, 50);
        assert.strictEqual(config.ageRiskWeight, 5);
    });
});

describe('CancerTypeModel.writeAssessmentsSnapshot / ensureSnapshot', () => {
    before(async () => {
        await setup();
        // Remove any existing snapshot
        try { await fs.unlink(SNAPSHOT_PATH); } catch {}
    });
    after(async () => {
        try { await fs.unlink(SNAPSHOT_PATH); } catch {}
        await teardown();
    });

    it('ensureSnapshot creates snapshot when file does not exist', async () => {
        const model = new CancerTypeModel();
        await model.ensureSnapshot();

        const raw = await fs.readFile(SNAPSHOT_PATH, 'utf8');
        const snapshot = JSON.parse(raw);
        assert.strictEqual(snapshot.success, true);
        assert.ok(Array.isArray(snapshot.data));
        assert.ok(snapshot.data.length > 0, 'snapshot should contain cancer types from fixtures');
    });

    it('ensureSnapshot does NOT overwrite existing snapshot', async () => {
        // Write a marker snapshot
        const marker = JSON.stringify({ success: true, data: [{ id: 'marker' }] });
        await fs.writeFile(SNAPSHOT_PATH, marker);

        const model = new CancerTypeModel();
        await model.ensureSnapshot();

        const raw = await fs.readFile(SNAPSHOT_PATH, 'utf8');
        const snapshot = JSON.parse(raw);
        assert.strictEqual(snapshot.data[0].id, 'marker', 'should not overwrite existing snapshot');
    });

    it('writeAssessmentsSnapshot writes all cancer types localized for en', async () => {
        const model = new CancerTypeModel();
        await model.writeAssessmentsSnapshot();

        const raw = await fs.readFile(SNAPSHOT_PATH, 'utf8');
        const snapshot = JSON.parse(raw);
        assert.strictEqual(snapshot.success, true);

        // Verify structure matches getAllCancerTypesLocalized output
        const first = snapshot.data[0];
        assert.ok('id' in first);
        assert.ok('name' in first);
        assert.ok('description' in first);
        assert.ok('familyWeight' in first);
        assert.ok('ethnicityRisk' in first);
    });
});

describe('QuestionModel.syncQuestionsForCancerType', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('creates new questions when cancer type has none', async () => {
        const model = new QuestionModel();
        const result = await model.syncQuestionsForCancerType('test-sync', [
            { prompt_en: 'Q1', weight: '50', yesValue: '100', noValue: '0', category: 'Lifestyle' },
            { prompt_en: 'Q2', weight: '50', yesValue: '100', noValue: '0', category: 'Diet & Nutrition' }
        ]);
        assert.strictEqual(result.added, 2);
        assert.strictEqual(result.updated, 0);
        assert.strictEqual(result.deleted, 0);

        // Verify they exist
        const questions = await model.getQuestionsByCancerType('test-sync');
        assert.strictEqual(questions.length, 2);
    });

    it('updates existing and deletes removed questions', async () => {
        const model = new QuestionModel();
        // Get the questions created above
        const existing = await model.getQuestionsByCancerType('test-sync');
        assert.strictEqual(existing.length, 2);

        // Keep the first (updated), drop the second, add a new one
        const result = await model.syncQuestionsForCancerType('test-sync', [
            { id: existing[0].id, prompt_en: 'Q1 Updated', weight: '60' },
            { prompt_en: 'Q3 New', weight: '40', yesValue: '100', noValue: '0' }
        ]);
        assert.strictEqual(result.updated, 1);
        assert.strictEqual(result.added, 1);
        assert.strictEqual(result.deleted, 1);

        const afterSync = await model.getQuestionsByCancerType('test-sync');
        assert.strictEqual(afterSync.length, 2);
        const updatedQ = afterSync.find(q => q.id === existing[0].id);
        assert.strictEqual(updatedQ.prompt_en, 'Q1 Updated');
    });

    it('deletes all questions when given empty array', async () => {
        const model = new QuestionModel();
        const before = await model.getQuestionsByCancerType('test-sync');
        assert.ok(before.length > 0);

        const result = await model.syncQuestionsForCancerType('test-sync', []);
        assert.strictEqual(result.deleted, before.length);
        assert.strictEqual(result.added, 0);
        assert.strictEqual(result.updated, 0);

        const after = await model.getQuestionsByCancerType('test-sync');
        assert.strictEqual(after.length, 0);
    });
});
