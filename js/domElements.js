export class DOMElements {
    constructor() {
        this.screens = {
            landing: document.getElementById('screen-landing'),
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
            genderInputs: document.querySelectorAll('input[name="gender"]'),
            ethnicityInputs: document.querySelectorAll('input[name="ethnicity"]'),
            ethnicityOthersContainer: document.getElementById('ethnicity-others-container'),
            ethnicityOthersInput: document.getElementById('ethnicity-others-input'),
            familyHistoryInputs: document.querySelectorAll('input[name="family-history"]'),
            startButton: document.getElementById('start-game-btn'),
            backButton: document.getElementById('back-to-landing'),
            assessmentTitle: document.getElementById('assessment-title'),
            familyHistoryLabel: document.getElementById('family-history-label')
        };
        
        this.game = {
            // UPDATED: Progress Bar Elements
            progressBar: document.getElementById('progress-bar-fill'),
            progressText: document.getElementById('progress-bar-text'),
            
            questionCard: document.getElementById('question-card'),
            questionText: document.getElementById('question-text'),
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
            recommendationsContainer: document.getElementById('recommendations-container'), 
            playAgainBtn: document.getElementById('play-again-btn') 
        };
        
        this.mascot = { 
            img: document.getElementById('mascot-img'), 
            liveContainer: document.getElementById('live-mascot-container') 
        };
    }

    switchScreen(name) { 
        Object.values(this.screens).forEach(s => s?.classList.remove('active')); 
        this.screens[name]?.classList.add('active'); 
    }

    validate() { return !!(this.screens.game && this.game.questionCard); }
}