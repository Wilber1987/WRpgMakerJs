//@ts-check
import { ComponentsManager, html } from "../WDevCore/WModules/WComponentsTools.js";
import { css } from "../WDevCore/WModules/WStyledRender.js";

export class CharacterContainer extends HTMLElement {
    /**
     * @param {string} character
     * @param {string | HTMLImageElement | HTMLImageElement[]} imageUrl - URL estática, imagen única, o array de sprites
     * @param {string} [position]
     * @param {Object} [options]
     * @param {number} [options.fps] - Frames por segundo para animación
     * @param {boolean} [options.loop] - Si la animación debe repetirse
     * @param {string} [options.state] - Estado del personaje (idle, walk, etc.)
     */
    constructor(character, imageUrl, position = "center", options = {}) {
        super();
        this.character = character;
        this.position = position;
        this.options = {
            fps: options.fps ?? 6,
            loop: options.loop ?? true,
            state: options.state ?? 'idle'
        };
        
        // Configuración de animación
        this.isAnimated = Array.isArray(imageUrl);
        this.spriteFrames = this.isAnimated ? imageUrl : [imageUrl];
        this.currentFrame = 0;
        this.animTimer = 0;
        this.frameTime = 1 / this.options.fps;
        this.animationId = null;
        this.isPlaying = false;
        
        this.append(this.CustomStyle);
        this.className = this.className + " character-container character-" + character;
        // @ts-ignore
        this.Draw(character, this.spriteFrames[0], position);
    }

    connectedCallback() {
        ComponentsManager.modalFunction(this);
        if (this.isAnimated) {
            this.startAnimation();
        }
    }

    disconnectedCallback() {
        this.stopAnimation();
    }

    close() {
        this.stopAnimation();
        ComponentsManager.modalFunction(this);
        setTimeout(() => {
            this.parentNode?.removeChild(this);
        }, 500);
    }

    /**
     * @param {string} character
     * @param {string | HTMLImageElement} imageUrl
     * @param {string} [position]
     */
    Draw = async (character, imageUrl, position = "center") => {
        const imgElement = html`<img src="${imageUrl}" class="character ${position}" alt="${character}" />`;
        this.imgElement = imgElement;
        this.append(imgElement);
    }

    /**
     * Cambia los frames de animación dinámicamente
     * @param {string[] | HTMLImageElement[]} frames
     * @param {number?} [fps]
     */
    setAnimationFrames(frames, fps = null) {
        this.stopAnimation();
        this.spriteFrames = frames;
        this.isAnimated = frames.length > 1;
        
        if (fps !== null) {
            this.options.fps = fps;
            this.frameTime = 1 / fps;
        }
        
        this.currentFrame = 0;
        
        if (this.isAnimated && this.isConnected) {
            this.startAnimation();
        } else if (frames.length > 0) {
            this._updateFrame(frames[0]);
        }
    }

    /**
     * Cambia el estado de animación (ej: idle -> walk)
     * @param {Object.<string, string[]>} spriteStates - { idle: [...], walk: [...], attack: [...] }
     * @param {string} newState
     * @param {number?} [fps]
     */
    setState(spriteStates, newState, fps = null) {
        if (spriteStates[newState]) {
            this.options.state = newState;
            this.setAnimationFrames(spriteStates[newState], fps);
        }
    }

    /**
     * Inicia la animación
     */
    startAnimation() {
        if (!this.isAnimated || this.isPlaying) return;
        
        this.isPlaying = true;
        this.lastTimestamp = 0;
        this._animate();
    }

    /**
     * Detiene la animación
     */
    stopAnimation() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Pausa la animación
     */
    pauseAnimation() {
        this.isPlaying = false;
    }

    /**
     * Reanuda la animación
     */
    resumeAnimation() {
        if (this.isAnimated) {
            this.isPlaying = true;
            this._animate();
        }
    }

    /**
     * Loop de animación principal
     * @param {number} timestamp
     */
    _animate = (timestamp) => {
        if (!this.isPlaying) return;

        if (!this.lastTimestamp) this.lastTimestamp = timestamp;
        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;

        this.animTimer += deltaTime;

        if (this.animTimer >= this.frameTime) {
            this.animTimer -= this.frameTime;
            this.currentFrame = (this.currentFrame + 1) % this.spriteFrames.length;
            this._updateFrame(this.spriteFrames[this.currentFrame]);
        }

        this.animationId = requestAnimationFrame(this._animate);
    }

    /**
     * Actualiza el frame visible
     * @param {string | HTMLImageElement} frame
     */
    _updateFrame(frame) {
        if (this.imgElement) {
            if (typeof frame === 'string') {
                this.imgElement.src = frame;
            } else if (frame instanceof HTMLImageElement) {
                this.imgElement.src = frame.src;
            }
        }
    }

    /**
     * Salta a un frame específico
     * @param {number} frameIndex
     */
    goToFrame(frameIndex) {
        if (frameIndex >= 0 && frameIndex < this.spriteFrames.length) {
            this.currentFrame = frameIndex;
            this._updateFrame(this.spriteFrames[frameIndex]);
        }
    }

    /**
     * Obtiene el frame actual
     * @returns {number}
     */
    getCurrentFrame() {
        return this.currentFrame;
    }

    /**
     * Cambia los FPS de la animación
     * @param {number} fps
     */
    setFPS(fps) {
        this.options.fps = fps;
        this.frameTime = 1 / fps;
    }

    CustomStyle = css`
        w-character-container { 
            opacity: 0; 
            transition: all 1s; 
        }
        
        w-character-container.visible {
            opacity: 1;
        }
        
        .character {
            display: block;
            image-rendering: pixelated;
            transition: transform 0.3s ease;
        }
        
        .character.center {
            margin: 0 auto;
        }
        
        .character.left {
            margin-right: auto;
        }
        
        .character.right {
            margin-left: auto;
        }
    `;
}

customElements.define('w-character-container', CharacterContainer);