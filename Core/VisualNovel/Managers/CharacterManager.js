//@ts-check

/**
 * Gestor de personajes y sprites
 * Maneja mostrar, ocultar y transiciones de personajes
 */
export class CharacterManager {
    /**
     * @param {Object} dependencies
     * @param {import('../Managers/UIManager.js').UIManager} dependencies.uiManager
     * @param {import('../Utils/AssetLoader.js').AssetLoader} dependencies.assetLoader
     */
    constructor(dependencies) {
        this.uiManager = dependencies.uiManager;
        this.assetLoader = dependencies.assetLoader;
        
        /** @type {Set<string>} */
        this.activeCharacters = new Set();
        
        /** @type {number} */
        this.transitionDuration = 300;
    }
    
    /**
     * Muestra un personaje en pantalla
     * @param {string} name - Nombre/ID del personaje
     * @param {string | string[]} image - Ruta de imagen o array de sprites
     * @param {string} position - 'left', 'center', 'right'
     * @param {Object<string, any>} [options] - Opciones adicionales
     * @returns {Promise<void>}
     */
    async show(name, image, position = 'center', options = {}) {
        // Ocultar versión previa si existe
        await this.hide(name);
        
        // Cargar imagen(s)
        let imageSource;
        const isAnimated = Array.isArray(image);
        
        if (isAnimated) {
            imageSource = await this.assetLoader.loadAnimatedSprites(image);
        } else {
            imageSource = await this.assetLoader.loadImage(image);
        }
        
        if (!imageSource) {
            console.warn(`[CharacterManager] No se pudo cargar imagen para: ${name}`);
            return;
        }
        
        // Crear y añadir el personaje
        await this.uiManager.renderCharacter(name, imageSource, position, {
            fps: options.fps ?? 25,
            loop: options.loop ?? true,
            state: options.state ?? 'idle'
        });
        
        this.activeCharacters.add(name);
        
        // Esperar transición
        await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
    }
    
    /**
     * Oculta un personaje de pantalla
     * @param {string} name 
     * @returns {Promise<void>}
     */
    async hide(name) {
        await this.uiManager.hideCharacter(name);
        this.activeCharacters.delete(name);
    }
    
    /**
     * Oculta todos los personajes
     * @returns {Promise<void>}
     */
    async hideAll() {
        const characters = Array.from(this.activeCharacters);
        for (const name of characters) {
            await this.hide(name);
        }
    }
    
    /**
     * Verifica si un personaje está visible
     * @param {string} name 
     * @returns {boolean}
     */
    isVisible(name) {
        return this.activeCharacters.has(name);
    }
    
    /**
     * Obtiene la lista de personajes activos
     * @returns {string[]}
     */
    getActiveCharacters() {
        return Array.from(this.activeCharacters);
    }
    
    /**
     * Obtiene el estado del manager
     * @returns {Object}
     */
    getStatus() {
        return {
            activeCharacters: this.getActiveCharacters(),
            count: this.activeCharacters.size
        };
    }
}