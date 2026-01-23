// DOM Element References (Single Responsibility)
export class DOMElements {
    constructor() {
        // Screens
        this.screens = {
            landing: document.getElementById('screen-landing'),
            cancerSelection: document.getElementById('screen-cancer-selection'),
            onboarding: document.getElementById('screen-onboarding'),
            game: document.getElementById('screen-game'),
            results: document.getElementById('screen-results')
        };

        // Landing elements
        this.landing = {
            assessmentCards: document.querySelectorAll('.assessment-card'),
            cardButtons: document.querySelectorAll('.card-btn')
        };

        // Onboarding elements
        this.onboarding = {
            form: document.getElementById('onboarding-form'),
            ageInput: document.getElementById('age-input'),
            ageSlider: document.getElementById('age-slider'),
            genderInputs: document.querySelectorAll('input[name="gender"]'),
            ethnicityInputs: document.querySelectorAll('input[name="ethnicity"]'),
            ethnicityOthersContainer: document.getElementById('ethnicity-others-container'),
            ethnicityOthersInput: document.getElementById('ethnicity-others-input'),
            familyHistoryInputs: document.querySelectorAll('input[name="family-history"]'),
            startButton: document.getElementById('start-game-btn'),
            backButton: document.getElementById('back-to-landing'),
            assessmentTitle: document.getElementById('assessment-title'),
            assessmentSubtitle: document.getElementById('assessment-subtitle'),
            familyHistoryLabel: document.getElementById('family-history-label')
        };

        // Game elements
        this.game = {
            riskBar: document.getElementById('risk-factor-progress'),
            riskLabel: document.getElementById('risk-factor-label'),
            questionCard: document.getElementById('question-card'),
            questionText: document.getElementById('question-text'),
            cardContainer: document.getElementById('card-container'),
            feedbackCorrect: document.getElementById('feedback-correct'),
            feedbackWrong: document.getElementById('feedback-wrong'),
            feedbackExplanation: document.getElementById('feedback-explanation'),
            progressCounter: document.getElementById('progress-counter'),
            glowOverlay: document.getElementById('glow-overlay')
        };

        // Results elements
        this.results = {
            riskLevel: document.getElementById('results-risk-level'),
            summary: document.getElementById('results-summary'),
            scoreNumber: document.getElementById('score-number'),
            scoreArc: document.getElementById('score-arc'),
            scoreComparison: document.getElementById('score-comparison'),
            breakdownContainer: document.getElementById('breakdown-categories'),
            recommendationsContainer: document.getElementById('recommendations-container'),
            resultsForm: document.getElementById('results-form'),
            emailPhone: document.getElementById('email-phone'),
            formMessage: document.getElementById('results-form-message'),
            playAgainBtn: document.getElementById('play-again-btn')
        };

        // Mascot elements
        this.mascot = {
            flashOverlay: document.getElementById('mascot-flash-overlay'),
            flashImg: document.getElementById('mascot-flash-img'),
            liveContainer: document.getElementById('live-mascot-container'),
            img: document.getElementById('mascot-img')
        };
    }

    /**
     * Switch between screens
     */
    switchScreen(screenName) {
        Object.values(this.screens).forEach(screen => screen?.classList.remove('active'));
        this.screens[screenName]?.classList.add('active');
    }

    /**
     * Validate that all required elements exist
     */
    validate() {
        const missing = [];

        // Check critical elements
        if (!this.screens.landing) missing.push('screen-landing');
        if (!this.screens.cancerSelection) missing.push('screen-cancer-selection');
        if (!this.screens.onboarding) missing.push('screen-onboarding');
        if (!this.screens.game) missing.push('screen-game');
        if (!this.screens.results) missing.push('screen-results');

        if (missing.length > 0) {
            console.warn('Missing DOM elements:', missing);
        }

        return missing.length === 0;
    }
}
