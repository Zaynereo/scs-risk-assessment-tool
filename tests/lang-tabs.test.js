/**
 * Unit tests for admin language tabs utility (js/admin/langTabs.js)
 * Uses a minimal DOM stub — no jsdom dependency needed.
 * Run: NODE_ENV=test node --test tests/lang-tabs.test.js
 */

import test from 'node:test';
import assert from 'node:assert';

// ---- Minimal DOM stub ----

class FakeClassList {
    constructor() { this._set = new Set(); }
    add(c) { this._set.add(c); }
    remove(c) { this._set.delete(c); }
    contains(c) { return this._set.has(c); }
    toggle(c, force) {
        if (force) this._set.add(c);
        else this._set.delete(c);
    }
}

class FakeElement {
    constructor(tag, attrs = {}) {
        this.tagName = (tag || 'div').toUpperCase();
        this._attrs = { ...attrs };
        this.dataset = {};
        for (const [k, v] of Object.entries(attrs)) {
            if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
        }
        this.classList = new FakeClassList();
        if (attrs['class']) attrs['class'].split(/\s+/).forEach(c => { if (c) this.classList.add(c); });
        this._listeners = {};
        this.children = [];
        this._parent = null;
    }
    getAttribute(k) { return this._attrs[k] ?? null; }
    setAttribute(k, v) {
        this._attrs[k] = v;
        if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
    }
    addEventListener(ev, fn) {
        if (!this._listeners[ev]) this._listeners[ev] = [];
        this._listeners[ev].push(fn);
    }
    contains(el) {
        let node = el;
        while (node) {
            if (node === this) return true;
            node = node._parent;
        }
        return false;
    }
    closest(sel) {
        let node = this;
        while (node) {
            if (matches(node, sel)) return node;
            node = node._parent;
        }
        return null;
    }
    click() {
        // Simulate event bubbling: dispatch click on this element, then bubble up
        const event = { target: this };
        let node = this;
        while (node) {
            (node._listeners['click'] || []).forEach(fn => fn(event));
            node = node._parent;
        }
    }
    querySelectorAll(sel) { return queryAll(this, sel); }
    querySelector(sel) { return queryAll(this, sel)[0] || null; }
}

function matches(el, sel) {
    for (const part of sel.split(/(?=[.#\[])/)) {
        if (part.startsWith('.')) { if (!el.classList.contains(part.slice(1))) return false; }
        else if (part.startsWith('#')) { if (el._attrs.id !== part.slice(1)) return false; }
        else if (part.startsWith('[')) {
            const m = part.match(/\[([^=\]]+)(?:="([^"]*)")?\]/);
            if (!m) return false;
            if (m[2] !== undefined) { if (el.getAttribute(m[1]) !== m[2]) return false; }
            else { if (el.getAttribute(m[1]) === null) return false; }
        }
    }
    return true;
}

function queryAll(root, sel) {
    const results = [];
    (function walk(node) {
        for (const c of node.children) { if (matches(c, sel)) results.push(c); walk(c); }
    })(root);
    return results;
}

function buildDOM(spec) {
    const el = new FakeElement(spec.tag || 'div', spec.attrs || {});
    (spec.children || []).forEach(child => {
        const ch = typeof child === 'object' && child instanceof FakeElement ? child : buildDOM(child);
        ch._parent = el;
        el.children.push(ch);
    });
    return el;
}

function langTabsBar(langs = ['en', 'zh', 'ms', 'ta']) {
    return [
        { tag: 'div', attrs: { class: 'lang-tabs' }, children: langs.map((l, i) => ({ tag: 'button', attrs: { class: i === 0 ? 'lang-tab-btn active' : 'lang-tab-btn', 'data-lang': l } })) },
        { tag: 'div', attrs: { class: 'lang-fields-grid' }, children: langs.map(l => ({ tag: 'div', attrs: { class: 'lang-field', 'data-lang': l } })) }
    ];
}

// Wrap in a body so querySelector can find #modal as a descendant
function makeDoc(modalChildren, modalId = 'modal') {
    const root = buildDOM({
        tag: 'body', children: [
            { tag: 'div', attrs: { id: modalId }, children: modalChildren }
        ]
    });
    global.document = {
        querySelector(s) { return root.querySelector(s); },
        querySelectorAll(s) { return root.querySelectorAll(s); }
    };
    return root;
}

// ---- Tests ----

let importCtr = 0;
async function freshImport() { return import(`../public/js/admin/langTabs.js?v=${++importCtr}`); }

test('langTabs: getActiveLang returns "en" by default', async () => {
    makeDoc([]);
    const { getActiveLang } = await freshImport();
    assert.strictEqual(getActiveLang(), 'en');
});

test('langTabs: initLangTabs sets data-active-lang on grids', async () => {
    const root = makeDoc(langTabsBar());
    const { initLangTabs } = await freshImport();
    initLangTabs('#modal');

    const grid = root.querySelector('.lang-fields-grid');
    assert.strictEqual(grid.getAttribute('data-active-lang'), 'en');
});

test('langTabs: clicking a tab switches active lang and updates grids', async () => {
    const root = makeDoc(langTabsBar());
    const { initLangTabs, getActiveLang } = await freshImport();
    initLangTabs('#modal');

    const zhBtn = root.querySelector('.lang-tab-btn[data-lang="zh"]');
    zhBtn.click();

    assert.strictEqual(getActiveLang(), 'zh');
    assert.strictEqual(root.querySelector('.lang-fields-grid').getAttribute('data-active-lang'), 'zh');
    assert.ok(zhBtn.classList.contains('active'));
    assert.ok(!root.querySelector('.lang-tab-btn[data-lang="en"]').classList.contains('active'));
});

test('langTabs: onLangChange fires callback on tab switch', async () => {
    const root = makeDoc(langTabsBar());
    const { initLangTabs, onLangChange } = await freshImport();
    initLangTabs('#modal');

    const calls = [];
    onLangChange(lang => calls.push(lang));
    root.querySelector('.lang-tab-btn[data-lang="ms"]').click();

    assert.deepStrictEqual(calls, ['ms']);
});

test('langTabs: clearLangChangeListeners removes all callbacks', async () => {
    const root = makeDoc(langTabsBar());
    const { initLangTabs, onLangChange, clearLangChangeListeners } = await freshImport();
    initLangTabs('#modal');

    const calls = [];
    onLangChange(lang => calls.push(lang));
    clearLangChangeListeners();

    root.querySelector('.lang-tab-btn[data-lang="ta"]').click();
    assert.deepStrictEqual(calls, []);
});

test('langTabs: invalid lang code is rejected', async () => {
    const root = makeDoc(langTabsBar(['en', 'xx']));
    const { initLangTabs, getActiveLang } = await freshImport();
    initLangTabs('#modal');

    root.querySelector('.lang-tab-btn[data-lang="xx"]').click();
    assert.strictEqual(getActiveLang(), 'en');
});

test('langTabs: multiple tab bars in same container sync together', async () => {
    const root = makeDoc([...langTabsBar(['en', 'zh']), ...langTabsBar(['en', 'zh'])]);
    const { initLangTabs } = await freshImport();
    initLangTabs('#modal');

    // Click ZH in the first tab bar
    const tabBars = root.querySelectorAll('.lang-tabs');
    tabBars[0].querySelector('.lang-tab-btn[data-lang="zh"]').click();

    const grids = root.querySelectorAll('.lang-fields-grid');
    assert.strictEqual(grids[0].getAttribute('data-active-lang'), 'zh');
    assert.strictEqual(grids[1].getAttribute('data-active-lang'), 'zh');

    const secondZh = tabBars[1].querySelector('.lang-tab-btn[data-lang="zh"]');
    assert.ok(secondZh.classList.contains('active'));
});

test('langTabs: initLangTabs with nonexistent selector does not throw', async () => {
    makeDoc([]);
    const { initLangTabs } = await freshImport();
    assert.doesNotThrow(() => initLangTabs('#nonexistent'));
});

test('langTabs: re-init replaces old event listeners (no double fire)', async () => {
    const root = makeDoc(langTabsBar());
    const { initLangTabs, onLangChange } = await freshImport();

    initLangTabs('#modal');
    const calls = [];
    onLangChange(lang => calls.push(lang));

    // Re-init (simulates reopening a modal) — with event delegation, second init is a no-op
    initLangTabs('#modal');

    root.querySelector('.lang-tab-btn[data-lang="zh"]').click();
    // Should fire once, not twice (WeakSet guard prevents duplicate delegation)
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0], 'zh');
});
