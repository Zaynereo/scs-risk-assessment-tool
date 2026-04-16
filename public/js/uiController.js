import { RISK_CATEGORY_KEYS } from './constants.js';
import { calculateRiskScore } from '../controllers/riskCalculator.js';
import { escapeHtml } from './utils/escapeHtml.js';
import { audioController } from './audioController.js';
import { triggerConfetti } from './particles.js';

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
            const template = this.t('game', 'progressTemplate', { current: curr, total });
            this.elements.game.progressText.textContent = template || `${curr} / ${total}`;
            // Hide the progress text if you only want the bar
            this.elements.game.progressText.style.display = 'none'; 
        }
    }

    setTargetHighlight(direction) {
        if (this.elements.game.binTarget) {
            this.elements.game.binTarget.classList.toggle('active', direction === 'left');
            this.elements.game.binTarget.style.opacity = direction === 'left' ? '1' : '0.15';
        }
        if (this.elements.game.pinboardTarget) {
            this.elements.game.pinboardTarget.classList.toggle('active', direction === 'right');
            this.elements.game.pinboardTarget.style.opacity = direction === 'right' ? '1' : '0.15';
        }
    }

    showQuestion(text) { if (this.elements.game.questionText) this.elements.game.questionText.textContent = text; }

    showFeedback(isCorrect) {
        // --- AUDIO TRIGGER ---
        if (isCorrect) {
            audioController.play('chime');
        } else {
            audioController.play('click');
        }
        // ---------------------

        const overlay = isCorrect ? this.elements.game.feedbackCorrect : this.elements.game.feedbackWrong;
        if (overlay) { overlay.style.opacity = '1'; setTimeout(() => overlay.style.opacity = '0', 500); }
    }

    showExplanation(question, userAnswer, continueLabel = 'Continue', undoLabel = 'Undo') {
        const container = this.elements.game.feedbackExplanation;
        if (!container) return;

        const explanationText = (userAnswer === 'Yes')
            ? (question.explanationYes ? String(question.explanationYes) : '')
            : (question.explanationNo ? String(question.explanationNo) : '');

        container.innerHTML = `
            <div class="explanation-content" aria-atomic="true">
                <p>${escapeHtml(explanationText)}</p>
                <div class="explanation-actions">
                    <button class="explanation-undo-btn" type="button">${escapeHtml(undoLabel)}</button>
                    <button class="explanation-continue-btn" type="button">${escapeHtml(continueLabel)}</button>
                </div>
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
        // --- AUDIO TRIGGER ---
        // Play click sound ONLY when swiping right (Yes/Pinboard)
        if (direction === 'right') {
            audioController.play('click');
        }
        // ---------------------

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

    showResults(gameState, answers, assessments = [], options = {}) {
        // `silent` suppresses the success sound and confetti — used when the
        // results screen is being re-rendered for a language switch, so the
        // participant doesn't get a second round of fanfare just for changing
        // languages.
        const { silent = false } = options;

        // --- AUDIO TRIGGER ---
        if (!silent) {
            audioController.play('success');
        }
        // ---------------------

        this.assessments = assessments;
        const userData = gameState.getUserData();
        const isGeneric = userData.assessmentType === 'generic';

        // For generic mode, hand the calculator the per-cancer demographic
        // configs so each cancer type's familyWeight / age / ethnicity boost
        // is applied from its own config rather than a single global value.
        let cancerConfigsByType = null;
        if (isGeneric && Array.isArray(assessments)) {
            cancerConfigsByType = {};
            for (const a of assessments) {
                if (!a || !a.id || a.id === 'generic') continue;
                cancerConfigsByType[a.id.toLowerCase()] = {
                    familyWeight: a.familyWeight,
                    ageRiskThreshold: a.ageRiskThreshold,
                    ageRiskWeight: a.ageRiskWeight,
                    ethnicityRisk: a.ethnicityRisk
                };
            }
        }

        const riskResult = calculateRiskScore(userData, answers, userData.assessmentType, null, cancerConfigsByType);

        gameState.riskScore = riskResult.totalScore;
        gameState.riskByCategory = { ...riskResult.categoryRisks };

        this.cancerTypeScores = riskResult.cancerTypeScores || null;

        const riskBreakdown = document.querySelector('.risk-breakdown');
        const cancerBreakdownSection = document.getElementById('cancer-breakdown');

        let finalRiskLevel = riskResult.riskLevel;

        if (isGeneric && this.cancerTypeScores) {
            if (riskBreakdown) riskBreakdown.style.display = 'none';

            // Defence-in-depth: even if the backend gender filter regressed or
            // wasn't passed, hide cancer types whose own genderFilter conflicts
            // with the participant. Driven by data, not hard-coded names — adding
            // a new gender-restricted cancer type via the admin panel just works.
            const gender = userData.gender?.toLowerCase();
            const genderFilterByType = {};
            if (Array.isArray(assessments)) {
                for (const a of assessments) {
                    if (a && a.id) genderFilterByType[a.id.toLowerCase()] = (a.genderFilter || 'all').toLowerCase();
                }
            }
            const filtered = {};
            for (const [type, data] of Object.entries(this.cancerTypeScores)) {
                const gf = genderFilterByType[type] || 'all';
                if (gender && gf !== 'all' && gf !== gender) continue;
                // Only surface cancer types with >=30% risk — low-risk buckets
                // would clutter the results screen.
                if (data.score >= 30) {
                    filtered[type] = data;
                }
            }

            const scores = Object.values(filtered);

            if (scores.length === 0) {
                // Nothing crosses 30% — keep the generic summary and show a
                // placeholder in place of the per-cancer breakdown.
                if (cancerBreakdownSection) cancerBreakdownSection.style.display = 'none';
                if (riskBreakdown) riskBreakdown.style.display = '';
                this._updateSummary(gameState, riskResult);
                this._updateHighRiskCTA(riskResult.riskLevel);
                this._renderNoCancerTypesMessage();
            } else {
                const highestRisk = scores.reduce((max, s) => s.score > max.score ? s : max, { score: 0, riskLevel: 'LOW' });
                
                finalRiskLevel = highestRisk.riskLevel;

                this._updateSummary(gameState, { ...riskResult, riskLevel: highestRisk.riskLevel });
                this._updateHighRiskCTA(highestRisk.riskLevel);
                this._renderCancerTypeBreakdown(filtered);
                if (cancerBreakdownSection) cancerBreakdownSection.style.display = 'block';
            }
        } else {
            if (riskBreakdown) riskBreakdown.style.display = '';
            if (cancerBreakdownSection) cancerBreakdownSection.style.display = 'none';

            this._updateSummary(gameState, riskResult);
            this._updateHighRiskCTA(riskResult.riskLevel);
        }

        // --- TRIGGER CONFETTI REGARDLESS OF RISK LEVEL ---
        if (!silent) {
            triggerConfetti();
        }
        // -------------------------------------------------

        return riskResult;
    }

    _renderCancerTypeBreakdown(cancerTypeScores) {
        if (!this.elements.results.cancerBreakdownContainer) return;

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
                return `<img src="${src}" alt="" class="cancer-type-icon-img"><span style="display:none">${escapeHtml(fallbackLetter)}</span>`;
            }
            return icon || fallbackLetter;
        };


        const sortedCancerTypes = Object.keys(cancerTypeScores)
            .map(type => ({ type, ...cancerTypeScores[type] }))
            .sort((a, b) => b.score - a.score);

        const html = sortedCancerTypes.map(({ type }) => {
            const displayName = nameMap[type] || type.charAt(0).toUpperCase() + type.slice(1) + ' Cancer';
            const fallbackLetter = type.charAt(0).toUpperCase();
            const iconHtml = renderIcon(iconMap[type], fallbackLetter);

            return `
                <div class="cancer-risk-item">
                    <div class="cancer-risk-header">
                        <div class="cancer-type-info">
                            <span class="cancer-type-icon">${iconHtml}</span>
                            <span class="cancer-type-name">${escapeHtml(displayName)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // All dynamic values escaped via escapeHtml — safe innerHTML usage
        this.elements.results.cancerBreakdownContainer.innerHTML = html;
        this.elements.results.cancerBreakdownContainer.querySelectorAll('img.cancer-type-icon-img').forEach(img => {
            img.addEventListener('error', function () {
                this.style.display = 'none';
                const fallback = this.nextElementSibling;
                if (fallback) fallback.style.display = 'inline';
            }, { once: true });
        });
    }

    _renderNoCancerTypesMessage() {
        const container = this.elements.results.cancerBreakdownContainer;
        if (!container) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'no-cancer-risk-results';
        const p = document.createElement('p');
        p.textContent = this.t('results', 'healthyLifestyle')
            || 'You have led a healthy lifestyle and are not at risk of any cancer!';
        wrapper.appendChild(p);
        container.replaceChildren(wrapper);
    }

    renderRiskBreakdown(categoryRisks, answerCounts, answers = []) {
        if (!this.elements.results.breakdownContainer) return;

        const factorsLabel = this.t('results', 'factorsIdentified') || 'factor(s) identified';

        // Hide categories with zero risk factors, matching how recommendations
        // only render categories that have actionable items.
        const categories = Object.keys(categoryRisks).filter(c => (answerCounts[c] || 0) > 0);
        const html = categories.map((category, index) => {
            const count = answerCounts[category];

            const translationKey = RISK_CATEGORY_KEYS[category];
            const displayLabel = translationKey
                ? (this.t('results', translationKey) || category)
                : category;

            const factorItems = answers
                .filter(a => a.category === category && a.isRisk)
                .map(a => `<li>${escapeHtml(a.questionText)}</li>`)
                .join('');

            const panelId = `risk-category-panel-${index}`;

            return `
                <div class="accordion-item">
                    <button class="accordion-header" type="button" aria-expanded="false" aria-controls="${panelId}">
                        <span class="category-name">${escapeHtml(displayLabel)}</span>
                        <span class="accordion-header-meta">
                            <span class="risk-factor-count">
                                ${count} ${escapeHtml(factorsLabel)}
                            </span>
                            <span class="accordion-icon">+</span>
                        </span>
                    </button>
                    <div id="${panelId}" class="accordion-content" role="region">
                        <ul>
                            ${factorItems}
                        </ul>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.results.breakdownContainer.innerHTML = html;

        this._attachBreakdownAccordionListeners();
    }

    _attachBreakdownAccordionListeners() {
        const container = this.elements.results.breakdownContainer;
        if (!container) return;
        container.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('active');
                const isActive = header.classList.contains('active');
                header.setAttribute('aria-expanded', String(isActive));
                const content = header.nextElementSibling;
                content?.classList.toggle('active');
                const icon = header.querySelector('.accordion-icon');
                if (icon) icon.textContent = isActive ? '−' : '+';
            });
        });
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

    _updateHighRiskCTA(riskLevel) {
        const ctaEl = document.getElementById('high-risk-cta');
        const bookBtn = document.getElementById('book-screening-btn');
        const healthierBtn = document.getElementById('book-healthiersg-btn');
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
        if (healthierBtn) {
            if (isHighRisk) {
                healthierBtn.setAttribute('data-high-risk', 'true');
                healthierBtn.classList.add('high-risk-cta-button');
            } else {
                healthierBtn.removeAttribute('data-high-risk');
                healthierBtn.classList.remove('high-risk-cta-button');
            }
        }
    }

    _attachAccordionListeners() {
        // Scoped to the recommendations container so this doesn't double-bind
        // onto the risk-factor accordion (which shares .accordion-header and
        // attaches its own listener via _attachBreakdownAccordionListeners).
        const container = this.elements.results.recommendationsContainer;
        if (!container) return;
        container.querySelectorAll('.accordion-header').forEach(header => {
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
