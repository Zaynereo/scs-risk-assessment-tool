import { DOMElements } from './domElements.js';
import { GameState } from './gameState.js';
import { MascotController } from './mascotController.js';
import { UIController } from './uiController.js';
import { RISK_WEIGHTS } from './constants.js';
import { QUESTIONS } from './questions.js';

class RiskAssessmentApp {
    constructor() {
        this.dom = new DOMElements();
        this.state = new GameState();
        this.mascot = new MascotController(this.dom.mascot);
        this.ui = new UIController(this.dom);
        this.initialize();
    }

    initialize() {
        this._setupLandingListeners();
        this._setupOnboardingListeners();
        this._setupGameListeners();
    }

    _setupLandingListeners() {
        this.dom.landing.assessmentCards.forEach(c => c.addEventListener('click', () => {
            this.selectedAssessment = c.dataset.assessment;
            this.dom.switchScreen('onboarding');
        }));
    }

    _setupOnboardingListeners() {
        const ageIn = this.dom.onboarding.ageInput;
        const ageSlide = this.dom.onboarding.ageSlider;

        ageIn?.addEventListener('input', (e) => { if (ageSlide) ageSlide.value = e.target.value; this._checkFormValidity(); });
        ageSlide?.addEventListener('input', (e) => { if (ageIn) ageIn.value = e.target.value; this._checkFormValidity(); });

        this.dom.onboarding.genderInputs.forEach(i => i.addEventListener('change', (e) => {
            this.mascot.setGender(e.target.value);
            this._checkFormValidity();
        }));
        this.dom.onboarding.ethnicityInputs.forEach(i => i.addEventListener('change', (e) => {
            this.dom.onboarding.ethnicityOthersContainer?.classList.toggle('hidden', e.target.value !== 'Others');
            this._checkFormValidity();
        }));
        this.dom.onboarding.familyHistoryInputs.forEach(i => i.addEventListener('change', () => this._checkFormValidity()));

        this.dom.onboarding.form?.addEventListener('submit', (e) => { e.preventDefault(); this._startAssessment(); });
    }

    _checkFormValidity() {
        const age = this.dom.onboarding.ageInput.value;
        const gender = document.querySelector('input[name="gender"]:checked');
        const family = document.querySelector('input[name="family-history"]:checked');
        const eth = document.querySelector('input[name="ethnicity"]:checked');
        this.dom.onboarding.startButton.disabled = !(age && gender && family && eth);
    }

    async _startAssessment() {
        const gender = document.querySelector('input[name="gender"]:checked').value;
        const familyHistory = document.querySelector('input[name="family-history"]:checked').value;
        const ethnicity = document.querySelector('input[name="ethnicity"]:checked').value;
        
        this.state.setUserData(this.dom.onboarding.ageInput.value, gender, familyHistory, ethnicity, this.selectedAssessment);
        this.state.setQuestions(QUESTIONS);
        this.dom.switchScreen('game');
        this._showNextQuestion();
    }

    _setupGameListeners() {
        let startX = 0, isDragging = false;
        const card = this.dom.game.questionCard;

        const move = (x) => {
            if (!isDragging) return;
            const deltaX = x - startX;
            card.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.05}deg)`;
            this.ui.setTargetHighlight(deltaX < -60 ? 'left' : (deltaX > 60 ? 'right' : null));
        };

        card.addEventListener('mousedown', e => { startX = e.clientX; isDragging = true; card.classList.add('dragging'); });
        document.addEventListener('mousemove', e => move(e.clientX));
        document.addEventListener('mouseup', e => {
            if (!isDragging) return;
            isDragging = false; card.classList.remove('dragging');
            const deltaX = e.clientX - startX;
            if (Math.abs(deltaX) > 100) this._handleAnswer(deltaX > 0 ? 'right' : 'left');
            else { card.style.transform = ''; this.ui.setTargetHighlight(null); }
        });

        card.addEventListener('touchstart', e => { startX = e.touches[0].clientX; isDragging = true; });
        card.addEventListener('touchmove', e => move(e.touches[0].clientX));
        card.addEventListener('touchend', e => {
            if (!isDragging) return;
            isDragging = false;
            const deltaX = e.changedTouches[0].clientX - startX;
            if (Math.abs(deltaX) > 100) this._handleAnswer(deltaX > 0 ? 'right' : 'left');
            else { card.style.transform = ''; this.ui.setTargetHighlight(null); }
        });
    }

    _showNextQuestion() {
        const q = this.state.getCurrentQuestion();
        if (!q) { this.dom.switchScreen('results'); return; }
        
        this.mascot.updateState('Idle');
        
        this.ui.showQuestion(q.prompt);
        this.ui.resetCard();
        
        const p = this.state.getProgress();
        this.ui.updateProgress(p.current, p.total);
        this.ui.hideExplanation();
    }

    _handleAnswer(dir) {
        const q = this.state.getCurrentQuestion();
        
        this.ui.pulseScreen(dir);

        const mascotState = (dir === 'left') ? 'Good' : 'Shocked';
        this.mascot.updateState(mascotState);

        const isRisk = (dir === 'left' && q.correctAnswer === 'No') || (dir === 'right' && q.correctAnswer === 'Yes');
        this.ui.showFeedback(dir === 'left');
        
        if (isRisk) { 
            this.state.addRiskScore(RISK_WEIGHTS[q.risk] || 5); 
            // REMOVED: this.ui.updateRiskBar(...) - Bar no longer exists
        }

        this.ui.animateCardSwipe(dir, () => {
            this.ui.showExplanation(q);

            setTimeout(() => {
                this.ui.hideExplanation();

                if (this.state.nextQuestion()) {
                    this._showNextQuestion();
                } else {
                    this.mascot.hide();
                    this.dom.switchScreen('results');
                }
            }, 5000);
        });
    }
}
document.addEventListener('DOMContentLoaded', () => new RiskAssessmentApp());