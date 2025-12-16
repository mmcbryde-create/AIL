import GameMode from './GameMode.js';
import { TARGET_TYPES } from '../Constants.js';
import { randomColor } from '../utils/Utils.js';

export default class StrikerMode extends GameMode {
    constructor() {
        super("STRIKER", "Build your combo by hitting targets. Avoid missing to keep your streak alive!");
    }

    init(gameState) {
        gameState.lives = 6; // Increased to 6 lives
        gameState.timeLimit = 0;
        gameState.score = 0;
        gameState.combo = 0;
        gameState.spawnRate = 500; // 3x Faster (was 1500)
    }

    update(gameState, dt) { }

    spawnTarget(width, height) {
        const margin = 100;
        const x = margin + Math.random() * (width - 2 * margin);
        const y = margin + Math.random() * (height - 2 * margin);

        let typeConfig = TARGET_TYPES.STANDARD;
        if (Math.random() < 0.10) {
            typeConfig = TARGET_TYPES.COMBO_STAR;
        }

        let color = typeConfig.color;
        if (typeConfig.type === "STANDARD") {
            color = randomColor();
        }

        return {
            x, y,
            radius: 0,
            maxRadius: typeConfig.radius || 30,
            color: color,
            bornTime: Date.now(),
            life: 1.0,
            type: typeConfig.type,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            maxAge: 1000 // 3x Faster disappearance (default was ~3000)
        };
    }

    onTargetHit(target, gameState, soundManager) {
        let points = 10;
        if (target.type === "COMBO_STAR") points = 20;

        // Combo Logic
        gameState.combo++;
        let multiplier = Math.min(Math.floor(gameState.combo / 5) + 1, 4); // Max x4

        gameState.score += (points * multiplier);

        // Dynamic Difficulty (Speed up every 100 points)
        if (gameState.score % 100 < 20 && gameState.spawnRate > 500) {
            gameState.spawnRate *= 0.98;
        }

        if (target.type === "COMBO_STAR") {
            soundManager.bonus();
        } else {
            soundManager.hit();
        }
    }

    onTargetMiss(target, gameState, soundManager) {
        gameState.combo = 0;
        gameState.lives -= 1;
        soundManager.miss();
    }
}
