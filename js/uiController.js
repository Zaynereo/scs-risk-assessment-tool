import { RISK_LEVELS } from './constants.js';
import { calculateRiskScore } from '../controllers/riskCalculator.js';

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

    showFeedback(isCorrect) {
        const overlay = isCorrect ? this.elements.game.feedbackCorrect : this.elements.game.feedbackWrong;
        if (overlay) { overlay.style.opacity = '1'; setTimeout(() => overlay.style.opacity = '0', 500); }
    }

    showExplanation(text) {
        if (!this.elements.game.feedbackExplanation) return;
        const p = this.elements.game.feedbackExplanation.querySelector('p');
        if (p) {
            p.textContent = text;
            this.elements.game.feedbackExplanation.style.display = 'block';
        }
    }

    hideExplanation() {
        if (this.elements.game.feedbackExplanation) {
            this.elements.game.feedbackExplanation.style.display = 'none';
        }
    }

    updateGlow(isRisk) {
        if (!this.elements.game.glowOverlay) return;
        if (isRisk) {
            this.elements.game.glowOverlay.classList.add('pulse-red');
        } else {
            this.elements.game.glowOverlay.classList.remove('pulse-red');
        }
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

    /**
     * Display results - Recalculates final score using comprehensive calculation
     */
    showResults(gameState, answers) {
        // Get user data and answers for comprehensive recalculation
        const userData = gameState.getUserData();

        // Recalculate risk score using comprehensive algorithm
        const riskResult = calculateRiskScore(userData, answers, userData.assessmentType);

        // Update GameState with recalculated values for consistency
        gameState.riskScore = riskResult.totalScore;
        gameState.riskByCategory = { ...riskResult.categoryRisks };

        // Store recommendations and cancer-specific scores for later use
        this.currentRecommendations = riskResult.recommendations;
        this.cancerTypeScores = riskResult.cancerTypeScores || null;
        
        // Debug: Log cancer type scores for generic assessment
        if (userData.assessmentType === 'generic') {
            console.log('Generic assessment - cancerTypeScores:', this.cancerTypeScores);
            console.log('Risk result:', riskResult);
        }

        // Update risk level heading
        if (this.elements.results.riskLevel) {
            this.elements.results.riskLevel.textContent = `${riskResult.riskLevel} RISK`;
            this.elements.results.riskLevel.className = `risk-${riskResult.riskLevel.toLowerCase()}`;
        }

        // Update score visualization
        this._updateScoreGauge(riskResult.totalScore);

        // Update summary with recalculated data
        this._updateSummary(gameState, riskResult);

        // Display cancer-specific breakdown for Generic Assessment
        if (userData.assessmentType === 'generic' && this.cancerTypeScores) {
            this._renderCancerTypeBreakdown(this.cancerTypeScores);
            // Show the cancer breakdown section
            const cancerBreakdownSection = document.getElementById('cancer-breakdown');
            if (cancerBreakdownSection) {
                cancerBreakdownSection.style.display = 'block';
            }
        }

        // Return the risk result for use by caller
        return riskResult;
    }

    /**
     * Render cancer-specific risk breakdown for Generic Assessment
     */
    _renderCancerTypeBreakdown(cancerTypeScores) {
        if (!this.elements.results.cancerBreakdownContainer) return;

        // Get cancer type names for display
        const cancerTypeNames = {
            'breast': 'Breast Cancer',
            'lung': 'Lung Cancer', 
            'colorectal': 'Colorectal Cancer',
            'liver': 'Liver Cancer',
            'cervical': 'Cervical Cancer',
            'prostate': 'Prostate Cancer'
        };

        // Sort by risk score (highest first)
        const sortedCancerTypes = Object.keys(cancerTypeScores)
            .map(type => ({ type, ...cancerTypeScores[type] }))
            .sort((a, b) => b.score - a.score);

        const html = sortedCancerTypes.map(({ type, score, riskLevel }) => {
            const displayName = cancerTypeNames[type] || type.charAt(0).toUpperCase() + type.slice(1) + ' Cancer';
            const riskClass = riskLevel.toLowerCase();
            
            return `
                <div class="cancer-risk-item">
                    <div class="cancer-risk-header">
                        <span class="cancer-type-name">${displayName}</span>
                        <div class="cancer-risk-score">
                            <span class="score-value">${score}</span>
                            <span class="risk-badge risk-${riskClass}">${riskLevel} RISK</span>
                        </div>
                    </div>
                    <div class="cancer-risk-gauge">
                        <div class="gauge-fill gauge-${riskClass}" style="width: ${Math.min(score, 100)}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.results.cancerBreakdownContainer.innerHTML = html;
    }

    /**
     * Render risk breakdown by category
     */
    renderRiskBreakdown(categoryRisks, answerCounts) {
        if (!this.elements.results.breakdownContainer) return;

        const categories = Object.keys(categoryRisks);
        const html = categories.map(category => {
            const risk = categoryRisks[category];
            const count = answerCounts[category];
            const badge = this._getCategoryBadge(risk, count);

            return `
                <div class="risk-category">
                    <div class="category-header">
                        <span class="category-name">${category}</span>
                        <span class="badge ${badge.class}">${badge.text}</span>
                    </div>
                    <p class="category-count">${count} factor(s) identified</p>
                </div>
            `;
        }).join('');

        this.elements.results.breakdownContainer.innerHTML = html;
    }

    /**
     * Render recommendations
     */
    renderRecommendations(recommendations) {
        if (!this.elements.results.recommendationsContainer) return;

        const html = recommendations.map((rec, index) => `
            <div class="accordion-item">
                <button class="accordion-header" data-index="${index}">
                    <span>${rec.title}</span>
                    <span class="accordion-icon">+</span>
                </button>
                <div class="accordion-content">
                    <ul>
                        ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');

        this.elements.results.recommendationsContainer.innerHTML = html;
        this._attachAccordionListeners();
    }

    // Private methods
    _getRiskLevelFromScore(score) {
        if (score < RISK_LEVELS.MEDIUM.threshold) return RISK_LEVELS.LOW;
        if (score < RISK_LEVELS.HIGH.threshold) return RISK_LEVELS.MEDIUM;
        return RISK_LEVELS.HIGH;
    }

    _updateScoreGauge(score) {
        if (this.elements.results.scoreNumber) {
            this.elements.results.scoreNumber.textContent = score;
        }

        if (this.elements.results.scoreArc) {
            const circumference = 188.5;
            const progressLength = (score / 100) * circumference;

            // Special handling for 100% - fill entire path
            if (score >= 100) {
                this.elements.results.scoreArc.style.strokeDasharray = `${circumference} 0`;
            } else {
                // Set dasharray with a very large gap to prevent pattern repetition
                this.elements.results.scoreArc.style.strokeDasharray = `${progressLength} 9999`;
            }
            this.elements.results.scoreArc.style.strokeDashoffset = '0';

            const level = this._getRiskLevelFromScore(score);
            // For score 0, make the progress arc invisible by setting it to background color
            if (score === 0) {
                this.elements.results.scoreArc.style.stroke = '#e0e0e0'; // Same as background
            } else {
                this.elements.results.scoreArc.style.stroke = level.color;
            }
        }
    }

    _updateSummary(gameState, riskResult = null) {
        // Use recalculated risk result if provided, otherwise fall back to gameState
        const riskLevel = riskResult ? riskResult.riskLevel : gameState.getRiskLevel();

        // Get assessment type for more specific messaging
        const assessmentType = gameState.getUserData().assessmentType || 'colorectal';

        const messages = {
            LOW: `Great job! Your lifestyle choices show low risk for ${assessmentType} cancer.`,
            MEDIUM: 'Your results show some areas that could be improved to reduce your risk.',
            HIGH: 'Your results indicate several risk factors. Consider making changes and consulting a doctor.'
        };

        if (this.elements.results.summary) {
            this.elements.results.summary.textContent = messages[riskLevel] || messages.MEDIUM;
        }
    }

    _getCategoryBadge(risk, count) {
        if (count === 0) return { class: 'badge-low', text: 'No Issues' };
        if (risk < 20) return { class: 'badge-low', text: 'Low Risk' };
        if (risk < 40) return { class: 'badge-medium', text: 'Some Risk' };
        return { class: 'badge-high', text: 'High Risk' };
    }

    _attachAccordionListeners() {
        const headers = document.querySelectorAll('.accordion-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('active');
                const content = header.nextElementSibling;
                content?.classList.toggle('active');

                const icon = header.querySelector('.accordion-icon');
                if (icon) {
                    icon.textContent = header.classList.contains('active') ? '−' : '+';
                }
            });
        });
    }
}
