export default class GameMode {
    constructor(name, description, config) {
        this.name = name;
        this.description = description || "No description available.";
        this.config = config || {};
    }

    // Called when the mode starts
    init(gameState) {
        console.log(`Initializing ${this.name} Mode`);
    }

    // Called every frame
    update(gameState, dt) {
        // Abstract
    }

    // Called when a target needs to spawn
    spawnTarget(canvasWidth, canvasHeight) {
        // Return target object or null
        return null;
    }

    // Called when player hits a target
    onTargetHit(target, gameState) {
        // Abstract
    }

    // Called when a target expires/misses
    onTargetMiss(target, gameState) {
        // Abstract
    }
}
