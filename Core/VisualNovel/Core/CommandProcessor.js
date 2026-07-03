//@ts-check

import { WAlertMessage } from '../../WDevCore/WComponents/WAlertMessage.js';


/**
 * Procesador de comandos del Visual Novel Engine
 * Separa la lógica de ejecución de comandos del motor principal
 */
export class CommandProcessor {
    /**
     * @param {Object} dependencies - Dependencias inyectadas desde el engine
     * @param {import('../VisualNovelEngine.js').VisualNovelEngine} dependencies.engine
     */
    constructor(dependencies) {
        this.engine = dependencies.engine;
        
        // Referencias directas para acceso rápido
        this.variables = dependencies.engine.variables;
        this.TimeSystem = dependencies.engine.TimeSystem;
        this.uiManager = dependencies.engine.uiManager;
        this.characterManager = dependencies.engine.characterManager;
        this.sceneManager = dependencies.engine.sceneManager;
        this.audioManager = dependencies.engine.audioManager;
        this.conditionEvaluator = dependencies.engine.conditionEvaluator;
    }

    /**
     * Procesa un comando individual
     * @param {import('../VisualNovelEngine.js').SceneCommand | Function} commandValue - El comando a procesar
     * @param {string | number | null} sceneName - Nombre de la escena actual
     * @returns {Promise<boolean>} - True para continuar, False para detener
     */
    async processCommand(commandValue, sceneName) {
        // Actualizar variable de tiempo
        this.variables["g_time"] = this.TimeSystem.hour;

        // Si jumpTriggered está activo, NO procesar más comandos
        if (this.engine.jumpTriggered) return true;

        /** @type {import('../VisualNovelEngine.js').SceneCommand | undefined} */
        let command = await this._processFunctionCommand(commandValue);

        this.TimeSystem.updateTimeUI();

        if (!command || !command.type) return true;

        console.log('[CommandProcessor] Procesando:', command.type);

        // Switch principal de tipos de comando
        switch (command.type) {
            case "block":
                return await this._handleBlock(command, sceneName);

            case "say":
                return await this._handleSay(command);

            case "show":
                return await this._handleShow(command);

            case "audio":
                return await this._handleAudio(command);

            case "hide":
                return await this._handleHide(command);

            case "scene":
                return await this._handleScene(command);

            case "jump":
                return await this._handleJump(command);

            case "choice":
                return await this._handleChoice(command, sceneName);

            case "set":
                return await this._handleSet(command);

            case "sum":
                return await this._handleSum(command);

            case "substrac":
                return await this._handleSubstrac(command);

            case "if":
                return await this._handleIf(command, sceneName);

            case "wait":
                return await this._handleWait(command);

            default:
                console.warn("Unknown command type:", command.type);
                return true;
        }
    }

    /**
     * Procesa comandos que son funciones
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand | Function} command | Function} command 
     * @returns {Promise<import('../VisualNovelEngine.js').SceneCommand | undefined>}
     */
    async _processFunctionCommand(command) {
        if (typeof command === "function") {
            const commandResult = await command();
            if (typeof commandResult === "function") {
                return await this._processFunctionCommand(commandResult);
            } else {
                return commandResult;
            }
        }
        return command;
    }

    // ==================== HANDLERS DE COMANDOS ====================

    /**
     * Maneja comando de bloque (sub-comandos anidados)
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @param {string | number | null} sceneName 
     * @returns {Promise<boolean>}
     */
    async _handleBlock(command, sceneName) {
        if (command.commands) {
            await this.engine.executeBlock(command.commands, sceneName);
        }
        return true;
    }

    /**
     * Maneja comando de diálogo
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @returns {Promise<boolean>}
     */
    async _handleSay(command) {
        await this.engine.showText(
            command.name ?? "",
            command.text ?? "",
            command.audio ?? null,
            command.isFemale ?? false
        );
        return true;
    }

    /**
     * Maneja comando de mostrar personaje
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @returns {Promise<boolean>}
     */
    async _handleShow(command) {
        await this.engine.showCharacter(
            command.who ?? "",
            command.image ?? "",
            command.position ?? "center"
        );
        return true;
    }

    /**
     * Maneja comando de audio
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @returns {Promise<boolean>}
     */
    async _handleAudio(command) {
        if (command.audio) {
            this.engine.stopCurrentAudio();
            const audioInstance = new Audio(command.audio);
            audioInstance.loop = command.loopAudio ?? true;
            try {
                await audioInstance.play();
                this.engine.currentBackgroundAudio = audioInstance;
            } catch (err) {
                console.warn("Error al reproducir audio:", err);
            }
        }
        return true;
    }

    /**
     * Maneja comando de ocultar personaje
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @returns {Promise<boolean>}
     */
    async _handleHide(command) {
        await this.engine.hideCharacter(command.who ?? "");
        return true;
    }

    /**
     * Maneja comando de cambio de escena/fondo
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @returns {Promise<boolean>}
     */
    async _handleScene(command) {
        await this.engine.changeBackground(command);
        return true;
    }

    /**
     * Maneja comando de salto a otra escena
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @returns {Promise<boolean>}
     */
    async _handleJump(command) {
        this.engine.clearMenus(true);
        this.characterManager.hideAll()
        if (command.target) {
            this.engine.quickSave();
            this.engine.jumpTriggered = true;
            this.engine.startScene(command.target);
            console.log("Jump to ->", command.target);
            
        }
        return false; // Detener ejecución del bloque actual
    }

    /**
     * Maneja comando de elección
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @param {string | number | null} sceneName 
     * @returns {Promise<boolean>}
     */
    async _handleChoice(command, sceneName) {
        if (command.options) {
            await this.engine.showChoices(command, sceneName, undefined);
            // ✅ CORRECCIÓN CRÍTICA: Solo detener si hubo jump dentro de la acción
            if (this.engine.jumpTriggered) {
                return false;
            }
            return true; // Continuar con el siguiente comando del bloque padre
        }
        return true;
    }

    /**
     * Maneja comando de establecer variable
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @returns {Promise<boolean>}
     */
    async _handleSet(command) {
        if (command.var !== undefined && command.value !== undefined) {
            this.variables[command.var] = command.value;
            this.engine.variableStore.set(command.var, command.value)
            console.log(command.var, this.variables[command.var]);
            WAlertMessage.Info(`${command.var}: ${this.variables[command.var]}`, true);
        }
        return true;
    }

    /**
     * Maneja comando de sumar variable
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @returns {Promise<boolean>}
     */
    async _handleSum(command) {
        if (command.var !== undefined && command.value !== undefined) {
            this.variables[command.var] = (this.variables[command.var] ?? 0) + command.value;           
            WAlertMessage.Info(`${command.var}: ${this.variables[command.var]}`, true);
            console.log(command.var, this.variables[command.var]);
        }
        return true;
    }

    /**
     * Maneja comando de restar variable
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @returns {Promise<boolean>}
     */
    async _handleSubstrac(command) {
        if (command.var !== undefined && command.value !== undefined) {
            this.variables[command.var] = (this.variables[command.var] ?? 0) - command.value;
            WAlertMessage.Info(`${command.var}: ${this.variables[command.var]}`, true);
            console.log(command.var, this.variables[command.var]);
        }
        return true;
    }

    /**
     * Maneja comando condicional if/else
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @param {string | number | null} sceneName 
     * @returns {Promise<boolean>}
     */
    async _handleIf(command, sceneName) {
        if (command.condition) {        
            const conditionMet = this.conditionEvaluator.evaluate(command.condition);  
              console.log("IF ====>" ,command.condition.var, 
                command.condition.operator, 
                command.condition.value, "==>" , 
                conditionMet);
            if (conditionMet) {
                if (command.then) {
                    await this.engine.executeBlock(command.then, sceneName);
                }
            } else if (command.else) {
                if (command.else) {
                    await this.engine.executeBlock(command.else, sceneName);
                }
            }
        }
        return true;
    }

    /**
     * Maneja comando de espera
     * @private
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @returns {Promise<boolean>}
     */
    async _handleWait(command) {
        if (command.duration !== undefined) {
            await new Promise(resolve => setTimeout(resolve, command.duration));
        }
        return true;
    }
}