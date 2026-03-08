// Touch Trail Effect for Touchscreen Interaction
// Creates visual feedback circles when user touches the screen

let lastTrailTime = 0;
const THROTTLE_MS = 50;

document.addEventListener('touchstart', function(e) {
    createTouchTrail(e.touches[0].clientX, e.touches[0].clientY);
}, {passive: true});

document.addEventListener('touchmove', function(e) {
    const now = Date.now();
    if (now - lastTrailTime < THROTTLE_MS) return;
    lastTrailTime = now;
    createTouchTrail(e.touches[0].clientX, e.touches[0].clientY);
}, {passive: true});

function createTouchTrail(x, y) {
    const trail = document.createElement('div');
    trail.className = 'touch-trail';
    trail.style.left = x + 'px';
    trail.style.top = y + 'px';
    document.body.appendChild(trail);
    trail.addEventListener('animationend', () => trail.remove(), { once: true });
}
