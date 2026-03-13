// touch-trail.js (Optimized Canvas Implementation)
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100vw';
canvas.style.height = '100vh';
canvas.style.pointerEvents = 'none';
canvas.style.zIndex = '9999';
document.body.appendChild(canvas);

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
});

const trails = [];
let lastTrailTime = 0;

document.addEventListener('touchmove', (e) => {
    const now = Date.now();
    if (now - lastTrailTime < 20) return; // 20ms throttle
    lastTrailTime = now;
    
    const touch = e.touches[0];
    trails.push({ x: touch.clientX, y: touch.clientY, life: 1 });
}, { passive: true });

function animate() {
    ctx.clearRect(0, 0, width, height);
    
    for (let i = trails.length - 1; i >= 0; i--) {
        const point = trails[i];
        point.life -= 0.03; // Fade out speed
        
        if (point.life <= 0) {
            trails.splice(i, 1);
            continue;
        }
        
        const radius = 20 + ((1 - point.life) * 30); // Expands as it fades
        
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
        gradient.addColorStop(0, `rgba(8, 145, 178, ${0.6 * point.life})`);
        gradient.addColorStop(1, 'rgba(8, 145, 178, 0)');
        
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    requestAnimationFrame(animate);
}

animate();
