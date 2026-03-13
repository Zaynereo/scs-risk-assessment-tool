/**
 * Mascot Controller
 * Handles mascot state and gender-based image switching.
 * Theme can provide custom URLs for Idle, Good (safe answer), and Shocked (risk answer) per gender.
 */
export class MascotController {
    constructor(elements) {
        this.elements = elements;
        this.genderIndex = 1; // Default to 1 (Male)
        this.resetTimeout = null; // Added to manage animation timing
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
        this._preloadImages(); // Preload state images to prevent blank flashes
        this.show();
    }

    /** Preloads the Good and Shocked images as soon as gender is set */
    _preloadImages() {
        ['Good', 'Shocked'].forEach(state => {
            const img = new Image();
            img.src = this.getImageUrlForState(state);
        });
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
        return `assets/mascots/${state} (${this.genderIndex}).png`;
    }

    /** Return the URL for Idle (used by main.js for gender feedback popup). */
    getIdleImageUrl() {
        return this.getImageUrlForState('Idle');
    }

    updateState(state) {
        if (!this.elements.img) return;
        this.elements.img.src = this.getImageUrlForState(state);
        
        // Clear any lingering animation timeouts when state is manually updated
        if (this.resetTimeout) {
            clearTimeout(this.resetTimeout);
            this.resetTimeout = null;
        }
    }

    startAnimation(state) {
        // state: 'Good' (safe answer) or 'Shocked' (risk answer)
        this.updateState(state);
        
        // Extended from 500ms to 2000ms. 
        // Note: If the user goes to the next question earlier, `main.js` handles resetting to Idle natively.
        this.resetTimeout = setTimeout(() => this.updateState('Idle'), 2000);
    }

    show() {
        this.elements.liveContainer?.classList.remove('hidden');
    }

    hide() {
        this.elements.liveContainer?.classList.add('hidden');
    }
}
