import { DOMElements } from './domElements.js';
import { GameState } from './gameState.js';
import { MascotController } from './mascotController.js';
import { UIController } from './uiController.js';
import { getRecommendations } from './recommendations.js';
import { ApiService } from './apiService.js';
import { loadAssessments, getAssessmentById, setCurrentLanguage, getCurrentLanguage, clearCache, SUPPORTED_LANGUAGES, filterAssessmentsByGender } from './assessmentConfig.js';
import { QuestionLoader } from './questionLoader.js';

/**
 * UI Text translations for static elements
 */
const UI_TRANSLATIONS = {
    en: {
        landingTitle: 'Cancer Risk Assessment',
        landingSubtitle: 'Take control of your health. Choose your assessment to get personalized risk insights and prevention guidance.',
        genderPrompt: 'Select your gender to see available assessments:',
        ageLabel: '1. What is your age?',
        genderLabel: '2. What is your gender at birth?',
        male: 'Male',
        female: 'Female',
        ethnicityLabel: '2. What is your ethnicity?',
        chinese: 'Chinese',
        malay: 'Malay',
        indian: 'Indian',
        caucasian: 'Caucasian',
        others: 'Others',
        ethnicityPlaceholder: 'Please specify your ethnicity',
        familyYes: 'Yes',
        familyNo: 'No',
        familyUnknown: "Don't Know",
        back: 'Back',
        startAssessment: 'Start Assessment',
        lowRisk: 'LOW RISK',
        mediumRisk: 'MEDIUM RISK',
        highRisk: 'HIGH RISK',
        resultsHeading: 'Your Results',
        riskFactorsHeading: 'Your Risk Factors',
        recommendationsHeading: 'What You Can Do',
        bookScreening: 'Book Your Cancer Screening Appointment With Us Today!',
        contactLabel: 'Enter your email or phone number to receive your detailed results and action plan.',
        submit: 'Submit',
        playAgain: 'Play Again?',
        disclaimer: '<strong>Disclaimer:</strong> This game is for educational purposes only and is not medical advice. The result is based on your self-reported answers to common risk factors. Please consult a doctor for a personal health assessment.',
        feedbackYes: 'Aiyo! (YES)',
        feedbackNo: 'Steady! (NO)',
        riskScore: 'Risk Score'
    },
    zh: {
        landingTitle: '癌症风险评估',
        landingSubtitle: '掌控您的健康。选择评估以获取个性化的风险洞察和预防指导。',
        genderPrompt: '选择您的性别以查看可用评估：',
        ageLabel: '1. 您的年龄是？',
        genderLabel: '2. 您出生时的性别是？',
        male: '男',
        female: '女',
        ethnicityLabel: '2. 您的种族是？',
        chinese: '华人',
        malay: '马来人',
        indian: '印度人',
        caucasian: '白人',
        others: '其他',
        ethnicityPlaceholder: '请说明您的种族',
        familyYes: '是',
        familyNo: '否',
        familyUnknown: '不知道',
        back: '返回',
        startAssessment: '开始评估',
        lowRisk: '低风险',
        mediumRisk: '中风险',
        highRisk: '高风险',
        resultsHeading: '您的结果',
        riskFactorsHeading: '您的风险因素',
        recommendationsHeading: '您可以做什么',
        bookScreening: '立即预约您的癌症筛查！',
        contactLabel: '输入您的电子邮件或电话号码以接收详细结果和行动计划。',
        submit: '提交',
        playAgain: '再玩一次？',
        disclaimer: '<strong>免责声明：</strong>此游戏仅用于教育目的，不构成医疗建议。结果基于您对常见风险因素的自我报告答案。请咨询医生进行个人健康评估。',
        feedbackYes: '哎呀！(是)',
        feedbackNo: '稳！(否)',
        riskScore: '风险分数'
    },
    ms: {
        landingTitle: 'Penilaian Risiko Kanser',
        landingSubtitle: 'Kawal kesihatan anda. Pilih penilaian untuk mendapatkan pandangan risiko peribadi dan panduan pencegahan.',
        genderPrompt: 'Pilih jantina anda untuk melihat penilaian yang tersedia:',
        ageLabel: '1. Berapakah umur anda?',
        genderLabel: '2. Apakah jantina anda semasa lahir?',
        male: 'Lelaki',
        female: 'Perempuan',
        ethnicityLabel: '2. Apakah etnik anda?',
        chinese: 'Cina',
        malay: 'Melayu',
        indian: 'India',
        caucasian: 'Kaukasia',
        others: 'Lain-lain',
        ethnicityPlaceholder: 'Sila nyatakan etnik anda',
        familyYes: 'Ya',
        familyNo: 'Tidak',
        familyUnknown: 'Tidak Tahu',
        back: 'Kembali',
        startAssessment: 'Mulakan Penilaian',
        lowRisk: 'RISIKO RENDAH',
        mediumRisk: 'RISIKO SEDERHANA',
        highRisk: 'RISIKO TINGGI',
        resultsHeading: 'Keputusan Anda',
        riskFactorsHeading: 'Faktor Risiko Anda',
        recommendationsHeading: 'Apa Yang Boleh Anda Lakukan',
        bookScreening: 'Tempah Temujanji Saringan Kanser Anda Hari Ini!',
        contactLabel: 'Masukkan e-mel atau nombor telefon anda untuk menerima keputusan terperinci dan pelan tindakan.',
        submit: 'Hantar',
        playAgain: 'Main Lagi?',
        disclaimer: '<strong>Penafian:</strong> Permainan ini hanya untuk tujuan pendidikan dan bukan nasihat perubatan. Keputusan adalah berdasarkan jawapan yang dilaporkan sendiri terhadap faktor risiko biasa. Sila berunding dengan doktor untuk penilaian kesihatan peribadi.',
        feedbackYes: 'Alamak! (YA)',
        feedbackNo: 'Bagus! (TIDAK)',
        riskScore: 'Skor Risiko'
    },
    ta: {
        landingTitle: 'புற்றுநோய் ஆபத்து மதிப்பீடு',
        landingSubtitle: 'உங்கள் ஆரோக்கியத்தைக் கட்டுப்படுத்துங்கள். தனிப்பயனாக்கப்பட்ட ஆபத்து நுண்ணறிவு மற்றும் தடுப்பு வழிகாட்டுதலைப் பெற உங்கள் மதிப்பீட்டைத் தேர்ந்தெடுக்கவும்.',
        genderPrompt: 'கிடைக்கும் மதிப்பீடுகளைக் காண உங்கள் பாலினத்தைத் தேர்ந்தெடுக்கவும்:',
        ageLabel: '1. உங்கள் வயது என்ன?',
        genderLabel: '2. பிறப்பின் போது உங்கள் பாலினம் என்ன?',
        male: 'ஆண்',
        female: 'பெண்',
        ethnicityLabel: '2. உங்கள் இனம் என்ன?',
        chinese: 'சீன',
        malay: 'மலாய்',
        indian: 'இந்திய',
        caucasian: 'காகசியன்',
        others: 'மற்றவை',
        ethnicityPlaceholder: 'உங்கள் இனத்தைக் குறிப்பிடவும்',
        familyYes: 'ஆம்',
        familyNo: 'இல்லை',
        familyUnknown: 'தெரியாது',
        back: 'பின்செல்',
        startAssessment: 'மதிப்பீட்டைத் தொடங்கு',
        lowRisk: 'குறைந்த ஆபத்து',
        mediumRisk: 'நடுத்தர ஆபத்து',
        highRisk: 'அதிக ஆபத்து',
        resultsHeading: 'உங்கள் முடிவுகள்',
        riskFactorsHeading: 'உங்கள் ஆபத்து காரணிகள்',
        recommendationsHeading: 'நீங்கள் என்ன செய்யலாம்',
        bookScreening: 'இன்றே உங்கள் புற்றுநோய் பரிசோதனை சந்திப்பை முன்பதிவு செய்யுங்கள்!',
        contactLabel: 'விரிவான முடிவுகள் மற்றும் செயல் திட்டத்தைப் பெற உங்கள் மின்னஞ்சல் அல்லது தொலைபேசி எண்ணை உள்ளிடவும்.',
        submit: 'சமர்ப்பி',
        playAgain: 'மீண்டும் விளையாடவா?',
        disclaimer: '<strong>மறுப்பு:</strong> இந்த விளையாட்டு கல்வி நோக்கங்களுக்காக மட்டுமே மற்றும் மருத்துவ ஆலோசனை அல்ல. முடிவு பொதுவான ஆபத்து காரணிகளுக்கு உங்கள் சுய-அறிக்கை பதில்களை அடிப்படையாகக் கொண்டது. தனிப்பட்ட சுகாதார மதிப்பீட்டிற்கு மருத்துவரை அணுகவும்.',
        feedbackYes: 'ஐயோ! (ஆம்)',
        feedbackNo: 'நல்லது! (இல்லை)',
        riskScore: 'ஆபத்து மதிப்பெண்'
    }
};

/**
 * Main Application Controller
 * Orchestrates all modules and handles application flow
 */
class RiskAssessmentApp {
    constructor() {
        this.dom = new DOMElements();
        this.state = new GameState();
        this.mascot = new MascotController(this.dom.mascot);
        this.ui = new UIController(this.dom);
        this.answers = [];
        this.useBackend = true;
        this.selectedAssessment = null;
        this.assessments = [];
        this.currentLanguage = getCurrentLanguage();
        this.selectedGender = localStorage.getItem('selectedGender') || null;

        this.initialize();
    }

    async initialize() {
        if (!this.dom.validate()) {
            console.error('Critical DOM elements missing!');
            return;
        }

        // Setup language selector
        this._setupLanguageSelector();

        // Setup gender selector on landing page
        this._setupGenderSelector();

        // Apply saved language
        this._applyLanguage(this.currentLanguage);

        // Show loading state while loading assessments
        this._showLandingLoadingState();

        // Load assessments
        try {
            this.assessments = await loadAssessments(this.currentLanguage);
            console.log(`Loaded ${this.assessments.length} cancer assessment types`);
            this._renderAssessmentCards();
        } catch (error) {
            console.error('Error loading assessments:', error);
            this._showLandingError();
            return;
        }

        // Setup event listeners
        this._setupLandingListeners();
        this._setupOnboardingListeners();
        this._setupGameListeners();
        this._setupResultsListeners();

        console.log('Risk Assessment App Initialized');
    }

    _setupGenderSelector() {
        const selector = document.getElementById('gender-selector');
        if (!selector) return;

        // Set active button based on saved gender
        if (this.selectedGender) {
            selector.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.gender === this.selectedGender);
            });
            // Also show the mascot for saved gender
            this.mascot.selectMascot(this.selectedGender);
        }

        selector.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', async () => {
                const gender = btn.dataset.gender;

                // Update active state
                selector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Save gender
                this.selectedGender = gender;
                localStorage.setItem('selectedGender', gender);

                // Show mascot with flash effect
                this.mascot.selectMascot(gender);

                // Re-render assessment cards filtered by gender
                this._renderAssessmentCards();

                // Update hidden gender field in onboarding form
                const genderHidden = document.getElementById('gender-hidden');
                if (genderHidden) {
                    genderHidden.value = gender;
                }
            });
        });
    }


    _setupLanguageSelector() {
        const selector = document.getElementById('language-selector');
        if (!selector) return;

        // Set active button based on current language
        selector.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === this.currentLanguage);
            
            btn.addEventListener('click', async () => {
                const lang = btn.dataset.lang;
                if (lang === this.currentLanguage) return;

                // Update active state
                selector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Change language
                this.currentLanguage = lang;
                setCurrentLanguage(lang);
                QuestionLoader.clearCache();

                // Reload UI
                this._applyLanguage(lang);
                
                // Reload assessments
                this._showLandingLoadingState();
                try {
                    this.assessments = await loadAssessments(lang);
                    this._renderAssessmentCards();
                } catch (error) {
                    console.error('Error reloading assessments:', error);
                }
            });
        });
    }

    _applyLanguage(lang) {
        const t = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.en;

        // Landing page
        const landingTitle = document.getElementById('landing-title');
        const landingSubtitle = document.getElementById('landing-subtitle');
        const genderPrompt = document.getElementById('gender-prompt');
        const genderMaleText = document.getElementById('gender-male-text');
        const genderFemaleText = document.getElementById('gender-female-text');
        
        if (landingTitle) landingTitle.textContent = t.landingTitle;
        if (landingSubtitle) landingSubtitle.textContent = t.landingSubtitle;
        if (genderPrompt) genderPrompt.textContent = t.genderPrompt;
        if (genderMaleText) genderMaleText.textContent = t.male;
        if (genderFemaleText) genderFemaleText.textContent = t.female;

        // Onboarding form labels
        const setTextContent = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = text;
        };

        setTextContent('age-label', `${t.ageLabel} <span class="required">*</span>`);
        // Gender is now on landing page, no need to set onboarding gender labels
        setTextContent('ethnicity-label', `${t.ethnicityLabel} <span class="required">*</span>`);
        setTextContent('ethnicity-chinese-label', t.chinese);
        setTextContent('ethnicity-malay-label', t.malay);
        setTextContent('ethnicity-indian-label', t.indian);
        setTextContent('ethnicity-caucasian-label', t.caucasian);
        setTextContent('ethnicity-others-label', t.others);
        setTextContent('family-yes-label', t.familyYes);
        setTextContent('family-no-label', t.familyNo);
        setTextContent('family-unknown-label', t.familyUnknown);

        const ethnicityInput = document.getElementById('ethnicity-others-input');
        if (ethnicityInput) ethnicityInput.placeholder = t.ethnicityPlaceholder;

        const backBtn = document.getElementById('back-to-landing');
        if (backBtn) backBtn.textContent = t.back;

        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) startBtn.textContent = t.startAssessment;

        // Game screen feedback
        const feedbackCorrect = document.getElementById('feedback-correct');
        const feedbackWrong = document.getElementById('feedback-wrong');
        if (feedbackCorrect) feedbackCorrect.textContent = t.feedbackNo;
        if (feedbackWrong) feedbackWrong.textContent = t.feedbackYes;

        // Results screen
        setTextContent('results-heading', t.resultsHeading);
        setTextContent('risk-factors-heading', t.riskFactorsHeading);
        setTextContent('recommendations-heading', t.recommendationsHeading);
        
        const bookBtn = document.getElementById('book-screening-btn');
        if (bookBtn) bookBtn.textContent = t.bookScreening;

        setTextContent('contact-label', t.contactLabel);
        
        const submitBtn = document.getElementById('submit-contact-btn');
        if (submitBtn) submitBtn.textContent = t.submit;

        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) playAgainBtn.textContent = t.playAgain;

        const disclaimer = document.getElementById('disclaimer-text');
        if (disclaimer) disclaimer.innerHTML = t.disclaimer;

        const scoreLabel = document.getElementById('score-label');
        if (scoreLabel) scoreLabel.textContent = t.riskScore;

        // Store translations for dynamic use
        this.translations = t;
    }

    _showLandingLoadingState() {
        const container = document.querySelector('.assessment-cards');
        if (!container) return;
        
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">Loading assessments...</p>';
    }

    _showLandingError() {
        const container = document.querySelector('.assessment-cards');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p style="color: #d32f2f; margin-bottom: 1rem;">Failed to load cancer assessments.</p>
                <button onclick="location.reload()" class="button">Reload Page</button>
            </div>
        `;
    }

    _renderAssessmentCards() {
        const container = document.querySelector('.assessment-cards');
        if (!container) return;

        container.innerHTML = '';

        // If no gender selected, show disabled placeholder cards
        if (!this.selectedGender) {
            this.assessments.forEach(assessment => {
                const card = document.createElement('div');
                card.className = 'assessment-card disabled';
                card.dataset.assessment = assessment.id;

                card.innerHTML = `
                    <div class="card-icon">${assessment.icon}</div>
                    <h3>${assessment.name}</h3>
                    <p>${assessment.description}</p>
                    <button class="card-btn" data-assessment="${assessment.id}" disabled>${this.translations?.startAssessment || 'Start Assessment'}</button>
                `;

                container.appendChild(card);
            });

            // Add overlay message
            const overlay = document.createElement('div');
            overlay.className = 'gender-required-overlay';
            overlay.innerHTML = `
                <div class="overlay-content">
                    <p>${this.translations?.genderPrompt || 'Select your gender above to see available assessments.'}</p>
                </div>
            `;
            container.appendChild(overlay);

            this.dom.landing.assessmentCards = document.querySelectorAll('.assessment-card');
            this.dom.landing.cardButtons = document.querySelectorAll('.card-btn');
            return;
        }

        // Filter assessments by gender if selected
        let filteredAssessments = filterAssessmentsByGender(this.assessments, this.selectedGender);

        if (filteredAssessments.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No assessments available for your selected gender.</p>';
            return;
        }

        filteredAssessments.forEach(assessment => {
            const card = document.createElement('div');
            card.className = 'assessment-card';
            card.dataset.assessment = assessment.id;

            card.innerHTML = `
                <div class="card-icon">${assessment.icon}</div>
                <h3>${assessment.name}</h3>
                <p>${assessment.description}</p>
                <button class="card-btn" data-assessment="${assessment.id}">${this.translations?.startAssessment || 'Start Assessment'}</button>
            `;

            container.appendChild(card);
        });

        this.dom.landing.assessmentCards = document.querySelectorAll('.assessment-card');
        this.dom.landing.cardButtons = document.querySelectorAll('.card-btn');
    }

    _setupLandingListeners() {
        const container = document.querySelector('.assessment-cards');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const button = e.target.closest('.card-btn');
            const card = e.target.closest('.assessment-card');

            // Prevent clicking on disabled cards
            if (button && button.disabled) return;
            if (card && card.classList.contains('disabled')) return;

            if (button) {
                const assessmentType = button.dataset.assessment;
                this._selectAssessment(assessmentType);
            } else if (card) {
                const assessmentType = card.dataset.assessment;
                this._selectAssessment(assessmentType);
            }
        });
    }

    async _selectAssessment(assessmentType) {
        this.selectedAssessment = assessmentType;
        this._updateOnboardingForAssessment(assessmentType);
        this.dom.switchScreen('onboarding');
    }

    async _updateOnboardingForAssessment(assessmentType) {
        const assessment = await getAssessmentById(assessmentType, this.currentLanguage);
        if (!assessment) {
            console.error('Assessment not found:', assessmentType);
            return;
        }

        if (this.dom.onboarding.assessmentTitle) {
            this.dom.onboarding.assessmentTitle.textContent = assessment.title;
        }
        if (this.dom.onboarding.assessmentSubtitle) {
            this.dom.onboarding.assessmentSubtitle.textContent = assessment.subtitle;
        }
        if (this.dom.onboarding.familyHistoryLabel) {
            this.dom.onboarding.familyHistoryLabel.innerHTML = `3. ${assessment.familyLabel} <span class="required">*</span>`;
        }
    }

    _setupOnboardingListeners() {
        this.dom.onboarding.backButton?.addEventListener('click', () => {
            this.dom.switchScreen('landing');
        });

        this.dom.onboarding.ageInput?.addEventListener('input', (e) => {
            if (this.dom.onboarding.ageSlider) {
                this.dom.onboarding.ageSlider.value = e.target.value;
            }
            this._checkFormValidity();
        });

        this.dom.onboarding.ageSlider?.addEventListener('input', (e) => {
            if (this.dom.onboarding.ageInput) {
                this.dom.onboarding.ageInput.value = e.target.value;
            }
            this._checkFormValidity();
        });


        this.dom.onboarding.ethnicityInputs?.forEach(input => {
            input.addEventListener('change', (e) => {
                if (e.target.value === 'Others') {
                    this.dom.onboarding.ethnicityOthersContainer?.classList.remove('hidden');
                } else {
                    this.dom.onboarding.ethnicityOthersContainer?.classList.add('hidden');
                }
                this._checkFormValidity();
            });
        });

        this.dom.onboarding.ethnicityOthersInput?.addEventListener('input', () => {
            this._checkFormValidity();
        });

        this.dom.onboarding.familyHistoryInputs?.forEach(input => {
            input.addEventListener('change', () => {
                this._checkFormValidity();
            });
        });

        this.dom.onboarding.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this._startAssessment();
        });
    }

    _checkFormValidity() {
        const age = this.dom.onboarding.ageInput?.value;
        // Gender is now selected on landing page and stored in this.selectedGender
        const gender = this.selectedGender;
        const familyHistory = document.querySelector('input[name="family-history"]:checked');

        let ethnicityValid = false;
        const selectedEthnicity = document.querySelector('input[name="ethnicity"]:checked');
        if (selectedEthnicity) {
            if (selectedEthnicity.value === 'Others') {
                ethnicityValid = this.dom.onboarding.ethnicityOthersInput?.value.trim() !== '';
            } else {
                ethnicityValid = true;
            }
        }

        const isValid = age && gender && familyHistory && ethnicityValid;

        if (this.dom.onboarding.startButton) {
            this.dom.onboarding.startButton.disabled = !isValid;
            this.dom.onboarding.startButton.setAttribute('aria-disabled', !isValid);
        }
    }

    async _startAssessment() {
        const age = parseInt(this.dom.onboarding.ageInput?.value);
        // Gender is selected on landing page
        const gender = this.selectedGender;
        const familyHistory = document.querySelector('input[name="family-history"]:checked')?.value;

        const eth = document.querySelector('input[name="ethnicity"]:checked')?.value;
        const ethnicity = (eth === 'Others') ? this.dom.onboarding.ethnicityOthersInput?.value.trim() : eth;

        this.state.setUserData(age, gender, familyHistory, ethnicity, this.selectedAssessment);
        this.answers = [];

        this._showLoadingState();

        let questions = [];
        try {
            // Load questions with current language
            questions = await QuestionLoader.loadQuestions(this.selectedAssessment, age, this.currentLanguage);
            
            if (questions.length === 0) {
                throw new Error(`No questions found for ${this.selectedAssessment}`);
            }
            
            console.log(`Loaded ${questions.length} questions for ${this.selectedAssessment} assessment (age: ${age}, lang: ${this.currentLanguage})`);
        } catch (error) {
            console.error('Error loading questions:', error);
            alert(`Failed to load questions for ${this.selectedAssessment}. Please try again.`);
            this.dom.switchScreen('onboarding');
            return;
        }

        this.state.setQuestions(questions);

        // Get configurable demographic risk settings from assessment data
        const currentAssessment = await getAssessmentById(this.selectedAssessment, this.currentLanguage);
        
        // 1. Family History Risk
        const familyHistoryWeight = currentAssessment?.familyWeight || 10;
        if (familyHistory === 'Yes') {
            this.state.addRiskScore(familyHistoryWeight);
            this.state.addCategoryRisk('Family & Genetics', familyHistoryWeight);
            console.log(`Applied family history risk: +${familyHistoryWeight}%`);
        }

        // 2. Age-based Risk
        const ageThreshold = currentAssessment?.ageRiskThreshold || 0;
        const ageWeight = currentAssessment?.ageRiskWeight || 0;
        if (ageThreshold > 0 && age >= ageThreshold && ageWeight > 0) {
            this.state.addRiskScore(ageWeight);
            this.state.addCategoryRisk('Age Factor', ageWeight);
            console.log(`Applied age risk (>=${ageThreshold}): +${ageWeight}%`);
        }

        // 3. Ethnicity-based Risk
        const ethnicityRisk = currentAssessment?.ethnicityRisk || {};
        const normalizedEthnicity = ethnicity.toLowerCase();
        const ethnicityMultiplier = ethnicityRisk[normalizedEthnicity] || 1.0;
        
        // Apply ethnicity modifier as additional percentage points if multiplier > 1.0
        if (ethnicityMultiplier > 1.0) {
            // Convert multiplier to additional risk points (e.g., 1.2 = +2 points)
            const ethnicityBonus = Math.round((ethnicityMultiplier - 1.0) * 10);
            if (ethnicityBonus > 0) {
                this.state.addRiskScore(ethnicityBonus);
                this.state.addCategoryRisk('Ethnicity Factor', ethnicityBonus);
                console.log(`Applied ethnicity risk (${ethnicity}, multiplier ${ethnicityMultiplier}): +${ethnicityBonus}%`);
            }
        }

        this.dom.switchScreen('game');
        this._showNextQuestion();
    }

    _showLoadingState() {
        console.log('Loading questions...');
    }

    _setupGameListeners() {
        let startX = 0;
        let isDragging = false;

        this.dom.game.questionCard?.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            isDragging = true;
            this.dom.game.questionCard.classList.add('dragging');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.dom.game.questionCard) return;

            const deltaX = e.clientX - startX;
            this.dom.game.questionCard.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.1}deg)`;
        });

        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;

            this.dom.game.questionCard?.classList.remove('dragging');

            const deltaX = e.clientX - startX;

            if (Math.abs(deltaX) > 100) {
                const direction = deltaX > 0 ? 'right' : 'left';
                this._handleAnswer(direction);
            } else if (this.dom.game.questionCard) {
                this.dom.game.questionCard.style.transform = '';
            }
        });

        this.dom.game.questionCard?.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        });

        this.dom.game.questionCard?.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const deltaX = e.touches[0].clientX - startX;
            this.dom.game.questionCard.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.1}deg)`;
        });

        this.dom.game.questionCard?.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;

            const deltaX = e.changedTouches[0].clientX - startX;

            if (Math.abs(deltaX) > 100) {
                const direction = deltaX > 0 ? 'right' : 'left';
                this._handleAnswer(direction);
            } else if (this.dom.game.questionCard) {
                this.dom.game.questionCard.style.transform = '';
            }
        });
    }

    _showNextQuestion() {
        const question = this.state.getCurrentQuestion();
        if (!question) {
            this._showResults();
            return;
        }

        this.ui.showQuestion(question.prompt || question.question);
        const progress = this.state.getProgress();
        this.ui.updateProgress(progress.current, progress.total);
        this.ui.hideExplanation();
    }

    _handleAnswer(direction) {
        const question = this.state.getCurrentQuestion();
        if (!question) return;

        const userAnswer = (direction === 'left') ? 'No' : 'Yes';
        
        const weight = question.weight || 0;
        const yesValue = question.yesValue ?? 100;
        const noValue = question.noValue ?? 0;
        
        const answerValue = (userAnswer === 'Yes') ? yesValue : noValue;
        const riskContribution = weight * (answerValue / 100);
        const isRisk = riskContribution > 0;

        this.answers.push({
            questionId: question.id,
            questionText: question.prompt,
            userAnswer: userAnswer,
            weight: weight,
            yesValue: yesValue,
            noValue: noValue,
            riskContribution: riskContribution,
            isRisk: isRisk,
            category: question.category
        });

        this.ui.showFeedback(!isRisk);
        this.ui.showExplanation(question.explanation);

        if (riskContribution > 0) {
            this.state.addRiskScore(riskContribution);
            this.state.addCategoryRisk(question.category, riskContribution);
            this.ui.updateGlow(true);
        }

        this.ui.updateRiskBar(this.state.getRiskScore());
        this.mascot.startAnimation('Jump');

        const hasMoreQuestions = this.state.nextQuestion();

        this.ui.animateCardSwipe(direction, () => {
            if (hasMoreQuestions) {
                this._showNextQuestion();
            } else {
                this._showResults();
            }
        });
    }

    _setupResultsListeners() {
        this.dom.results.playAgainBtn?.addEventListener('click', () => {
            this._resetApp();
        });

        this.dom.results.resultsForm?.addEventListener('submit', (e) => {
            e.preventDefault();

            const value = this.dom.results.emailPhone?.value.trim();
            const messageEl = this.dom.results.formMessage;
            if (!messageEl) return;

            if (value) {
                messageEl.textContent = `Thank you! Your results would be sent to: ${value}`;
                messageEl.classList.remove('error');
                messageEl.classList.add('success');
            } else {
                messageEl.textContent = 'You did not enter any contact details. You can still review your results on this page.';
                messageEl.classList.remove('success');
                messageEl.classList.add('error');
            }
        });
    }

    async _showResults() {
        this.dom.switchScreen('results');

        this.ui.showResults(this.state);

        const categoryRisks = this.state.getCategoryRisks();
        const answerCounts = this.state.getAnswerCounts();
        this.ui.renderRiskBreakdown(categoryRisks, answerCounts);

        if (this.useBackend) {
            try {
                const userData = this.state.getUserData();
                await ApiService.submitAssessment(userData, this.answers);
                console.log('Assessment submitted to backend');
            } catch (error) {
                console.warn('Failed to submit assessment to backend:', error);
            }
        }

        const recommendations = getRecommendations(this.state);
        this.ui.renderRecommendations(recommendations);
    }

    _resetApp() {
        this.state.reset();
        this.mascot.hide();
        this.selectedAssessment = null;
        this.dom.switchScreen('landing');
        this.dom.onboarding.form?.reset();
        this.dom.onboarding.ethnicityOthersContainer?.classList.add('hidden');
        if (this.dom.onboarding.ageSlider) this.dom.onboarding.ageSlider.value = 18;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RiskAssessmentApp();
});
