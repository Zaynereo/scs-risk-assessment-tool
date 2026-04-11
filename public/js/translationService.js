/**
 * Translation Service — singleton that fetches, caches, and resolves UI translations.
 */

let cached = null;

export async function fetchTranslations() {
    try {
        const res = await fetch('/api/translations');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        cached = await res.json();
    } catch (err) {
        console.warn('Failed to fetch translations:', err);
        cached = {};
    }
    return cached;
}

/**
 * Resolve a translated string.
 * Fallback contract: requested lang -> en -> '' (with console.warn).
 * Never leaks the raw key name to the UI.
 * Supports {placeholder} replacements.
 */
export function t(group, key, lang, replacements = {}) {
    const val = cached?.[group]?.[key]?.[lang] || cached?.[group]?.[key]?.en;
    if (!val) {
        console.warn(`[i18n] Missing translation: ${group}.${key} (lang=${lang})`);
        return '';
    }
    return Object.entries(replacements).reduce(
        (s, [k, v]) => s.replaceAll(`{${k}}`, v), val
    );
}

export function getTranslations() {
    return cached;
}

export function clearCache() {
    cached = null;
}
