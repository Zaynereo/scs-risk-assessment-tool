/**
 * Question Loader (Frontend)
 * Loads questions using ApiService with multi-language support
 * Provides client-side caching and filtering
 */

import { ApiService } from './apiService.js';
import { getCurrentLanguage } from './assessmentConfig.js';

export class QuestionLoader {
    static cache = {};
    static allQuestionsCache = null;
    static lastLanguage = null;

    /**
     * Get all unique cancer types from the backend
     * @param {string} lang - Language code (en, zh, ms, ta)
     */
    static async getAllCancerTypes(lang = null) {
        const language = lang || getCurrentLanguage();
        
        try {
            const API_BASE_URL = window.location.origin.includes('localhost') 
                ? 'http://localhost:3000/api' 
                : '/api';
            
            const response = await fetch(`${API_BASE_URL}/questions/cancer-types?lang=${language}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                return result.data.map(ct => ct.id);
            }
            
            throw new Error('Failed to load cancer types');
        } catch (error) {
            console.error('Error getting cancer types:', error);
            // Fallback: extract from questions
            const questions = await this.loadAllQuestions(language);
            const cancerTypes = new Set();
            questions.forEach(q => {
                if (q.cancerType && q.cancerType.trim()) {
                    cancerTypes.add(q.cancerType.trim().toLowerCase());
                }
            });
            return Array.from(cancerTypes).sort();
        }
    }

    /**
     * Load all questions from the backend
     * @param {string} lang - Language code (en, zh, ms, ta)
     */
    static async loadAllQuestions(lang = null) {
        const language = lang || getCurrentLanguage();
        
        // Clear cache if language changed
        if (this.lastLanguage !== language) {
            this.clearCache();
            this.lastLanguage = language;
        }

        if (this.allQuestionsCache) {
            return this.allQuestionsCache;
        }

        try {
            const API_BASE_URL = window.location.origin.includes('localhost') 
                ? 'http://localhost:3000/api' 
                : '/api';
            
            const response = await fetch(`${API_BASE_URL}/questions?lang=${language}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                this.allQuestionsCache = result.data;
                return this.allQuestionsCache;
            }
            
            throw new Error('Failed to load questions');
        } catch (error) {
            console.error('Error loading questions from API:', error);
            throw error;
        }
    }

    /**
     * Load questions for a specific cancer type
     * Filters by cancer type and optionally by user age
     * @param {string} cancerType - Cancer type to filter by
     * @param {number} userAge - User's age for filtering age-restricted questions
     * @param {string} lang - Language code (en, zh, ms, ta)
     */
    static async loadQuestions(cancerType, userAge = null, lang = null) {
        const language = lang || getCurrentLanguage();
        
        // Create cache key including language
        const cacheKey = `${cancerType}_${userAge || 'all'}_${language}`;
        
        // Check cache first
        if (this.cache[cacheKey]) {
            return this.cache[cacheKey];
        }

        try {
            // Prefer the new assessment-based API which uses the Assignments model.
            // Here, `cancerType` is effectively the assessmentId (e.g. colorectal, breast, generic).
            const rawQuestions = await ApiService.getQuestionsByAssessment(
                cancerType,
                userAge,
                language
            );
            const questions = this.formatQuestions(rawQuestions);
            this.cache[cacheKey] = questions;
            return questions;
        } catch (error) {
            console.error('Error loading questions via by-assessment API, falling back to legacy /questions endpoint:', error);

            // Fallback: legacy cancerType-based endpoint, to reduce risk during migration.
            try {
                const API_BASE_URL = window.location.origin.includes('localhost') 
                    ? 'http://localhost:3000/api' 
                    : '/api';
                
                const params = new URLSearchParams();
                // For the Generic assessment, load all questions across cancer types.
                // Each question's own `cancerType` is used later to build the breakdown.
                if (cancerType && cancerType !== 'generic') {
                    params.append('cancerType', cancerType);
                }
                params.append('lang', language);
                if (userAge) {
                    params.append('age', userAge);
                }
                
                const response = await fetch(`${API_BASE_URL}/questions?${params.toString()}`);
                const result = await response.json();
                
                if (result.success && result.data) {
                    const questions = this.formatQuestions(result.data);
                    this.cache[cacheKey] = questions;
                    return questions;
                }
                
                throw new Error('Failed to load questions from legacy endpoint');
            } catch (fallbackError) {
                console.error('Error loading questions from legacy /questions endpoint:', fallbackError);
                throw fallbackError;
            }
        }
    }

    /**
     * Format questions to ensure consistent structure
     * The API now returns localized prompt and explanation fields
     */
    static formatQuestions(questions) {
        return questions.map(q => ({
            id: q.id,
            prompt: q.prompt,        // Already localized from API
            question: q.prompt,      // Alias for backward compatibility
            weight: q.weight ? parseFloat(q.weight) : null,
            yesValue: q.yesValue ? parseFloat(q.yesValue) : 100,
            noValue: q.noValue ? parseFloat(q.noValue) : 0,
            category: q.category,
            explanation: q.explanation,  // Already localized from API
            minAge: q.minAge ? parseInt(q.minAge) : null,
            // Prefer targetCancerType when present (Assignments model),
            // fall back to cancerType for backward compatibility.
            cancerType: q.targetCancerType || q.cancerType
        }));
    }

    /**
     * Clear all caches (useful for language switching or refreshing data)
     */
    static clearCache() {
        this.cache = {};
        this.allQuestionsCache = null;
    }

    /**
     * Reload data from server (bypasses cache)
     * @param {string} lang - Language code
     */
    static async reload(lang = null) {
        this.clearCache();
        return await this.loadAllQuestions(lang);
    }
}
