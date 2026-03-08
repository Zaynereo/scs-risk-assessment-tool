import { RISK_LEVELS } from './constants.js';
import { calculateRiskScore } from '../controllers/riskCalculator.js';
import { escapeHtml } from './utils/escapeHtml.js';

export class UIController {
    constructor(elements, translationFn) {
        this.elements = elements;
        this.t = translationFn || ((group, key) => key);
    }

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

    showExplanation(question, userAnswer, continueLabel = 'Continue') {
        const container = this.elements.game.feedbackExplanation;
        if (!container) return;

        const riskLevel = question.risk || (question.weight > 10 ? 'HIGH' : (question.weight > 5 ? 'MEDIUM' : 'LOW'));
        const riskClass = riskLevel.toLowerCase();
        const explanationText = (userAnswer === 'Yes')
            ? (question.explanationYes ? String(question.explanationYes) : '')
            : (question.explanationNo ? String(question.explanationNo) : '');

        const importanceKey = riskLevel.toLowerCase() + 'Importance';
        const translatedBadge = this.t('game', importanceKey);
        container.innerHTML = `
            <div class="explanation-content" aria-atomic="true">
                <h4 class="risk-badge ${escapeHtml(riskClass)}">${escapeHtml(translatedBadge)}</h4>
                <p>${escapeHtml(explanationText)}</p>
                <button class="explanation-continue-btn" type="button">${escapeHtml(continueLabel)}</button>
            </div>
        `;
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.style.display = 'block';
        const continueBtn = container.querySelector('.explanation-continue-btn');
        if (continueBtn) continueBtn.focus();
    }

    hideExplanation() {
        if (this.elements.game.feedbackExplanation) {
            this.elements.game.feedbackExplanation.style.display = 'none';
            this.elements.game.feedbackExplanation.setAttribute('role', 'region');
            this.elements.game.feedbackExplanation.removeAttribute('aria-modal');
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

    // ... (Your existing showResults and helper methods remain unchanged)
    showResults(gameState, answers, assessments = []) {
        this.assessments = assessments;
        const userData = gameState.getUserData();
        const isGeneric = userData.assessmentType === 'generic';
        const riskResult = calculateRiskScore(userData, answers, userData.assessmentType, null);

        gameState.riskScore = riskResult.totalScore;
        gameState.riskByCategory = { ...riskResult.categoryRisks };

        this.cancerTypeScores = riskResult.cancerTypeScores || null;

        const scoreContainer = document.querySelector('.results-score-container');
        const riskBreakdown = document.querySelector('.risk-breakdown');
        const cancerBreakdownSection = document.getElementById('cancer-breakdown');

        if (isGeneric && this.cancerTypeScores) {
            // Generic assessment: cancer breakdown is the hero section
            if (scoreContainer) scoreContainer.style.display = 'none';
            if (riskBreakdown) riskBreakdown.style.display = 'none';

            // Filter out gender-irrelevant cancer types
            const gender = userData.gender?.toLowerCase();
            const filtered = {};
            for (const [type, data] of Object.entries(this.cancerTypeScores)) {
                if (gender === 'female' && type === 'prostate') continue;
                if (gender === 'male' && type === 'cervical') continue;
                filtered[type] = data;
            }

            // Determine overall risk from highest individual cancer type
            const scores = Object.values(filtered);
            const highestRisk = scores.reduce((max, s) => s.score > max.score ? s : max, { score: 0, riskLevel: 'LOW' });

            if (this.elements.results.riskLevel) {
                const riskKey = highestRisk.riskLevel.toLowerCase() + 'Risk';
                this.elements.results.riskLevel.textContent = this.t('results', riskKey);
                this.elements.results.riskLevel.className = `risk-${highestRisk.riskLevel.toLowerCase()}`;
            }

            this._updateSummary(gameState, { ...riskResult, riskLevel: highestRisk.riskLevel });
            this._updateHighRiskCTA(highestRisk.riskLevel);
            this._renderCancerTypeBreakdown(filtered);
            if (cancerBreakdownSection) cancerBreakdownSection.style.display = 'block';
        } else {
            // Specific cancer type assessment: show the standard gauge
            if (scoreContainer) scoreContainer.style.display = '';
            if (riskBreakdown) riskBreakdown.style.display = '';
            if (cancerBreakdownSection) cancerBreakdownSection.style.display = 'none';

            if (this.elements.results.riskLevel) {
                const riskKey = riskResult.riskLevel.toLowerCase() + 'Risk';
                this.elements.results.riskLevel.textContent = this.t('results', riskKey);
                this.elements.results.riskLevel.className = `risk-${riskResult.riskLevel.toLowerCase()}`;
            }

            this._updateScoreGauge(riskResult.totalScore);
            this._updateSummary(gameState, riskResult);
            this._updateHighRiskCTA(riskResult.riskLevel);
        }

        return riskResult;
    }

    _renderCancerTypeBreakdown(cancerTypeScores) {
        if (!this.elements.results.cancerBreakdownContainer) return;

        // Build lookup maps from assessment data (single source of truth)
        const nameMap = {};
        const iconMap = {};
        if (this.assessments) {
            for (const a of this.assessments) {
                if (a.id && a.id !== 'generic') {
                    nameMap[a.id] = a.name;
                    iconMap[a.id] = a.icon;
                }
            }
        }

        const isImageUrl = (val) => {
            if (!val || typeof val !== 'string') return false;
            const v = val.trim();
            return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/') || v.startsWith('data:') || v.startsWith('assets/');
        };

        const renderIcon = (icon, fallbackLetter) => {
            if (icon && isImageUrl(icon)) {
                const src = escapeHtml(icon);
                return `<img src="${src}" alt="" class="cancer-type-icon-img" onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='inline'"><span style="display:none">${escapeHtml(fallbackLetter)}</span>`;
            }
            return icon || fallbackLetter;
        };


        const sortedCancerTypes = Object.keys(cancerTypeScores)
            .map(type => ({ type, ...cancerTypeScores[type] }))
            .sort((a, b) => b.score - a.score);

        const html = sortedCancerTypes.map(({ type, score, riskLevel }) => {
            const displayName = nameMap[type] || type.charAt(0).toUpperCase() + type.slice(1) + ' Cancer';
            const fallbackLetter = type.charAt(0).toUpperCase();
            const iconHtml = renderIcon(iconMap[type], fallbackLetter);
            const riskClass = riskLevel.toLowerCase();
            const gaugeWidth = Math.min(score, 100);

            return `
                <div class="cancer-risk-item cancer-risk-${escapeHtml(riskClass)}">
                    <div class="cancer-risk-header">
                        <div class="cancer-type-info">
                            <span class="cancer-type-icon">${iconHtml}</span>
                            <span class="cancer-type-name">${escapeHtml(displayName)}</span>
                        </div>
                        <div class="cancer-risk-score">
                            <span class="risk-badge risk-${escapeHtml(riskClass)}">${escapeHtml(riskLevel)}</span>
                        </div>
                    </div>
                    <div class="cancer-risk-gauge">
                        <div class="gauge-fill gauge-${escapeHtml(riskClass)}" style="width: ${gaugeWidth}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.results.cancerBreakdownContainer.innerHTML = html;
    }

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
                        <span class="category-name">${escapeHtml(category)}</span>
                        <span class="badge ${badge.class}">${escapeHtml(badge.text)}</span>
                    </div>
                    <p class="category-count">${count} ${escapeHtml(this.t('results', 'factorsIdentified'))}</p>
                </div>
            `;
        }).join('');

        this.elements.results.breakdownContainer.innerHTML = html;
    }

    renderRecommendations(recommendations) {
        if (!this.elements.results.recommendationsContainer) return;

        const html = recommendations.map((rec, index) => `
            <div class="accordion-item">
                <button class="accordion-header" data-index="${index}" aria-expanded="false">
                    <span>${escapeHtml(rec.title)}</span>
                    <span class="accordion-icon">+</span>
                </button>
                <div class="accordion-content">
                    <ul>
                        ${rec.actions.map(action => `<li>${escapeHtml(action)}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');

        this.elements.results.recommendationsContainer.innerHTML = html;
        this._attachAccordionListeners();
    }

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

            if (score >= 100) {
                this.elements.results.scoreArc.style.strokeDasharray = `${circumference} 0`;
            } else {
                this.elements.results.scoreArc.style.strokeDasharray = `${progressLength} 9999`;
            }
            this.elements.results.scoreArc.style.strokeDashoffset = '0';

            const level = this._getRiskLevelFromScore(score);
            if (score === 0) {
                this.elements.results.scoreArc.style.stroke = '#e0e0e0';
            } else {
                this.elements.results.scoreArc.style.stroke = level.color;
            }
        }
    }

    _updateSummary(gameState, riskResult = null) {
        const riskLevel = riskResult ? riskResult.riskLevel : gameState.getRiskLevel();
        const assessmentType = gameState.getUserData().assessmentType || 'colorectal';
        const isGeneric = assessmentType === 'generic';

        const cancerLabel = isGeneric ? 'cancer' : `${assessmentType} cancer`;
        const summaryKeys = { LOW: 'summaryLow', MEDIUM: 'summaryMedium', HIGH: 'summaryHigh' };
        const key = summaryKeys[riskLevel] || summaryKeys.MEDIUM;

        if (this.elements.results.summary) {
            this.elements.results.summary.textContent = this.t('results', key, { cancer: cancerLabel });
        }
    }

    /**
     * Show or hide high-risk call-to-action and emphasize book-screening button for HIGH risk (US-01).
     */
    _updateHighRiskCTA(riskLevel) {
        const ctaEl = document.getElementById('high-risk-cta');
        const bookBtn = document.getElementById('book-screening-btn');
        const isHighRisk = riskLevel === 'HIGH';
        if (ctaEl) {
            ctaEl.classList.toggle('hidden', !isHighRisk);
        }
        if (bookBtn) {
            if (isHighRisk) {
                bookBtn.setAttribute('data-high-risk', 'true');
                bookBtn.classList.add('high-risk-cta-button');
            } else {
                bookBtn.removeAttribute('data-high-risk');
                bookBtn.classList.remove('high-risk-cta-button');
            }
        }
    }

    _getCategoryBadge(risk, count) {
        if (count === 0) return { class: 'badge-low', text: this.t('results', 'noIssues') };
        if (risk < 20) return { class: 'badge-low', text: this.t('results', 'lowRiskBadge') };
        if (risk < 40) return { class: 'badge-medium', text: this.t('results', 'someRisk') };
        return { class: 'badge-high', text: this.t('results', 'highRiskBadge') };
    }

    _attachAccordionListeners() {
        const headers = document.querySelectorAll('.accordion-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('active');
                const isActive = header.classList.contains('active');
                header.setAttribute('aria-expanded', String(isActive));
                const content = header.nextElementSibling;
                content?.classList.toggle('active');

                const icon = header.querySelector('.accordion-icon');
                if (icon) {
                    icon.textContent = isActive ? '−' : '+';
                }
            });
        });
    }
}