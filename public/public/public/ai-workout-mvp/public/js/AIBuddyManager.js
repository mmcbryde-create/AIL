export default class AIBuddyManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.lastSpeakTime = 0;
        this.minInterval = 10000;
        this.isStalling = false;
        this.lastMoveTime = Date.now();
        this.stallThreshold = 8000;
        this.isSpeaking = false;

        // Automation
        this.hasGreeted = false;
        this.ambientInterval = null;

        // Voice Loading
        this.voice = null;
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.loadVoice();
        }
        this.loadVoice();
    }

    greetUser() {
        if (this.hasGreeted) return;
        this.hasGreeted = true;
        this.triggerComment("GREETING", true);
        this.startAmbientLoop();
    }

    startAmbientLoop() {
        if (this.ambientInterval) clearInterval(this.ambientInterval);
        // Every 25 seconds, try to say something if not speaking
        this.ambientInterval = setInterval(() => {
            if (!this.isSpeaking && !this.isStalling) {
                // 50% chance to speak to not be TOO annoying
                if (Math.random() < 0.5) {
                    this.triggerComment("AMBIENT", false);
                }
            }
        }, 25000);
    }

    loadVoice() {
        const voices = this.synth.getVoices();
        if (voices.length > 0) {
            this.voice = voices.find(v => v.name.includes('Google US English')) || voices[0];
            console.log("AI Buddy Voice Loaded:", this.voice.name);
        }
    }

    // Called every frame with hand positions
    updateMovement(leftHand, rightHand) {
        if (!leftHand && !rightHand) return; // probably nothing detected

        // Simple movement check: if hands exist, we assume some movement or at least presence
        // A better check would be velocity, but presence is a good proxy for "are they playing".
        // If hands are undetected for X seconds, they stepped away.
        this.lastMoveTime = Date.now();

        // Reset stall state if we were stalling
        if (this.isStalling) {
            this.isStalling = false;
            // Optionally welcome them back?
        }
    }

    checkStall() {
        if (Date.now() - this.lastMoveTime > this.stallThreshold) {
            if (!this.isStalling) {
                this.isStalling = true;
                this.triggerComment("User is stalling/stepped away", true);
            }
        }
    }

    async triggerComment(eventDescription, force = false) {
        const now = Date.now();
        if (!force && (now - this.lastSpeakTime < this.minInterval || this.isSpeaking)) {
            return;
        }

        this.lastSpeakTime = now;
        this.isSpeaking = true;

        // Fetch comment from server
        try {
            // Gather Context
            // We need to access GameEngine state ideally, or pass it in.
            // For now, we'll assume the caller passes critical stats or we hold a ref.
            // Let's pass basic placeholders that the app.js will populate if possible, or we rely on args.

            const context = {
                event: eventDescription,
                isStalling: this.isStalling,
                score: document.getElementById("rep-count")?.textContent || "0",
                mode: document.getElementById("state")?.textContent || "Unknown",
                // combo: ... (if we had access)
            };

            const response = await fetch('/api/buddy-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ context })
            });

            const data = await response.json();
            if (data.message) {
                this.speak(data.message);
            }

        } catch (e) {
            console.error("AI Buddy failed:", e);
            this.isSpeaking = false;
        }
    }

    speak(text) {
        if (!this.synth) {
            console.error("SpeechSynthesis not supported.");
            return;
        }

        console.log("AI Buddy Speaking:", text);
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 1.0;
        utterance.rate = 1.1;

        if (this.voice) {
            utterance.voice = this.voice;
        } else {
            console.warn("No specific voice loaded, using default.");
        }

        utterance.onend = () => {
            this.isSpeaking = false;
        };
        utterance.onerror = (e) => {
            console.error("Speech Error:", e);
            this.isSpeaking = false;
        };

        this.synth.speak(utterance);
    }
}
