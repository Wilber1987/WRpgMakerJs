//@ts-check

import { StateMachine } from './Core/StateMachine.js';
import { VariableStore } from './Core/VariableStore.js';
import { AudioManager } from './Managers/AudioManager.js';
import { SceneManager } from './Managers/SceneManager.js';
import { CharacterManager } from './Managers/CharacterManager.js';
import { UIManager } from './Managers/UIManager.js';
import { ConditionEvaluator } from './Utils/ConditionEvaluator.js';
import { AssetLoader } from './Utils/AssetLoader.js';
import { CommandProcessor } from './Core/CommandProcessor.js';
import { VisualNovelView } from './VidualNovelView.js';
import { TimeSystem } from '../Common/TimeSystem.js';
import { SaveSystem } from '../Common/SaveSystem.js';

/**
 * Visual Novel Engine - Con CommandProcessor Separado
 * MANTIENE COMPATIBILIDAD TOTAL CON FLOW.X EXISTENTE
 */
export class VisualNovelEngine {
    constructor() {
        // ==================== ESTADO COMPATIBLE (NO CAMBIAR) ====================
        /** @type {boolean} */
        this.jumpTriggered = false;

        /** @type {boolean} */
        this.autoPlay = true;

        /** @type {Number} */
        this.autoPlayTimeOut = 1000;

        /** @type {boolean} */
        this.active = false;

        /** @type {string | null} */
        this.currentScene = null;

        /** @type {string | null} */
        this.currentSceneImage = null;

        /** @type {number} */
        this.currentCommandIndex = 0;

        /** @type {Array<SceneCommand|Function> | undefined} */
        this.currentsBlocks = [];

        /** @type {SceneCommand | undefined} */
        this.ActualMenu = undefined;

        /** @type {number} */
        this.transitionDuration = 300;

        /** @type {(() => void) | null} */
        this.clickHandler = null;

        /** @type {((e: KeyboardEvent) => void) | null} */
        this.keyHandler = null;

        // ==================== COLECCIONES COMPATIBLES (NO CAMBIAR) ====================
        /** @type {Object.<string, Array<SceneCommand|Function>>} */
        this.scenes = {};

        /** @type {Object.<string, any>} */
        this.variables = {};

        /** @type {Array<Object.<string, string>>} */
        this.history = [];

        /** @type {import('../Common/CharacterModel.js').CharacterModel[]} */
        this.Characters = [];

        /** @type {Set<string>} */
        this.activeCharacters = new Set();

        // ==================== UI COMPATIBLE (NO CAMBIAR) ====================
        /** @type {VisualNovelView} */
        this.UI = new VisualNovelView();

        /** @type {Object.<string, HTMLElement>} */
        this.uiElements = {
            gameContainer: this.UI.GetUIElement('game-container'),
            gloablMenuContainer: this.UI.GetUIElement('global-choices-container-menu'),
            textContainer: this.UI.GetUIElement('text-container'),
            textBox: this.UI.GetUIElement('text-box'),
            nameBox: this.UI.GetUIElement('name-box'),
            choicesContainer: this.UI.GetUIElement('choices-container'),
            choicesContainerMenu: this.UI.GetUIElement('choices-container-menu'),
            choicesContainerFullScreen: this.UI.GetUIElement('choices-container-fullscreen'),
            background: this.UI.GetUIElement('background'),
            characterSprites: this.UI.GetUIElement('character-sprites'),
            characterView: this.UI.GetUIElement('character-view-container'),
        };

        // ==================== TIME SYSTEM COMPATIBLE (NO CAMBIAR) ====================
        /** @type {TimeSystem} */
        this.TimeSystem = new TimeSystem(this);

        // ==================== AUDIO COMPATIBLE ====================
        /** @type {HTMLAudioElement[]} */
        this.activeAudioInstances = [];

        /** @type {HTMLAudioElement | null} */
        this.currentBackgroundAudio = new Audio();

        // ==================== COMPONENTES INTERNOS ====================
        this.stateMachine = new StateMachine();
        this.variableStore = new VariableStore();
        this.assetLoader = new AssetLoader();

        // Sincronizar variables
        this.variableStore.onChange((/** @type {string | number} */ name, /** @type {any} */ value) => {
            this.variables[name] = value;
        });

        // ==================== MANAGERS ====================
        this.audioManager = new AudioManager();

        this.uiManager = new UIManager({
            view: this.UI,
            uiElements: this.uiElements,
            audioManager: this.audioManager,
            engine: this
        });

        this.characterManager = new CharacterManager({
            uiManager: this.uiManager,
            assetLoader: this.assetLoader
        });

        this.sceneManager = new SceneManager({
            stateMachine: this.stateMachine,
            uiManager: this.uiManager,
            assetLoader: this.assetLoader,
            timeSystem: this.TimeSystem
        });

        // ==================== CONDITION EVALUATOR ====================
        this.conditionEvaluator = new ConditionEvaluator({
            variableStore: this.variableStore,
            timeSystem: this.TimeSystem
        });

        // ==================== COMMAND PROCESSOR (NUEVO) ====================
        this.commandProcessor = new CommandProcessor({
            engine: this
        });

        // ==================== SAVE SYSTEM ====================
        // @ts-ignore
        this.saveSystem = new SaveSystem(this);

        console.log('[VisualNovelEngine] Inicializado correctamente');
    }

    // ==================== API PÚBLICA COMPATIBLE ====================

    /**
     * @param {string} sceneName
     *  * @param {Array<SceneCommand|Function>} sceneData - Un arreglo de comandos que componen la escena.
     */
    defineScene(sceneName, sceneData) {
        this.scenes[sceneName] = sceneData;
        //console.log(`[VisualNovelEngine] Escena definida: ${sceneName} (${sceneData.length} comandos)`);
    }

    /**
     * @param {string  | null} sceneName
     */
    async startScene(sceneName) {
        if (sceneName == null) return;

        this.active = true;
        this.UI.Connect();
        this.jumpTriggered = true;
        this.currentCommandIndex = 0;

        if (!this.scenes[sceneName]) {
            console.error(`Escena no encontrada: ${sceneName}`);
            return;
        }

        this.currentScene = sceneName;
        this.currentsBlocks = this.scenes[sceneName];

        if (this.currentsBlocks) {
            return await this.executeBlock(this.currentsBlocks, sceneName);
        }
    }

    Disconnect() {
        this.active = false;
        this.clearMenus();
        this.UI.Disconnect();
    }

    async goToCurrentScene() {
        try {
            if (!this.currentScene || !this.scenes[this.currentScene]) {
                console.error(`Escena no encontrada: ${this.currentScene}`);
                return;
            }
            this.currentsBlocks = this.scenes[this.currentScene];
            if (this.currentsBlocks) {
                await this.executeBlock(this.currentsBlocks, this.currentScene);
            }
        } catch (error) {
            console.log(error);
            console.log(this.currentScene);
            console.table(this.scenes[this.currentScene ?? ""]);
        }
    }

    // ==================== EXECUTE BLOCK (CONTROL DE FLUJO - NO CAMBIAR) ====================

    /**
     * Ejecuta una secuencia de comandos.
     * @param {Array<SceneCommand|Function>} blocks - El arreglo de comandos a ejecutar.
     * @param {string | number | null} sceneName - El nombre de la escena actual.
     */
    async executeBlock(blocks, sceneName) {
        try {
            this.currentCommandIndex = 0;

            if (!blocks) {
                console.warn("No hay bloques para ejecutar.");
                return;
            }

            for (const command of blocks) {
                // ✅ VERIFICAR jumpTriggered ANTES de procesar cada comando
                if (sceneName != this.currentScene && !this.jumpTriggered) {
                    return;
                }

                // ✅ Resetear jumpTriggered después de verificar
                if (this.jumpTriggered && sceneName == this.currentScene) {
                    this.jumpTriggered = false;
                }

                // ✅ DELEGAR al CommandProcessor
                const returnCommand = await this.commandProcessor.processCommand(command, sceneName);
                this.currentCommandIndex++;

                // ✅ Si processCommand retorna false, DETENER ejecución del bloque
                if (returnCommand == false) {
                    if (this.clickHandler) document.removeEventListener("click", this.clickHandler);
                    if (this.keyHandler) document.removeEventListener("keypress", this.keyHandler);
                    break;
                }
            }
        } catch (error) {
            console.log(error);
            console.table(blocks);
        }
    }

    // ==================== MÉTODOS DELEGADOS A MANAGERS ====================

    /**
     * @param {string} name
     * @param {string} text
     * @param {string | null} audio
     * @param {boolean} isFemale
     */
    async showText(name, text, audio, isFemale) {
        await this.uiManager.showText(name, text, audio, isFemale);
    }

    /**
     * @param {string} character
     * @param {string | string[]} image
     * @param {string | undefined} position
     */
    async showCharacter(character, image, position, options = {}) {
        await this.characterManager.show(character, image, position, options);
    }

    /**
     * @param {string} character
     */
    async hideCharacter(character) {
        await this.characterManager.hide(character);
    }
    /**
    * @param {SceneCommand} command 
    */
    async changeBackground(command) {
        await this.sceneManager.changeBackground(command);
    }

    /**
     * @param {SceneCommand} command
     * @param {string | number | null} sceneName
     * @param {boolean | undefined} isGlobal
     */
    async showChoices(command, sceneName, isGlobal) {
        await this.uiManager.showChoices(command, sceneName, isGlobal);
    }

    clearMenus(fullMenu = false) {
        this.uiManager.clearMenus(fullMenu);
    }

    // ==================== MÉTODOS DE AUDIO ====================

    stopAllAudio() {
        this.activeAudioInstances.forEach(sound => {
            try {
                sound.pause();
                sound.currentTime = 0;
            } catch (e) { }
        });
        this.activeAudioInstances = [];
    }

    stopCurrentAudio() {
        if (this.currentBackgroundAudio) {
            this.currentBackgroundAudio.pause();
            this.currentBackgroundAudio.currentTime = 0;
            this.currentBackgroundAudio = null;
        }
    }

    // ==================== MÉTODOS DE PERSONAJES ====================

    /**
     * @param {import("../Common/CharacterModel.js").CharacterModel} character
     */
    RegisterCharacter(character) {
        if (!this.Characters.find(char => char.Name == character.Name)) {
            this.Characters.push(character);
        }
    }

    CharacterView() {
        if (!this.uiElements.characterView) return;
        this.uiElements.characterView.innerHTML = "";
        // @ts-ignore
        this.uiElements.characterView.appendChild(new CharacterManagerView(this.Characters));
    }

    // ==================== MÉTODOS DE TIEMPO ====================

    GetCurrenTime() {
        return this.TimeSystem;
    }

    getTimeSuffix() {
        const hour = this.TimeSystem.getCurrentTime().hour;
        if (hour >= 5 && hour < 12) return "_day";
        if (hour >= 12 && hour < 15) return "_day";
        if (hour >= 15 && hour < 20) return "_afternoon";
        if (hour >= 20 || hour < 1) return "_night";
        if (hour >= 1 || hour < 5) return "_night";
        return "_day";
    }


    /**
     * @param {boolean | Function | Condition} condition
     */
    evaluateCondition(condition) {
        const value =  this.conditionEvaluator.evaluate(condition)
        // @ts-ignore
        console.log("IF ====>", condition.var,
            // @ts-ignore
            condition.operator,
            // @ts-ignore
            condition.value, "==>",
            value);
        return value;
    }

    // ==================== GUARDADO ====================

    quickSave(slot = "slot0") {
        if (this.currentScene != "start") {
            this.saveSystem.saveToSlot(slot);
        }
    }

    async quickLoad(slot = "slot0") {
        await this.saveSystem.loadFromSlot(slot);
    }

    GetActualMenu() {
        console.log(this.ActualMenu);
        return this.ActualMenu;
    }

    // ==================== CARGA DE RECURSOS ====================

    /**
     * @param {string} basePath
     */
    async loadImageWithExtensions(basePath) {
        return await this.assetLoader.loadImage(basePath);
    }

    /**
     * @param {string[]} spritePaths
     */
    async loadAnimatedSprites(spritePaths, maxConcurrent = 5) {
        return await this.assetLoader.loadAnimatedSprites(spritePaths, maxConcurrent);
    }

    /**
     * @param {string} url
     */
    async tryLoadVideo(url, extensions = ["mp4", "webm"], timeoutMs = 1500) {
        return await this.assetLoader.loadVideo(url);
    }

    // ==================== WAIT FOR CLICK ====================

    waitForClick = (() => {
        return (time = Date.now()) => {
            console.log("espera", time);
            if (this.clickHandler) document.removeEventListener("click", this.clickHandler);
            if (this.keyHandler) document.removeEventListener("keypress", this.keyHandler);
            return new Promise(resolve => {
                this.clickHandler = () => {
                    if (this.clickHandler) document.removeEventListener("click", this.clickHandler);
                    if (this.keyHandler) document.removeEventListener("keypress", this.keyHandler);
                    this.clickHandler = this.keyHandler = null;
                    resolve(true);
                    console.log("libera:", time);
                };
                this.keyHandler = e => {
                    if (e.key === " " || e.key === "Enter") {
                        if (this.clickHandler) this.clickHandler();
                    }
                };
                document.addEventListener("click", this.clickHandler);
                document.addEventListener("keypress", this.keyHandler);
            });
        };
    })();

    // ==================== ESTADO PARA DEBUGGING ====================

    getStatus() {
        return {
            active: this.active,
            currentScene: this.currentScene,
            currentCommandIndex: this.currentCommandIndex,
            jumpTriggered: this.jumpTriggered,
            variables: { ...this.variables },
            scenes: Object.keys(this.scenes),
            characters: this.Characters.length,
            activeCharacters: Array.from(this.activeCharacters)
        };
    }
}

// ==================== EXPORTACIÓN COMPATIBLE ====================
const vnEngine = new VisualNovelEngine();
// @ts-ignore
const saveSystem = vnEngine.saveSystem;

export { vnEngine, saveSystem };



/**
 * @typedef {Object} SceneCommand
 * @property {string} type - El tipo de comando (e.g., 'say', 'show', 'scene', 'choice').
 * @property {string} [name] - El nombre del personaje que habla (para el tipo 'say').
 * @property {string} [text] - El texto a mostrar (para el tipo 'say').
 * @property {string | null} [audio] - La ruta al archivo de audio (para los tipos 'say', 'audio', 'scene').
 * @property {boolean} [isFemale] - Indica si el personaje que habla es femenino (para el tipo 'say').
 * @property {string} [who] - El nombre del personaje a mostrar u ocultar (para los tipos 'show', 'hide').
 * @property {string} [image] - La ruta de la imagen del personaje o fondo (para los tipos 'show', 'scene').
 * @property {string} [position] - La posición del personaje en pantalla (e.g., 'left', 'center', 'right') (para el tipo 'show').
 * @property {boolean} [loopAudio] - Indica si el audio debe repetirse (para el tipo 'audio').
 * @property {string} [target] - El nombre de la escena a la que saltar (para el tipo 'jump').
 * @property {Array<ChoiceOption>} [options] - Opciones para el comando 'choice'.
 * @property {string} [var] - Nombre de la variable a establecer o modificar (para los tipos 'set', 'sum', 'substrac').
 * @property {any} [value] - Valor a asignar a la variable (para los tipos 'set', 'sum', 'substrac').
 * @property {Condition} [condition] - Condición para el comando 'if'.
 * @property {Array<SceneCommand>} [then] - Bloque de comandos a ejecutar si la condición es verdadera (para el tipo 'if').
 * @property {Array<SceneCommand>} [else] - Bloque de comandos a ejecutar si la condición es falsa (para el tipo 'if').
 * @property {number} [duration] - Duración en milisegundos para el comando 'wait'.
 * @property {Array<SceneCommand>} [commands] - Sub-comandos para el tipo 'block'.
 * @property {boolean} [loopScene] - Indica si el video de la escena debe repetirse (para el tipo 'scene').
 * @property {boolean} [isAffectedByTime] - Indica si la imagen de fondo se ve afectada por la hora del día (para el tipo 'scene').
 * @property {string | null} [video] - Ruta al archivo de video de fondo (para el tipo 'scene').
 */

/**
 * @typedef {Object} ChoiceOption
 * @property {string} text - El texto que se muestra en la opción.
 * @property {string} [icon] - La ruta al icono de la opción.
 * @property {Array<SceneCommand>} [action] - Un bloque de comandos a ejecutar cuando se selecciona esta opción.
 * @property {String} [typeMenu] - El tipo de menú para la opción.
 * @property {number} [xpos] - Posición X para opciones posicionadas (en porcentaje).
 * @property {number} [ypos] - Posición Y para opciones posicionadas (en porcentaje).
 * @property {number} [heightPercent] - Altura de la opción posicionada (en porcentaje).
 * @property {number} [widthPercent] - Ancho de la opción posicionada (en porcentaje).
 * @property {Condition|Function|Boolean} [render] - Condición para que la opción sea visible.
 */

/**
 * @typedef {Object} Condition
 * @property {string} type - El tipo de condición. "variable"|"time"|"and"|"or"|"not"
 * @property {string} [var] - Nombre de la variable a evaluar (para "variable").
 * @property {any} [value] - Valor con el que comparar (para "variable", "time").
 * @property {"=="|"!="|">"|"<"|">="|"<="} [operator] - Operador de comparación (para "variable", "time").
 * @property {Array<Condition>} [conditions] - Arreglo de sub-condiciones (para "and", "or").
 * @property {Condition} [condition] - Sub-condición para "not".
 */
