/**
 * Unit tests for dynamic risk scoring (US-03)
 * Run: node --test tests/riskCalculator.test.js
 */

import test from 'node:test';
import assert from 'node:assert';
import { calculateRiskScore, calculateAnswerContribution, validateQuestionWeights } from '../controllers/riskCalculator.js';

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

test('calculateRiskScore: generic assessment adds demographics to each cancer type', () => {
    const config = { familyWeight: 8, ageRiskThreshold: 40, ageRiskWeight: 5, ethnicityRisk: { chinese: 2 } };
    const userData = { age: 50, familyHistory: 'Yes', ethnicity: 'chinese' };
    const answers = [
        { weight: 10, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'breast' },
        { weight: 20, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle', cancerType: 'lung' }
    ];
    const result = calculateRiskScore(userData, answers, 'generic', config);
    // Demographics: family(8) + age(5) + ethnicity(2) = 15
    // Breast: 10 quiz + 15 demo = 25
    // Lung: 20 quiz + 15 demo = 35
    assert.strictEqual(result.cancerTypeScores.breast.score, 25);
    assert.strictEqual(result.cancerTypeScores.lung.score, 35);
});

test('calculateAnswerContribution: Yes uses yesValue', () => {
    const q = { weight: 20, yesValue: 100, noValue: 0 };
    assert.strictEqual(calculateAnswerContribution(q, 'Yes'), 20);
});

test('calculateAnswerContribution: No uses noValue', () => {
    const q = { weight: 20, yesValue: 100, noValue: 0 };
    assert.strictEqual(calculateAnswerContribution(q, 'No'), 0);
});

test('calculateAnswerContribution: partial yesValue', () => {
    const q = { weight: 20, yesValue: 50, noValue: 0 };
    assert.strictEqual(calculateAnswerContribution(q, 'Yes'), 10);
});

test('validateQuestionWeights: valid sum 100', () => {
    const questions = [{ weight: 50 }, { weight: 50 }];
    const r = validateQuestionWeights(questions);
    assert.strictEqual(r.isValid, true);
    assert.strictEqual(r.totalWeight, 100);
});

test('validateQuestionWeights: invalid sum', () => {
    const questions = [{ weight: 30 }, { weight: 40 }];
    const r = validateQuestionWeights(questions);
    assert.strictEqual(r.isValid, false);
});

test('validateQuestionWeights: custom target weight', () => {
    const questions = [{ weight: 42.5 }, { weight: 42.5 }];
    const r = validateQuestionWeights(questions, 85);
    assert.strictEqual(r.isValid, true);
    assert.strictEqual(r.totalWeight, 85);
});
