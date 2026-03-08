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
 * Calculate risk score from user data and answers using percentage-based scoring
 * @param {Object} userData - User demographic data
 * @param {Array} answers - Array of answer objects with question details
 * @param {string} assessmentType - Type of assessment ('generic' or specific cancer type)
 * @param {Object} assessmentConfig - Assessment configuration with demographic risk settings
 * @returns {Object} - Risk assessment results
 */
export function calculateRiskScore(userData, answers, assessmentType = null, assessmentConfig = null) {
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

        // For Generic Assessment, add family history to all cancer types
        if (assessmentType === 'generic') {
            // This will be populated when we process answers
        }
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

    // Calculate from answers using percentage-based scoring
    answers.forEach(answer => {
        const weight = parseFloat(answer.weight) || 0;
        const parsedYes = parseFloat(answer.yesValue);
        const yesValue = Number.isNaN(parsedYes) ? 100 : parsedYes;
        const parsedNo = parseFloat(answer.noValue);
        const noValue = Number.isNaN(parsedNo) ? 0 : parsedNo;

        // Determine which value to use based on user's answer
        let answerValue = 0;
        if (answer.userAnswer === 'Yes') {
            answerValue = yesValue;
        } else if (answer.userAnswer === 'No') {
            answerValue = noValue;
        }

        // Calculate contribution: weight * (answerValue / 100)
        const contribution = weight * (answerValue / 100);

        if (contribution > 0) {
            totalScore += contribution;
            const category = answer.category || RISK_CATEGORIES.LIFESTYLE;
            categoryRisks[category] = (categoryRisks[category] || 0) + contribution;

            // Track by cancer type for Generic Assessment
            if (assessmentType === 'generic' && answer.cancerType) {
                const cancerType = answer.cancerType.toLowerCase();
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
                cancerTypeScores[cancerType].score += contribution;
                cancerTypeScores[cancerType].categories[category] += contribution;
            }
        }
    });

    // For Generic Assessment, add demographic contributions to each cancer type score
    if (assessmentType === 'generic') {
        const demoTotal = demographicContributions.familyHistory
            + demographicContributions.age
            + demographicContributions.ethnicity;
        if (demoTotal > 0) {
            Object.keys(cancerTypeScores).forEach(ct => {
                cancerTypeScores[ct].score += demoTotal;
            });
        }
    }

    // Clamp score to 0-100
    totalScore = Math.max(0, Math.min(100, totalScore));

    // Determine risk level
    let riskLevel = 'LOW';
    if (totalScore >= 66) riskLevel = 'HIGH';
    else if (totalScore >= 33) riskLevel = 'MEDIUM';

    // Generate recommendations
    const recommendations = generateRecommendations(categoryRisks, userData.age);

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
            const score = cancerTypeScores[cancerType].score;
            let cancerRiskLevel = 'LOW';
            if (score >= 70) cancerRiskLevel = 'HIGH'; // Lower threshold for individual cancer types
            else if (score >= 40) cancerRiskLevel = 'MEDIUM';

            result.cancerTypeScores[cancerType] = {
                score: Math.round(score),
                riskLevel: cancerRiskLevel,
                categories: cancerTypeScores[cancerType].categories
            };
        });
    }

    return result;
}

/**
 * Calculate the contribution of a single answer
 * @param {Object} question - Question object with weight, yesValue, noValue
 * @param {string} userAnswer - User's answer ('Yes' or 'No')
 * @returns {number} - Risk contribution percentage
 */
export function calculateAnswerContribution(question, userAnswer) {
    const weight = parseFloat(question.weight) || 0;
    const yesValue = parseFloat(question.yesValue) ?? 100;
    const noValue = parseFloat(question.noValue) ?? 0;

    let answerValue = 0;
    if (userAnswer === 'Yes') {
        answerValue = yesValue;
    } else if (userAnswer === 'No') {
        answerValue = noValue;
    }

    return weight * (answerValue / 100);
}

/**
 * Validate that question weights for a cancer type sum to approximately 100%
 * @param {Array} questions - Array of questions for a specific cancer type
 * @returns {Object} - Validation result with isValid flag and details
 */
export function validateQuestionWeights(questions, targetWeight = 100) {
    const totalWeight = questions.reduce((sum, q) => sum + (parseFloat(q.weight) || 0), 0);
    const isValid = Math.round(totalWeight * 100) === Math.round(targetWeight * 100);

    return {
        isValid,
        totalWeight: Math.round(totalWeight * 100) / 100,
        targetWeight,
        difference: Math.round((targetWeight - totalWeight) * 100) / 100,
        message: isValid
            ? `Weights are valid (sum to ~${targetWeight}%)`
            : `Weights sum to ${totalWeight.toFixed(2)}%, should be ${targetWeight}%`
    };
}

/**
 * Auto-calculate equal weights for questions without custom weights
 * @param {Array} questions - Array of questions
 * @returns {Array} - Questions with calculated weights
 */
export function autoCalculateWeights(questions) {
    const questionsWithoutWeight = questions.filter(q => !q.weight || q.weight === '');
    const questionsWithWeight = questions.filter(q => q.weight && q.weight !== '');

    const usedWeight = questionsWithWeight.reduce((sum, q) => sum + parseFloat(q.weight), 0);
    const remainingWeight = 100 - usedWeight;
    const autoWeight = questionsWithoutWeight.length > 0
        ? remainingWeight / questionsWithoutWeight.length
        : 0;

    return questions.map(q => {
        if (!q.weight || q.weight === '') {
            return { ...q, weight: autoWeight.toFixed(2) };
        }
        return q;
    });
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
export function computeGenericWeightValidity(assignments, cancerType) {
    const quizTarget = getQuizWeightTarget(cancerType);
    const weightByTarget = {};
    for (const a of assignments) {
        const target = (a.targetCancerType || '').toLowerCase().trim();
        if (!target) continue;
        if (!weightByTarget[target]) weightByTarget[target] = { totalWeight: 0, isValid: false };
        weightByTarget[target].totalWeight += parseFloat(a.weight) || 0;
    }
    for (const target of Object.keys(weightByTarget)) {
        const sum = weightByTarget[target].totalWeight;
        weightByTarget[target].isValid = Math.round(sum * 100) === Math.round(quizTarget * 100);
    }
    const hasAssignments = assignments.length > 0;
    const everyTargetValid = Object.keys(weightByTarget).length === 0
        ? !hasAssignments
        : Object.values(weightByTarget).every(v => v.isValid);
    const isValid = hasAssignments && everyTargetValid;
    return { weightByTarget, targetCount: Object.keys(weightByTarget).length, isValid, quizTarget };
}

/**
 * Generate personalized recommendations based on category risks
 */
function generateRecommendations(categoryRisks, userAge) {
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

    if (categoryRisks[RISK_CATEGORIES.MEDICAL] > 0 || categoryRisks[RISK_CATEGORIES.FAMILY] > 0 || userAge >= 45) {
        recommendations.push({
            title: 'Schedule Screening',
            actions: [
                'Screening is recommended starting at age 45 (earlier with family history)',
                'Options include colonoscopy, FIT test, or stool DNA test',
                'Early detection can prevent 90% of CRC deaths',
                'Talk to your doctor about which screening is right for you'
            ]
        });
    }

    recommendations.push({
        title: 'Reduce Risk Behaviors',
        actions: [
            'Quit smoking or seek support to quit (increases cancer risk significantly)',
            'Limit alcohol to no more than 1 drink per day',
            'Manage chronic conditions like diabetes with your doctor',
            'Stay up to date with all recommended health screenings'
        ]
    });

    return recommendations;
}
