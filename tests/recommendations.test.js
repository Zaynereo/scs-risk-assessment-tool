/**
 * Tests for per-cancer-type recommendations system.
 * Run: NODE_ENV=test node --test tests/recommendations.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateRiskScore, evaluateTrigger } from '../controllers/riskCalculator.js';

describe('evaluateTrigger', () => {
    const baseRisks = {
        'Diet & Nutrition': 0,
        'Lifestyle': 0,
        'Medical History': 0,
        'Family & Genetics': 0
    };

    it('always trigger returns true regardless of risks', () => {
        assert.strictEqual(evaluateTrigger('always', baseRisks, 'LOW'), true);
        assert.strictEqual(evaluateTrigger('always', baseRisks, 'HIGH'), true);
    });

    it('diet trigger returns true only when Diet & Nutrition > 0', () => {
        assert.strictEqual(evaluateTrigger('diet', baseRisks, 'LOW'), false);
        assert.strictEqual(evaluateTrigger('diet', { ...baseRisks, 'Diet & Nutrition': 5 }, 'LOW'), true);
    });

    it('lifestyle trigger returns true only when Lifestyle > 0', () => {
        assert.strictEqual(evaluateTrigger('lifestyle', baseRisks, 'LOW'), false);
        assert.strictEqual(evaluateTrigger('lifestyle', { ...baseRisks, 'Lifestyle': 3 }, 'LOW'), true);
    });

    it('medical trigger returns true only when Medical History > 0', () => {
        assert.strictEqual(evaluateTrigger('medical', baseRisks, 'LOW'), false);
        assert.strictEqual(evaluateTrigger('medical', { ...baseRisks, 'Medical History': 2 }, 'LOW'), true);
    });

    it('family trigger returns true only when Family & Genetics > 0', () => {
        assert.strictEqual(evaluateTrigger('family', baseRisks, 'LOW'), false);
        assert.strictEqual(evaluateTrigger('family', { ...baseRisks, 'Family & Genetics': 10 }, 'LOW'), true);
    });

    it('high_risk trigger returns true only when riskLevel is HIGH', () => {
        assert.strictEqual(evaluateTrigger('high_risk', baseRisks, 'LOW'), false);
        assert.strictEqual(evaluateTrigger('high_risk', baseRisks, 'MEDIUM'), false);
        assert.strictEqual(evaluateTrigger('high_risk', baseRisks, 'HIGH'), true);
    });

    it('screening trigger returns true when Medical History or Family & Genetics > 0', () => {
        assert.strictEqual(evaluateTrigger('screening', baseRisks, 'LOW'), false);
        assert.strictEqual(evaluateTrigger('screening', { ...baseRisks, 'Medical History': 1 }, 'LOW'), true);
        assert.strictEqual(evaluateTrigger('screening', { ...baseRisks, 'Family & Genetics': 1 }, 'LOW'), true);
    });

    it('unknown trigger defaults to true', () => {
        assert.strictEqual(evaluateTrigger('unknown_trigger', baseRisks, 'LOW'), true);
    });
});

describe('generateRecommendations with per-cancer recs', () => {
    const sampleRecs = [
        {
            trigger: 'diet',
            title: { en: 'Improve Diet', zh: '改善饮食' },
            actions: [{ en: 'Eat fiber', zh: '吃纤维' }]
        },
        {
            trigger: 'high_risk',
            title: { en: 'See Doctor', zh: '看医生' },
            actions: [{ en: 'Visit doctor ASAP', zh: '尽快看医生' }]
        },
        {
            trigger: 'always',
            title: { en: 'General Advice', zh: '一般建议' },
            actions: [{ en: 'Stay healthy', zh: '保持健康' }]
        }
    ];

    it('filters recommendations by trigger when per-cancer recs are provided', () => {
        const result = calculateRiskScore(
            { age: 30, gender: 'Male', familyHistory: 'No' },
            [{ weight: 10, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Diet & Nutrition' }],
            'colorectal',
            { familyWeight: 10, ageRiskThreshold: 50, ageRiskWeight: 5, ethnicityRisk: {}, recommendations: sampleRecs }
        );

        // Should include 'diet' (triggered) and 'always', but NOT 'high_risk' (score is low)
        assert.ok(result.recommendations.length >= 2, `Expected at least 2 recs, got ${result.recommendations.length}`);
        const titles = result.recommendations.map(r => r.title.en);
        assert.ok(titles.includes('Improve Diet'), 'Should include diet rec');
        assert.ok(titles.includes('General Advice'), 'Should include always rec');
        assert.ok(!titles.includes('See Doctor'), 'Should NOT include high_risk rec for low score');
    });

    it('returns multilingual title/actions format when per-cancer recs are provided', () => {
        const result = calculateRiskScore(
            { age: 30, gender: 'Male', familyHistory: 'No' },
            [{ weight: 10, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Diet & Nutrition' }],
            'colorectal',
            { familyWeight: 10, ageRiskThreshold: 50, ageRiskWeight: 5, ethnicityRisk: {}, recommendations: sampleRecs }
        );

        const dietRec = result.recommendations.find(r => r.title?.en === 'Improve Diet');
        assert.ok(dietRec, 'Diet recommendation should be present');
        assert.strictEqual(typeof dietRec.title, 'object', 'Title should be an object (multilingual)');
        assert.strictEqual(dietRec.title.en, 'Improve Diet');
        assert.strictEqual(dietRec.title.zh, '改善饮食');
        assert.ok(Array.isArray(dietRec.actions), 'Actions should be an array');
        assert.strictEqual(typeof dietRec.actions[0], 'object', 'Action items should be objects');
    });

    it('falls back to hardcoded defaults when recommendations array is empty', () => {
        const result = calculateRiskScore(
            { age: 30, gender: 'Male', familyHistory: 'No' },
            [{ weight: 10, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle' }],
            'colorectal',
            { familyWeight: 10, ageRiskThreshold: 50, ageRiskWeight: 5, ethnicityRisk: {}, recommendations: [] }
        );

        // Should get hardcoded defaults
        assert.ok(result.recommendations.length > 0, 'Should have fallback recommendations');
        const titles = result.recommendations.map(r => r.title);
        assert.ok(titles.includes('Get Active & Healthy'), 'Should include hardcoded lifestyle rec');
        // Titles are plain strings in fallback mode
        assert.strictEqual(typeof result.recommendations[0].title, 'string');
    });

    it('falls back to hardcoded defaults when recommendations is null/undefined', () => {
        const result = calculateRiskScore(
            { age: 30, gender: 'Male', familyHistory: 'No' },
            [{ weight: 10, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle' }],
            'colorectal',
            { familyWeight: 10, ageRiskThreshold: 50, ageRiskWeight: 5, ethnicityRisk: {} }
        );

        assert.ok(result.recommendations.length > 0, 'Should have fallback recommendations');
        assert.strictEqual(typeof result.recommendations[0].title, 'string');
    });

    it('high_risk trigger fires only when score >= 66', () => {
        // Force high score with heavy weight
        const result = calculateRiskScore(
            { age: 30, gender: 'Male', familyHistory: 'No' },
            [{ weight: 70, yesValue: 100, noValue: 0, userAnswer: 'Yes', category: 'Lifestyle' }],
            'colorectal',
            { familyWeight: 10, ageRiskThreshold: 50, ageRiskWeight: 5, ethnicityRisk: {}, recommendations: sampleRecs }
        );

        assert.strictEqual(result.riskLevel, 'HIGH');
        const titles = result.recommendations.map(r => r.title.en);
        assert.ok(titles.includes('See Doctor'), 'high_risk rec should fire when score is HIGH');
    });
});
