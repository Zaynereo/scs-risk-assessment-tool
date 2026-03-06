/**
 * Assessment Configuration Module
 * Fetches cancer type configurations from the API
 * Supports multi-language display
 */

let cachedAssessments = null;
let currentLanguage = 'en';

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'zh', 'ms', 'ta'];

// Language display names
export const LANGUAGE_NAMES = {
    'en': 'English',
    'zh': '中文',
    'ms': 'Bahasa Melayu',
    'ta': 'தமிழ்'
};

/**
 * Get the current language
 */
export function getCurrentLanguage() {
    // Check localStorage first
    const stored = localStorage.getItem('quizLanguage');
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
        currentLanguage = stored;
        return stored;
    }
    return currentLanguage;
}

/**
 * Set the current language
 */
export function setCurrentLanguage(lang) {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
        currentLanguage = lang;
        localStorage.setItem('quizLanguage', lang);
        // Clear cache to force reload with new language
        cachedAssessments = null;
        return true;
    }
    return false;
}

/**
 * Load all available assessments from the API
 * @param {string} lang - Language code (en, zh, ms, ta)
 */
export async function loadAssessments(lang = null) {
    const language = lang || getCurrentLanguage();
    
    // Use cache if same language
    if (cachedAssessments && currentLanguage === language) {
        return cachedAssessments;
    }

    try {
        const API_BASE_URL = window.location.origin.includes('localhost') 
            ? 'http://localhost:3000/api' 
            : '/api';
        
        const response = await fetch(`${API_BASE_URL}/questions/cancer-types?lang=${language}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            cachedAssessments = result.data.map(ct => ({
                id: ct.id,
                name: ct.name,
                icon: ct.icon,
                description: ct.description,
                title: `${ct.name} Risk Assessment`,
                subtitle: 'Answer a few questions to get your personalized risk assessment and prevention plan.',
                familyLabel: ct.familyLabel,
                familyWeight: ct.familyWeight || 10,
                genderFilter: ct.genderFilter || 'all',
                ageRiskThreshold: ct.ageRiskThreshold || 0,
                ageRiskWeight: ct.ageRiskWeight || 0,
                ethnicityRisk: ct.ethnicityRisk || { chinese: 0, malay: 0, indian: 0, caucasian: 0, others: 0 }
            }));
            
            currentLanguage = language;
            return cachedAssessments;
        }
        
        throw new Error('Failed to load cancer types');
    } catch (error) {
        console.error('Error loading assessments:', error);
        // Return fallback if API fails
        return getFallbackAssessments();
    }
}

/**
 * Get assessment by ID
 */
export async function getAssessmentById(id, lang = null) {
    const assessments = await loadAssessments(lang);
    return assessments.find(assessment => assessment.id === id);
}

/**
 * Clear cache (useful for language switching or reloading)
 */
export function clearCache() {
    cachedAssessments = null;
}

/**
 * Fallback assessments if API is unavailable
 */
function getFallbackAssessments() {
    return [
        {
            id: 'generic',
            name: 'Generic Health Assessment',
            icon: 'assets/cancer-cards/generic_cancer_image.png',
            description: 'Answer a few quick questions to learn simple ways to look after your health!',
            title: 'Generic Health Assessment Risk Assessment',
            subtitle: 'Answer a few questions to get your personalized risk assessment and prevention plan.',
            familyLabel: 'Has a close relative (parent sibling child) had any type of cancer?',
            familyWeight: 8,
            genderFilter: 'all',
            ageRiskThreshold: 40,
            ageRiskWeight: 5,
            ethnicityRisk: { chinese: 0, malay: 0, indian: 0, caucasian: 0, others: 2 }
        },
        {
            id: 'colorectal',
            name: 'Colorectal Health',
            icon: 'assets/cancer-cards/colorectal_cancer_image.png',
            description: 'Take a quick quiz to learn simple steps you can take for your colorectal health!',
            title: 'Colorectal Health Risk Assessment',
            subtitle: 'Answer a few questions to get your personalized risk assessment and prevention plan.',
            familyLabel: 'Has a close relative (parent sibling child) had colorectal cancer?',
            familyWeight: 10,
            genderFilter: 'all',
            ageRiskThreshold: 50,
            ageRiskWeight: 5,
            ethnicityRisk: { chinese: 0, malay: 0, indian: 0, caucasian: 0, others: 0 }
        },
        {
            id: 'breast',
            name: 'Breast Health',
            icon: 'assets/cancer-cards/breast_cancer_image.png',
            description: 'A short quiz to help you learn easy ways to care for your breast health!',
            title: 'Breast Health Risk Assessment',
            subtitle: 'Answer a few questions to get your personalized risk assessment and prevention plan.',
            familyLabel: 'Has a close relative (parent sibling child) had breast cancer?',
            familyWeight: 15,
            genderFilter: 'all',
            ageRiskThreshold: 50,
            ageRiskWeight: 8,
            ethnicityRisk: { chinese: 0, malay: 0, indian: 0, caucasian: 2, others: 0 }
        },
        {
            id: 'cervical',
            name: 'Cervical Health',
            icon: 'assets/cancer-cards/cervical_cancer_image.png',
            description: 'A quick check-in to help you stay on top of your cervical health!',
            title: 'Cervical Health Risk Assessment',
            subtitle: 'Answer a few questions to get your personalized risk assessment and prevention plan.',
            familyLabel: 'Has a close relative (parent sibling child) had cervical cancer?',
            familyWeight: 10,
            genderFilter: 'female',
            ageRiskThreshold: 0,
            ageRiskWeight: 0,
            ethnicityRisk: { chinese: 0, malay: 0, indian: 0, caucasian: 0, others: 0 }
        },
        {
            id: 'lung',
            name: 'Lung Health',
            icon: 'assets/cancer-cards/lung_cancer_image.png',
            description: 'A short quiz with simple tips to help you care for your lung health!',
            title: 'Lung Health Risk Assessment',
            subtitle: 'Answer a few questions to get your personalized risk assessment and prevention plan.',
            familyLabel: 'Has a close relative (parent sibling child) had lung cancer?',
            familyWeight: 12,
            genderFilter: 'all',
            ageRiskThreshold: 55,
            ageRiskWeight: 7,
            ethnicityRisk: { chinese: 3, malay: 1, indian: 0, caucasian: 0, others: 0 }
        },
        {
            id: 'liver',
            name: 'Liver Health',
            icon: 'assets/cancer-cards/liver_cancer_image.png',
            description: 'Take a quick quiz to pick up handy tips for your liver health!',
            title: 'Liver Health Risk Assessment',
            subtitle: 'Answer a few questions to get your personalized risk assessment and prevention plan.',
            familyLabel: 'Has a close relative (parent sibling child) had liver cancer?',
            familyWeight: 10,
            genderFilter: 'all',
            ageRiskThreshold: 50,
            ageRiskWeight: 6,
            ethnicityRisk: { chinese: 4, malay: 2, indian: 0, caucasian: 0, others: 0 }
        },
        {
            id: 'prostate',
            name: 'Prostate Health',
            icon: 'assets/cancer-cards/prostate_cancer_image.png',
            description: 'A short quiz to help you learn easy ways to look after your prostate health!',
            title: 'Prostate Health Risk Assessment',
            subtitle: 'Answer a few questions to get your personalized risk assessment and prevention plan.',
            familyLabel: '',
            familyWeight: 10,
            genderFilter: 'male',
            ageRiskThreshold: 0,
            ageRiskWeight: 0,
            ethnicityRisk: { chinese: 0, malay: 0, indian: 0, caucasian: 0, others: 0 }
        }
    ];
}

/**
 * Filter assessments by gender
 * @param {Array} assessments - Array of assessment objects
 * @param {string} gender - User's gender ('Male' or 'Female')
 * @returns {Array} Filtered assessments
 */
export function filterAssessmentsByGender(assessments, gender) {
    if (!gender) return assessments;
    
    const normalizedGender = gender.toLowerCase();
    return assessments.filter(assessment => {
        const filter = (assessment.genderFilter || 'all').toLowerCase();
        if (filter === 'all') return true;
        return filter === normalizedGender;
    });
}
