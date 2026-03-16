// public/js/audioController.js

class AudioController {
    constructor() {
        // Pre-load the audio files
        this.sfx = {
            click: new Audio('/assets/sfx/click.mp3'),
            chime: new Audio('/assets/sfx/chime.mp3'),
            success: new Audio('/assets/sfx/success.mp3'),
            button: new Audio('/assets/sfx/button.mp3') // <-- Added button sound
        };
        
        // Lower the volume so it doesn't jump scare the user or overpower the background music
        Object.values(this.sfx).forEach(audio => {
            audio.volume = 0.4; // 40% volume
        });
    }

    play(soundName) {
        const sound = this.sfx[soundName];
        if (sound) {
            // Reset the audio to the beginning so it can be played rapidly (e.g., fast clicking)
            sound.currentTime = 0; 
            
            // The .catch() prevents the browser from throwing an ugly console error 
            // if the sound tries to play before the user has clicked anywhere on the page
            sound.play().catch(err => {
                console.warn(`SFX '${soundName}' skipped: User hasn't interacted with the page yet.`, err);
            });
        }
    }
}

// Export a single instance of the controller so the whole app shares it
export const audioController = new AudioController();
