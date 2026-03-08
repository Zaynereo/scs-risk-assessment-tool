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
                title: ct.name,
                subtitle: '',
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
        console.error('Error loading assessments from API:', error);
        // Try snapshot fallback
        try {
            const snapshotResponse = await fetch('/api/assessments-snapshot');
            const snapshotResult = await snapshotResponse.json();
            if (snapshotResult.success && snapshotResult.data) {
                cachedAssessments = snapshotResult.data.map(ct => ({
                    id: ct.id,
                    name: ct.name,
                    icon: ct.icon,
                    description: ct.description,
                    title: ct.name,
                    subtitle: '',
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
        } catch (snapshotError) {
            console.error('Snapshot fallback also failed:', snapshotError);
        }
        return [];
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
