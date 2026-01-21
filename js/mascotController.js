/**
 * Mascot Controller
 * Handles mascot state and gender-based image switching
 */
export class MascotController {
    constructor(elements) {
        this.elements = elements;
        this.genderIndex = 1; // Default to 1 (Male)
    }

    setGender(gender) {
        this.genderIndex = gender.toLowerCase() === 'female' ? 2 : 1;
        this.updateState('Idle');
        this.show();
    }

    updateState(state) {
        if (!this.elements.img) return;
        // Asset paths: assets/Idle (1).png, assets/Good (2).png, etc.
        this.elements.img.src = `assets/${state} (${this.genderIndex}).png`;
    }

    show() {
        this.elements.liveContainer?.classList.remove('hidden');
    }

    hide() {
        this.elements.liveContainer?.classList.add('hidden');
    }
}