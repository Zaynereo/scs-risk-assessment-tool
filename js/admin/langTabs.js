const VALID_LANGS = ['en', 'zh', 'ms', 'ta'];
let activeLang = 'en';
const listeners = [];
const initializedContainers = new WeakSet();

export function getActiveLang() {
    return activeLang;
}

export function onLangChange(callback) {
    listeners.push(callback);
}

function setActiveLang(lang) {
    if (!VALID_LANGS.includes(lang)) return;
    if (activeLang === lang) return;
    activeLang = lang;
    listeners.forEach(cb => cb(lang));
}

export function initLangTabs(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    // Set initial state
    container.querySelectorAll('.lang-fields-grid').forEach(grid => {
        grid.setAttribute('data-active-lang', activeLang);
    });
    container.querySelectorAll('.lang-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === activeLang);
    });

    // Event delegation: one click listener per container element.
    // WeakSet tracks which containers already have a listener attached,
    // so re-calling initLangTabs (e.g. on modal reopen) won't add duplicates.
    if (initializedContainers.has(container)) return;
    initializedContainers.add(container);

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.lang-tab-btn');
        if (!btn || !container.contains(btn)) return;
        const lang = btn.dataset.lang;
        if (!VALID_LANGS.includes(lang)) return;

        container.querySelectorAll('.lang-tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.lang === lang);
        });
        container.querySelectorAll('.lang-fields-grid').forEach(grid => {
            grid.setAttribute('data-active-lang', lang);
        });
        setActiveLang(lang);
    });
}

export function clearLangChangeListeners() {
    listeners.length = 0;
}
