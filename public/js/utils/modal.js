/**
 * Accessibility helper for modal dialogs.
 *
 * Side-effect-only. Callers still toggle visibility the way they already do
 * (class swap, CSS display change, etc.). After showing a modal, call
 * openModalA11y(modalEl, options). Before hiding it, call closeModalA11y(modalEl).
 *
 * What this helper does:
 *   1. Stores the trigger element so focus can be returned to it on close.
 *   2. Marks every ancestor-sibling of the modal as `inert` so the rest of the
 *      page cannot be clicked, focused, or read by screen readers while the
 *      modal is open. Pre-existing `inert` state on those siblings is preserved
 *      (we only revert siblings that WE inerted).
 *   3. Focuses the modal root (needs `tabindex="-1"`), then on the next frame
 *      focuses the `autoFocus` selector target if provided, else the first
 *      non-disabled focusable descendant.
 *   4. Installs a Tab / Shift+Tab keydown handler on the modal root that keeps
 *      focus wrapped inside the modal.
 *   5. A single document-level Escape listener (installed once at module load)
 *      calls `onEscape` if the currently open modal is `dismissible`.
 *
 * Assumptions baked into this helper:
 *   - Only one modal is open at a time. A module-level `current` variable is
 *     simpler than a WeakMap and enforces the invariant naturally.
 *   - Modal roots have `tabindex="-1"` so they can receive focus before the
 *     `autoFocus` target is resolved.
 */

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    'audio[controls]',
    'video[controls]',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])'
].join(', ');

// Module-level single-open-modal state. `null` when no modal is open.
let current = null;

function getFocusableElements(container) {
    const candidates = container.querySelectorAll(FOCUSABLE_SELECTOR);
    const result = [];
    for (const el of candidates) {
        if (el.offsetParent === null) continue; // hidden or display:none
        if (el.closest('fieldset:disabled')) continue;
        result.push(el);
    }
    return result;
}

/**
 * Mark every ancestor-sibling of `modalEl` as `inert`. Returns two collections:
 *   - prevInert: the siblings WE inerted (revert on close)
 *   - prevAlreadyInert: siblings that were already inert when we opened
 *     (do NOT revert on close — they belong to someone else)
 */
function inertBackground(modalEl) {
    const prevInert = [];
    const prevAlreadyInert = new Set();
    let node = modalEl;
    while (node && node.parentElement && node !== document.body) {
        for (const sibling of node.parentElement.children) {
            if (sibling === node) continue;
            if (sibling.tagName === 'SCRIPT' || sibling.tagName === 'STYLE') continue;
            if (sibling.inert) {
                prevAlreadyInert.add(sibling);
            } else {
                sibling.inert = true;
                prevInert.push(sibling);
            }
        }
        node = node.parentElement;
    }
    return { prevInert, prevAlreadyInert };
}

function restoreBackground(prevInert) {
    for (const el of prevInert) {
        el.inert = false;
    }
}

function buildKeydownHandler(modalEl) {
    return function handleKeydown(event) {
        if (event.key !== 'Tab') return;
        const focusables = getFocusableElements(modalEl);
        if (focusables.length === 0) {
            event.preventDefault();
            modalEl.focus();
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey) {
            if (active === first || active === modalEl) {
                event.preventDefault();
                last.focus();
            }
        } else {
            if (active === last) {
                event.preventDefault();
                first.focus();
            }
        }
    };
}

/**
 * Open-time a11y wiring. Call AFTER the modal has been made visible.
 *
 * @param {HTMLElement} modalEl
 * @param {Object} [opts]
 * @param {HTMLElement|null} [opts.triggerEl] - Element to return focus to on close.
 *     Defaults to document.activeElement at the time of this call.
 * @param {boolean} [opts.dismissible=true] - Whether Escape should close the modal.
 * @param {Function} [opts.onEscape] - Called when Escape is pressed (if dismissible).
 * @param {string|HTMLElement|null} [opts.autoFocus] - Selector or element to focus
 *     initially. Defaults to the first focusable descendant.
 */
export function openModalA11y(modalEl, opts = {}) {
    if (!modalEl) return;

    // Idempotent: if this same modal is already open, no-op. If a DIFFERENT
    // modal is open, close it first so background inert state doesn't leak.
    if (current) {
        if (current.modalEl === modalEl) return;
        closeModalA11y(current.modalEl);
    }

    const triggerEl = opts.triggerEl !== undefined
        ? opts.triggerEl
        : document.activeElement;
    const dismissible = opts.dismissible !== false;
    const onEscape = opts.onEscape || null;
    const autoFocus = opts.autoFocus || null;

    const { prevInert, prevAlreadyInert } = inertBackground(modalEl);
    const keydownHandler = buildKeydownHandler(modalEl);
    modalEl.addEventListener('keydown', keydownHandler);

    current = {
        modalEl,
        triggerEl,
        prevInert,
        prevAlreadyInert,
        dismissible,
        onEscape,
        keydownHandler
    };

    // Focus the modal root first (requires tabindex="-1" on the modal element),
    // then on the next frame move focus to the autoFocus target or first
    // focusable descendant. The two-step dance helps screen readers announce
    // the dialog before focus enters it.
    try { modalEl.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
    requestAnimationFrame(() => {
        // Guard: the modal may have been closed before the frame fires.
        if (!current || current.modalEl !== modalEl) return;

        let target = null;
        if (autoFocus) {
            target = typeof autoFocus === 'string'
                ? modalEl.querySelector(autoFocus)
                : autoFocus;
        }
        if (!target) {
            const focusables = getFocusableElements(modalEl);
            target = focusables[0] || null;
        }
        if (target && typeof target.focus === 'function') {
            try { target.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
        }
    });
}

/**
 * Close-time a11y wiring. Call BEFORE the modal is hidden.
 * Idempotent: calling twice or on a modal that isn't the current one is a no-op.
 */
export function closeModalA11y(modalEl) {
    if (!current || current.modalEl !== modalEl) return;

    modalEl.removeEventListener('keydown', current.keydownHandler);
    restoreBackground(current.prevInert);

    const { triggerEl } = current;
    current = null;

    if (triggerEl && triggerEl.isConnected && typeof triggerEl.focus === 'function') {
        try { triggerEl.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
    } else {
        // Graceful fallback when the trigger was removed from the DOM
        // (e.g. a list row was re-rendered after a save).
        try { document.body.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
    }
}

// Single document-level Escape listener. Installed once at module load so we
// do not accumulate listeners on repeated open/close cycles.
document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!current || !current.dismissible) return;
    if (typeof current.onEscape === 'function') {
        event.preventDefault();
        current.onEscape();
    }
});
