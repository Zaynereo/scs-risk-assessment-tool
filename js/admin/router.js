const viewLoaders = {};

export function registerView(tabName, loader) {
    viewLoaders[tabName] = loader;
}

export function switchToTab(tabName) {
    document.querySelectorAll('.sidebar-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const btn = document.querySelector(`.sidebar-item[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
    const content = document.getElementById(`${tabName}-tab`);
    if (content) content.classList.add('active');

    if (viewLoaders[tabName]) viewLoaders[tabName]();
}

export function initRouter() {
    document.querySelectorAll('.sidebar-item').forEach(tab => {
        tab.addEventListener('click', () => {
            switchToTab(tab.dataset.tab);
        });
    });
}
