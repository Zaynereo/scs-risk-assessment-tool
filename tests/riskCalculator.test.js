/**
 * Unit tests for dynamic risk scoring (US-03)
 * Run: node --test tests/riskCalculator.test.js
 */

import test from 'node:test';
import assert from 'node:assert';
import { calculateRiskScore } from '../controllers/riskCalculator.js';

test('calculateRiskScore: no answers returns zero score and LOW risk', () => {
    const userData = { age: 30, familyHistory: 'No' };
    const answers = [];
    const result = calculateRiskScore(userData, answers);
    assert.strictEqual(result.totalScore, 0);
    assert.strictEqual(result.riskLevel, 'LOW');
});

test('calculateRiskScore: score >= 66 yields HIGH risk', () => {
    const userData = { age: 25, familyHistory: 'No' };
    const answers = [
        { weight: 70, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle' }
    ];
    const result = calculateRiskScore(userData, answers);
    assert.ok(result.totalScore >= 66);
    assert.strictEqual(result.riskLevel, 'HIGH');
});

test('calculateRiskScore: score in [33, 66) yields MEDIUM risk', () => {
    const userData = { age: 25, familyHistory: 'No' };
    const answers = [
        { weight: 50, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle' }
    ];
    const result = calculateRiskScore(userData, answers);
    assert.ok(result.totalScore >= 33 && result.totalScore < 66);
    assert.strictEqual(result.riskLevel, 'MEDIUM');
});

test('calculateRiskScore: family history adds family weight', () => {
    const config = { familyWeight: 10, ageRiskThreshold: 50, ageRiskWeight: 0, ethnicityRisk: {} };
    const userData = { age: 30, familyHistory: 'Yes' };
    const result = calculateRiskScore(userData, [], null, config);
    assert.strictEqual(result.totalScore, 10);
    assert.strictEqual(result.riskLevel, 'LOW');
    assert.strictEqual(result.demographicContributions.familyHistory, 10);
});

test('calculateRiskScore: age >= threshold adds age weight', () => {
    const config = { familyWeight: 0, ageRiskThreshold: 50, ageRiskWeight: 5, ethnicityRisk: {} };
    const userData = { age: 55, familyHistory: 'No' };
    const result = calculateRiskScore(userData, [], null, config);
    assert.strictEqual(result.totalScore, 5);
    assert.strictEqual(result.demographicContributions.age, 5);
});

test('calculateRiskScore: ethnicity adds direct percentage weight', () => {
    const config = {
        familyWeight: 0,
        ageRiskThreshold: 0,
        ageRiskWeight: 0,
        ethnicityRisk: { chinese: 2, malay: 0, indian: 0, caucasian: 0, others: 0 }
    };
    const userData = { age: 30, familyHistory: 'No', ethnicity: 'chinese' };
    const answers = [{ weight: 50, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle' }];
    const result = calculateRiskScore(userData, answers, null, config);
    // Ethnicity weight: 2 (direct percentage)
    assert.strictEqual(result.totalScore, 52); // 50 + 2
    assert.strictEqual(result.demographicContributions.ethnicity, 2);
});

test('calculateRiskScore: ethnicity weight of 0 adds nothing', () => {
    const config = {
        familyWeight: 0,
        ageRiskThreshold: 0,
        ageRiskWeight: 0,
        ethnicityRisk: { chinese: 0, malay: 0, indian: 0, caucasian: 0, others: 0 }
    };
    const userData = { age: 30, familyHistory: 'No', ethnicity: 'chinese' };
    const answers = [{ weight: 50, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle' }];
    const result = calculateRiskScore(userData, answers, null, config);
    assert.strictEqual(result.totalScore, 50);
    assert.strictEqual(result.demographicContributions.ethnicity, 0);
});

test('calculateRiskScore: score clamped to 0-100', () => {
    const userData = { age: 25, familyHistory: 'No' };
    const answers = [
        { weight: 100, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle' }
    ];
    const result = calculateRiskScore(userData, answers);
    assert.strictEqual(result.totalScore, 100);
    assert.strictEqual(result.riskLevel, 'HIGH');
});

test('calculateRiskScore: generic assessment produces per-cancer-type scores', () => {
    const config = { familyWeight: 0, ageRiskThreshold: 0, ageRiskWeight: 0, ethnicityRisk: {} };
    const userData = { age: 30, familyHistory: 'No' };
    const answers = [
        { weight: 10, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'breast' },
        { weight: 15, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Medical History', cancerType: 'lung' },
        { weight: 5, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'breast' }
    ];
    const result = calculateRiskScore(userData, answers, 'generic', config);
    assert.ok(result.cancerTypeScores);
    assert.strictEqual(result.cancerTypeScores.breast.score, 15); // 10 + 5
    assert.strictEqual(result.cancerTypeScores.lung.score, 15);
    assert.strictEqual(result.totalScore, 30); // 10 + 15 + 5
});

// Per-cancer scores must be clamped to 0-100
test('calculateRiskScore: generic per-cancer scores are clamped to 100', () => {
    // Demographics applied per-cancer via cancerConfigsByType.
    // breast bucket = quiz 80 + family 20 + age 15 + ethnicity 5 = 120 unclamped.
    const cancerConfigsByType = {
        breast: { familyWeight: 20, ageRiskThreshold: 40, ageRiskWeight: 15, ethnicityRisk: { chinese: 5 } }
    };
    const userData = { age: 50, familyHistory: 'Yes', ethnicity: 'chinese' };
    const answers = [
        { weight: 80, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'breast' }
    ];
    const result = calculateRiskScore(userData, answers, 'generic', null, cancerConfigsByType);
    assert.ok(result.cancerTypeScores.breast.score <= 100,
        `Expected breast score <= 100, got ${result.cancerTypeScores.breast.score}`);
    assert.strictEqual(result.cancerTypeScores.breast.score, 100);
});

// === New generic-mode behaviour: per-cancer demographics, unified thresholds ===

test('generic: cancerConfigsByType applies each cancer\'s own demographics', () => {
    const userData = { age: 60, familyHistory: 'Yes', ethnicity: 'chinese' };
    const answers = [
        { weight: 10, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'lung' },
        { weight: 10, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'breast' }
    ];
    const cancerConfigsByType = {
        lung: { familyWeight: 12, ageRiskThreshold: 55, ageRiskWeight: 7, ethnicityRisk: { chinese: 1.3 } },
        breast: { familyWeight: 15, ageRiskThreshold: 50, ageRiskWeight: 8, ethnicityRisk: { chinese: 1.0 } }
    };
    const result = calculateRiskScore(userData, answers, 'generic', null, cancerConfigsByType);
    // lung: quiz 10 + family 12 + age 7 + eth 1.3 = 30.3 → 30
    // breast: quiz 10 + family 15 + age 8 + eth 1.0 = 34 → 34
    assert.strictEqual(result.cancerTypeScores.lung.score, 30);
    assert.strictEqual(result.cancerTypeScores.breast.score, 34);
});

test('generic per-cancer thresholds match specific (33/66)', () => {
    const userData = { age: 30, familyHistory: 'No' };
    // Each answer crafted to land its target cancer in a specific band. No
    // demographics: `cancerConfigsByType` has no entries for these cancers,
    // so the per-cancer demo block is a no-op.
    const answers = [
        { weight: 32, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'a_low' },
        { weight: 33, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'b_med' },
        { weight: 65, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'c_med_hi' },
        { weight: 66, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'd_high' }
    ];
    const result = calculateRiskScore(userData, answers, 'generic', null, {});
    assert.strictEqual(result.cancerTypeScores.a_low.riskLevel, 'LOW');
    assert.strictEqual(result.cancerTypeScores.b_med.riskLevel, 'MEDIUM');
    assert.strictEqual(result.cancerTypeScores.c_med_hi.riskLevel, 'MEDIUM');
    assert.strictEqual(result.cancerTypeScores.d_high.riskLevel, 'HIGH');
});
