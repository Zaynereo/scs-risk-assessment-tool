import { RISK_LEVELS } from './constants.js';

export class UIController {
    constructor(elements) { this.elements = elements; }

    updateRiskBar(score) {
        const level = score < RISK_LEVELS.MEDIUM.threshold ? RISK_LEVELS.LOW : (score < RISK_LEVELS.HIGH.threshold ? RISK_LEVELS.MEDIUM : RISK_LEVELS.HIGH);
        if (this.elements.game.riskBar) { this.elements.game.riskBar.style.width = `${score}%`; this.elements.game.riskBar.style.backgroundColor = level.color; }
        if (this.elements.game.riskLabel) { this.elements.game.riskLabel.textContent = level.label; this.elements.game.riskLabel.style.color = level.color; }
    }

    setTargetHighlight(direction) {
        this.elements.game.binTarget?.classList.toggle('active', direction === 'left');
        this.elements.game.pinboardTarget?.classList.toggle('active', direction === 'right');
    }

    showQuestion(text) { if (this.elements.game.questionText) this.elements.game.questionText.textContent = text; }
    updateProgress(curr, total) { if (this.elements.game.progressCounter) this.elements.game.progressCounter.textContent = `${curr} / ${total}`; }

    showFeedback(isLeft) {
        const overlay = isLeft ? this.elements.game.feedbackCorrect : this.elements.game.feedbackWrong;
        if (overlay) { overlay.style.opacity = '1'; setTimeout(() => overlay.style.opacity = '0', 500); }
    }

    pulseScreen(direction) {
        const overlay = this.elements.game.glowOverlay;
        if (!overlay) return;

        const pulseClass = direction === 'left' ? 'pulse-green' : 'pulse-red';
        
        // Reset animation if already running
        overlay.classList.remove('pulse-green', 'pulse-red');
        void overlay.offsetWidth; // Trigger reflow
        overlay.classList.add(pulseClass);
        
        setTimeout(() => {
            overlay.classList.remove(pulseClass);
        }, 600);
    }

    animateCardSwipe(direction, onComplete) {
        const card = this.elements.game.questionCard;
        if (!card) return;
        this.setTargetHighlight(null);
        card.style.transform = ''; // Clear manual drag transform
        const className = direction === 'left' ? 'swipe-left' : 'swipe-right';
        card.classList.add(className);

        setTimeout(() => {
            card.classList.remove(className);
            card.style.opacity = '0';
            if (onComplete) onComplete();
            setTimeout(() => { card.style.opacity = '1'; }, 50);
        }, 500);
    }

    showExplanation(text) {
        const container = this.elements.game.feedbackExplanation;
        if (container) { container.querySelector('p').textContent = text; container.style.display = 'block'; }
    }
    hideExplanation() { if (this.elements.game.feedbackExplanation) this.elements.game.feedbackExplanation.style.display = 'none'; }
    updateGlow(isRisk) { this.elements.game.glowOverlay?.classList.toggle('pulse-red', isRisk); }
}