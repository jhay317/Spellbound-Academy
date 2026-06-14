/**
 * Magical Particle System
 * Creates floating "dust" and "sparkles" tailored to the player's active subclass.
 */

class ParticleSystem {
    constructor(canvasId) {
        this.container = document.getElementById(canvasId);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.particles = [];
        this.subclass = 'storm'; // Default
        this.resize();

        window.addEventListener('resize', () => this.resize());
        this.animate();

        // Bind clicks to spawn bursts
        window.addEventListener('mousedown', (e) => {
            this.emitBurst(e.clientX, e.clientY, 10);
        });
        window.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches[0]) {
                this.emitBurst(e.touches[0].clientX, e.touches[0].clientY, 10);
            }
        });
    }

    setSubclass(subclass) {
        this.subclass = subclass;
        this.initParticles();
    }

    resize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.initParticles();
    }

    initParticles() {
        this.particles = [];
        const count = Math.floor((this.width * this.height) / 15000); // Density
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        const p = {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            size: Math.random() * 2.5 + 0.5,
            opacity: Math.random() * 0.5 + 0.1,
            fadeSpeed: Math.random() * 0.01 + 0.002,
            isTemporary: false
        };

        // Subclass behaviors
        if (this.subclass === 'fire') {
            // Rising warm embers
            p.speedX = (Math.random() - 0.5) * 0.4;
            p.speedY = -Math.random() * 0.6 - 0.2; // Upward
            const colors = ['255, 69, 0', '255, 140, 0', '255, 200, 50'];
            p.color = colors[Math.floor(Math.random() * colors.length)];
        } else if (this.subclass === 'frost') {
            // Gently falling snow/ice crystals
            p.speedX = (Math.random() - 0.5) * 0.2;
            p.speedY = Math.random() * 0.4 + 0.1; // Downward
            const colors = ['255, 255, 255', '173, 216, 230', '224, 255, 255'];
            p.color = colors[Math.floor(Math.random() * colors.length)];
        } else {
            // Storm / spark floats
            p.speedX = (Math.random() - 0.5) * 0.6;
            p.speedY = (Math.random() - 0.5) * 0.6;
            const colors = ['186, 85, 211', '255, 215, 0', '230, 190, 255'];
            p.color = colors[Math.floor(Math.random() * colors.length)];
        }

        return p;
    }

    emitBurst(x, y, count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2.5 + 1;
            const p = {
                x: x,
                y: y,
                size: Math.random() * 3 + 1,
                speedX: Math.cos(angle) * speed,
                speedY: Math.sin(angle) * speed,
                opacity: 1.0,
                fadeSpeed: Math.random() * 0.02 + 0.015,
                isTemporary: true
            };

            if (this.subclass === 'fire') {
                p.color = '255, 90, 30';
            } else if (this.subclass === 'frost') {
                p.color = '130, 220, 255';
            } else {
                p.color = '255, 215, 0';
            }

            this.particles.push(p);
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;

            if (p.isTemporary) {
                p.opacity -= p.fadeSpeed;
            } else {
                p.opacity += Math.sin(Date.now() * p.fadeSpeed) * 0.01;
            }

            // Wrap normal particles around screen
            if (!p.isTemporary) {
                if (p.x < 0) p.x = this.width;
                if (p.x > this.width) p.x = 0;
                if (p.y < 0) p.y = this.height;
                if (p.y > this.height) p.y = 0;
            }

            this.ctx.fillStyle = `rgba(${p.color}, ${Math.max(0, p.opacity)})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Filter out dissolved burst particles
        this.particles = this.particles.filter(p => !p.isTemporary || p.opacity > 0);

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize on window load and make it globally available
window.addEventListener('load', () => {
    window.spellParticles = new ParticleSystem('particles-js');
});
