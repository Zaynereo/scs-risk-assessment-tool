/**
 * Mascot Controller
 * Handles mascot state and gender-based image switching.
 */
export class MascotController {
    constructor(elements) {
        this.elements = elements;
        this.genderIndex = 1; // Default to 1 (Male)
        this.theme = null;
        this.animationTimeout = null; // Store timeout reference
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

    updateState(state) {
        if (!this.elements.img) return;
        this.elements.img.src = this.getImageUrlForState(state);
    }

    startAnimation(state) {
        // Fix: Clear any existing timeout to prevent the mascot 
        // from switching to Idle prematurely during rapid swipes
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
        }

        this.updateState(state);

        // Fix: Increase duration to 1000ms so the "Shocked" image 
        // stays visible throughout the swipe animation
        this.animationTimeout = setTimeout(() => {
            this.updateState('Idle');
            this.animationTimeout = null;
        }, 1000);
    }

    show() {
        this.elements.liveContainer?.classList.remove('hidden');
    }

    hide() {
        this.elements.liveContainer?.classList.add('hidden');
    }
}
