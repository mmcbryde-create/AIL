import GameMode from './GameMode.js';
import { TARGET_TYPES } from '../Constants.js';

export default class ZenMode extends GameMode {
    constructor() {
        super("ZEN", "Relax and practice. No time limit, no score pressure. Just flow.");
    }

    init(gameState) {
        gameState.lives = Infinity;
        gameState.timeLimit = 0;
        gameState.spawnRate = 2000;
    }

    spawnTarget(width, height) {
        const margin = 100;
        const x = margin + Math.random() * (width - 2 * margin);
        const y = margin + Math.random() * (height - 2 * margin);
        const typeConfig = TARGET_TYPES.FLOW_ORB;

        return {
            x, y,
            radius: 0,
            maxRadius: 40,
            color: typeConfig.color,
            bornTime: Date.now(),
            life: 1.0,
            type: typeConfig.type,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            maxAge: 10000
        };
    }

    onTargetHit(target, gameState, soundManager) {
        gameState.score += 5;
        soundManager.bonus(); // Zen sound
    }

    onTargetMiss(target, gameState, soundManager) {
        // No penalty in Zen
    }
}
