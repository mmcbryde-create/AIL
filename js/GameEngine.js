import { HAND_RADIUS, TARGET_TYPES } from './Constants.js';

export default class GameEngine {
    constructor(canvas, soundManager, skinManager, aiBuddyManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.soundManager = soundManager;
        this.skinManager = skinManager;
        this.aiBuddyManager = aiBuddyManager; // New Dependency

        this.mode = null;
        this.isRunning = false;
        // ... (rest of constructor is implicitly preserved by replace_file_content if I only target the constructor signature? No, I must be careful).
        /* 
           Wait, rely on careful target matching. 
           I will replace the constructor START and the hit logic separately.
        */
        this.gameState = {};

        // Entities
        this.targets = [];
        this.particles = [];
        this.floatingTexts = [];

        // Juice State
        this.screenShake = 0;
    }

    start(mode) {
        this.mode = mode;
        this.isRunning = true;
        this.targets = [];
        this.particles = [];
        this.floatingTexts = [];
        this.screenShake = 0;

        this.gameState = {
            score: 0,
            startTime: Date.now(),
            lastSpawnTime: 0,
            // Mode specific fields will be init by mode
        };

        this.mode.init(this.gameState);

        console.log("Engine Started with mode:", mode.name);
    }

    stop() {
        this.isRunning = false;
        this.screenShake = 0;
    }

    update(now, leftHand, rightHand) {
        if (!this.isRunning) return;

        // 1. Spawning
        if (now - this.gameState.lastSpawnTime > this.gameState.spawnRate) {
            const t = this.mode.spawnTarget(this.canvas.width, this.canvas.height);
            if (t) {
                this.targets.push(t);
            }
            // Decay spawn rate if mode allows, or let mode handle it. 
            // We'll trust mode.update/spawnTarget config primarily, but simple decay here:
            // this.gameState.spawnRate *= 0.99; // moved to StrikerMode logic mostly
            this.gameState.lastSpawnTime = now;
        }

        // 2. Mode Update
        this.mode.update(this.gameState, 16); // ~16ms dt

        // 3. Physics & Lifespan
        for (let i = this.targets.length - 1; i >= 0; i--) {
            let t = this.targets[i];

            // Grow entry
            if (t.radius < t.maxRadius) t.radius += 2;

            // Move
            t.x += t.vx;
            t.y += t.vy;

            // Bouncing (for Blitz/Zen mostly, but applies generally if vx/vy exists)
            if (t.vx !== 0 || t.vy !== 0) {
                if (t.x < t.radius || t.x > this.canvas.width - t.radius) t.vx *= -1;
                if (t.y < t.radius || t.y > this.canvas.height - t.radius) t.vy *= -1;
            }

            // Lifespan
            const age = now - t.bornTime;
            const maxAge = t.maxAge || 3000;

            if (age > maxAge) {
                this.mode.onTargetMiss(t, this.gameState, this.soundManager);
                this.addFloatingText(t.x, t.y, "MISS", "#ff0000");
                this.triggerScreenShake(5);
                this.targets.splice(i, 1);
            }
        }

        // 4. Collision Detection
        const hands = [leftHand, rightHand];
        for (let i = this.targets.length - 1; i >= 0; i--) {
            let t = this.targets[i];
            let hit = false;

            for (let h of hands) {
                if (!h) continue;
                const dx = h.x - t.x;
                const dy = h.y - t.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < t.radius + HAND_RADIUS) {
                    hit = true;
                    break;
                }
            }

            if (hit) {
                this.mode.onTargetHit(t, this.gameState, this.soundManager);
                this.createExplosion(t.x, t.y, t.color);
                this.addFloatingText(t.x, t.y, "+SCORED", "#fff");
                this.triggerScreenShake(2);
                this.targets.splice(i, 1);

                // Trigger Buddy?
                if (this.aiBuddyManager && Math.random() < 0.2) { // 20% chance on hit
                    this.aiBuddyManager.triggerComment("User scored a hit", false);
                }
            }
        }

        // 5. Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // 6. Floating Text update
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            let ft = this.floatingTexts[i];
            ft.y -= 1; // float up
            ft.life -= 0.02;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        // 7. Screen Shake decay
        if (this.screenShake > 0) this.screenShake *= 0.9;
        if (this.screenShake < 0.5) this.screenShake = 0;
    }

    draw(videoImage) {
        this.ctx.save();

        // Clear / Background
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (videoImage) {
            this.ctx.save();
            // Mirror the video
            this.ctx.translate(this.canvas.width, 0);
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(videoImage, 0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();

            // Darken it slightly for game contrast
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Apply Screen Shake
        if (this.screenShake > 0) {
            const dx = (Math.random() - 0.5) * this.screenShake;
            const dy = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(dx, dy);
        }

        // Draw Targets
        for (let t of this.targets) {
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, t.radius, 0, 2 * Math.PI);
            this.ctx.fillStyle = t.color;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = t.color;
            this.ctx.fill();
            this.ctx.strokeStyle = "#fff";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            // Label special targets
            if (t.type === "TIME_ORB") {
                this.ctx.fillStyle = "#000";
                this.ctx.font = "bold 12px Arial";
                this.ctx.textAlign = "center";
                this.ctx.fillText("+5s", t.x, t.y + 4);
            }
        }

        // Draw Particles
        for (let p of this.particles) {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
            this.ctx.fill();
        }

        // Draw Floating Text
        for (let ft of this.floatingTexts) {
            this.ctx.fillStyle = ft.color;
            this.ctx.font = "bold 20px 'Press Start 2P'"; // usage of game font
            this.ctx.globalAlpha = ft.life;
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.globalAlpha = 1.0;
        }

        this.ctx.restore();
    }

    // Helpers
    createExplosion(x, y, color) {
        const skin = this.skinManager.getSkin();
        // Use skin particle color if hitting standard, or target color
        // Let's mix them
        const pColor = skin.particleColor || color;

        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: pColor
            });
        }
    }

    addFloatingText(x, y, text, color) {
        this.floatingTexts.push({
            x, y,
            text,
            life: 1.0,
            color
        });
    }

    triggerScreenShake(amount) {
        this.screenShake = amount * 5.0; // multiplier for impact
    }
}
