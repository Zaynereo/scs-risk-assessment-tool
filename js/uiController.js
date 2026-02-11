import { RISK_LEVELS } from './constants.js';

export class UIController {
    constructor(elements) { this.elements = elements; }

    // UPDATED: Now updates the visual progress bar and text
    updateProgress(curr, total) { 
        if (this.elements.game.progressBar) {
            const percentage = (curr / total) * 100;
            this.elements.game.progressBar.style.width = `${percentage}%`;
        }
        if (this.elements.game.progressText) {
            this.elements.game.progressText.textContent = `${curr} / ${total}`;
        }
    }

    setTargetHighlight(direction) {
        this.elements.game.binTarget?.classList.toggle('active', direction === 'left');
        this.elements.game.pinboardTarget?.classList.toggle('active', direction === 'right');
    }

    showQuestion(text) { if (this.elements.game.questionText) this.elements.game.questionText.textContent = text; }

    showFeedback(isLeft) {
        const overlay = isLeft ? this.elements.game.feedbackCorrect : this.elements.game.feedbackWrong;
        if (overlay) { overlay.style.opacity = '1'; setTimeout(() => overlay.style.opacity = '0', 500); }
    }

    pulseScreen(direction) {
        const overlay = this.elements.game.glowOverlay;
        if (!overlay) return;

        const pulseClass = direction === 'left' ? 'pulse-green' : 'pulse-red';
        
        overlay.classList.remove('pulse-green', 'pulse-red');
        void overlay.offsetWidth; 
        overlay.classList.add(pulseClass);
        
        setTimeout(() => {
            overlay.classList.remove(pulseClass);
        }, 600);
    }

    animateCardSwipe(direction, onComplete) {
        const card = this.elements.game.questionCard;
        if (!card) return;
        this.setTargetHighlight(null);
        card.style.transform = ''; 
        const className = direction === 'left' ? 'swipe-left' : 'swipe-right';
        card.classList.add(className);

        setTimeout(() => {
            card.classList.remove(className);
            card.style.opacity = '0'; 
            if (onComplete) onComplete();
        }, 500);
    }

    resetCard() {
        const card = this.elements.game.questionCard;
        if (card) {
            card.style.opacity = '1';
            card.style.transform = '';
        }
    }

    showExplanation(question) {
        const container = this.elements.game.feedbackExplanation;
        if (container) {
            container.innerHTML = `
                <div class="explanation-content">
                    <h4 class="risk-badge ${question.risk.toLowerCase()}">${question.risk} RISK</h4>
                    <p>${question.explanation}</p>
                </div>
            `;
            container.style.display = 'block';
        }
    }

    hideExplanation() { if (this.elements.game.feedbackExplanation) this.elements.game.feedbackExplanation.style.display = 'none'; }
    updateGlow(isRisk) { this.elements.game.glowOverlay?.classList.toggle('pulse-red', isRisk); }
}