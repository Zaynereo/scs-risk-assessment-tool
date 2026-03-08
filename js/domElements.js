export class DOMElements {
    constructor() {
        this.screens = {
            landing: document.getElementById('screen-landing'),
            cancerSelection: document.getElementById('screen-cancer-selection'),
            onboarding: document.getElementById('screen-onboarding'),
            game: document.getElementById('screen-game'),
            results: document.getElementById('screen-results')
        };
        
        this.landing = { 
            assessmentCards: document.querySelectorAll('.assessment-card'), 
            cardButtons: document.querySelectorAll('.card-btn') 
        };
        
        this.onboarding = {
            form: document.getElementById('onboarding-form'),
            ageInput: document.getElementById('age-input'),
            ageSlider: document.getElementById('age-slider'),
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
        
        this.game = {
            progressBar: document.getElementById('progress-bar-fill'),
            progressText: document.getElementById('progress-bar-text'),
            questionCard: document.getElementById('question-card'),
            questionText: document.getElementById('question-text'),
            cardContainer: document.getElementById('card-container'),
            feedbackCorrect: document.getElementById('feedback-correct'),
            feedbackWrong: document.getElementById('feedback-wrong'),
            feedbackExplanation: document.getElementById('feedback-explanation'),
            glowOverlay: document.getElementById('glow-overlay'),
            binTarget: document.getElementById('target-bin'),
            pinboardTarget: document.getElementById('target-pinboard')
        };

        this.results = {
            riskLevel: document.getElementById('results-risk-level'),
            summary: document.getElementById('results-summary'),
            scoreNumber: document.getElementById('score-number'),
            scoreArc: document.getElementById('score-arc'),
            breakdownContainer: document.getElementById('breakdown-categories'),
            cancerBreakdownContainer: document.getElementById('cancer-breakdown-container'),
            recommendationsContainer: document.getElementById('recommendations-container'),
            resultsForm: document.getElementById('results-form'),
            emailPhone: document.getElementById('email-phone'),
            formMessage: document.getElementById('results-form-message'),
            playAgainBtn: document.getElementById('play-again-btn')
        };
        
        this.mascot = { 
            img: document.getElementById('mascot-img'), 
            liveContainer: document.getElementById('live-mascot-container') 
        };

        this._bgAudio = new Audio();
        this._bgAudio.loop = true;
    }

    getActiveScreenName() {
        const names = ['landing', 'cancerSelection', 'onboarding', 'game', 'results'];
        return names.find(name => this.screens[name]?.classList.contains('active')) || 'landing';
    }

    switchScreen(name) { 
        Object.values(this.screens).forEach(s => s?.classList.remove('active')); 
        this.screens[name]?.classList.add('active');
        const el = this.screens[name];
        const src = (el && el.dataset.backgroundMusic) ? el.dataset.backgroundMusic.trim() : '';
        if (src) {
            this._bgAudio.src = src;
            this._bgAudio.play().catch(() => {});
        } else {
            this._bgAudio.pause();
            this._bgAudio.removeAttribute('src');
        }
    }

    validate() {
        const missing = [];
        if (!this.screens.landing) missing.push('screen-landing');
        if (!this.screens.cancerSelection) missing.push('screen-cancer-selection');
        if (!this.screens.onboarding) missing.push('screen-onboarding');
        if (!this.screens.game) missing.push('screen-game');
        if (!this.screens.results) missing.push('screen-results');
        if (missing.length > 0) console.warn('Missing DOM elements:', missing);
        return missing.length === 0;
    }
}
