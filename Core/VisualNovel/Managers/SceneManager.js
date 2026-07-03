//@ts-check

import { TimeSystem } from '../../Common/TimeSystem.js';

/**
 * Gestor de escenas y fondos
 * Maneja carga, transiciones y navegación entre escenas
 */
export class SceneManager {
    /**
     * @param {Object} dependencies
     * @param {import('../Core/StateMachine.js').StateMachine} dependencies.stateMachine
     * @param {import('../Managers/UIManager.js').UIManager} dependencies.uiManager
     * @param {import('../Utils/AssetLoader.js').AssetLoader} dependencies.assetLoader
     * @param {TimeSystem} [dependencies.timeSystem]
     */
    constructor(dependencies) {
        this.stateMachine = dependencies.stateMachine;
        this.uiManager = dependencies.uiManager;
        this.assetLoader = dependencies.assetLoader;
        this.timeSystem = dependencies.timeSystem;
        
        /** @type {Object.<string | number, Object[]>} */
        this.scenes = {};
        
        /** @type {string | number | null} */
        this.currentScene = null;
        
        /** @type {number} */
        this.transitionDuration = 300;
    }
    
    /**
     * Define una nueva escena
     * @param {string | number} name 
     * @param {Object[]} commands 
     */
    defineScene(name, commands) {
        this.scenes[name] = commands;
        console.log(`[SceneManager] Escena definida: ${name} (${commands.length} comandos)`);
    }
    
    /**
     * Inicia una escena
     * @param {string | number | null} name 
     * @returns {Promise<boolean>}
     */
    async startScene(name) {
        if (name === null) return false;
        
        if (!this.scenes[name]) {
            console.error(`[SceneManager] Escena no encontrada: ${name}`);
            return false;
        }
        
        this.currentScene = name;
        this.stateMachine.transition('RUNNING');
        
        await this.executeCommands(this.scenes[name], name);
        return true;
    }
    
    /**
     * Ejecuta una secuencia de comandos
     * @param {Object[]} commands 
     * @param {string | number} sceneName 
     * @returns {Promise<void>}
     */
    async executeCommands(commands, sceneName) {
        // Este método será llamado por CommandProcessor para bloques anidados
        // La lógica de iteración está en el engine principal
        for (const command of commands) {
            if (!this.stateMachine.isActive()) {
                break;
            }
            // El procesamiento individual lo hace CommandProcessor
        }
    }
    
    /**
     * Salta a otra escena
     * @param {string | number} target 
     * @returns {Promise<void>}
     */
    async jumpTo(target) {
        this.stateMachine.transition('IDLE');
        await this.startScene(target);
    }
    
    /**
     * Cambia el fondo de la escena
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @returns {Promise<void>}
     */
    async changeBackground(command) {
        await this.uiManager.changeBackground(command);
    }
    
    /**
     * Obtiene la hora actual del sistema
     * @returns {number}
     */
    getTime() {
        return this.timeSystem ? this.timeSystem.hour : 0;
    }
    
    /**
     * Reinicia la escena actual
     * @returns {Promise<void>}
     */
    async restartCurrent() {
        if (this.currentScene) {
            await this.startScene(this.currentScene);
        }
    }
    
    /**
     * Obtiene los comandos de una escena
     * @param {string | number} name 
     * @returns {Object[] | undefined}
     */
    getSceneCommands(name) {
        return this.scenes[name];
    }
    
    /**
     * Verifica si una escena existe
     * @param {string | number} name 
     * @returns {boolean}
     */
    hasScene(name) {
        return name in this.scenes;
    }
    
    /**
     * Obtiene el estado del manager
     * @returns {Object}
     */
    getStatus() {
        return {
            currentScene: this.currentScene,
            totalScenes: Object.keys(this.scenes).length,
            transitionDuration: this.transitionDuration
        };
    }
}