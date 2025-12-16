import GameMode from './GameMode.js';
import { TARGET_TYPES } from '../Constants.js';
import { randomColor } from '../utils/Utils.js';

export default class BlitzMode extends GameMode {
    constructor() {
        super("BLITZ", "Race against the clock! Targets spawn faster and disappear quicker as time goes on.");
    }

    init(gameState) {
        this.gameStateRef = gameState; // Store reference for spawnTarget
        gameState.lives = Infinity;
        gameState.timeLimit = 13; // Start with 13s
        gameState.timeLeft = gameState.timeLimit; // Initialize timeLeft
        gameState.score = 0;
        gameState.combo = 0;
        gameState.spawnRate = 700; // Slower spawn (was 600)
    }

    update(gameState, dt) {
        // Basic movement logic handled by Engine
        // Decrement timer
        if (gameState.timeLeft > 0) {
            gameState.timeLeft -= dt / 1000;
        }

        // Difficulty Scaling
        const elapsed = Date.now() - gameState.startTime;
        // Scale from 0.0 to 1.0 over 60 seconds
        const difficulty = Math.min(elapsed / 60000, 1.0);

        // Spawn Rate: 700ms -> 300ms
        gameState.spawnRate = 700 - (400 * difficulty);
    }

    spawnTarget(width, height) {
        const margin = 100;
        const x = margin + Math.random() * (width - 2 * margin);
        const y = margin + Math.random() * (height - 2 * margin);

        let typeConfig = TARGET_TYPES.STANDARD;
        // Small chance for bonus time orbs
        if (Math.random() < 0.15) typeConfig = TARGET_TYPES.TIME_ORB;

        let color = typeConfig.color;
        if (typeConfig.type === "STANDARD") {
            color = randomColor();
        }

        // Difficulty Scaling for Target
        const elapsed = this.gameStateRef ? (Date.now() - this.gameStateRef.startTime) : 0;
        const difficulty = Math.min(elapsed / 60000, 1.0);

        // Speed: 5 -> 9
        const speed = 5 + (4 * difficulty);

        // Max Age: 1200ms -> 600ms
        const maxAge = 1200 - (600 * difficulty);

        return {
            x, y,
            radius: 0,
            maxRadius: typeConfig.radius || 30,
            color: color,
            bornTime: Date.now(),
            life: 1.0,
            type: typeConfig.type,
            // Fast random velocity
            vx: (Math.random() - 0.5) * speed * 2,
            vy: (Math.random() - 0.5) * speed * 2,
            // Short limit for lifespan check (handled in Engine, but we can tag it)
            maxAge: maxAge
        };
    }

    onTargetHit(target, gameState, soundManager) {
        // Time Attack Rule: +2s on hit
        gameState.timeLeft += 2;
        // Cap time logic? Maybe cap at 60s if we want, but let's leave uncapped for fun

        let points = 10;
        if (target.type === "TIME_ORB") {
            points = 50;
            gameState.timeLeft += 5; // Extra bonus
            soundManager.bonus();
        } else {
            soundManager.hit();
        }

        gameState.score += points;
    }

    onTargetMiss(target, gameState, soundManager) {
        // Time Attack Rule: -5s on miss (reduced from 20s to prevent instant loss)
        gameState.timeLeft -= 5;
        soundManager.miss();
    }
}
