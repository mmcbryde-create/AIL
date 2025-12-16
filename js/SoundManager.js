export default class SoundManager {
    // Accept an optional skinManager so we can tailor voice lines per skin
    constructor(skinManager = null) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.skinManager = skinManager;
        this.speechEnabled = true;

        // Base/fallback voice lines
        this.voiceLines = {
            default: {
                start: [
                    "Boot sequence complete. Ready to rumble.",
                    "Locking in targets. Let's go!",
                    "Warm up those fists, pilot!"
                ],
                hit: ["Nice hit!", "Bullseye!", "Right on target!", "Smashed it!", "Clean strike!"],
                miss: ["Close one — keep your eyes up.", "Missed. Reset and focus.", "Not quite — try again.", "Shake it off, you got this."],
                bonus: ["Sweet combo! Bonus!", "Extra points! You're cooking.", "Chain breaker! Keep it up."],
                equip: ["Gear equipped. Looking sharp.", "New loadout active. Stylish."],
                gameover: ["Mission failed. Learn and return stronger.", "That was rough — regroup and retry.", "Game over. High-five for effort."],
                encourage: ["Keep pushing!", "You got the rhythm now!", "One more for the win!", "Push! Push! Push!"],
                welcome: ["Welcome, Pilot. Systems Online.", "Connection established. Ready.", "Neural link active."]
            },
            // Per-skin personalities
            MIDAS: { // Now METIS
                start: ["Metis online. Wisdom guides the fist.", "Calculate. Strike. Win."],
                hit: ["Precisely.", "Optimal outcome.", "Knowledge is power.", "Calculated."],
                miss: ["Recalculating.", "Error in judgment.", "Focus your mind."],
                bonus: ["Strategic advantage gained.", "Brilliant move!"],
                equip: ["Metis system engaged. Tactical advantage.", "Wisdom armor equiped."],
                gameover: ["The simulation ends.", "Review the data. Try again."],
                encourage: ["Think before you strike.", "Analyze the pattern."]
            },
            NEON: { // Now NIGHTSHIELD
                start: ["Nightshield active. Shadows protect us.", "Darkness falls. We rise."],
                hit: ["Silent strike.", "From the shadows.", "Too fast.", "Night falls."],
                miss: ["Revealed.", "Too loud.", "Back to the dark."],
                bonus: ["Shadow arts!", "Unseen victory!"],
                equip: ["Nightshield cloak active.", "Embrace the dark."],
                gameover: ["The light finds us.", "Fade to black."],
                encourage: ["Stay in the shadows.", "Strike when they blink."]
            },
            CYBER: { // Now HAVEN
                start: ["Haven protocol initialized. Sanctuary secure.", "Peace through training."],
                hit: ["Harmony.", "Flow like water.", "Perfect balance.", "Zen strike."],
                miss: ["Disruption detected.", "Unbalanced.", "Breath."],
                bonus: ["Nirvana achieved!", "Peaceful destruction!"],
                equip: ["Haven armor synced. Find your center.", "Sanctuary mode."],
                gameover: ["Balance lost.", "Return to one."],
                encourage: ["Find your flow.", "Be the calm storm."]
            },
            FIRE: { // Now OMNICORE
                start: ["Omnicore systems online. Power overwhelming.", "Reactor at 100%."],
                hit: ["Power surge!", "Critical hit!", "Overload!", "Maximum output!"],
                miss: ["System miss.", "Target lost.", "Re-calibrating core."],
                bonus: ["Core meltdown!", "Limit break!"],
                equip: ["Omnicore fused. Unlimted power.", "Reactor suit on."],
                gameover: ["System failure.", "Shutdown sequence."],
                encourage: ["Need more power!", "Push the engine!"]
            }
        };
    }

    resume() {
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    setSpeechEnabled(enabled) {
        this.speechEnabled = !!enabled;
    }

    // type: 'hit' | 'miss' | 'bonus' | 'equip' | 'start' | 'gameover' | 'encourage'
    speak(type = 'encourage') {
        if (!this.speechEnabled) return;
        if (!('speechSynthesis' in window)) return;

        const skinId = this.skinManager && this.skinManager.getSkin ? this.skinManager.getSkin().id : null;

        const pool = (skinId && this.voiceLines[skinId] && this.voiceLines[skinId][type])
            ? this.voiceLines[skinId][type]
            : (this.voiceLines.default[type] || this.voiceLines.default['encourage']);

        const text = pool[Math.floor(Math.random() * pool.length)];

        try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            // small randomization for variety
            utter.rate = 0.95 + Math.random() * 0.25;
            utter.pitch = 0.9 + Math.random() * 0.5;
            utter.volume = 0.9;
            // choose a voice loosely matching personality if possible
            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length) {
                // prefer a slightly sassy female voice for MIDAS if available
                if (skinId === 'MIDAS') {
                    const v = voices.find(v => /female|woman|samantha|alloy/i.test(v.name));
                    if (v) utter.voice = v;
                }
            }
            window.speechSynthesis.speak(utter);
        } catch (e) {
            console.warn('TTS failed', e);
        }
    }

    playTone(freq, type, duration) {
        this.resume();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    hit() {
        this.playTone(880, 'square', 0.1);
        setTimeout(() => this.playTone(1760, 'square', 0.1), 50);
        // voice feedback (use skin-aware speak)
        setTimeout(() => this.speak('hit'), 80);
    }

    bonus() {
        this.playTone(440, 'sine', 0.1);
        setTimeout(() => this.playTone(880, 'sine', 0.1), 100);
        setTimeout(() => this.speak('bonus'), 120);
    }

    miss() {
        this.playTone(150, 'sawtooth', 0.3);
        this.playTone(100, 'sawtooth', 0.3);
        setTimeout(() => this.speak('miss'), 100);
    }

    hazard() {
        this.playTone(100, 'sawtooth', 0.5);
        this.playTone(50, 'square', 0.5);
    }

    gameOver() {
        let t = this.audioCtx.currentTime;
        [400, 350, 300, 250].forEach((freq, i) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + i * 0.2);
            gain.gain.setValueAtTime(0.2, t + i * 0.2);
            gain.gain.linearRampToValueAtTime(0, t + i * 0.2 + 0.2);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(t + i * 0.2);
            osc.stop(t + i * 0.2 + 0.2);
        });
        // voice feedback after tones
        setTimeout(() => this.speak('gameover'), 400);
    }

    // Optional: notify when equip selected
    equip() {
        this.speak('equip');
    }
}
