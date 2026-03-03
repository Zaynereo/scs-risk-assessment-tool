/**
 * Mascot Controller
 * Handles mascot state and gender-based image switching.
 * Theme can provide custom URLs for Idle, Good (safe answer), and Shocked (risk answer) per gender.
 */
export class MascotController {
    constructor(elements) {
        this.elements = elements;
        this.genderIndex = 1; // Default to 1 (Male)
        /** @type {{ mascotMale?: string, mascotFemale?: string, mascotMaleGood?: string, mascotFemaleGood?: string, mascotMaleShocked?: string, mascotFemaleShocked?: string }|null} */
        this.theme = null;
    }

    setTheme(theme) {
        const hasAny = theme && (
            (theme.mascotMale || theme.mascotFemale || theme.mascotMaleGood || theme.mascotFemaleGood ||
             theme.mascotMaleShocked || theme.mascotFemaleShocked)
        );
        this.theme = hasAny ? theme : null;
    }

    setGender(gender) {
        this.genderIndex = gender.toLowerCase() === 'female' ? 2 : 1;
        this.updateState('Idle');
        this.show();
    }

    /** Return the URL to use for the current gender and state. Used for Idle by main.js popup too. */
    getImageUrlForState(state) {
        if (this.theme) {
            const isFemale = this.genderIndex === 2;
            let url = '';
            if (state === 'Idle') url = isFemale ? this.theme.mascotFemale : this.theme.mascotMale;
            else if (state === 'Good') url = isFemale ? this.theme.mascotFemaleGood : this.theme.mascotMaleGood;
            else if (state === 'Shocked') url = isFemale ? this.theme.mascotFemaleShocked : this.theme.mascotMaleShocked;
            if (url && url.trim()) return url.trim();
        }
        return `assets/${state} (${this.genderIndex}).png`;
    }

    /** Return the URL for Idle (used by main.js for gender feedback popup). */
    getIdleImageUrl() {
        return this.getImageUrlForState('Idle');
    }

    updateState(state) {
        if (!this.elements.img) return;
        this.elements.img.src = this.getImageUrlForState(state);
    }

    startAnimation(state) {
        // state: 'Good' (safe answer) or 'Shocked' (risk answer)
        this.updateState(state);
        setTimeout(() => this.updateState('Idle'), 500);
    }

    show() {
        this.elements.liveContainer?.classList.remove('hidden');
    }

    hide() {
        this.elements.liveContainer?.classList.add('hidden');
    }
}