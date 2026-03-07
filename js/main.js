import { DOMElements } from './domElements.js';
import { GameState } from './gameState.js';
import { MascotController } from './mascotController.js';
import { UIController } from './uiController.js';
import { ApiService } from './apiService.js';
import { loadAssessments, getAssessmentById, setCurrentLanguage, getCurrentLanguage, clearCache, SUPPORTED_LANGUAGES, filterAssessmentsByGender } from './assessmentConfig.js';
import { QuestionLoader } from './questionLoader.js';
import { loadTheme, applyTheme } from './themeLoader.js';
import { escapeHtml } from './utils/escapeHtml.js';
import { fetchTranslations, t as _t } from './translationService.js';

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

        // TARGET ADMIN BUTTON
        this.adminBtn = document.getElementById('admin-panel-btn');

        this.initialize();
    }

    // HELPER TO MANAGE SCREEN CHANGES AND ADMIN BUTTON VISIBILITY
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
        this._setupGenderSelector();
        this._showLandingLoadingState();

        try {
            const [_, theme, pdpaConfig, __, ___] = await Promise.all([
                loadAssessments(this.currentLanguage).then(a => { this.assessments = a; return a; }),
                loadTheme(),
                this._loadPdpaConfig(),
                fetchTranslations(),
                this._loadRecommendationsData()
            ]);
            this._applyLanguage(this.currentLanguage);
            applyTheme(theme);
            this.mascot.setTheme(theme);
            
            this.mascot.hide(); // Mascot starts hidden

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

    async _loadRecommendationsData() {
        try {
            const res = await fetch('/api/recommendations');
            this.recommendationsData = await res.json();
        } catch (e) {
            console.warn('Recommendations data load failed:', e);
            this.recommendationsData = null;
        }
    }

    _localizeRecommendations(recommendations) {
        if (!this.recommendationsData) return recommendations;
        const lang = this.currentLanguage;

        // Build a reverse lookup: English title -> recommendation data key
        // This lets us match backend output (always English titles) to our localized data
        const titleToData = {};
        for (const [, data] of Object.entries(this.recommendationsData)) {
            if (data.title?.en) titleToData[data.title.en] = data;
        }

        return recommendations.map(rec => {
            const data = titleToData[rec.title];
            if (!data) return rec;
            return {
                title: data.title[lang] || data.title.en || rec.title,
                actions: data.actions.map(a => a[lang] || a.en || '')
            };
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
        checkbox.onchange = () => { agreeBtn.disabled = !checkbox.checked; };
        agreeBtn.onclick = () => {
            sessionStorage.setItem('pdpaConsented', 'true');
            this._hidePdpaModal();
        };
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }

    _hidePdpaModal() {
        const modal = document.getElementById('pdpa-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
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
                const gender = btn.dataset.gender;
                selector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedGender = gender;
                sessionStorage.setItem('selectedGender', gender);
                this.mascot.setGender(gender);
                
                this.mascot.hide(); // Keep mascot hidden during navigation
                this._changeScreen('cancerSelection');
                
                this._renderAssessmentCards();
                const genderHidden = document.getElementById('gender-hidden');
                if (genderHidden) genderHidden.value = gender;
            });
        });
    }

    _setupLanguageSelector() {
        const selector = document.getElementById('language-selector');
        if (!selector) return;
        selector.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === this.currentLanguage);
            btn.addEventListener('click', async () => {
                const lang = btn.dataset.lang;
                if (lang === this.currentLanguage) return;
                selector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentLanguage = lang;
                setCurrentLanguage(lang);
                QuestionLoader.clearCache();
                this._applyLanguage(lang);
                this._showLandingLoadingState();
                try {
                    this.assessments = await loadAssessments(lang);
                    this._renderAssessmentCards();
                } catch (error) {
                    console.error('Error reloading assessments:', error);
                }
                // Re-apply screen-specific dynamic content
                if (this.selectedAssessment) {
                    this._updateOnboardingForAssessment(this.selectedAssessment);
                }
                // If mid-game, reload questions in new language and re-show current
                const activeScreen = this.dom.getActiveScreenName();
                if (activeScreen === 'game' && this.selectedAssessment) {
                    try {
                        const age = parseInt(this.dom.onboarding.ageInput?.value) || 0;
                        const questions = await QuestionLoader.loadQuestions(this.selectedAssessment, age, lang);
                        if (questions.length > 0) {
                            this.state.replaceQuestions(questions);
                            this._showNextQuestion();
                        }
                    } catch (err) {
                        console.warn('Failed to reload questions for language switch:', err);
                    }
                }
            });
        });
    }

    _applyLanguage(lang) {
        const t = (group, key, replacements) => _t(group, key, lang, replacements);

        // --- Data-driven text mappings (element ID -> translation key) ---
        // Uses textContent (safe). To add a new translatable element, add one line here.
        const TEXT_MAPPINGS = [
            // Landing
            { id: 'landing-title',              group: 'landing',         key: 'landingTitle' },
            { id: 'landing-subtitle',           group: 'landing',         key: 'landingSubtitle' },
            { id: 'gender-prompt',              group: 'landing',         key: 'genderPrompt' },
            { id: 'gender-male-text',           group: 'landing',         key: 'male' },
            { id: 'gender-female-text',         group: 'landing',         key: 'female' },
            // Cancer selection
            { id: 'cancer-selection-title',      group: 'cancerSelection', key: 'cancerSelectionTitle' },
            { id: 'cancer-selection-subtitle',   group: 'cancerSelection', key: 'cancerSelectionSubtitle' },
            // Onboarding
            { id: 'ethnicity-chinese-label',     group: 'onboarding',      key: 'chinese' },
            { id: 'ethnicity-malay-label',       group: 'onboarding',      key: 'malay' },
            { id: 'ethnicity-indian-label',      group: 'onboarding',      key: 'indian' },
            { id: 'ethnicity-caucasian-label',   group: 'onboarding',      key: 'caucasian' },
            { id: 'ethnicity-others-label',      group: 'onboarding',      key: 'others' },
            { id: 'family-yes-label',            group: 'onboarding',      key: 'familyYes' },
            { id: 'family-no-label',             group: 'onboarding',      key: 'familyNo' },
            { id: 'family-unknown-label',        group: 'onboarding',      key: 'familyUnknown' },
            { id: 'start-game-btn',              group: 'cancerSelection', key: 'startAssessment' },
            // Game
            { id: 'feedback-correct',            group: 'game',            key: 'feedbackNo' },
            { id: 'feedback-wrong',              group: 'game',            key: 'feedbackYes' },
            { id: 'swipe-no-label',              group: 'game',            key: 'swipeNo' },
            { id: 'swipe-yes-label',             group: 'game',            key: 'swipeYes' },
            { id: 'bin-label',                   group: 'game',            key: 'binIt' },
            { id: 'pin-label',                   group: 'game',            key: 'pinIt' },
            // Results
            { id: 'results-heading',             group: 'results',         key: 'resultsHeading' },
            { id: 'risk-factors-heading',        group: 'results',         key: 'riskFactorsHeading' },
            { id: 'recommendations-heading',     group: 'results',         key: 'recommendationsHeading' },
            { id: 'book-screening-btn',          group: 'results',         key: 'bookScreening' },
            { id: 'contact-label',               group: 'results',         key: 'contactLabel' },
            { id: 'submit-contact-btn',          group: 'results',         key: 'submit' },
            { id: 'play-again-btn',              group: 'results',         key: 'playAgain' },
            { id: 'score-label',                 group: 'results',         key: 'riskScore' },
            { id: 'cancer-breakdown-heading',    group: 'results',         key: 'cancerBreakdownHeading' },
            { id: 'high-risk-cta-text',          group: 'results',         key: 'highRiskCta' },
        ];

        for (const { id, group, key } of TEXT_MAPPINGS) {
            const el = document.getElementById(id);
            if (el) el.textContent = t(group, key);
        }

        // --- Elements that require innerHTML (contain markup like <span> or <strong>) ---
        const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
        setHtml('age-label', `${escapeHtml(t('onboarding', 'ageLabel'))} <span class="required">*</span>`);
        setHtml('ethnicity-label', `${escapeHtml(t('onboarding', 'ethnicityLabel'))} <span class="required">*</span>`);
        setHtml('disclaimer-text', t('results', 'disclaimer')); // Intentionally HTML: contains <strong>

        // --- Placeholder attributes ---
        const ethnicityInput = document.getElementById('ethnicity-others-input');
        if (ethnicityInput) ethnicityInput.placeholder = t('onboarding', 'ethnicityPlaceholder');
        const emailInput = document.getElementById('email-phone');
        if (emailInput) emailInput.placeholder = t('results', 'emailPlaceholder');

        // --- PDPA modal (content from separate pdpa config, not translations JSON) ---
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
        container.innerHTML = `<div style="text-align: center; padding: 2rem;"><p style="color: #d32f2f; margin-bottom: 1rem;">${escapeHtml(this.t('common', 'loadError'))}</p><button onclick="location.reload()" class="button">${escapeHtml(this.t('common', 'reloadPage'))}</button></div>`;
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
                return '<div class="card-icon card-icon-img"><img src="' + src + '" alt="" onerror="this.onerror=null;this.style.display=\'none\';var s=this.nextElementSibling;if(s)s.style.display=\'inline\';"><span class="card-icon-fallback" style="display:none">🏥</span></div>';
            }
            return '<div class="card-icon">' + (icon || '🏥') + '</div>';
        };
        if (!this.selectedGender) {
            this.assessments.forEach(assessment => {
                const card = document.createElement('div');
                card.className = 'assessment-card disabled';
                card.dataset.assessment = assessment.id;
                card.innerHTML = `${renderCardIcon(assessment.icon)}<h3>${escapeHtml(assessment.name)}</h3><p>${escapeHtml(assessment.description)}</p><button class="card-btn" data-assessment="${escapeHtml(assessment.id)}" disabled>${escapeHtml(this.t('cancerSelection', 'startAssessment'))}</button>`;
                container.appendChild(card);
            });
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
                    this._selectAssessment(newButton.dataset.assessment);
                });
            }
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            newCard.addEventListener('click', (e) => {
                const button = newCard.querySelector('.card-btn');
                if (button && !button.disabled && !newCard.classList.contains('disabled')) {
                    e.preventDefault(); e.stopPropagation();
                    this._selectAssessment(newCard.dataset.assessment);
                }
            });
        });
        const backBtn = document.getElementById('back-to-gender');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
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
        if (this.dom.onboarding.familyHistoryLabel) this.dom.onboarding.familyHistoryLabel.innerHTML = `3. ${assessment.familyLabel} <span class="required">*</span>`;
    }

    _setupOnboardingListeners() {
        this.dom.onboarding.backButton?.addEventListener('click', () => {
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
                if (e.target.value === 'Others') this.dom.onboarding.ethnicityOthersContainer?.classList.remove('hidden');
                else this.dom.onboarding.ethnicityOthersContainer?.classList.add('hidden');
                this._checkFormValidity();
            });
        });
        this.dom.onboarding.ethnicityOthersInput?.addEventListener('input', () => this._checkFormValidity());
        this.dom.onboarding.familyHistoryInputs?.forEach(input => input.addEventListener('change', () => this._checkFormValidity()));
        this.dom.onboarding.form?.addEventListener('submit', (e) => { e.preventDefault(); this._startAssessment(); });
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
        this._showLoadingState();
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
        const currentAssessment = await getAssessmentById(this.selectedAssessment, this.currentLanguage);
        const familyHistoryWeight = currentAssessment?.familyWeight || 10;
        if (familyHistory === 'Yes') {
            this.state.addRiskScore(familyHistoryWeight);
            this.state.addCategoryRisk(this.t('common', 'familyGenetics'), familyHistoryWeight);
        }
        const ageThreshold = currentAssessment?.ageRiskThreshold || 0;
        const ageWeight = currentAssessment?.ageRiskWeight || 0;
        if (ageThreshold > 0 && age >= ageThreshold && ageWeight > 0) {
            this.state.addRiskScore(ageWeight);
            this.state.addCategoryRisk(this.t('common', 'ageFactor'), ageWeight);
        }
        const ethnicityRisk = currentAssessment?.ethnicityRisk || {};
        const ethnicityWeight = parseFloat(ethnicityRisk[ethnicity.toLowerCase()]) || 0;
        if (ethnicityWeight > 0) {
            this.state.addRiskScore(ethnicityWeight);
            this.state.addCategoryRisk(this.t('common', 'ethnicityFactor'), ethnicityWeight);
        }
        this._changeScreen('game');
        this.mascot.show();
        this.mascot.updateState('Idle');
        this._showNextQuestion();
    }

    _showLoadingState() {}

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
            this.dom.game.questionCard?.classList.remove('dragging');
            const deltaX = e.changedTouches[0].clientX - startX;
            if (Math.abs(deltaX) > 100) this._handleAnswer(deltaX > 0 ? 'right' : 'left');
            else { card.style.transform = ''; this.ui.setTargetHighlight(null); }
        });
        const explanationContainer = this.dom.game.feedbackExplanation;
        if (explanationContainer) {
            explanationContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.explanation-continue-btn');
                if (!btn || btn.disabled) return;
                btn.disabled = true;
                if (this._onExplanationContinue) this._onExplanationContinue();
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
        // Expand shared questions: iterate over all cancer-type targets for this question
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
        this.ui.animateCardSwipe(dir, () => {
            const explanationText = (userAnswer === 'Yes') ? question.explanationYes : question.explanationNo;
            if (explanationText) {
                this._isExplanationVisible = true;
                const continueLabel = this.t('game', 'continueButton');
                this.ui.showExplanation(question, userAnswer, continueLabel);
                this._onExplanationContinue = () => {
                    this._isExplanationVisible = false;
                    this._onExplanationContinue = null;
                    this.ui.hideExplanation();
                    if (hasMoreQuestions) this._showNextQuestion();
                    else this._showResults();
                };
            } else {
                if (hasMoreQuestions) this._showNextQuestion();
                else this._showResults();
            }
        });
    }

    _setupResultsListeners() {
        this.dom.results.playAgainBtn?.addEventListener('click', () => this._resetApp());
        this.dom.results.resultsForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = this.dom.results.emailPhone?.value.trim();
            const messageEl = this.dom.results.formMessage;
            const submitBtn = e.target.querySelector('button[type="submit"]');
            messageEl.textContent = ''; messageEl.classList.remove('success', 'error');
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                messageEl.textContent = this.t('common', 'validEmailError'); messageEl.classList.add('error'); return;
            }
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = this.t('common', 'sendingText'); }
            try {
                const assessmentData = { riskScore: this.state.riskScore, riskLevel: this.state.getRiskLevel(), userData: this.state.getUserData(), categoryRisks: this.state.getCategoryRisks(), recommendations: this.lastRecommendations || [], assessmentType: this.selectedAssessment };
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
        this.ui.renderRiskBreakdown(this.state.getCategoryRisks(), this.state.getAnswerCounts());

        // Submit to backend and use its recommendations
        let recommendations = riskResult?.recommendations || [];
        if (this.useBackend) {
            try {
                const apiResult = await ApiService.submitAssessment(this.state.getUserData(), this.answers);
                if (apiResult?.recommendations) {
                    recommendations = apiResult.recommendations;
                }
            } catch (err) {
                console.warn('API submission failed:', err);
            }
        }
        recommendations = this._localizeRecommendations(recommendations);
        this.lastRecommendations = recommendations;
        this.ui.renderRecommendations(recommendations);
        this._changeScreen('results');
        window.scrollTo(0, 0);
    }

    _resetApp() {
        this._isExplanationVisible = false;
        this._onExplanationContinue = null;
        this.state.reset(); this.answers = []; this.mascot.hide(); this.selectedAssessment = null; this.selectedGender = null;
        sessionStorage.removeItem('selectedGender'); sessionStorage.removeItem('pdpaConsented');
        // Reset results screen to default state
        const scoreContainer = document.querySelector('.results-score-container');
        const riskBreakdown = document.querySelector('.risk-breakdown');
        const cancerBreakdown = document.getElementById('cancer-breakdown');
        if (scoreContainer) scoreContainer.style.display = '';
        if (riskBreakdown) riskBreakdown.style.display = '';
        if (cancerBreakdown) cancerBreakdown.style.display = 'none';
        this._changeScreen('landing');
        this.dom.onboarding.form?.reset();
        this.dom.onboarding.ethnicityOthersContainer?.classList.add('hidden');
        if (this.pdpaConfig?.enabled) this._showPdpaModal();
    }
}
document.addEventListener('DOMContentLoaded', () => new RiskAssessmentApp());