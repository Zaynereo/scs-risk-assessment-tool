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

test('calculateRiskScore: ethnicity multiplier applied to total', () => {
    const config = {
        familyWeight: 0,
        ageRiskThreshold: 0,
        ageRiskWeight: 0,
        ethnicityRisk: { chinese: 1.2, malay: 1.0, indian: 1.0, caucasian: 1.0, others: 1.0 }
    };
    const userData = { age: 30, familyHistory: 'No', ethnicity: 'chinese' };
    const answers = [{ weight: 50, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle' }];
    const result = calculateRiskScore(userData, answers, null, config);
    assert.strictEqual(result.totalScore, Math.round(50 * 1.2)); // 60
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
