/**
 * bg.js — Dynamic Web Background
 * Red binary rain + drifting particle web
 */

(function () {
    const canvas = document.getElementById('bgCanvas');
    const ctx    = canvas.getContext('2d');

    let W, H, cols, drops, particles;

    const CHARS   = '01アイウエ01カキクケ10コサシ01スセソ10タチツ01テトナ10ニヌネ01ABCDEF01><[]{}01!#$%^&*';
    const FSIZE   = 14;
    const PARTICLE_COUNT = 60;

    /* ── Resize ──────────────────────────────────────────────── */
    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        cols  = Math.floor(W / FSIZE);
        drops = Array(cols).fill(0).map(() => Math.random() * -50);
        initParticles();
    }

    /* ── Particles (floating nodes) ─────────────────────────── */
    function initParticles() {
        particles = Array.from({ length: PARTICLE_COUNT }, () => ({
            x:  Math.random() * W,
            y:  Math.random() * H,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r:  Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.4 + 0.1,
        }));
    }

    /* ── Draw Binary Rain ────────────────────────────────────── */
    function drawRain() {
        ctx.fillStyle = 'rgba(4, 0, 0, 0.055)';
        ctx.fillRect(0, 0, W, H);

        ctx.font = FSIZE + 'px "Source Code Pro", monospace';

        for (let i = 0; i < drops.length; i++) {
            const char = CHARS[Math.floor(Math.random() * CHARS.length)];
            const y    = drops[i] * FSIZE;
            const rnd  = Math.random();

            if (rnd > 0.97) {
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#ff0a0a';
                ctx.shadowBlur  = 8;
            } else if (rnd > 0.85) {
                ctx.fillStyle = '#ff2020';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur  = 6;
            } else if (rnd > 0.6) {
                ctx.fillStyle = '#aa0000';
                ctx.shadowBlur  = 0;
            } else {
                ctx.fillStyle = '#440000';
                ctx.shadowBlur  = 0;
            }

            ctx.fillText(char, i * FSIZE, y);

            if (y > H && Math.random() > 0.978) {
                drops[i] = 0;
            }
            drops[i] += 0.35 + Math.random() * 0.15;
        }
        ctx.shadowBlur = 0;
    }

    /* ── Draw Particle Web ───────────────────────────────────── */
    function drawParticles() {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;

            // Node dot
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 10, 10, ${p.opacity})`;
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur  = 6;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Connect nearby particles
            for (let j = i + 1; j < particles.length; j++) {
                const q  = particles[j];
                const dx = p.x - q.x;
                const dy = p.y - q.y;
                const d  = Math.sqrt(dx * dx + dy * dy);

                if (d < 140) {
                    const alpha = (1 - d / 140) * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.strokeStyle = `rgba(200, 0, 0, ${alpha})`;
                    ctx.lineWidth   = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    /* ── Loop ────────────────────────────────────────────────── */
    function loop() {
        drawRain();
        drawParticles();
        requestAnimationFrame(loop);
    }

    /* ── Init ────────────────────────────────────────────────── */
    window.addEventListener('resize', resize);
    resize();
    loop();

})();
