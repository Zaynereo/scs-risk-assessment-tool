// public/js/particles.js

export function triggerConfetti() {
    // 1. Create a temporary canvas
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none'; // Crucial: lets users click buttons underneath the confetti
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#2ecc71', '#f1c40f', '#e74c3c', '#3498db', '#9b59b6'];

    // 2. Generate 150 confetti particles
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: canvas.width / 2,                // Start from the center horizontally
            y: canvas.height / 2 + 100,         // Start slightly below the center vertically
            r: Math.random() * 6 + 3,           // Random size
            dx: Math.random() * 10 - 5,         // Random horizontal velocity
            dy: Math.random() * -15 - 5,        // Random upward velocity (the "pop")
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngle: 0,
            tiltAngleInc: (Math.random() * 0.07) + 0.05
        });
    }

    let frameId;
    
    // 3. The Animation Loop
    function animate() {
        frameId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let activeParticles = 0;

        particles.forEach((p) => {
            // Apply gravity and wind
            p.tiltAngle += p.tiltAngleInc;
            p.y += (Math.cos(p.tiltAngle) + p.dy + p.r / 2) / 2;
            p.x += Math.sin(p.tiltAngle) * 2 + p.dx;
            p.dy += 0.15; // Gravity pulling it down

            // Draw the particle
            ctx.beginPath();
            ctx.lineWidth = p.r;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
            ctx.stroke();

            // Count particles that are still visible on screen
            if (p.y < canvas.height) {
                activeParticles++;
            }
        });

        // 4. Clean up when all particles have fallen off the screen
        if (activeParticles === 0) {
            cancelAnimationFrame(frameId);
            canvas.remove();
        }
    }

    // Start the explosion
    animate();
}
