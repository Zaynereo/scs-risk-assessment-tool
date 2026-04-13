/**
 * Load and apply theme (backgrounds, mascot URLs) from API.
 * Used by the user-facing app to apply admin-configured appearance.
 */

const THEME_API = '/api/theme';
const SCREEN_IDS = {
    landing: 'screen-landing',
    cancerSelection: 'screen-cancer-selection',
    onboarding: 'screen-onboarding',
    game: 'screen-game',
    results: 'screen-results'
};

let cachedTheme = null;

const str = (v) => (typeof v === 'string' ? v : '');
const num = (v, def) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : def; };
const SCREEN_KEYS = ['landing', 'cancerSelection', 'onboarding', 'game', 'results'];

function normalizeScreens(screens) {
    const out = {};
    SCREEN_KEYS.forEach(key => {
        const s = screens && screens[key];
        out[key] = {
            backgroundImage: str(s && s.backgroundImage),
            backgroundMusic: str(s && s.backgroundMusic),
            backgroundOpacity: num(s && s.backgroundOpacity, 1)
        };
    });
    return out;
}

/**
 * @returns {Promise<{ screens: Object, mascotMale: string, mascotFemale: string, mascotMaleGood: string, mascotFemaleGood: string, mascotMaleShocked: string, mascotFemaleShocked: string, partnerLogo: string }>}
 */
export async function loadTheme() {
    if (cachedTheme) return cachedTheme;
    try {
        const res = await fetch(THEME_API);
        const data = await res.json();
        cachedTheme = {
            screens: normalizeScreens(data.screens),
            mascotMale: str(data.mascotMale),
            mascotFemale: str(data.mascotFemale),
            mascotMaleGood: str(data.mascotMaleGood),
            mascotFemaleGood: str(data.mascotFemaleGood),
            mascotMaleShocked: str(data.mascotMaleShocked),
            mascotFemaleShocked: str(data.mascotFemaleShocked),
            appLogo: str(data.appLogo),
            gameLogo: str(data.gameLogo),
            binIcon: str(data.binIcon),
            pinboardIcon: str(data.pinboardIcon),
            partnerLogo: str(data.partnerLogo) // Added partnerLogo
        };
        return cachedTheme;
    } catch (e) {
        console.warn('Theme load failed:', e);
        cachedTheme = { screens: normalizeScreens({}), mascotMale: '', mascotFemale: '', mascotMaleGood: '', mascotFemaleGood: '', mascotMaleShocked: '', mascotFemaleShocked: '', appLogo: '', gameLogo: '', binIcon: '', pinboardIcon: '', partnerLogo: '' };
        return cachedTheme;
    }
}

/**
 * Apply background images, opacity, and optional background music to screen elements.
 * @param {{ screens: Object }} theme
 */
export function applyTheme(theme) {
    if (!theme || !theme.screens) return;
    Object.entries(SCREEN_IDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        const screen = theme.screens[key];
        if (!el || !screen) return;
        const opacity = typeof screen.backgroundOpacity === 'number' ? Math.max(0, Math.min(1, screen.backgroundOpacity)) : 1;
        const overlay = 1 - opacity;
        if (screen.backgroundImage && screen.backgroundImage.trim()) {
            const url = screen.backgroundImage.replace(/'/g, "\\'");
            if (overlay > 0) {
                el.style.backgroundImage = `linear-gradient(rgba(255,255,255,${overlay}), rgba(255,255,255,${overlay})), url('${url}')`;
            } else {
                el.style.backgroundImage = `url('${url}')`;
            }
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
        }
        el.dataset.backgroundMusic = (screen.backgroundMusic && screen.backgroundMusic.trim()) ? screen.backgroundMusic : '';
    });

    // Apply logos
    if (theme.appLogo && theme.appLogo.trim()) {
        const appLogoEl = document.getElementById('app-logo');
        if (appLogoEl) appLogoEl.src = theme.appLogo;
    }
    if (theme.gameLogo && theme.gameLogo.trim()) {
        const gameLogoEl = document.getElementById('game-logo');
        if (gameLogoEl) gameLogoEl.src = theme.gameLogo;
    }
    if (theme.binIcon && theme.binIcon.trim()) {
        const binEl = document.getElementById('bin-icon');
        if (binEl) binEl.src = theme.binIcon;
    }
    if (theme.pinboardIcon && theme.pinboardIcon.trim()) {
        const pinEl = document.getElementById('pinboard-icon');
        if (pinEl) pinEl.src = theme.pinboardIcon;
    }
    
    // Apply Partner Logo
    const partnerLogoEl = document.getElementById('partner-logo');
    if (partnerLogoEl) {
        if (theme.partnerLogo && theme.partnerLogo.trim()) {
            partnerLogoEl.src = theme.partnerLogo;
            partnerLogoEl.style.display = 'inline-block';
        } else {
            partnerLogoEl.style.display = 'none';
        }
    }
}

/**
 * Get current theme (from cache or empty). Use after loadTheme().
 */
export function getTheme() {
    return cachedTheme || { screens: {}, mascotMale: '', mascotFemale: '', mascotMaleGood: '', mascotFemaleGood: '', mascotMaleShocked: '', mascotFemaleShocked: '', appLogo: '', gameLogo: '', binIcon: '', pinboardIcon: '', partnerLogo: '' };
}