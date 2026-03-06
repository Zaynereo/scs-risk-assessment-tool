/**
 * Unit tests for getQuizWeightTarget() and computeGenericWeightValidity()
 * moved from routes/admin/index.js → controllers/riskCalculator.js
 * Run: NODE_ENV=test node --test tests/weight-functions.test.js
 */

import test from 'node:test';
import assert from 'node:assert';
import { getQuizWeightTarget, computeGenericWeightValidity } from '../controllers/riskCalculator.js';

// ---- getQuizWeightTarget ----

test('getQuizWeightTarget: returns 100 when no cancer type provided', () => {
    assert.strictEqual(getQuizWeightTarget(null), 100);
    assert.strictEqual(getQuizWeightTarget(undefined), 100);
});

test('getQuizWeightTarget: subtracts familyWeight', () => {
    const ct = { familyWeight: '10', ageRiskWeight: '0' };
    assert.strictEqual(getQuizWeightTarget(ct), 90);
});

test('getQuizWeightTarget: subtracts ageRiskWeight', () => {
    const ct = { familyWeight: '0', ageRiskWeight: '5' };
    assert.strictEqual(getQuizWeightTarget(ct), 95);
});

test('getQuizWeightTarget: subtracts max ethnicity weight', () => {
    const ct = {
        familyWeight: '10',
        ageRiskWeight: '5',
        ethnicityRisk_chinese: '3',
        ethnicityRisk_malay: '1',
        ethnicityRisk_indian: '0',
        ethnicityRisk_caucasian: '0',
        ethnicityRisk_others: '0'
    };
    // 100 - 10 - 5 - 3 (max ethnicity) = 82
    assert.strictEqual(getQuizWeightTarget(ct), 82);
});

test('getQuizWeightTarget: handles missing ethnicity keys gracefully', () => {
    const ct = { familyWeight: '10', ageRiskWeight: '5' };
    // No ethnicity keys → max eth = 0 → 100 - 10 - 5 = 85
    assert.strictEqual(getQuizWeightTarget(ct), 85);
});

test('getQuizWeightTarget: handles non-numeric values as 0', () => {
    const ct = { familyWeight: 'abc', ageRiskWeight: '', ethnicityRisk_chinese: 'bad' };
    assert.strictEqual(getQuizWeightTarget(ct), 100);
});

// ---- computeGenericWeightValidity ----

test('computeGenericWeightValidity: valid when all targets sum to quiz target', () => {
    const ct = { familyWeight: '10', ageRiskWeight: '5', ethnicityRisk_chinese: '0' };
    const quizTarget = getQuizWeightTarget(ct); // 85
    const assignments = [
        { targetCancerType: 'colorectal', weight: '42.5' },
        { targetCancerType: 'colorectal', weight: '42.5' },
        { targetCancerType: 'breast', weight: '85' }
    ];
    const result = computeGenericWeightValidity(assignments, ct);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.targetCount, 2);
    assert.strictEqual(result.quizTarget, quizTarget);
    assert.strictEqual(result.weightByTarget.colorectal.isValid, true);
    assert.strictEqual(result.weightByTarget.breast.isValid, true);
});

test('computeGenericWeightValidity: invalid when a target does not sum correctly', () => {
    const ct = { familyWeight: '10', ageRiskWeight: '5' };
    const assignments = [
        { targetCancerType: 'colorectal', weight: '40' },
        { targetCancerType: 'colorectal', weight: '40' }
    ];
    const result = computeGenericWeightValidity(assignments, ct);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.weightByTarget.colorectal.isValid, false);
});

test('computeGenericWeightValidity: invalid when no assignments', () => {
    const ct = { familyWeight: '10' };
    const result = computeGenericWeightValidity([], ct);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.targetCount, 0);
});

test('computeGenericWeightValidity: skips assignments with empty targetCancerType', () => {
    const ct = { familyWeight: '0', ageRiskWeight: '0' };
    const assignments = [
        { targetCancerType: '', weight: '50' },
        { targetCancerType: 'breast', weight: '100' }
    ];
    const result = computeGenericWeightValidity(assignments, ct);
    assert.strictEqual(result.targetCount, 1);
    assert.strictEqual(result.weightByTarget.breast.isValid, true);
});
