export const SKINS = {
    NEON: {
        id: 'NEON',
        name: 'Nightshield',
        color: '#00f3ff',
        glow: '#bc13fe',
        particleColor: '#ffffff'
    },
    CYBER: {
        id: 'CYBER',
        name: 'Haven',
        color: '#00ff00',
        glow: '#003300',
        particleColor: '#00ff00'
    },
    FIRE: {
        id: 'FIRE',
        name: 'Omnicore',
        color: '#ff4500',
        glow: '#ffa500',
        particleColor: '#ffff00'
    },
    MIDAS: {
        id: 'MIDAS',
        name: 'Metis',
        color: '#ffd700',
        glow: '#ffffff',
        particleColor: '#ffec8b'
    }
};

export default class SkinManager {
    constructor() {
        this.currentSkin = SKINS.NEON;
        this.load();
    }

    load() {
        const saved = localStorage.getItem('lunarisSkin');
        if (saved && SKINS[saved]) {
            this.currentSkin = SKINS[saved];
        }
    }

    save(skinId) {
        if (SKINS[skinId]) {
            this.currentSkin = SKINS[skinId];
            localStorage.setItem('lunarisSkin', skinId);
        }
    }

    getSkin() {
        return this.currentSkin;
    }
}
