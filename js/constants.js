// Application Constants

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
