/**
 * Risk Calculator Controller (MVC Pattern)
 * Contains business logic for percentage-based risk score calculation
 * 
 * New Scoring System:
 * - Each question has a 'weight' (percentage contribution to total risk)
 * - Each answer (Yes/No) has a value (0-100%) that determines how much of the weight is added
 * - Final score = sum of (weight * answerValue / 100) for all questions
 * - Score is clamped to 0-100%
 */

const RISK_CATEGORIES = {
    DIET: 'Diet & Nutrition',
    LIFESTYLE: 'Lifestyle',
    MEDICAL: 'Medical History',
    FAMILY: 'Family & Genetics'
};

/**
 * Calculate risk score from user data and answers using percentage-based scoring.
 *
 * For generic mode, callers may pass `cancerConfigsByType` — a map
 * `{ [cancerTypeId]: perCancerConfig }` — so each cancer type's demographic
 * weights (familyWeight / ageRiskWeight / ethnicityRisk) are applied per-cancer.
 * If `cancerConfigsByType` is omitted, the legacy single `assessmentConfig` is
 * applied uniformly to every cancer type appearing in the answers.
 *
 * Each generic answer may carry a `targets[]` array (one entry per
 * `(question, targetCancerType)` assignment row); each target's contribution is
 * credited independently to its cancer type. Legacy `answer.cancerType` is still
 * honoured when `targets[]` is absent.
 */
export function calculateRiskScore(userData, answers, assessmentType = null, assessmentConfig = null, cancerConfigsByType = null) {
    let totalScore = 0;
    const categoryRisks = {
        [RISK_CATEGORIES.DIET]: 0,
        [RISK_CATEGORIES.LIFESTYLE]: 0,
        [RISK_CATEGORIES.MEDICAL]: 0,
        [RISK_CATEGORIES.FAMILY]: 0
    };

    // For Generic Assessment, track scores by cancer type
    const cancerTypeScores = {};
    
    // Demographic contributions (separate from quiz answers)
    const demographicContributions = {
        familyHistory: 0,
        age: 0,
        ethnicity: 0
    };
    
    // Base risk from family history (uses assessment-specific weight)
    if (userData.familyHistory === 'Yes') {
        const familyWeight = assessmentConfig?.familyWeight || 10;
        totalScore += familyWeight;
        categoryRisks[RISK_CATEGORIES.FAMILY] += familyWeight;
        demographicContributions.familyHistory = familyWeight;
        
        // For Generic Assessment, demographics are added to per-cancer scores
        // after answer processing (see demoTotal block below)
    }
    
    // Age-based risk (if user age >= threshold)
    if (assessmentConfig && userData.age !== undefined && userData.age !== null) {
        const age = parseInt(userData.age);
        const threshold = assessmentConfig.ageRiskThreshold || 0;
        const ageWeight = assessmentConfig.ageRiskWeight || 0;
        
        if (age >= threshold && ageWeight > 0) {
            totalScore += ageWeight;
            categoryRisks[RISK_CATEGORIES.MEDICAL] += ageWeight;
            demographicContributions.age = ageWeight;
        }
    }
    
    // Ethnicity risk (direct percentage, e.g. 2 = 2%)
    if (assessmentConfig && userData.ethnicity && assessmentConfig.ethnicityRisk) {
        const ethnicity = userData.ethnicity.toLowerCase();
        const ethnicityWeight = parseFloat(assessmentConfig.ethnicityRisk[ethnicity]) || 0;
        if (ethnicityWeight > 0) {
            totalScore += ethnicityWeight;
            categoryRisks[RISK_CATEGORIES.MEDICAL] += ethnicityWeight;
            demographicContributions.ethnicity = ethnicityWeight;
        }
    }

    function ensureCancerBucket(cancerType) {
        if (!cancerTypeScores[cancerType]) {
            cancerTypeScores[cancerType] = {
                score: 0,
                categories: {
                    [RISK_CATEGORIES.DIET]: 0,
                    [RISK_CATEGORIES.LIFESTYLE]: 0,
                    [RISK_CATEGORIES.MEDICAL]: 0,
                    [RISK_CATEGORIES.FAMILY]: 0
                }
            };
        }
        return cancerTypeScores[cancerType];
    }

    // Calculate from answers using percentage-based scoring.
    // Shared generic questions are multiplexed at the frontend answer-
    // construction stage (public/js/main.js _handleAnswer pushes one answer
    // row per target), so the calculator sees a flat stream of single-target
    // answers for both specific and generic modes.
    answers.forEach(answer => {
        const weight = parseFloat(answer.weight) || 0;
        const parsedYes = parseFloat(answer.yesValue);
        const yesValue = Number.isNaN(parsedYes) ? 100 : parsedYes;
        const parsedNo = parseFloat(answer.noValue);
        const noValue = Number.isNaN(parsedNo) ? 0 : parsedNo;
        const category = answer.category || RISK_CATEGORIES.LIFESTYLE;
        const cancerType = answer.cancerType ? String(answer.cancerType).toLowerCase() : null;

        let answerValue = 0;
        if (answer.userAnswer === 'Yes') answerValue = yesValue;
        else if (answer.userAnswer === 'No') answerValue = noValue;

        const contribution = weight * (answerValue / 100);
        if (contribution <= 0) return;

        totalScore += contribution;
        categoryRisks[category] = (categoryRisks[category] || 0) + contribution;

        if (assessmentType === 'generic' && cancerType) {
            const bucket = ensureCancerBucket(cancerType);
            bucket.score += contribution;
            bucket.categories[category] = (bucket.categories[category] || 0) + contribution;
        }
    });

    // For Generic Assessment, add demographic contributions per cancer type.
    // Each cancer's own config drives its family/age/ethnicity boost. Callers
    // always pass `cancerConfigsByType` (uiController builds it from
    // assessments; routes/assessments.js builds it from getAllCancerTypes).
    if (assessmentType === 'generic' && cancerConfigsByType) {
        Object.keys(cancerTypeScores).forEach(ct => {
            const cfg = cancerConfigsByType[ct];
            if (!cfg) return;
            const bucket = cancerTypeScores[ct];
            if (userData.familyHistory === 'Yes') {
                const w = parseFloat(cfg.familyWeight) || 0;
                if (w > 0) {
                    bucket.score += w;
                    bucket.categories[RISK_CATEGORIES.FAMILY] = (bucket.categories[RISK_CATEGORIES.FAMILY] || 0) + w;
                }
            }
            if (userData.age !== undefined && userData.age !== null) {
                const age = parseInt(userData.age);
                const threshold = parseInt(cfg.ageRiskThreshold) || 0;
                const w = parseFloat(cfg.ageRiskWeight) || 0;
                if (age >= threshold && w > 0) {
                    bucket.score += w;
                    bucket.categories[RISK_CATEGORIES.MEDICAL] = (bucket.categories[RISK_CATEGORIES.MEDICAL] || 0) + w;
                }
            }
            if (userData.ethnicity && cfg.ethnicityRisk) {
                const w = parseFloat(cfg.ethnicityRisk[userData.ethnicity.toLowerCase()]) || 0;
                if (w > 0) {
                    bucket.score += w;
                    bucket.categories[RISK_CATEGORIES.MEDICAL] = (bucket.categories[RISK_CATEGORIES.MEDICAL] || 0) + w;
                }
            }
        });
    }

    // Clamp score to 0-100
    totalScore = Math.max(0, Math.min(100, totalScore));

    // Determine risk level
    let riskLevel = 'LOW';
    if (totalScore >= 66) riskLevel = 'HIGH';
    else if (totalScore >= 33) riskLevel = 'MEDIUM';

    // Generate recommendations
    const recommendations = generateRecommendations(categoryRisks, riskLevel, assessmentConfig?.recommendations);

    const result = {
        totalScore: Math.round(totalScore),
        riskLevel,
        categoryRisks,
        recommendations,
        demographicContributions // Separate demographic contributions for display
    };
    
    // Add cancer-specific scores for Generic Assessment
    if (assessmentType === 'generic' && Object.keys(cancerTypeScores).length > 0) {
        result.cancerTypeScores = {};
        
        Object.keys(cancerTypeScores).forEach(cancerType => {
            const score = Math.min(100, cancerTypeScores[cancerType].score);
            let cancerRiskLevel = 'LOW';
            if (score >= 66) cancerRiskLevel = 'HIGH';
            else if (score >= 33) cancerRiskLevel = 'MEDIUM';
            
            result.cancerTypeScores[cancerType] = {
                score: Math.round(Math.min(100, score)),
                riskLevel: cancerRiskLevel,
                categories: cancerTypeScores[cancerType].categories
            };
        });
    }
    
    return result;
}

/**
 * Calculate the quiz weight target for a cancer type.
 * Total risk budget is 100%, shared between quiz questions and onboarding factors.
 * Ethnicity values are direct percentages (e.g. 2 = 2%).
 */
export function getQuizWeightTarget(cancerType) {
    if (!cancerType) return 100;
    const familyWeight = parseFloat(cancerType.familyWeight) || 0;
    const ageWeight = parseFloat(cancerType.ageRiskWeight) || 0;
    const ethKeys = ['ethnicityRisk_chinese', 'ethnicityRisk_malay', 'ethnicityRisk_indian', 'ethnicityRisk_caucasian', 'ethnicityRisk_others'];
    let maxEthWeight = 0;
    for (const key of ethKeys) {
        const ethWeight = parseFloat(cancerType[key]) || 0;
        if (ethWeight > maxEthWeight) maxEthWeight = ethWeight;
    }
    return 100 - familyWeight - ageWeight - maxEthWeight;
}

/**
 * Compute weight validity for generic assessment assignments.
 * Checks that each target cancer type's assignments sum to the quiz weight target.
 */
export function computeGenericWeightValidity(assignments, cancerType, perTargetRows) {
    const fallbackQuizTarget = getQuizWeightTarget(cancerType);
    const weightByTarget = {};
    for (const a of assignments) {
        const target = (a.targetCancerType || '').toLowerCase().trim();
        if (!target) continue;
        if (!weightByTarget[target]) weightByTarget[target] = { totalWeight: 0, isValid: false, quizTarget: fallbackQuizTarget };
        weightByTarget[target].totalWeight += parseFloat(a.weight) || 0;
    }
    for (const target of Object.keys(weightByTarget)) {
        // Each group's own budget comes from ITS OWN cancer row. When a target
        // is missing from the map (e.g. the cancer was deleted), the group
        // still gets a fallback target derived from the generic row so the
        // validation never throws — but a missing entry is a data bug worth
        // surfacing upstream.
        const row = perTargetRows[target];
        const quizTarget = row ? getQuizWeightTarget(row) : fallbackQuizTarget;
        weightByTarget[target].quizTarget = quizTarget;
        const sum = weightByTarget[target].totalWeight;
        weightByTarget[target].isValid = Math.round(sum * 100) === Math.round(quizTarget * 100);
    }
    const hasAssignments = assignments.length > 0;
    const everyTargetValid = Object.keys(weightByTarget).length === 0
        ? !hasAssignments
        : Object.values(weightByTarget).every(v => v.isValid);
    const isValid = hasAssignments && everyTargetValid;
    return { weightByTarget, targetCount: Object.keys(weightByTarget).length, isValid, quizTarget: fallbackQuizTarget };
}

/**
 * Evaluate whether a recommendation trigger condition is met.
 * @param {string} trigger - Trigger type (always, diet, lifestyle, medical, family, high_risk, screening)
 * @param {Object} categoryRisks - Risk scores by category
 * @param {string} riskLevel - Overall risk level (LOW, MEDIUM, HIGH)
 * @returns {boolean}
 */
export function evaluateTrigger(trigger, categoryRisks, riskLevel) {
    switch (trigger) {
        case 'always': return true;
        case 'diet': return (categoryRisks[RISK_CATEGORIES.DIET] || 0) > 0;
        case 'lifestyle': return (categoryRisks[RISK_CATEGORIES.LIFESTYLE] || 0) > 0;
        case 'medical': return (categoryRisks[RISK_CATEGORIES.MEDICAL] || 0) > 0;
        case 'family': return (categoryRisks[RISK_CATEGORIES.FAMILY] || 0) > 0;
        case 'high_risk': return riskLevel === 'HIGH';
        case 'screening': return (categoryRisks[RISK_CATEGORIES.MEDICAL] || 0) > 0
                               || (categoryRisks[RISK_CATEGORIES.FAMILY] || 0) > 0;
        default: return true;
    }
}

/**
 * Generate personalized recommendations based on category risks.
 * If cancerTypeRecs is provided (non-empty array from the cancer type's DB record),
 * filter by trigger and return multilingual format.
 * Otherwise fall back to hardcoded defaults for backward compatibility.
 */
function generateRecommendations(categoryRisks, riskLevel, cancerTypeRecs) {
    // Use per-cancer-type recommendations if available
    if (Array.isArray(cancerTypeRecs) && cancerTypeRecs.length > 0) {
        return cancerTypeRecs
            .filter(rec => evaluateTrigger(rec.trigger || 'always', categoryRisks, riskLevel))
            .map(rec => ({
                trigger: rec.trigger,
                title: rec.title,
                actions: rec.actions || []
            }));
    }

    // Fallback: hardcoded defaults (backward compat for cancer types without recommendations)
    const recommendations = [];

    if (categoryRisks[RISK_CATEGORIES.DIET] > 0) {
        recommendations.push({
            title: 'Improve Your Diet',
            actions: [
                'Add more fiber: Aim for 25-30g daily from fruits, vegetables, and whole grains',
                'Limit red meat to 1-2 servings per week',
                'Avoid processed meats like bacon, hot dogs, and deli meats',
                'Try Mediterranean diet patterns with fish, olive oil, and vegetables'
            ]
        });
    }

    if (categoryRisks[RISK_CATEGORIES.LIFESTYLE] > 0) {
        recommendations.push({
            title: 'Get Active & Healthy',
            actions: [
                'Start with 30 minutes of moderate activity 5 days a week',
                'Include both cardio (walking, swimming) and strength training',
                'Take movement breaks every hour if you sit at a desk',
                'Maintain a healthy weight through balanced diet and exercise',
                'Limit alcohol consumption and avoid smoking'
            ]
        });
    }

    if (categoryRisks[RISK_CATEGORIES.MEDICAL] > 0 || categoryRisks[RISK_CATEGORIES.FAMILY] > 0) {
        recommendations.push({
            title: 'Schedule Screening',
            actions: [
                'Talk to your doctor about which cancer screenings are right for you',
                'Early detection significantly improves treatment outcomes',
                'Follow the Singapore Cancer Society screening guidelines'
            ]
        });
    }

    recommendations.push({
        title: 'Reduce Risk Behaviours',
        actions: [
            'Quit smoking or seek support to quit (increases cancer risk significantly)',
            'Limit alcohol to no more than 1 drink per day',
            'Manage chronic conditions like diabetes with your doctor',
            'Stay up to date with all recommended health screenings'
        ]
    });

    return recommendations;
}
