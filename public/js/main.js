import { DOMElements } from './domElements.js';
import { GameState } from './gameState.js';
import { MascotController } from './mascotController.js';
import { UIController } from './uiController.js';
import { ApiService } from './apiService.js';
import { loadAssessments, getAssessmentById, setCurrentLanguage, getCurrentLanguage, clearCache, SUPPORTED_LANGUAGES, filterAssessmentsByGender } from './assessmentConfig.js';
import { QuestionLoader } from './questionLoader.js';
import { loadTheme, applyTheme } from './themeLoader.js';
import { escapeHtml } from './utils/escapeHtml.js';
import { openModalA11y, closeModalA11y } from './utils/modal.js';
import { fetchTranslations, t as _t } from './translationService.js';
import { audioController } from './audioController.js'; // <-- Imported audioController

class RiskAssessmentApp {
    constructor() {
        this.dom = new DOMElements();
        this.state = new GameState();
        this.mascot = new MascotController(this.dom.mascot);
        this.t = (group, key, replacements) => _t(group, key, this.currentLanguage, replacements);
        this.ui = new UIController(this.dom, this.t);
        this.answers = [];
        this.useBackend = true;
        this.selectedAssessment = null;
        this.assessments = [];
        this.currentLanguage = getCurrentLanguage();
        this.selectedGender = sessionStorage.getItem('selectedGender') || null;
        this._isExplanationVisible = false;
        this._onExplanationContinue = null;
        this._onExplanationUndo = null;
        this._langRequestId = 0;

        this.adminBtn = document.getElementById('admin-panel-btn');

        this.initialize();
    }

    _changeScreen(screenName) {
        this.dom.switchScreen(screenName);
        if (this.adminBtn) {
            this.adminBtn.style.display = (screenName === 'landing') ? 'inline-block' : 'none';
        }
    }

    async initialize() {
        if (!this.dom.validate()) {
            console.error('Critical DOM elements missing!');
            return;
        }

        this._setupLanguageSelector();

        // Fetch translations BEFORE any code that calls this.t(). Previously the
        // landing-loading-state and the gender-selector pre-render ran before
        // fetchTranslations() resolved, causing `[i18n] Missing translation:
        // common.loading (lang=xx)` warnings on every page load. This split
        // restores the expected invariant: the cache is populated before any
        // t() call, so warnings only fire for genuinely missing keys.
        try {
            await fetchTranslations();
        } catch (err) {
            console.warn('Failed to fetch translations during init:', err);
        }

        this._setupGenderSelector();
        this._showLandingLoadingState();

        try {
            const [_, theme, pdpaConfig] = await Promise.all([
                loadAssessments(this.currentLanguage).then(a => { this.assessments = a; return a; }),
                loadTheme(),
                this._loadPdpaConfig()
            ]);
            this._applyLanguage(this.currentLanguage);
            applyTheme(theme);
            this.mascot.setTheme(theme);
            
            this.mascot.hide(); 

            const activeScreen = this.dom.getActiveScreenName();
            this._changeScreen(activeScreen);

            this._renderAssessmentCards();

            if (this.pdpaConfig && this.pdpaConfig.enabled && !sessionStorage.getItem('pdpaConsented')) {
                this._showPdpaModal();
            }
        } catch (error) {
            console.error('Error loading assessments:', error);
            this._showLandingError();
            return;
        }

        this._setupLandingListeners();
        this._setupCancerSelectionListeners();
        this._setupOnboardingListeners();
        this._setupGameListeners();
        this._setupResultsListeners();
    }

    _localizeRecommendations(recommendations) {
        const lang = this.currentLanguage;

        return recommendations.map(rec => {
            // Multilingual format (from per-cancer recs): title is {en, zh, ms, ta}
            if (rec.title && typeof rec.title === 'object') {
                return {
                    title: rec.title[lang] || rec.title.en || '',
                    actions: (rec.actions || []).map(a =>
                        typeof a === 'object' ? (a[lang] || a.en || '') : a
                    )
                };
            }

            // Plain string format (hardcoded fallback): pass through as-is
            return rec;
        });
    }

    async _loadPdpaConfig() {
        try {
            const res = await fetch('/api/pdpa');
            const data = await res.json();
            this.pdpaConfig = data;
            return data;
        } catch (e) {
            console.warn('PDPA config load failed:', e);
            this.pdpaConfig = { enabled: false };
            return this.pdpaConfig;
        }
    }

    _showPdpaModal() {
        const modal = document.getElementById('pdpa-modal');
        if (!modal) return;
        const lang = this.currentLanguage;
        const cfg = this.pdpaConfig;
        const t = (obj) => (obj && obj[lang]) || (obj && obj.en) || '';
        document.getElementById('pdpa-modal-title').textContent = t(cfg.title);
        document.getElementById('pdpa-modal-purpose').textContent = t(cfg.purpose);
        document.getElementById('pdpa-modal-data').textContent = t(cfg.dataCollected);
        document.getElementById('pdpa-consent-text').textContent = t(cfg.checkboxLabel);
        const agreeBtn = document.getElementById('pdpa-agree-btn');
        agreeBtn.textContent = t(cfg.agreeButtonText);
        agreeBtn.disabled = true;
        const checkbox = document.getElementById('pdpa-consent-checkbox');
        checkbox.checked = false;
        checkbox.onchange = () => { 
            audioController.play('button'); // <-- Added audio
            agreeBtn.disabled = !checkbox.checked; 
        };
        agreeBtn.onclick = () => {
            audioController.play('button'); // <-- Added audio
            sessionStorage.setItem('pdpaConsented', 'true');
            this._hidePdpaModal();
        };
        modal.classList.remove('hidden');
        // `inert` removes the subtree from the a11y tree AND prevents focus, which
        // is the correct semantic here. It also avoids the "aria-hidden on a
        // focusable element" browser warning that `aria-hidden="true"` produced.
        modal.inert = false;
        // PDPA is a legal gate — not dismissible via Escape. Focus the consent
        // checkbox so the keyboard user can tick and continue without hunting.
        openModalA11y(modal, {
            triggerEl: null,
            dismissible: false,
            autoFocus: '#pdpa-consent-checkbox'
        });
    }

    _hidePdpaModal() {
        const modal = document.getElementById('pdpa-modal');
        if (!modal) return;
        closeModalA11y(modal);
        modal.classList.add('hidden');
        modal.inert = true;
    }

    _setupGenderSelector() {
        const selector = document.getElementById('gender-selector');
        if (!selector) return;
        if (this.selectedGender) {
            selector.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.gender === this.selectedGender);
            });
            this.mascot.setGender(this.selectedGender);
            this._changeScreen('cancerSelection');
            this._renderAssessmentCards();
            return;
        }
        this._attachGenderSelectionListeners();
    }

    _attachGenderSelectionListeners() {
        const selector = document.getElementById('gender-selector');
        if (!selector) return;

        selector.querySelectorAll('button').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });

        selector.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', async () => {
                audioController.play('button'); // <-- Added audio
                const gender = btn.dataset.gender;
                selector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedGender = gender;
                sessionStorage.setItem('selectedGender', gender);
                this.mascot.setGender(gender);
                
                this.mascot.hide();
                this._changeScreen('cancerSelection');
                
                this._renderAssessmentCards();
            });
        });
    }

    _setupLanguageSelector() {
        const selector = document.getElementById('language-selector');
        if (!selector) return;
        selector.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === this.currentLanguage);
            btn.addEventListener('click', async () => {
                // Translation button click intentionally does NOT have the 'button' sound here
                const lang = btn.dataset.lang;
                if (lang === this.currentLanguage) return;

                // Update button active states immediately
                selector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Get reference to loading overlay
                const loadingOverlay = document.getElementById('language-loading-overlay');
                
                // 1. Show loading overlay BEFORE any changes
                if (loadingOverlay) loadingOverlay.classList.remove('hidden');
                
                // Track this switch so later clicks can invalidate in-flight fetches.
                // If a newer switch runs while awaits below are pending, the stale
                // handler bails out instead of overwriting UI state with old data.
                const requestId = ++this._langRequestId;

                try {
                    // 2. Fetch all translated data FIRST (don't update UI yet)
                    QuestionLoader.clearCache();

                    // Fetch assessments
                    const newAssessments = await loadAssessments(lang);
                    if (requestId !== this._langRequestId) return; // superseded by newer switch

                    // Fetch questions if on game screen
                    let newQuestions = null;
                    const activeScreen = this.dom.getActiveScreenName();
                    if (activeScreen === 'game' && this.selectedAssessment) {
                        const age = parseInt(this.dom.onboarding.ageInput?.value) || 0;
                        newQuestions = await QuestionLoader.loadQuestions(this.selectedAssessment, age, lang);
                        if (requestId !== this._langRequestId) return; // superseded by newer switch
                    }

                    // 3. NOW update everything atomically after data is ready
                    this.currentLanguage = lang;
                    setCurrentLanguage(lang);
                    this._applyLanguage(lang);
                    
                    this.assessments = newAssessments;
                    // Prefer the in-place text update so the browser doesn't
                    // re-fetch identical cancer-card images on every language
                    // switch. Falls back to a full rebuild only if the cards
                    // haven't been rendered yet (cold language switch before
                    // the cancer-selection screen was ever shown).
                    if (!this._updateAssessmentCardText()) {
                        this._renderAssessmentCards();
                    }

                    if (this.selectedAssessment) {
                        this._updateOnboardingForAssessment(this.selectedAssessment);
                    }
                    
                    // 4. Update game screen if active
                    if (activeScreen === 'game' && newQuestions && newQuestions.length > 0) {
                        this.state.replaceQuestions(newQuestions);

                        if (this._isExplanationVisible) {
                            // Re-show explanation with new language
                            const question = this.state.getCurrentQuestion();
                            const lastAnswer = this.answers.length > 0 ? this.answers[this.answers.length - 1] : null;
                            if (question && lastAnswer) {
                                const continueLabel = this.t('game', 'continueButton');
                                const undoLabel = this.t('game', 'undoButton');
                                this.ui.showExplanation(question, lastAnswer.userAnswer, continueLabel, undoLabel);
                            }
                        } else {
                            // Re-show question with new language
                            this._showNextQuestion();
                        }
                    } else if (activeScreen === 'results') {
                        // Re-render the dynamic results content in the new language.
                        // _applyLanguage above already refreshed the TEXT_MAPPINGS-
                        // driven static headings, but showResults / renderRiskBreakdown
                        // / renderRecommendations set their text via dynamic this.t()
                        // calls that only run when the results screen is entered.
                        // Without this branch, a user who switches language on the
                        // results screen sees the headings update but the risk badge,
                        // summary, category breakdown, and recommendations stay in the
                        // original language.
                        //
                        // We pass { silent: true } to suppress the success sound and
                        // confetti (they already fired when the participant first
                        // reached the results screen). We also re-localize the raw
                        // recommendations stored by _showResults — NOT re-submit to
                        // the backend, which would create a duplicate assessment
                        // record.
                        this.ui.showResults(this.state, this.answers, newAssessments, { silent: true });
                        this.ui.renderRiskBreakdown(this.state.getCategoryRisks(), this.state.getAnswerCounts(), this.answers);
                        if (Array.isArray(this.lastRawRecommendations)) {
                            const localized = this._localizeRecommendations(this.lastRawRecommendations);
                            this.lastRecommendations = localized;
                            this.ui.renderRecommendations(localized);
                        }
                    }
                } catch (error) {
                    console.error('Error switching language:', error);
                } finally {
                    // 5. Hide loading overlay — only if this is still the latest switch.
                    // A stale handler that was superseded must not hide the overlay
                    // while a newer handler is still fetching.
                    if (loadingOverlay && requestId === this._langRequestId) {
                        loadingOverlay.classList.add('hidden');
                    }
                }
            });
        });
    }

    _applyLanguage(lang) {
        const t = (group, key, replacements) => _t(group, key, lang, replacements);

        const TEXT_MAPPINGS = [
            { id: 'landing-title',              group: 'landing',         key: 'landingTitle' },
            { id: 'landing-subtitle',           group: 'landing',         key: 'landingSubtitle' },
            { id: 'gender-prompt',              group: 'landing',         key: 'genderPrompt' },
            { id: 'gender-male-text',           group: 'landing',         key: 'male' },
            { id: 'gender-female-text',         group: 'landing',         key: 'female' },
            { id: 'cancer-selection-title',      group: 'cancerSelection', key: 'cancerSelectionTitle' },
            { id: 'cancer-selection-subtitle',   group: 'cancerSelection', key: 'cancerSelectionSubtitle' },
            { id: 'ethnicity-chinese-label',     group: 'onboarding',      key: 'chinese' },
            { id: 'ethnicity-malay-label',       group: 'onboarding',      key: 'malay' },
            { id: 'ethnicity-indian-label',      group: 'onboarding',      key: 'indian' },
            { id: 'ethnicity-caucasian-label',   group: 'onboarding',      key: 'caucasian' },
            { id: 'ethnicity-others-label',      group: 'onboarding',      key: 'others' },
            { id: 'family-yes-label',            group: 'onboarding',      key: 'familyYes' },
            { id: 'family-no-label',             group: 'onboarding',      key: 'familyNo' },
            { id: 'family-unknown-label',        group: 'onboarding',      key: 'familyUnknown' },
            { id: 'start-game-btn',              group: 'cancerSelection', key: 'startAssessment' },
            { id: 'feedback-correct',            group: 'game',            key: 'feedbackNo' },
            { id: 'feedback-wrong',              group: 'game',            key: 'feedbackYes' },
            { id: 'swipe-no-label',              group: 'game',            key: 'swipeNo' },
            { id: 'swipe-yes-label',             group: 'game',            key: 'swipeYes' },
            { id: 'bin-label',                   group: 'game',            key: 'binIt' },
            { id: 'pin-label',                   group: 'game',            key: 'pinIt' },
            { id: 'game-exit-btn',               group: 'game',            key: 'exitButton' },
            { id: 'exit-modal-title',            group: 'game',            key: 'exitModalTitle' },
            { id: 'exit-modal-message',          group: 'game',            key: 'exitModalMessage' },
            { id: 'exit-stay-btn',               group: 'game',            key: 'exitModalStay' },
            { id: 'exit-leave-btn',              group: 'game',            key: 'exitModalLeave' },
            { id: 'results-heading',             group: 'results',         key: 'resultsHeading' },
            { id: 'risk-factors-heading',        group: 'results',         key: 'riskFactorsHeading' },
            { id: 'recommendations-heading',     group: 'results',         key: 'recommendationsHeading' },
            { id: 'book-screening-btn',          group: 'results',         key: 'bookScreening' },
            { id: 'contact-label',               group: 'results',         key: 'contactLabel' },
            { id: 'submit-contact-btn',          group: 'results',         key: 'submit' },
            { id: 'play-again-btn',              group: 'results',         key: 'playAgain' },
            { id: 'return-home-btn',             group: 'results',         key: 'returnHome' },
            { id: 'score-label',                 group: 'results',         key: 'riskScore' },
            { id: 'cancer-breakdown-heading',    group: 'results',         key: 'cancerBreakdownHeading' },
            { id: 'high-risk-cta-text',          group: 'results',         key: 'highRiskCta' },
            { id: 'disclaimer-text',             group: 'results',         key: 'disclaimer' },
            { id: 'admin-login-link',            group: 'common',          key: 'login' },
            { id: 'language-loading-text',       group: 'common',          key: 'switchingLanguage' },
        ];

        for (const { id, group, key } of TEXT_MAPPINGS) {
            const el = document.getElementById(id);
            if (el) el.textContent = t(group, key);
        }

        const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
        setHtml('age-label', `${escapeHtml(t('onboarding', 'ageLabel'))} <span class="required">*</span>`);
        setHtml('ethnicity-label', `${escapeHtml(t('onboarding', 'ethnicityLabel'))} <span class="required">*</span>`);

        const ethnicityInput = document.getElementById('ethnicity-others-input');
        if (ethnicityInput) ethnicityInput.placeholder = t('onboarding', 'ethnicityPlaceholder');
        const emailInput = document.getElementById('email-phone');
        if (emailInput) emailInput.placeholder = t('results', 'emailPlaceholder');

        if (this.pdpaConfig && this.pdpaConfig.enabled) {
            const cfg = this.pdpaConfig;
            const pt = (obj) => (obj && obj[lang]) || (obj && obj.en) || '';
            const pdpaFields = [
                ['pdpa-modal-title', cfg.title],
                ['pdpa-modal-purpose', cfg.purpose],
                ['pdpa-modal-data', cfg.dataCollected],
                ['pdpa-consent-text', cfg.checkboxLabel],
                ['pdpa-agree-btn', cfg.agreeButtonText],
            ];
            for (const [id, obj] of pdpaFields) {
                const el = document.getElementById(id);
                if (el) el.textContent = pt(obj);
            }
        }
    }

    _showLandingLoadingState() {
        const container = document.querySelector('.assessment-cards');
        if (!container) return;
        container.innerHTML = `<p style="text-align: center; padding: 2rem; color: #666;">${escapeHtml(this.t('common', 'loading'))}</p>`;
    }

    _showLandingError() {
        const container = document.querySelector('.assessment-cards');
        if (!container) return;
        // All dynamic values escaped via escapeHtml — safe innerHTML usage
        container.innerHTML = `<div style="text-align: center; padding: 2rem;"><p style="color: #d32f2f; margin-bottom: 1rem;">${escapeHtml(this.t('common', 'loadError'))}</p><button class="button reload-btn">${escapeHtml(this.t('common', 'reloadPage'))}</button></div>`;
        container.querySelector('.reload-btn').addEventListener('click', () => location.reload());
    }

    /**
     * In-place language refresh for already-rendered assessment cards.
     * On language switch, only the name/description/button-label inside each
     * card changes — the image, id, and DOM structure stay identical. This
     * method updates just the text nodes, leaving the existing <img> elements
     * untouched so the browser never re-fetches the card icons.
     *
     * Returns true on success, false if the cards aren't rendered yet or if
     * the container is missing. In the "false" case callers should fall back
     * to the full _renderAssessmentCards() path.
     *
     * Rationale: _renderAssessmentCards() wipes the container and rebuilds
     * every card, which causes the browser (with cache disabled during dev
     * testing) to re-fetch all 7 cancer-card PNGs on every language switch.
     * 5 switches × 7 images = 35 wasted image fetches per session. This path
     * drops that to zero.
     */
    _updateAssessmentCardText() {
        const container = document.querySelector('#screen-cancer-selection .assessment-cards');
        if (!container) return false;

        const existingCards = container.querySelectorAll('.assessment-card');
        if (existingCards.length === 0) return false;

        // Index the new assessments so we can match existing cards by data-assessment.
        const assessmentsById = new Map();
        for (const a of (this.assessments || [])) {
            assessmentsById.set(a.id, a);
        }

        const startLabel = this.t('cancerSelection', 'startAssessment');

        for (const card of existingCards) {
            const id = card.dataset.assessment;
            if (!id) continue;
            const assessment = assessmentsById.get(id);
            if (!assessment) continue;

            const h3 = card.querySelector('h3');
            if (h3) h3.textContent = assessment.name;

            const desc = card.querySelector('p');
            if (desc) desc.textContent = assessment.description;

            const btn = card.querySelector('.card-btn');
            if (btn) btn.textContent = startLabel;
        }

        // If the gender-required overlay is currently shown (no gender picked
        // yet), its prompt text also needs to follow the language.
        const overlayText = container.querySelector('.gender-required-overlay .overlay-content p');
        if (overlayText) {
            overlayText.textContent = this.t('landing', 'genderPrompt');
        }

        return true;
    }

    _renderAssessmentCards() {
        const container = document.querySelector('#screen-cancer-selection .assessment-cards');
        if (!container) return;
        container.innerHTML = '';
        const isImageUrl = (val) => {
            if (!val || typeof val !== 'string') return false;
            const v = val.trim();
            return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/') || v.startsWith('data:') || v.startsWith('assets/');
        };
        const renderCardIcon = (icon) => {
            if (icon && isImageUrl(icon)) {
                const src = escapeHtml(icon || '');
                return '<div class="card-icon card-icon-img"><img src="' + src + '" alt="" class="card-icon-img-el"><span class="card-icon-fallback" style="display:none">🏥</span></div>';
            }
            return '<div class="card-icon">' + (icon || '🏥') + '</div>';
        };
        const bindImgFallbacks = (el) => {
            el.querySelectorAll('img.card-icon-img-el').forEach(img => {
                img.addEventListener('error', function () {
                    this.style.display = 'none';
                    const fallback = this.nextElementSibling;
                    if (fallback) fallback.style.display = 'inline';
                }, { once: true });
            });
        };
        if (!this.selectedGender) {
            this.assessments.forEach(assessment => {
                const card = document.createElement('div');
                card.className = 'assessment-card disabled';
                card.dataset.assessment = assessment.id;
                card.innerHTML = `${renderCardIcon(assessment.icon)}<h3>${escapeHtml(assessment.name)}</h3><p>${escapeHtml(assessment.description)}</p><button class="card-btn" data-assessment="${escapeHtml(assessment.id)}" disabled>${escapeHtml(this.t('cancerSelection', 'startAssessment'))}</button>`;
                container.appendChild(card);
            });
            bindImgFallbacks(container);
            const overlay = document.createElement('div');
            overlay.className = 'gender-required-overlay';
            overlay.innerHTML = `<div class="overlay-content"><p>${escapeHtml(this.t('landing', 'genderPrompt'))}</p></div>`;
            container.appendChild(overlay);
            return;
        }
        let filteredAssessments = filterAssessmentsByGender(this.assessments, this.selectedGender);
        if (filteredAssessments.length === 0) {
            container.innerHTML = `<p style="text-align: center; padding: 2rem; color: #666;">${escapeHtml(this.t('cancerSelection', 'noAssessmentsForGender'))}</p>`;
            return;
        }
        filteredAssessments.forEach(assessment => {
            const card = document.createElement('div');
            card.className = 'assessment-card';
            card.dataset.assessment = assessment.id;
            card.innerHTML = `${renderCardIcon(assessment.icon)}<h3>${escapeHtml(assessment.name)}</h3><p>${escapeHtml(assessment.description)}</p><button class="card-btn" data-assessment="${escapeHtml(assessment.id)}">${escapeHtml(this.t('cancerSelection', 'startAssessment'))}</button>`;
            container.appendChild(card);
        });
        bindImgFallbacks(container);
        this._setupCancerCardListeners();
    }

    _setupLandingListeners() {}
    _setupCancerSelectionListeners() { this._setupCancerCardListeners(); }

    _setupCancerCardListeners() {
        const existingCards = document.querySelectorAll('#screen-cancer-selection .assessment-card');
        existingCards.forEach(card => {
            const button = card.querySelector('.card-btn');
            if (button) {
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                newButton.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (newButton.disabled || card.classList.contains('disabled')) return;
                    audioController.play('button'); // <-- Added audio
                    this._selectAssessment(newButton.dataset.assessment);
                });
            }
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            newCard.addEventListener('click', (e) => {
                const button = newCard.querySelector('.card-btn');
                if (button && !button.disabled && !newCard.classList.contains('disabled')) {
                    e.preventDefault(); e.stopPropagation();
                    audioController.play('button'); // <-- Added audio
                    this._selectAssessment(newCard.dataset.assessment);
                }
            });
        });
        const backBtn = document.getElementById('back-to-gender');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                audioController.play('button'); // <-- Added audio
                this.selectedGender = null;
                sessionStorage.removeItem('selectedGender');
                document.querySelectorAll('#gender-selector button').forEach(btn => btn.classList.remove('active'));
                this.mascot.hide();
                this._changeScreen('landing');
                this._attachGenderSelectionListeners();
            });
        }
    }

    async _selectAssessment(assessmentType) {
        this.selectedAssessment = assessmentType;
        this._updateOnboardingForAssessment(assessmentType);
        this.mascot.hide();
        this._changeScreen('onboarding');
    }

    async _updateOnboardingForAssessment(assessmentType) {
        const assessment = await getAssessmentById(assessmentType, this.currentLanguage);
        if (!assessment) return;
        if (this.dom.onboarding.assessmentTitle) this.dom.onboarding.assessmentTitle.textContent = assessment.title;
        if (this.dom.onboarding.assessmentSubtitle) this.dom.onboarding.assessmentSubtitle.textContent = this.t('onboarding', 'assessmentSubtitle');
        if (this.dom.onboarding.familyHistoryLabel) this.dom.onboarding.familyHistoryLabel.innerHTML = `3. ${escapeHtml(assessment.familyLabel)} <span class="required">*</span>`;
    }

    _setupOnboardingListeners() {
        this.dom.onboarding.backButton?.addEventListener('click', () => {
            audioController.play('button'); // <-- Added audio
            this.mascot.hide();
            this._changeScreen('cancerSelection');
        });
        this.dom.onboarding.ageInput?.addEventListener('input', (e) => {
            if (this.dom.onboarding.ageSlider) this.dom.onboarding.ageSlider.value = e.target.value;
            this._checkFormValidity();
        });
        this.dom.onboarding.ageSlider?.addEventListener('input', (e) => {
            if (this.dom.onboarding.ageInput) this.dom.onboarding.ageInput.value = e.target.value;
            this._checkFormValidity();
        });
        this.dom.onboarding.ethnicityInputs?.forEach(input => {
            input.addEventListener('change', (e) => {
                audioController.play('button'); // <-- Added audio
                if (e.target.value === 'Others') this.dom.onboarding.ethnicityOthersContainer?.classList.remove('hidden');
                else this.dom.onboarding.ethnicityOthersContainer?.classList.add('hidden');
                this._checkFormValidity();
            });
        });
        this.dom.onboarding.ethnicityOthersInput?.addEventListener('input', () => this._checkFormValidity());
        this.dom.onboarding.familyHistoryInputs?.forEach(input => input.addEventListener('change', () => {
            audioController.play('button'); // <-- Added audio
            this._checkFormValidity();
        }));
        this.dom.onboarding.form?.addEventListener('submit', (e) => { 
            e.preventDefault(); 
            audioController.play('button'); // <-- Added audio
            this._startAssessment(); 
        });
    }

    _checkFormValidity() {
        const age = this.dom.onboarding.ageInput?.value;
        const familyHistory = document.querySelector('input[name="family-history"]:checked');
        let ethnicityValid = false;
        const selectedEthnicity = document.querySelector('input[name="ethnicity"]:checked');
        if (selectedEthnicity) ethnicityValid = (selectedEthnicity.value === 'Others') ? this.dom.onboarding.ethnicityOthersInput?.value.trim() !== '' : true;
        const isValid = age && this.selectedGender && familyHistory && ethnicityValid;
        if (this.dom.onboarding.startButton) {
            this.dom.onboarding.startButton.disabled = !isValid;
            this.dom.onboarding.startButton.setAttribute('aria-disabled', !isValid);
        }
    }

    async _startAssessment() {
        const age = parseInt(this.dom.onboarding.ageInput?.value);
        const familyHistory = document.querySelector('input[name="family-history"]:checked')?.value;
        const eth = document.querySelector('input[name="ethnicity"]:checked')?.value;
        const ethnicity = (eth === 'Others') ? this.dom.onboarding.ethnicityOthersInput?.value.trim() : eth;
        this.state.setUserData(age, this.selectedGender, familyHistory, ethnicity, this.selectedAssessment);
        this.answers = [];
        let questions = [];
        try {
            questions = await QuestionLoader.loadQuestions(this.selectedAssessment, age, this.currentLanguage);
            if (questions.length === 0) throw new Error(`No questions found for ${this.selectedAssessment}`);
        } catch (error) {
            console.error('Error loading questions:', error);
            this.dom.switchScreen('onboarding');
            return;
        }
        this.state.setQuestions(questions);
        this._changeScreen('game');
        this.mascot.show();
        this.mascot.updateState('Idle');
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
            if (Math.abs(deltaX) > 80) this._handleAnswer(deltaX > 0 ? 'right' : 'left');
            else { card.style.transform = ''; this.ui.setTargetHighlight(null); }
        });

        card.addEventListener('touchstart', e => { 
            if (e.cancelable) e.preventDefault(); 
            startX = e.touches[0].clientX; 
            isDragging = true; 
            card.classList.add('dragging');
        }, { passive: false });
        
        card.addEventListener('touchmove', e => {
            if (isDragging && e.cancelable) e.preventDefault();
            move(e.touches[0].clientX);
        }, { passive: false });
        
        card.addEventListener('touchend', e => {
            if (!isDragging) return;
            isDragging = false;
            card.classList.remove('dragging');
            const deltaX = e.changedTouches[0].clientX - startX;
            if (Math.abs(deltaX) > 80) this._handleAnswer(deltaX > 0 ? 'right' : 'left');
            else { card.style.transform = ''; this.ui.setTargetHighlight(null); }
        });

        card.addEventListener('touchcancel', () => {
            if (!isDragging) return;
            isDragging = false;
            card.classList.remove('dragging');
            card.style.transform = '';
            this.ui.setTargetHighlight(null);
        });

        // Handle both Undo and Continue button clicks safely
        const explanationContainer = this.dom.game.feedbackExplanation;
        if (explanationContainer) {
            explanationContainer.addEventListener('click', (e) => {
                const continueBtn = e.target.closest('.explanation-continue-btn');
                const undoBtn = e.target.closest('.explanation-undo-btn');

                if (continueBtn && !continueBtn.disabled) {
                    audioController.play('button'); // <-- Added audio
                    continueBtn.disabled = true;
                    if (undoBtn) undoBtn.disabled = true;
                    if (this._onExplanationContinue) this._onExplanationContinue();
                } else if (undoBtn && !undoBtn.disabled) {
                    audioController.play('button'); // <-- Added audio
                    undoBtn.disabled = true;
                    if (continueBtn) continueBtn.disabled = true;
                    if (this._onExplanationUndo) this._onExplanationUndo();
                }
            });
        }

        // Exit Modal Logic
        const exitBtn = document.getElementById('game-exit-btn');
        const exitModal = document.getElementById('exit-modal');
        const stayBtn = document.getElementById('exit-stay-btn');
        const leaveBtn = document.getElementById('exit-leave-btn');

        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                audioController.play('button'); // <-- Added audio
                if (exitModal) {
                    exitModal.classList.remove('hidden');
                    exitModal.inert = false;
                    // Escape acts as "Stay" — cancel the destructive action.
                    openModalA11y(exitModal, {
                        triggerEl: exitBtn,
                        dismissible: true,
                        onEscape: () => stayBtn && stayBtn.click()
                    });
                }
            });
        }

        if (stayBtn) {
            stayBtn.addEventListener('click', () => {
                audioController.play('button'); // <-- Added audio
                if (exitModal) {
                    closeModalA11y(exitModal);
                    exitModal.classList.add('hidden');
                    exitModal.inert = true;
                }
            });
        }

        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => {
                audioController.play('button'); // <-- Added audio
                if (exitModal) {
                    closeModalA11y(exitModal);
                    exitModal.classList.add('hidden');
                    exitModal.inert = true;
                }
                
                // Stop ongoing explanation popups
                this._isExplanationVisible = false;
                this._onExplanationContinue = null;
                this._onExplanationUndo = null;
                
                // Clear out the game data but KEEP the gender
                this.state.reset(); 
                this.answers = []; 
                this.selectedAssessment = null; 
                this.mascot.hide();
                
                // Clear out the onboarding form inputs
                this.dom.onboarding.form?.reset();
                this.dom.onboarding.ethnicityOthersContainer?.classList.add('hidden');
                
                // Send user explicitly to Cancer Selection, NOT landing
                this._changeScreen('cancerSelection'); 
            });
        }
    }

    _showNextQuestion() {
        this._isExplanationVisible = false;
        const q = this.state.getCurrentQuestion();
        if (!q) { this._showResults(); return; }
        this.mascot.updateState('Idle');
        this.ui.showQuestion(q.prompt);
        this.ui.resetCard();
        const p = this.state.getProgress();
        this.ui.updateProgress(p.current, p.total);
        this.ui.hideExplanation();
    }

    _handleAnswer(dir) {
        const question = this.state.getCurrentQuestion();
        if (!question || this._isExplanationVisible) return;
        this.ui.pulseScreen(dir);
        const userAnswer = (dir === 'left') ? 'No' : 'Yes';
        
        const targets = question.targets || [{
            cancerType: question.cancerType,
            weight: question.weight,
            yesValue: question.yesValue,
            noValue: question.noValue,
            category: question.category
        }];
        
        let totalContribution = 0;
        for (const target of targets) {
            const weight = target.weight || 0;
            const riskContribution = weight * (((userAnswer === 'Yes') ? (target.yesValue ?? 100) : (target.noValue ?? 0)) / 100);
            this.answers.push({
                questionId: question.id, questionText: question.prompt, userAnswer,
                weight: target.weight, yesValue: target.yesValue, noValue: target.noValue,
                riskContribution, isRisk: riskContribution > 0,
                category: target.category, cancerType: target.cancerType
            });
            if (riskContribution > 0) {
                this.state.addRiskScore(riskContribution);
                this.state.addCategoryRisk(target.category, riskContribution);
            }
            totalContribution += riskContribution;
        }
        
        const isRisk = totalContribution > 0;
        this.ui.showFeedback(!isRisk);
        if (isRisk) {
            this.ui.updateGlow(true);
        }
        this.mascot.startAnimation(isRisk ? 'Shocked' : 'Good');
        const hasMoreQuestions = this.state.nextQuestion();
        
        // Attach Undo logic here after swiping
        this.ui.animateCardSwipe(dir, () => {
            const explanationText = (userAnswer === 'Yes') ? question.explanationYes : question.explanationNo;
            if (explanationText) {
                this._isExplanationVisible = true;
                const continueLabel = this.t('game', 'continueButton') || 'Continue';
                const undoLabel = this.t('game', 'undoButton') || 'Undo'; 
                
                this.ui.showExplanation(question, userAnswer, continueLabel, undoLabel);
                
                // Normal Continue Action
                this._onExplanationContinue = () => {
                    this._isExplanationVisible = false;
                    this._onExplanationContinue = null;
                    this._onExplanationUndo = null;
                    this.ui.hideExplanation();
                    if (hasMoreQuestions) this._showNextQuestion();
                    else this._showResults();
                };

                // New Undo Action
                this._onExplanationUndo = () => {
                    this._isExplanationVisible = false;
                    this._onExplanationContinue = null;
                    this._onExplanationUndo = null;
                    this.ui.hideExplanation();

                    // 1. Remove this question's answers from the history array
                    const answersToRevert = this.answers.filter(a => a.questionId === question.id);
                    this.answers = this.answers.filter(a => a.questionId !== question.id);

                    // 2. Subtract the points & categories that were just added
                    for (const ans of answersToRevert) {
                        if (ans.riskContribution > 0) {
                            this.state.removeRiskScore(ans.riskContribution);
                            this.state.removeCategoryRisk(ans.category, ans.riskContribution);
                        }
                    }

                    // 3. Move the game index back one step
                    this.state.previousQuestion();

                    // 4. Redraw the current question
                    this._showNextQuestion(); 
                };

            } else {
                if (hasMoreQuestions) this._showNextQuestion();
                else this._showResults();
            }
        });
    }

    _setupResultsListeners() {
        this.dom.results.playAgainBtn?.addEventListener('click', () => {
            audioController.play('button'); // <-- Added audio
            this._resetApp();
        });
        this.dom.results.returnHomeBtn?.addEventListener('click', () => {
            audioController.play('button'); // <-- Added audio
            this._returnToHome();
        });
        this.dom.results.resultsForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            audioController.play('button'); // <-- Added audio
            const email = this.dom.results.emailPhone?.value.trim();
            const messageEl = this.dom.results.formMessage;
            const submitBtn = e.target.querySelector('button[type="submit"]');
            messageEl.textContent = ''; messageEl.classList.remove('success', 'error');
            // TLD must be at least 2 chars — matches the backend validator in routes/assessments.js.
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
                messageEl.textContent = this.t('common', 'validEmailError'); messageEl.classList.add('error'); return;
            }
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = this.t('common', 'sendingText'); }
            try {
                const assessmentData = { 
                    riskScore: this.state.riskScore, 
                    riskLevel: this.state.getRiskLevel(), 
                    userData: this.state.getUserData(), 
                    categoryRisks: this.state.getCategoryRisks(), 
                    recommendations: this.lastRecommendations || [], 
                    assessmentType: this.selectedAssessment,
                    cancerTypeScores: this.lastApiResult?.cancerTypeScores || null 
             };
                const result = await ApiService.sendResults(email, assessmentData);
                if (result.success) { messageEl.textContent = this.t('common', 'resultsSentSuccess'); messageEl.classList.add('success'); }
                else throw new Error(result.error || 'Failed to send');
            } catch (error) { messageEl.textContent = `Error: ${error.message}`; messageEl.classList.add('error'); }
            finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = this.t('results', 'submit'); } }
        });
    }

    async _showResults() {
        this.mascot.hide();
        const riskResult = this.ui.showResults(this.state, this.answers, this.assessments);
        this.ui.renderRiskBreakdown(this.state.getCategoryRisks(), this.state.getAnswerCounts(), this.answers);

        let recommendations = riskResult?.recommendations || [];
        if (this.useBackend) {
            try {
                const apiResult = await ApiService.submitAssessment(this.state.getUserData(), this.answers);
                if (apiResult?.recommendations) {
                    recommendations = apiResult.recommendations;
                }
                this.lastApiResult = apiResult;
            } catch (err) {
                console.warn('API submission failed:', err);
            }
        }
        // Store the raw (pre-localization) form alongside the localized form so
        // that a subsequent language switch can re-localize without re-hitting
        // the backend (which would create a duplicate assessment record).
        this.lastRawRecommendations = recommendations;
        recommendations = this._localizeRecommendations(recommendations);
        this.lastRecommendations = recommendations;
        this.ui.renderRecommendations(recommendations);
        this._changeScreen('results');
        window.scrollTo(0, 0);
    }

    _resetApp() {
        // Stop ongoing explanation popups
        this._isExplanationVisible = false;
        this._onExplanationContinue = null;
        this._onExplanationUndo = null;
        
        // Clear game state but KEEP the selected gender
        this.state.reset();
        this.answers = [];
        this.mascot.hide();
        this.selectedAssessment = null;

        // Clear PDPA consent so next participant must re-accept
        sessionStorage.removeItem('pdpaConsented');

        // Reset UI elements on results page
        const riskBreakdown = document.querySelector('.risk-breakdown');
        const cancerBreakdown = document.getElementById('cancer-breakdown');

        if (riskBreakdown) riskBreakdown.style.display = '';
        if (cancerBreakdown) cancerBreakdown.style.display = 'none';
        
        // Clear out the onboarding form inputs so it's fresh for the next quiz
        this.dom.onboarding.form?.reset();
        this.dom.onboarding.ethnicityOthersContainer?.classList.add('hidden');

        // Navigate directly to cancer selection instead of landing
        this._changeScreen('cancerSelection');

        // Re-render the cards to make sure they are clickable
        this._renderAssessmentCards();

        // Show PDPA modal for next participant
        if (this.pdpaConfig && this.pdpaConfig.enabled) {
            this._showPdpaModal();
        }
    }

    _returnToHome() {
        // Stop ongoing explanation popups
        this._isExplanationVisible = false;
        this._onExplanationContinue = null;
        this._onExplanationUndo = null;
        
        // Clear game state
        this.state.reset(); 
        this.answers = []; 
        this.mascot.hide(); 
        this.selectedAssessment = null; 
        
        // Clear out the selected gender
        this.selectedGender = null;
        sessionStorage.removeItem('selectedGender');
        document.querySelectorAll('#gender-selector button').forEach(btn => btn.classList.remove('active'));

        // Clear out PDPA consent so the modal shows again
        sessionStorage.removeItem('pdpaConsented');

        // Reset UI elements on results page
        const riskBreakdown = document.querySelector('.risk-breakdown');
        const cancerBreakdown = document.getElementById('cancer-breakdown');

        // if (riskBreakdown) riskBreakdown.style.display = '';
        if (riskBreakdown) riskBreakdown.style.display = 'none';
        if (cancerBreakdown) cancerBreakdown.style.display = 'none';
        
        // Clear out the onboarding form inputs
        this.dom.onboarding.form?.reset();
        this.dom.onboarding.ethnicityOthersContainer?.classList.add('hidden');

        // Re-attach gender selection listeners just in case
        this._attachGenderSelectionListeners();

        // Navigate directly to landing screen
        this._changeScreen('landing');
        
        // Show PDPA Modal again
        if (this.pdpaConfig && this.pdpaConfig.enabled) {
            this._showPdpaModal();
        }
    }
}
document.addEventListener('DOMContentLoaded', () => new RiskAssessmentApp());
