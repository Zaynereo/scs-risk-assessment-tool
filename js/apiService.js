/**
 * API Service - Handles all backend API communication
 */

const API_BASE_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:3000/api' 
    : '/api';

export class ApiService {
    /**
     * Fetch all cancer types from backend
     */
    static async getCancerTypes() {
        try {
            const response = await fetch(`${API_BASE_URL}/questions/cancer-types`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch cancer types');
            }
            return result.data;
        } catch (error) {
            console.error('Error fetching cancer types:', error);
            throw error;
        }
    }

    /**
     * Fetch all questions from backend (legacy, cancerType-based)
     */
    static async getQuestions(userAge = null, cancerType = null) {
        try {
            const params = new URLSearchParams();
            if (userAge) params.append('age', userAge);
            if (cancerType) params.append('cancerType', cancerType);
            
            const url = userAge 
                ? `${API_BASE_URL}/questions?age=${userAge}`
                : `${API_BASE_URL}/questions`;
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch questions');
            }
            
            return result.data;
        } catch (error) {
            console.error('Error fetching questions:', error);
            // Fallback to local questions if API fails
            throw error;
        }
    }

    /**
     * Fetch questions for a specific assessment using the Assignments model
     * @param {string} assessmentId - Assessment identifier (e.g. colorectal, breast, generic)
     * @param {number|null} userAge - Optional user age for minAge filtering
     * @param {string} lang - Language code (en, zh, ms, ta)
     */
    static async getQuestionsByAssessment(assessmentId, userAge = null, lang = 'en') {
        if (!assessmentId) {
            throw new Error('assessmentId is required');
        }

        try {
            const params = new URLSearchParams();
            params.append('assessmentId', assessmentId);
            if (userAge !== null && userAge !== undefined) {
                params.append('age', userAge);
            }
            if (lang) {
                params.append('lang', lang);
            }

            const response = await fetch(`${API_BASE_URL}/questions/by-assessment?${params.toString()}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch questions by assessment');
            }

            return result.data;
        } catch (error) {
            console.error('Error fetching questions by assessment:', error);
            throw error;
        }
    }

    /**
     * Submit assessment to backend
     */
    static async submitAssessment(userData, answers) {
        try {
            const response = await fetch(`${API_BASE_URL}/assessments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userData,
                    answers
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to submit assessment');
            }
            
            return result.data;
        } catch (error) {
            console.error('Error submitting assessment:', error);
            throw error;
        }
    }

    /**
     * Get assessment statistics (for admin/analytics)
     */
    static async getStatistics() {
        try {
            const response = await fetch(`${API_BASE_URL}/assessments/stats`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch statistics');
            }
            
            return result.data;
        } catch (error) {
            console.error('Error fetching statistics:', error);
            throw error;
        }
    }

    /**
     * Health check
     */
    static async healthCheck() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            return await response.json();
        } catch (error) {
            console.error('Backend not available:', error);
            return { status: 'error', message: 'Backend unavailable' };
        }
    }
}

