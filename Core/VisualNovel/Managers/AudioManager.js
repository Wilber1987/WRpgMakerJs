//@ts-check

/**
 * Gestor centralizado de audio
 * Maneja reproducción, fade, y tracking de instancias
 */
export class AudioManager {
    constructor() {
        /** @type {HTMLAudioElement[]} */
        this.activeInstances = [];
        
        /** @type {HTMLAudioElement | null} */
        this.backgroundAudio = null;
        
        /** @type {number} */
        this.defaultVolume = 1.0;
    }
    
    /**
     * Reproduce audio de fondo
     * @param {string} src - Ruta del audio
     * @param {boolean} loop - Si debe repetirse
     * @returns {Promise<HTMLAudioElement>}
     */
    async playAudio(src, loop = true) {
        this.stopBackground();
        
        const audio = new Audio(src);
        audio.loop = loop;
        audio.volume = this.defaultVolume;
        
        try {
            await audio.play();
            this.backgroundAudio = audio;
            this.activeInstances.push(audio);
            
            audio.onended = () => {
                this._removeInstance(audio);
            };
            
            return audio;
        } catch (error) {
            console.warn('Error al reproducir audio de fondo:', error);
            return audio;
        }
    }
    
    /**
     * Detiene el audio de fondo actual
     */
    stopBackground() {
        if (this.backgroundAudio) {
            this.backgroundAudio.pause();
            this.backgroundAudio.currentTime = 0;
            this._removeInstance(this.backgroundAudio);
            this.backgroundAudio = null;
        }
    }
    
    /**
     * Reproduce un efecto de sonido (no bloqueante)
     * @param {string} src 
     * @param {number} [volume=1.0]
     * @returns {Promise<HTMLAudioElement>}
     */
    async playSound(src, volume = 1.0) {
        const audio = new Audio(src);
        audio.volume = volume;
        
        try {
            await audio.play();
            this.activeInstances.push(audio);
            
            audio.onended = () => {
                this._removeInstance(audio);
            };
            
            return audio;
        } catch (error) {
            console.warn('Error al reproducir sonido:', error);
            return audio;
        }
    }
    
    /**
     * Reproduce audio de diálogo
     * @param {string} src 
     * @returns {Promise<{audio: HTMLAudioElement, finished: Promise<boolean>}>}
     */
    async playDialogue(src) {
        this.stopDialogue();
        
        const audio = new Audio(src);
        audio.loop = false;
        
        let finished = false;
        const finishedPromise = new Promise(resolve => {
            audio.onended = () => {
                finished = true;
                this._removeInstance(audio);
                resolve(true);
            };
            audio.onerror = () => {
                finished = true;
                this._removeInstance(audio);
                resolve(true);
            };
        });
        
        try {
            await audio.play();
            this.activeInstances.push(audio);
            return { audio, finished: finishedPromise };
        } catch (error) {
            console.warn('Error al reproducir audio de diálogo:', error);
            finished = true;
            return { audio: audio, finished: Promise.resolve(true) };
        }
    }
    
    /**
     * Detiene todos los audios de diálogo
     */
    stopDialogue() {
        // Detener solo audios no-loop (diálogo)
        this.activeInstances.forEach(audio => {
            if (!audio.loop) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    }
    
    /**
     * Detiene todos los audios activos
     */
    stopAll() {
        this.activeInstances.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        this.activeInstances = [];
        this.backgroundAudio = null;
    }
    
    /**
     * Aplica fade out al audio de fondo
     * @param {number} duration - Duración en ms
     * @returns {Promise<void>}
     */
    async fadeOut(duration = 1000) {
        if (!this.backgroundAudio) return;
        
        const startVolume = this.backgroundAudio.volume;
        const steps = 20;
        const stepTime = duration / steps;
        
        for (let i = 0; i < steps; i++) {
            await new Promise(resolve => setTimeout(resolve, stepTime));
            this.backgroundAudio.volume = startVolume * (1 - (i + 1) / steps);
        }
        
        this.stopBackground();
    }
    
    /**
     * Aplica fade in al audio de fondo
     * @param {number} duration - Duración en ms
     * @returns {Promise<void>}
     */
    async fadeIn(duration = 1000) {
        if (!this.backgroundAudio) return;
        
        this.backgroundAudio.volume = 0;
        const steps = 20;
        const stepTime = duration / steps;
        
        for (let i = 0; i < steps; i++) {
            await new Promise(resolve => setTimeout(resolve, stepTime));
            this.backgroundAudio.volume = this.defaultVolume * ((i + 1) / steps);
        }
    }
    
    /**
     * Establece el volumen por defecto
     * @param {number} volume - 0.0 a 1.0
     */
    setVolume(volume) {
        this.defaultVolume = Math.max(0, Math.min(1, volume));
        if (this.backgroundAudio) {
            this.backgroundAudio.volume = this.defaultVolume;
        }
    }
    
    /**
     * Remueve una instancia de la lista de activos
     * @private
     * @param {HTMLAudioElement} audio 
     */
    _removeInstance(audio) {
        const index = this.activeInstances.indexOf(audio);
        if (index > -1) {
            this.activeInstances.splice(index, 1);
        }
    }
    
    /**
     * Obtiene el estado del manager
     * @returns {Object}
     */
    getStatus() {
        return {
            hasBackground: !!this.backgroundAudio,
            activeInstances: this.activeInstances.length,
            volume: this.defaultVolume
        };
    }
}