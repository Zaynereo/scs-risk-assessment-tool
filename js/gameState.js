import { RISK_CATEGORIES } from './constants.js';

/**
 * Game State Management (Single Responsibility)
 * Manages all game state with clear getters/setters
 * 
 * Updated for percentage-based scoring:
 * - riskScore is now a percentage (0-100)
 * - Each question contributes based on its weight and answer value
 */
export class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.userAge = 0;
        this.userGender = '';
        this.userFamilyHistory = '';
        this.userEthnicity = '';
        this.userAssessmentType = 'colorectal';
        this.currentQuestionIndex = 0;
        this.riskScore = 0; // Percentage-based score (0-100)
        this.questions = [];

        this.riskByCategory = {
            [RISK_CATEGORIES.DIET]: 0,
            [RISK_CATEGORIES.LIFESTYLE]: 0,
            [RISK_CATEGORIES.MEDICAL]: 0,
            [RISK_CATEGORIES.FAMILY]: 0
        };

        this.answersCount = {
            [RISK_CATEGORIES.DIET]: 0,
            [RISK_CATEGORIES.LIFESTYLE]: 0,
            [RISK_CATEGORIES.MEDICAL]: 0,
            [RISK_CATEGORIES.FAMILY]: 0
        };
    }

    // User Data
    setUserData(age, gender, familyHistory, ethnicity, assessmentType = 'colorectal') {
        this.userAge = parseInt(age);
        this.userGender = gender;
        this.userFamilyHistory = familyHistory;
        this.userEthnicity = ethnicity;
        this.userAssessmentType = assessmentType;
    }

    getUserData() {
        return {
            age: this.userAge,
            gender: this.userGender,
            familyHistory: this.userFamilyHistory,
            ethnicity: this.userEthnicity,
            assessmentType: this.userAssessmentType
        };
    }

    // Questions
    setQuestions(questions) {
        this.questions = [...questions];
    }

    replaceQuestions(questions) {
        this.questions = [...questions];
        // Clamp index so it stays within bounds after swap
        if (this.currentQuestionIndex >= this.questions.length) {
            this.currentQuestionIndex = Math.max(0, this.questions.length - 1);
        }
    }

    getCurrentQuestion() {
        return this.questions[this.currentQuestionIndex];
    }

    nextQuestion() {
        this.currentQuestionIndex++;
        return this.currentQuestionIndex < this.questions.length;
    }

    isLastQuestion() {
        return this.currentQuestionIndex >= this.questions.length - 1;
    }

    getProgress() {
        return {
            current: this.currentQuestionIndex + 1,
            total: this.questions.length
        };
    }

    // Risk Score
    addRiskScore(amount) {
        this.riskScore = Math.max(0, Math.min(100, this.riskScore + amount));
        return this.riskScore;
    }

    getRiskScore() {
        return Math.round(this.riskScore);
    }

    // Category Tracking
    addCategoryRisk(category, amount) {
        if (this.riskByCategory.hasOwnProperty(category)) {
            this.riskByCategory[category] += amount;
            this.answersCount[category]++;
        }
    }

    getCategoryRisks() {
        return { ...this.riskByCategory };
    }

    getAnswerCounts() {
        return { ...this.answersCount };
    }

    // Risk Level Computation
    getRiskLevel() {
        const score = this.getRiskScore();
        if (score < 33) return 'LOW';
        if (score < 66) return 'MEDIUM';
        return 'HIGH';
    }

    // State Validation
    isReady() {
        return this.userAge > 0 && this.userGender && this.userFamilyHistory;
    }
}
