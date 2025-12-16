import GameMode from './GameMode.js';
import { TARGET_TYPES } from '../Constants.js';
import { randomColor } from '../utils/Utils.js';

export default class HardcoreMode extends GameMode {
    constructor() {
        super("HARDCORE", "Survival mode. One miss and you're out. How long can you last?");
    }

    init(gameState) {
        gameState.lives = 1; // One life
        gameState.timeLimit = 0;
        gameState.spawnRate = 600;
    }

    spawnTarget(width, height) {
        const margin = 100;
        const x = margin + Math.random() * (width - 2 * margin);
        const y = margin + Math.random() * (height - 2 * margin);

        let typeConfig = TARGET_TYPES.STANDARD;
        if (Math.random() < 0.20) typeConfig = TARGET_TYPES.VOID_MINE; // Minesss

        let color = typeConfig.color;
        if (typeConfig.type === "STANDARD") color = randomColor();

        return {
            x, y,
            radius: 0,
            maxRadius: typeConfig.radius || 30,
            color: color,
            bornTime: Date.now(),
            life: 1.0,
            type: typeConfig.type,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4
        };
    }

    onTargetHit(target, gameState, soundManager) {
        if (target.type === "VOID_MINE") {
            gameState.lives = 0; // Instant death
            soundManager.hazard();
            return;
        }

        gameState.score += 20;
        soundManager.hit();

        // Ramp up
        if (gameState.spawnRate > 400) gameState.spawnRate *= 0.99;
    }

    onTargetMiss(target, gameState, soundManager) {
        if (target.type !== "VOID_MINE") {
            gameState.lives = 0;
            soundManager.miss();
        }
    }
}
