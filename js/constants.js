// Application Constants
export const RISK_WEIGHTS = {
    HIGH: 15,
    MEDIUM: 8,
    LOW: 3
};

export const RISK_LEVELS = {
    // UPDATED: Colors match css/variables.css
    LOW: { threshold: 0, max: 33, label: 'LOW RISK', color: '#f1c40f' },    // Yellow
    MEDIUM: { threshold: 33, max: 66, label: 'MEDIUM RISK', color: '#f39c12' }, // Orange
    HIGH: { threshold: 66, max: 100, label: 'HIGH RISK', color: '#e74c3c' }  // Red
};

export const RISK_CATEGORIES = {
    DIET: 'Diet & Nutrition',
    LIFESTYLE: 'Lifestyle',
    MEDICAL: 'Medical History',
    FAMILY: 'Family & Genetics'
};

export const AGE_RANGES = {
    MIN: 18,
    MAX: 100,
    HIGH_RISK_THRESHOLD: 45
};

export const ANIMATION_DURATIONS = {
    SWIPE: 500,        // ms
    FLASH: 800,        // ms
    MASCOT_FPS: 25     // frames per second
};

export const MASCOT_CONFIG = {
    MALE: {
        folder: 'flatboy',
        frames: {
            IDLE: 15,
            JUMP: 15
        }
    },
    FEMALE: {
        folder: 'cutegirlfiles',
        frames: {
            IDLE: 15,
            JUMP: 15
        }
    }
};