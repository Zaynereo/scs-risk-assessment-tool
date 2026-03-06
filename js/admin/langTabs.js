const VALID_LANGS = ['en', 'zh', 'ms', 'ta'];
let activeLang = 'en';
const listeners = [];

export function getActiveLang() {
    return activeLang;
}

export function onLangChange(callback) {
    listeners.push(callback);
}

function setActiveLang(lang) {
    if (!VALID_LANGS.includes(lang)) return;
    activeLang = lang;
    listeners.forEach(cb => cb(lang));
}

export function initLangTabs(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    // Set data-active-lang on all grids inside the container
    container.querySelectorAll('.lang-fields-grid').forEach(grid => {
        grid.setAttribute('data-active-lang', activeLang);
    });

    container.querySelectorAll('.lang-tabs').forEach(bar => {
        // Remove old listeners by replacing buttons
        bar.querySelectorAll('.lang-tab-btn').forEach(btn => {
            const fresh = btn.cloneNode(true);
            btn.replaceWith(fresh);
        });

        bar.querySelectorAll('.lang-tab-btn').forEach(btn => {
            // Set initial active state
            btn.classList.toggle('active', btn.dataset.lang === activeLang);

            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;

                // Update all tab bars within the container
                container.querySelectorAll('.lang-tab-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.lang === lang);
                });

                // Update all grids within the container
                container.querySelectorAll('.lang-fields-grid').forEach(grid => {
                    grid.setAttribute('data-active-lang', lang);
                });

                setActiveLang(lang);
            });
        });
    });
}

export function clearLangChangeListeners() {
    listeners.length = 0;
}
