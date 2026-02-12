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
        genderPrompt: 'Select your gender to continue:',
        cancerSelectionTitle: 'Choose Your Assessment',
        cancerSelectionSubtitle: 'Select the type of cancer risk assessment you\'d like to take.',
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
        genderPrompt: '选择您的性别以继续：',
        cancerSelectionTitle: '选择您的评估',
        cancerSelectionSubtitle: '选择您想要进行的癌症风险评估类型。',
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
        genderPrompt: 'Pilih jantina anda untuk meneruskan:',
        cancerSelectionTitle: 'Pilih Penilaian Anda',
        cancerSelectionSubtitle: 'Pilih jenis penilaian risiko kanser yang ingin anda ambil.',
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
        genderPrompt: 'தொடர உங்கள் பாலினத்தைத் தேர்ந்தெடுக்கவும்:',
        cancerSelectionTitle: 'உங்கள் மதிப்பீட்டைத் தேர்ந்தெடுக்கவும்',
        cancerSelectionSubtitle: 'நீங்கள் எடுக்க விரும்பும் புற்றுநோய் ஆபத்து மதிப்பீட்டின் வகையைத் தேர்ந்தெடுக்கவும்.',
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

        this._setupLanguageSelector();
        this._setupGenderSelector();
        this._applyLanguage(this.currentLanguage);
        this._showLandingLoadingState();

        try {
            this.assessments = await loadAssessments(this.currentLanguage);
            console.log(`Loaded ${this.assessments.length} cancer assessment types`);
            this._renderAssessmentCards();
        } catch (error) {
            console.error('Error loading assessments:', error);
            this._showLandingError();
            return;
        }

        this._setupLandingListeners();
        this._setupCancerSelectionListeners();
        this._setupOnboardingListeners();
        this._setupGameListeners();
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
            this.mascot.setGender(this.selectedGender);
            // If we have a saved gender, go directly to cancer selection
            this.dom.switchScreen('cancerSelection');
            this._renderAssessmentCards();
            return;
        }

        // Set up event listeners for gender selection
        this._attachGenderSelectionListeners();
    }

    _attachGenderSelectionListeners() {
        const selector = document.getElementById('gender-selector');
        if (!selector) return;

        // Remove existing listeners first to avoid duplicates
        selector.querySelectorAll('button').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });

        // Attach new listeners
        selector.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', async () => {
                const gender = btn.dataset.gender;

                // Update active state
                selector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Save gender
                this.selectedGender = gender;
                localStorage.setItem('selectedGender', gender);

                // Set mascot gender for later screens
                this.mascot.setGender(gender);

                // Show large 50% transparent mascot popup as feedback (Idle (1)=Male, Idle (2)=Female)
                const popup = document.getElementById('gender-feedback-popup');
                const popupImg = document.getElementById('gender-feedback-mascot-img');
                const genderIndex = gender.toLowerCase() === 'female' ? 2 : 1;
                if (popup && popupImg) {
                    popupImg.src = `assets/Idle (${genderIndex}).png`;
                    popupImg.alt = `${gender} selected`;
                    popup.classList.remove('hidden');
                    popup.setAttribute('aria-hidden', 'false');

                    // Auto-advance after delay: hide popup, show mascot, go to assessment selection
                    const advanceDelay = 1500;
                    setTimeout(() => {
                        popup.classList.add('hidden');
                        popup.setAttribute('aria-hidden', 'true');
                        this.mascot.show();
                        this.dom.switchScreen('cancerSelection');
                        this._renderAssessmentCards();

                        const genderHidden = document.getElementById('gender-hidden');
                        if (genderHidden) genderHidden.value = gender;
                    }, advanceDelay);
                } else {
                    this.mascot.show();
                    this.dom.switchScreen('cancerSelection');
                    this._renderAssessmentCards();
                    const genderHidden = document.getElementById('gender-hidden');
                    if (genderHidden) genderHidden.value = gender;
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

        // Landing page (gender selection)
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

        // Cancer selection page
        const cancerTitle = document.getElementById('cancer-selection-title');
        const cancerSubtitle = document.getElementById('cancer-selection-subtitle');

        if (cancerTitle) cancerTitle.textContent = t.cancerSelectionTitle;
        if (cancerSubtitle) cancerSubtitle.textContent = t.cancerSelectionSubtitle;

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
        const container = document.querySelector('#screen-cancer-selection .assessment-cards');
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

        // Set up event listeners for the newly created cards
        this._setupCancerCardListeners();

        this.dom.landing.assessmentCards = document.querySelectorAll('#screen-cancer-selection .assessment-card');
        this.dom.landing.cardButtons = document.querySelectorAll('#screen-cancer-selection .card-btn');
    }

    _setupLandingListeners() {
        // Landing page doesn't have cards anymore, this is now handled by cancer selection screen
    }

    _setupCancerSelectionListeners() {
        // This is called during initialization, but we also call it after rendering cards
        this._setupCancerCardListeners();
    }

    _setupCancerCardListeners() {
        // Remove existing listeners first to avoid duplicates
        const existingCards = document.querySelectorAll('#screen-cancer-selection .assessment-card');
        existingCards.forEach(card => {
            const button = card.querySelector('.card-btn');
            if (button) {
                // Clone and replace to remove existing listeners
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);

                newButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (newButton.disabled) return;
                    if (card.classList.contains('disabled')) return;

                    const assessmentType = newButton.dataset.assessment;
                    this._selectAssessment(assessmentType);
                });
            }

            // Clone and replace card to remove existing listeners
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);

            newCard.addEventListener('click', (e) => {
                const button = newCard.querySelector('.card-btn');
                if (button && !button.disabled && !newCard.classList.contains('disabled')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const assessmentType = newCard.dataset.assessment;
                    this._selectAssessment(assessmentType);
                }
            });
        });

        // Back button
        const backBtn = document.getElementById('back-to-gender');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.selectedGender = null;
                localStorage.removeItem('selectedGender');
                const genderButtons = document.querySelectorAll('#gender-selector button');
                genderButtons.forEach(btn => btn.classList.remove('active'));
                this.mascot.hide();
                this.dom.switchScreen('landing');
                this._attachGenderSelectionListeners();
            });
        }
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

    _setupCancerSelectionListeners() {
        // Back button(s) are attached in _setupCancerCardListeners after cards render
    }

    _setupOnboardingListeners() {
        this.dom.onboarding.backButton?.addEventListener('click', () => {
            this.dom.switchScreen('cancerSelection');
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
            
            // Debug: Log what questions we got for generic assessment
            if (this.selectedAssessment === 'generic') {
                console.log('Generic assessment - loaded questions:', questions.length);
                console.log('Questions with cancerType:', questions.filter(q => q.cancerType).length);
                console.log('Cancer types found:', [...new Set(questions.map(q => q.cancerType).filter(Boolean))]);
            }
            
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
        this.mascot.show();
        this.mascot.updateState('Idle');
        this._showNextQuestion();
    }

    _showLoadingState() {
        console.log('Loading questions...');
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
            this.dom.game.questionCard?.classList.remove('dragging');
            const deltaX = e.changedTouches[0].clientX - startX;
            if (Math.abs(deltaX) > 100) {
                this._handleAnswer(deltaX > 0 ? 'right' : 'left');
            } else {
                card.style.transform = '';
                this.ui.setTargetHighlight(null);
            }
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
        const question = this.state.getCurrentQuestion();
        if (!question) return;

        this.ui.pulseScreen(dir);

        const userAnswer = (dir === 'left') ? 'No' : 'Yes';
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
            category: question.category,
            cancerType: question.cancerType
        });

        if (this.selectedAssessment === 'generic' && question.cancerType) {
            console.log(`Answer for ${question.cancerType}: ${userAnswer} (${riskContribution}%)`);
        }

        this.ui.showFeedback(!isRisk);

        if (riskContribution > 0) {
            this.state.addRiskScore(riskContribution);
            this.state.addCategoryRisk(question.category, riskContribution);
            this.ui.updateGlow(true);
        }

        this.mascot.startAnimation(isRisk ? 'Shocked' : 'Good');

        const hasMoreQuestions = this.state.nextQuestion();

        this.ui.animateCardSwipe(dir, () => {
            // Show explanation card after swipe; keep it visible for 3s then advance
            if (question.explanation) {
                this.ui.showExplanation(question.explanation);
                setTimeout(() => {
                    this.ui.hideExplanation();
                    if (hasMoreQuestions) {
                        this._showNextQuestion();
                    } else {
                        this._showResults();
                    }
                }, 3000);
            } else {
                if (hasMoreQuestions) {
                    this._showNextQuestion();
                } else {
                    this._showResults();
                }
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
        this.mascot.hide();

        // Pass answers to UI controller for comprehensive score recalculation
        const riskResult = this.ui.showResults(this.state, this.answers);

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

        // Use recommendations from recalculated result
        if (riskResult && riskResult.recommendations) {
            this.ui.renderRecommendations(riskResult.recommendations);
        } else {
            // Fallback to old method if recalculation fails
            const recommendations = getRecommendations(this.state);
            this.ui.renderRecommendations(recommendations);
        }
    }

    _resetApp() {
        this.state.reset();
        this.mascot.hide();
        this.selectedAssessment = null;
        this.selectedGender = null;
        localStorage.removeItem('selectedGender');
        this.dom.switchScreen('landing');
        this.dom.onboarding.form?.reset();
        this.dom.onboarding.ethnicityOthersContainer?.classList.add('hidden');
        if (this.dom.onboarding.ageSlider) this.dom.onboarding.ageSlider.value = 18;
    }
}
document.addEventListener('DOMContentLoaded', () => new RiskAssessmentApp());