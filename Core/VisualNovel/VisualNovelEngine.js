//@ts-check
import { CharacterContainer } from "../Common/UIComponents/CharacterContainer.js";
import { CharacterModel } from "../Common/CharacterModel.js";
import { CharacterManagerView } from "../Common/UIComponents/CharacterManagerView.js";
import { SaveSystem } from "../Common/SaveSystem.js";
import { TimeSystem } from "../Common/TimeSystem.js";
import { WAlertMessage } from "../WDevCore/WComponents/WAlertMessage.js";
import { VisualNovelView } from "./VidualNovelView.js";

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
 * @property {"TAB"|"MENU"|"FLOATING"} [typeMenu] - El tipo de menú para la opción.
 * @property {number} [xpos] - Posición X para opciones posicionadas (en porcentaje).
 * @property {number} [ypos] - Posición Y para opciones posicionadas (en porcentaje).
 * @property {number} [heightPercent] - Altura de la opción posicionada (en porcentaje).
 * @property {number} [widthPercent] - Ancho de la opción posicionada (en porcentaje).
 * @property {Condition} [render] - Condición para que la opción sea visible.
 */

/**
 * @typedef {Object} Condition
 * @property {"variable"|"time"|"and"|"or"|"not"} type - El tipo de condición.
 * @property {string} [var] - Nombre de la variable a evaluar (para "variable").
 * @property {any} [value] - Valor con el que comparar (para "variable", "time").
 * @property {"=="|"!="|">"|"<"|">="|"<="} [operator] - Operador de comparación (para "variable", "time").
 * @property {Array<Condition>} [conditions] - Arreglo de sub-condiciones (para "and", "or").
 * @property {Condition} [condition] - Sub-condición para "not".
 */

export class VisualNovelEngine {
    constructor() {
        /** @type {boolean} */
        this.jumpTriggered = false;
        /** @type {Object.<string, Array<SceneCommand>>} */
        this.scenes = {};
        /** @type {string | number | null} */
        this.currentScene = null;
        /** @type {string | null} */
        this.currentSceneImage = null;
        /**
         * @type {CharacterModel[]}
         */
        this.Characters = [];
        /**
         * @type {Array<Object.<string, string>>}
         */
        this.history = [];
        /**@type {Object.<string, any>} */
        this.variables = {};
        /** @type {Set<string>} */
        this.activeCharacters = new Set(); // Track active characters
        /** @type {number} */
        this.transitionDuration = 300; // Default transition duration in ms
        /** @type {VisualNovelView} */
        this.UI = new VisualNovelView()
        /** @type {Object.<string, HTMLElement | null | undefined>} */
        this.uiElements = {
            gameContainer: /** @type {HTMLElement | null | undefined} */(this.UI.GetUIElement("game-container")),
            gloablMenuContainer: /** @type {HTMLElement | null | undefined} */(this.UI.GetUIElement("global-choices-container-menu")),
            textContainer: /** @type {HTMLElement | null | undefined} */(this.UI.GetUIElement("text-container")),
            textBox: /** @type {HTMLElement | null | undefined} */(this.UI.GetUIElement("text-box")),
            nameBox: /** @type {HTMLElement | null | undefined} */(this.UI.GetUIElement("name-box")),
            choicesContainer: /** @type {HTMLElement | null | undefined} */(this.UI.GetUIElement("choices-container")),
            choicesContainerMenu: /** @type {HTMLElement | null | undefined} */(this.UI.GetUIElement("choices-container-menu")),
            choicesContainerFullScreen: /** @type {HTMLElement | null | undefined} */(this.UI.GetUIElement("choices-container-fullscreen")),
            background: /** @type {HTMLElement | null | undefined} */(this.UI.GetUIElement("background")),
            characterSprites: /** @type {HTMLElement | null | undefined} */(this.UI.GetUIElement("character-sprites")),
            characterView: /** @type {HTMLElement | null | undefined} */(this.UI.GetUIElement("character-view-container")),
        };
        /** @type {TimeSystem} */
        this.TimeSystem = new TimeSystem(this);
        /**
         * @type {HTMLAudioElement[]}
         */
        this.activeAudioInstances = [];
        /**@type {HTMLAudioElement | null} */
        this.currentBackgroundAudio = new Audio();
        /** @type {number} */
        this.currentCommandIndex = 0;
        /**
         * @type {Array<SceneCommand> | undefined} 
         */
        this.currentsBlocks = [];
        /** @type {SceneCommand | undefined} */
        this.ActualMenu = undefined;
        /** @type {(() => void) | null} */
        this.clickHandler = null;
        /** @type {((e: KeyboardEvent) => void) | null} */
        this.keyHandler = null;
        // CSS for transitions
    }


    /**
     * Establece el menú global con opciones de elección.
     * @param {SceneCommand} command - El comando de elección que contiene las opciones.
     */
    setglobalMenu(command) {
        this.showChoices(command, this.currentScene, true);
    }

    /**
     * Detiene la reproducción de todos los audios activos y los reinicia.
     */
    stopAllAudio() {
        this.activeAudioInstances.forEach(sound => {
            try {
                sound.pause();
                sound.currentTime = 0;
            } catch (e) { }
        });
        this.activeAudioInstances = [];
    }

    /**
     * Detiene la reproducción del audio de fondo actual y lo reinicia.
     */
    stopCurrentAudio() {
        if (this.currentBackgroundAudio) {
            this.currentBackgroundAudio.pause();
            this.currentBackgroundAudio.currentTime = 0;
            this.currentBackgroundAudio = null;
        }
    }

    // Inyectar estilos CSS para transiciones


    // Definir una escena
    /**
     * Define una nueva escena con un nombre y un conjunto de comandos.
     * @param {string | number} sceneName - El nombre único de la escena.
     * @param {Array<SceneCommand>} sceneData - Un arreglo de comandos que componen la escena.
     */
    defineScene(sceneName, sceneData) {
        this.scenes[sceneName] = sceneData;
    }

    // Iniciar una escena
    /**
     * Inicia la ejecución de una escena específica.
     * @param {string | number} sceneName - El nombre de la escena a iniciar.
     */
    startScene(sceneName) {
        this.active = true;
        this.UI.Connect()
        this.jumpTriggered = true;
        // Limpiar variables temporales
        this.currentCommandIndex = 0;
        console.log(sceneName, this.scenes[sceneName]);

        if (!this.scenes[sceneName]) {
            console.error(`Escena no encontrada: ${sceneName}`);
            return;
        }
        this.currentScene = sceneName;
        this.currentsBlocks = this.scenes[/** @type {string | number} */(this.currentScene)]; // Ensured currentScene is not null
        if (this.currentsBlocks) { // Add null/undefined check here
            this.executeBlock(this.currentsBlocks, sceneName);
        }
    }

    /**
     * Desconecta la interfaz de usuario de la novela visual.
     */
    Disconnect() {
        this.active = false;
        this.UI.Disconnect();
    }

    /**
     * Vuelve a la ejecución de la escena actual desde el principio.
     */
    goToCurrentScene() {
        try {
            if (!this.currentScene || !this.scenes[this.currentScene]) { // Ensure currentScene is not null
                console.error(`Escena no encontrada: ${this.currentScene}`);
                return;
            }
            this.currentsBlocks = this.scenes[this.currentScene]
            if (this.currentsBlocks) { // Add null/undefined check here
                this.executeBlock(this.currentsBlocks, this.currentScene);
            }
        } catch (error) {
            console.log(error);
            console.log(this.currentScene);
            console.table(this.scenes[/** @type {string | number} */(this.currentScene)]); // Ensured currentScene is not null
        }
    }

    // Ejecutar un bloque de comandos
    /**
     * Ejecuta una secuencia de comandos.
     * @param {Array<SceneCommand>} blocks - El arreglo de comandos a ejecutar.
     * @param {string | number | null} sceneName - El nombre de la escena actual.
     */
    async executeBlock(blocks, sceneName) {
        try {
            this.currentCommandIndex = 0;
            if (!blocks) { // Manejar el caso de que blocks sea undefined (aunque ahora es requerido)
                console.warn("No hay bloques para ejecutar.");
                return;
            }
            for (const command of blocks) {

                if (sceneName != this.currentScene && !this.jumpTriggered) return; // ✅ Salir si ya se saltó
                else this.jumpTriggered = false

                const returnCommand = await this.processCommand(command, sceneName);
                this.currentCommandIndex++;
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

    /**
     * Procesa un comando que puede ser una función asíncrona o un objeto.
     * Si es una función, la ejecuta y procesa su resultado recursivamente.
     * @param {SceneCommand | Function} command - El comando o función a procesar.
     * @returns {Promise<SceneCommand | undefined>} - El comando final después de resolver funciones, o undefined si no hay comando.
     */
    async processFunctionComand(command) {
        let commandResult;
        if (typeof command === "function") {
            commandResult = await command();
            if (typeof commandResult === "function") {
                return await this.processFunctionComand(commandResult)
            } else {
                return commandResult
            }
        } else {
            return command;
        }
    }

    // Procesar un comando individual
    /**
     * Procesa un comando individual de la escena.
     * @param {SceneCommand | Function} commandValue - El comando a procesar.
     * @param {string | number | null} sceneName - El nombre de la escena actual.
     * @returns {Promise<boolean>} - Verdadero si la ejecución debe continuar, falso si debe detenerse (e.g., por un 'jump').
     */
    async processCommand(commandValue, sceneName) {
        this.variables["g_time"] = this.TimeSystem.hour
        if (this.jumpTriggered) return true;
        /** @type {SceneCommand | undefined} */
        let command = await this.processFunctionComand(commandValue);

        this.TimeSystem.updateTimeUI();

        if (!command || !command.type) return true;

        switch (command.type) {
            case "block":
                if (command.commands) { // Add null/undefined check here
                    await this.executeBlock(command.commands, sceneName)
                }
                break;
            case "say":
                await this.showText(command.name ?? "", command.text ?? "", command.audio ?? null, command.isFemale ?? false);
                //await this.waitForClick();
                break;
            case "show":
                await this.showCharacter(command.who ?? "", command.image ?? "", command.position ?? "center");
                break;
            case "audio":
                if (command.audio) {
                    this.stopCurrentAudio()
                    const audioInstance = new Audio(command.audio);
                    audioInstance.loop = command.loopAudio ?? true;
                    try {
                        await audioInstance.play();
                        this.currentBackgroundAudio = audioInstance; // Guardamos para detener después
                    } catch (err) {
                        console.warn("Error al reproducir audio:", err);
                    }
                }
                break;
            case "hide":
                await this.hideCharacter(command.who ?? "");
                break;
            case "scene":
                await this.changeBackground(command);
                break;
            case "jump":
                this.clearMenus();
                if (command.target) {
                    this.startScene(command.target);
                }
                this.quickSave();
                return false; // Exit current execution

            case "choice":
                if (command.options) {
                    await this.showChoices(command, sceneName, undefined); // sceneName is now before isGlobal
                }
                break;

            case "set":
                if (command.var !== undefined && command.value !== undefined) {
                    this.variables[command.var] = command.value;
                    console.log(command.var, this.variables[command.var]);
                    WAlertMessage.Info(`${command.var}: ${this.variables[command.var]}`, true)
                }
                break;
            case "sum":
                if (command.var !== undefined && command.value !== undefined) {
                    this.variables[command.var] = (this.variables[command.var] ?? 0) + command.value;
                    WAlertMessage.Info(`${command.var}: ${this.variables[command.var]}`, true)
                    console.log(command.var, this.variables[command.var]);
                }
                break;
            case "substrac":
                if (command.var !== undefined && command.value !== undefined) {
                    this.variables[command.var] = (this.variables[command.var] ?? 0) - command.value;
                    WAlertMessage.Info(`${command.var}: ${this.variables[command.var]}`, true)
                    console.log(command.var, this.variables[command.var]);
                }
                break;

            case "if":
                if (command.condition) {
                    const conditionMet = this.evaluateCondition(command.condition);

                    if (conditionMet) {
                        if (command.then) { // Add null/undefined check here
                            await this.executeBlock(command.then, sceneName);
                        }
                    } else if (command.else) {
                        if (command.else) { // Add null/undefined check here
                            await this.executeBlock(command.else, sceneName);
                        }
                    }
                }
                break;

            case "wait":
                if (command.duration !== undefined) {
                    await new Promise(resolve => setTimeout(resolve, command.duration));
                }
                break;

            default:
                console.warn("Unknown command type:", command.type);
        }
        return true;
    }


    /**
     * Muestra texto con animación de escritura (letra por letra)
     * @param {string} name - Nombre del hablante
     * @param {string} text - Texto a mostrar
     * @param {string|null} [audio=null] - Audio opcional asociado
     * @param {boolean} [isFemale=false] - Indica si el personaje que habla es femenino.
     */
    async showText(name, text, audio = null, isFemale = false) {
        if (!this.uiElements.textBox || !this.uiElements.nameBox || !this.uiElements.textContainer) return;
        // @ts-ignore TODO REVISAR
        this.uiElements.textBox.block = "flex";
        if (isFemale) {
            this.uiElements.nameBox.className = "female"
        } else {
            this.uiElements.nameBox.className = "male"
        }
        this.uiElements.nameBox.textContent = name || "";
        this.uiElements.textBox.textContent = "";
        this.history.push({ name, text });

        let audioFinished = false;
        const localAudios = [];

        if (audio) {
            this.stopAllAudio();
            const sound = new Audio(audio);
            sound.loop = false;
            this.activeAudioInstances.push(sound);
            localAudios.push(sound);
            try {
                await sound.play();
                sound.onended = () => {
                    audioFinished = true;
                };
                sound.onerror = () => {
                    console.warn("Error al reproducir audio:", audio);
                    audioFinished = true;
                };
            } catch (err) {
                console.warn("No se pudo reproducir el audio:", err);
                audioFinished = true;
            }
        }
        this.uiElements.textContainer.style.opacity = "1";
        // ANIMACIÓN DE TEXTO LETRA POR LETRA
        const textBox = this.uiElements.textBox;
        textBox.textContent = "";
        textBox.style.opacity = "0"; // Ocultar antes de comenzar

        // Esperar un fotograma para permitir que transition funcione
        await new Promise(r => requestAnimationFrame(r));

        // Mostrar suavemente
        textBox.style.opacity = "1";

        // Animación letra por letra
        for (let i = 0; i < text.length; i++) {
            textBox.textContent += text[i];
            await new Promise(resolve => setTimeout(resolve, 5));
        }

        // Esperar al menos 1 segundo antes de permitir avanzar (cambiado de 2 a 1 para mayor fluidez)
        const minWait = new Promise(resolve => setTimeout(resolve, 1000));

        // También esperar que termine el audio o que el usuario interactúe
        const userOrAudio = new Promise(resolve => {
            const checkAudioEnd = setInterval(() => {
                if (audioFinished) {
                    clearInterval(checkAudioEnd);
                    cleanup();
                    resolve(true);
                }
            }, 200);

            const cleanup = () => {
                if (this.clickHandler) document.removeEventListener("click", this.clickHandler);
                if (this.keyHandler) document.removeEventListener("keypress", this.keyHandler);
                clearInterval(checkAudioEnd);
            };

            this.clickHandler = () => {
                cleanup();
                resolve(true);
            };

            this.keyHandler = (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    cleanup();
                    resolve(true);
                }
            };

            document.addEventListener("click", /** @type {EventListenerOrEventListenerObject} */(this.clickHandler));
            document.addEventListener("keypress", /** @type {EventListenerOrEventListenerObject} */(this.keyHandler));
        });

        // Esperar ambos: mínimo 1 segundo Y audio/usuario
        await Promise.all([minWait, userOrAudio]);

        // Detener todos los audios de esta escena
        localAudios.forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
    }


    /**
  * Muestra un personaje en la pantalla con una transición.
  * @param {string} character - El nombre o identificador del personaje.
  * @param {string | string[]} image - La ruta de la imagen/video o array de rutas para sprites animados.
  * @param {string} [position='center'] - La posición del personaje en la pantalla.
  * @param {Object} [options] - Opciones adicionales para animación.
  * @param {number} [options.fps] - Frames por segundo para animación (default: 6).
  * @param {boolean} [options.loop] - Si la animación debe repetirse (default: true).
  * @param {string} [options.state] - Estado del personaje (idle, walk, etc.).
  */
    async showCharacter(character, image, position = "center", options = {}) {
        if (!this.uiElements.characterSprites) return;

        let imageSource;
        let isAnimated = Array.isArray(image);

        // Manejar carga de imagen(s)
        if (isAnimated) {
            // Cargar múltiples frames para animación
            // @ts-ignore
            imageSource = await this.loadAnimatedSprites(image);
            if (!imageSource || imageSource.length === 0) {
                console.warn(`No se pudieron cargar los sprites para el personaje: ${character}`);
                return;
            }
        } else {
            // Cargar imagen estática
            // @ts-ignore
            imageSource = await this.loadImageWithExtensions(image);            
            if (!imageSource) {
                console.warn(`No se pudo cargar la imagen para el personaje: ${character} con base: ${image}`);
                return;
            }
        }

        this.hideCharacter(character);

        // Crear elemento con soporte para animación
        // @ts-ignore
        let element = new CharacterContainer(character, imageSource, position, {
            fps: options.fps ?? 25,
            loop: options.loop ?? true,
            state: options.state ?? 'idle'
        });

        this.uiElements.characterSprites.appendChild(element);
        this.activeCharacters.add(character);

        // Esperar transición
        await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
    }
    /**
     * Carga múltiples sprites para animación
     * @param {string[]} spritePaths - Array de rutas de imágenes
     * @param {number} [maxConcurrent] - Máximo de cargas simultáneas
     * @returns {Promise<(string | HTMLImageElement)[]>}
     */
    async loadAnimatedSprites(spritePaths, maxConcurrent = 5) {
        /**
         * @type {(string | null)[]}
         */
        const loadedSprites = [];

        // Carga en lotes para no saturar
        for (let i = 0; i < spritePaths.length; i += maxConcurrent) {
            const batch = spritePaths.slice(i, i + maxConcurrent);
            const results = await Promise.allSettled(
                batch.map(path => this.loadImageWithExtensions(path))
            );

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    loadedSprites.push(result.value);
                } else {
                    console.warn(`Failed to load sprite: ${batch[index]}`);
                    loadedSprites.push(null); // Mantener índice para animación
                }
            });
        }

        // Filtrar nulls si prefieres, o mantenerlos para sincronización de frames
        return loadedSprites.filter(s => s !== null);
    }


    /**
     * Intenta cargar una imagen o video probando con diferentes extensiones.
     * @param {string} basePath - La ruta base del archivo (sin extensión).
     * @returns {Promise<string | null>} - La URL válida del recurso o null si no se encuentra.
     */
    async loadImageWithExtensions(basePath) {
        const extensions = ["webp", "png", "jpg", "mp4", "webm"];
        const hasExtension = /\.\w+$/.test(basePath);

        // Si ya tiene extensión, intentar directamente
        if (hasExtension) {
            try {
                const response = await fetch(basePath, { method: "HEAD" });
                if (response.ok) {
                    return basePath;
                }
            } catch (_) {
                // No mostrar nada aquí para evitar ruido en consola
            }
        }

        // Probar con múltiples extensiones silenciosamente
        for (const ext of extensions) {
            const url = `${basePath}.${ext}`;
            try {
                const response = await fetch(url, { method: "HEAD" });
                if (response.ok) {
                    return url;
                }
            } catch (_) {
                // No mostrar errores aquí
            }
        }

        // Solo mostrar advertencia si ningún recurso fue válido
        console.warn(`Ninguna extensión válida encontrada para: ${basePath}`);
        return null;
    }


    /**
     * Oculta un personaje de la pantalla con una transición.
     * @param {string} character - El nombre o identificador del personaje a ocultar.
     */
    async hideCharacter(character) {
        /**@type {Array<CharacterContainer>} */
        // @ts-ignore
        const elements = this.uiElements.characterSprites?.querySelectorAll(`.character-${character}`);

        if (!elements || elements.length === 0) return;
        for (const el of elements) {
            el.close();
        }
        this.activeCharacters.delete(character);
    }

    /**
     * Oculta todos los personajes actualmente visibles en la pantalla.
     */
    async hideAllCharacter() {
        const elements = this.uiElements.characterSprites?.querySelectorAll(`.character-container`);

        if (!elements || elements.length === 0) return;

        for (const el of elements) {
            el.classList.remove("visible");
            el.classList.add("hiding");

            // Esperar a que termine la transición antes de remover
            await new Promise(resolve => {
                el.addEventListener("transitionend", () => {
                    el.remove();
                    resolve(true);
                }, { once: true });
            });
        }
    }

    /**
     * Cambia el fondo de la escena con una transición, pudiendo ser una imagen o un video.
     * También puede reproducir un audio asociado al fondo.
     * @param {string | SceneCommand} commandInput - La URL de la imagen/video o un objeto de comando de escena.
     */
    async changeBackground(commandInput) {
        /** @type {SceneCommand} */
        let command;
        // Si es solo una URL (imagen), convertirlo en un comando compatible
        if (typeof commandInput === "string") {
            command = { type: "scene", image: commandInput };
        } else {
            command = commandInput;
        }

        // Detener cualquier audio previo

        this.hideAllCharacter()

        const currentBg = this.uiElements.background?.querySelector(".background-image");
        const newBgContainer = document.createElement("div");
        newBgContainer.className = "background-image";
        newBgContainer.style.position = "absolute";
        newBgContainer.style.width = "100%";
        newBgContainer.style.height = "100%";
        newBgContainer.style.opacity = "0";

        /** @type {HTMLVideoElement | HTMLImageElement | null} */
        let mediaElement = null;

        // Reproducir audio asociado si existe
        if (command.audio) {
            this.stopAllAudio()
            const audioInstance = new Audio(command.audio);
            audioInstance.loop = command.loopScene ?? true;
            try {
                await audioInstance.play();
                this.activeAudioInstances.push(audioInstance)
                //this.currentBackgroundAudio = audioInstance; // Guardamos para detener después
            } catch (err) {
                console.warn("Error al reproducir audio:", err);
            }
        }
        command.video = command.video ?? await this.tryLoadVideo(command.image ?? "");

        // Manejo de video
        if (command.video) {
            let validVideoUrl = null;

            // Si ya tiene extensión, intentar directamente
            const hasExtension = /\.\w+$/.test(command.video);
            if (hasExtension) {
                validVideoUrl = command.video;
            } else { // Intenta con extensiones comunes
                validVideoUrl = await this.tryLoadVideo(command.video, ["mp4", "webm"]);
            }

            // Si encontramos un video válido, crear el elemento
            if (validVideoUrl) {
                mediaElement = document.createElement("video");
                mediaElement.src = validVideoUrl;
                mediaElement.autoplay = true;
                mediaElement.muted = false; // El audio del video puede ser importante
                mediaElement.loop = command.loopScene ?? true;
                mediaElement.playsInline = true;
                mediaElement.style.width = "100%";
                mediaElement.style.height = "100%";
                mediaElement.style.objectFit = "cover";

                if (mediaElement.loop) {
                    mediaElement.addEventListener("timeupdate", () => {
                        if (mediaElement && mediaElement instanceof HTMLVideoElement && mediaElement.duration - mediaElement.currentTime < 0.1) {
                            mediaElement.currentTime = 0;
                            mediaElement.play();
                        }
                    });
                }

                newBgContainer.appendChild(mediaElement);

                try {
                    if (mediaElement instanceof HTMLVideoElement) {
                        await mediaElement.play();
                        // Si no es loop, esperar hasta que termine o pasen 5 segundos
                        if (!mediaElement.loop) {
                            const videoEnded = new Promise(resolve => {
                                if (mediaElement != null) mediaElement.onended = resolve;
                            });
                            const timeout = new Promise(resolve => setTimeout(resolve, 5000));
                            await Promise.race([videoEnded, timeout]);
                        }
                    }
                } catch (err) {
                    console.warn("Reproducción automática bloqueada:", err);
                }

                // Detener video anterior si existe
                if (currentBg) {
                    const oldVideo = currentBg.querySelector("video");
                    if (oldVideo) {
                        oldVideo.pause();
                        oldVideo.currentTime = 0;
                    }
                }

            } else {
                console.warn("No se pudo cargar ningún video válido.");
                // Opcional: mostrar imagen alternativa o mensaje
            }
        }

        // Manejo de imagen
        else if (command.image && command.video == null) {
            // Intentar encontrar una imagen válida
            let imageUrl = command.image;

            if (command.isAffectedByTime) {
                const suffix = this.getTimeSuffix();

                // Separar nombre y extensión si hay extensión
                const match = imageUrl.match(/^(.*)(\.\w+)$/);
                if (match) {
                    // Hay extensión → insertar sufijo antes
                    imageUrl = `${match[1]}${suffix}${match[2]}`;
                } else {
                    // No hay extensión → agregar sufijo al final
                    imageUrl = `${imageUrl}${suffix}`;
                }
            }
            let validImage = await this.loadImageWithExtensions(imageUrl);
            newBgContainer.style.backgroundImage = `url('${validImage}')`;
            newBgContainer.style.backgroundSize = "cover";
            newBgContainer.style.backgroundPosition = "center";
        }

        this.uiElements.background?.appendChild(newBgContainer);

        // Forzar reflow para activar transición
        void newBgContainer.offsetWidth;

        // Eliminar fondo anterior

        currentBg?.classList.add("fade-out");
        setTimeout(() => {
            currentBg?.remove();
        }, 200);


        // Activar opacidad
        newBgContainer.style.opacity = "1";

        // Esperar a que termine la transición visual
        await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
        if (command.video) {
            await this.waitForClick() // Esperar la interacción del usuario si es un video
        }
    }

    /**
     * Obtiene el sufijo de tiempo ("_day", "_afternoon", "_night") basado en la hora actual.
     * @returns {string} - El sufijo de tiempo.
     */
    getTimeSuffix() {
        const hour = this.TimeSystem.getCurrentTime().hour;

        if (hour >= 5 && hour < 12) return "_day";
        if (hour >= 12 && hour < 15) return "_day";
        if (hour >= 15 && hour < 20) return "_afternoon";
        if (hour >= 20 || hour < 1) return "_night";
        if (hour >= 1 || hour < 5) return "_night";

        return "_day"; // fallback
    }

    /**
     * Intenta cargar un archivo de video con varias extensiones.
     * @param {string} url - La ruta base del archivo (sin extensión).
     * @param {string[]} [extensions=["mp4", "webm"]] - Arreglo de extensiones a probar.
     * @param {number} [timeoutMs=1500] - Tiempo máximo de espera para la respuesta HEAD.
     * @returns {Promise<string | null>} - La URL válida del video o null si no se encuentra.
     */
    async tryLoadVideo(url, extensions = ["mp4", "webm"], timeoutMs = 1500) {
        for (const ext of extensions) {
            const testUrl = `${url}.${ext}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetch(testUrl, {
                    method: "HEAD",
                    signal: controller.signal,
                    cache: "no-store"
                });
                clearTimeout(timeout);

                if (response.ok) {
                    return testUrl; // ✅ Archivo encontrado
                }
            } catch (err) {
                // Ignorar errores o timeout
            }
        }
        return null; // ❌ Ningún formato disponible
    }




    /**
     * Muestra opciones de elección al usuario, organizadas en diferentes tipos de menú.
     * @param {SceneCommand} command - El comando de elección que contiene las opciones.
     * @param {string | number | null} sceneName - El nombre de la escena actual.
     * @param {boolean} [isGlobal=false] - Indica si el menú es global y no bloquea el flujo.
     */
    async showChoices(command, sceneName, isGlobal = false) {
        if (!command.options) return; // Si no hay opciones, salir

        let options = command.options
        if (!this.uiElements.textContainer) return;
        this.uiElements.textContainer.style.opacity = "0";
        const validOptions = options.filter((/** @type {ChoiceOption} */ option) =>
            !option.render || this.evaluateCondition(option.render)
        );

        if (validOptions.length === 0) return;

        // Separar por tipo de menú
        const tabOptions = validOptions.filter(o => o.typeMenu === "TAB");
        const menuOptions = validOptions.filter(o => o.typeMenu === "MENU");
        const floatingOptions = validOptions.filter(o => o.typeMenu === "FLOATING");
        const positionedOptions = validOptions.filter(o => o.xpos !== undefined && o.ypos !== undefined);
        const defaultOptions = validOptions.filter(o => !o.typeMenu && o.xpos === undefined);

        // 1. Menú TAB - Cuadrícula en esquina inferior derecha
        if (tabOptions.length > 0) {
            if (!this.uiElements.choicesContainer) return;
            this.uiElements.choicesContainer.style.opacity = "0";
            const tabWrapper = document.createElement("div");
            tabWrapper.className = "menu-wrapper menu-tab-container";
            tabWrapper.style.gridTemplateColumns = `repeat(${Math.min(4, tabOptions.length)}, 1fr)`;

            for (const option of tabOptions) {
                const button = await this.createChoiceButton(option, undefined, sceneName, command);
                tabWrapper.appendChild(button);
            }
            if (!isGlobal) {
                this.uiElements.choicesContainer?.appendChild(tabWrapper);
                this.uiElements.choicesContainer.style.display = "grid";
                this.uiElements.choicesContainer.style.opacity = "1";
            } else {
                this.uiElements.gloablMenuContainer?.appendChild(tabWrapper);
            }
        }

        // 2. Menú lateral fijo - Tipo MENU
        if (menuOptions.length > 0) {
            if (!this.uiElements.choicesContainerFullScreen) return;
            this.uiElements.choicesContainerFullScreen.style.opacity = "0";
            const menuWrapper = document.createElement("div");
            menuWrapper.className = "menu-wrapper menu-container";

            for (const option of menuOptions) {
                const button = await this.createChoiceButton(option, undefined, sceneName, command);
                menuWrapper.appendChild(button);
            }
            if (!isGlobal) {
                this.uiElements.choicesContainerFullScreen?.appendChild(menuWrapper);
                this.uiElements.choicesContainerFullScreen.style.display = "flex";
                this.uiElements.choicesContainerFullScreen.style.opacity = "1"

            } else {
                this.uiElements.gloablMenuContainer?.appendChild(menuWrapper);
            }
        }

        // 3. Menú flotante - No bloquea el flujo
        if (floatingOptions.length > 0) {
            if (!this.uiElements.choicesContainerMenu) return;
            this.uiElements.choicesContainerMenu.style.opacity = "0"
            this.uiElements.choicesContainerMenu.innerHTML = ""
            const floatingWrapper = document.createElement("div");
            floatingWrapper.className = "menu-wrapper menu-floating-container";

            for (const option of floatingOptions) {
                const button = await this.createChoiceButton(option, undefined, sceneName, command);
                floatingWrapper.appendChild(button);
            }
            if (!isGlobal) {
                this.uiElements.choicesContainerMenu?.appendChild(floatingWrapper);
                this.uiElements.choicesContainerMenu.style.display = "flex";
                this.uiElements.choicesContainerMenu.style.opacity = "1"
            }
            else {
                this.uiElements.gloablMenuContainer?.appendChild(floatingWrapper);
            }
            // NO esperamos click ni promesa aquí
        }
        if (positionedOptions.length > 0) {
            if (!this.uiElements.choicesContainerFullScreen) return;
            this.uiElements.choicesContainerFullScreen.style.opacity = "0"
            const positionedWrapper = document.createElement("div");
            positionedWrapper.className = "menu-wrapper menu-positioned-container";
            // 4. Opciones posicionadas manualmente
            for (const option of positionedOptions) {
                const button = await this.createChoiceButton(option, undefined, sceneName, command);
                button.style.position = "absolute";
                //button.style.left = `${(this.uiElements.background.offsetWidth * (option.xpos / 100))}px`;
                //button.style.top = `${(this.uiElements.background.offsetHeight * (option.ypos / 100))}px`; heightPercent, widthPercent
                button.style.left = `${option.xpos}%`;
                button.style.bottom = `${option.ypos}%`;
                if (option.heightPercent || option.widthPercent) {
                    button.style.height = option.heightPercent ? `${option.heightPercent}%` : "auto";
                    button.style.width = option.widthPercent ? `${option.widthPercent}%` : "auto";
                    button.style.background = "none"
                    button.classList.add("btnlayout")
                }
                positionedWrapper.appendChild(button);
            }
            if (!isGlobal) {
                this.uiElements.choicesContainerFullScreen?.appendChild(positionedWrapper);
                this.uiElements.choicesContainerFullScreen.style.display = "flex";
                this.uiElements.choicesContainerFullScreen.style.opacity = "1";
            } else {
                this.uiElements.gloablMenuContainer?.appendChild(positionedWrapper);
            }
        }

        // 5. Opciones normales (centradas)
        const normalOptions = [...defaultOptions];
        if (normalOptions.length > 0) {
            if (!this.uiElements.choicesContainer) return;
            this.uiElements.choicesContainer.style.opacity = "0";
            const defaultWrapper = document.createElement("div");
            defaultWrapper.className = "menu-wrapper default-choice-wrapper";
            defaultWrapper.style.display = "flex";
            defaultWrapper.style.flexDirection = "column";
            defaultWrapper.style.gap = "10px";

            for (const option of normalOptions) {
                const button = await this.createChoiceButton(option, defaultWrapper, sceneName, command);
                defaultWrapper.appendChild(button);
            }
            if (!isGlobal) {
                this.uiElements.choicesContainer?.appendChild(defaultWrapper);
                this.uiElements.choicesContainer.style.display = "flex";
                this.uiElements.choicesContainer.style.opacity = "1"

            } else {
                this.uiElements.gloablMenuContainer?.appendChild(defaultWrapper);
            }
            // Solo esperar click si hay opciones normales
            await new Promise(resolve => {
                const buttons = defaultWrapper.querySelectorAll("button");
                const handler = () => {
                    buttons.forEach(btn => btn.removeEventListener("click", handler));
                    resolve(true);
                };

                buttons.forEach(btn => btn.addEventListener("click", handler));
            });
        }
    }

    /**
     * Limpia todos los menús de elección de la interfaz de usuario, excepto los globales.
     */
    clearMenus() {
        this.uiElements.gameContainer?.querySelectorAll(".menu-wrapper").forEach(menu => {
            // @ts-ignore
            if (menu.parentNode?.id == "global-choices-container-menu") { // Acceso seguro a parentNode
                return
            }
            // @ts-ignore
            menu.style.opacity = "0";
            setTimeout(() => {
                menu.remove();
            }, 1000);
        })
        if (this.uiElements.choicesContainerFullScreen) this.uiElements.choicesContainerFullScreen.style.opacity = "0";
        if (this.uiElements.choicesContainer) this.uiElements.choicesContainer.style.opacity = "0";
        if (this.uiElements.choicesContainerMenu) this.uiElements.choicesContainerMenu.style.opacity = "0";
        if (this.uiElements.textContainer) this.uiElements.textContainer.style.opacity = "0";
    }

    /**
     * Crea un botón de opción para un menú de elección.
     * @param {ChoiceOption} option - El objeto de opción de elección.
     * @param {HTMLElement | undefined} menuWrapper - El contenedor del menú donde se agregará el botón.
     * @param {string | number | null} sceneName - El nombre de la escena actual.
     * @param {SceneCommand} command - El comando de elección original.
     * @returns {Promise<HTMLButtonElement>} - El elemento botón creado.
     */
    async createChoiceButton(option, menuWrapper, sceneName, command) {
        const button = document.createElement("button");

        // Mantener las clases originales según el tipo de menú
        if (option.typeMenu === "TAB") {
            button.className = "choice-button menu-tab-item";
        } else if (option.typeMenu === "MENU") {
            button.className = "choice-button menu-item";
        } else if (option.xpos !== undefined && option.ypos !== undefined) {
            button.className = "choice-button positioned-choice";
        } else if (option.typeMenu === "FLOATING") {
            button.className = "choice-button menu-floating-item";
        } else {
            button.className = "choice-button";
        }
        if (button.className != "choice-button positioned-choice") {
            const label = document.createElement("label");
            label.innerText = option.text;
            button.appendChild(label);
        }

        // Agregar icono si existe
        if (option.icon) {
            // Intentar encontrar una imagen válida
            let validImage = await this.loadImageWithExtensions(option.icon);
            if (!validImage) {
                console.warn(`No se pudo cargar la imagen para icono "${option.icon}"`);
            }
            const icon = document.createElement("img");
            if (validImage) { // Solo asignar src si validImage no es null
                icon.src = validImage;
            }
            icon.className = "menu-icon";
            button.prepend(icon);
        }

        // Acción al hacer click
        button.addEventListener("click", async () => {
            this.ActualMenu = command
            if (menuWrapper) {
                menuWrapper.remove()
            }
            button.classList.add("fade-out");
            await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
            //console.log(menuWrapper);
            if (option.action) {
                // @ts-ignore
                if (button.parentNode?.parentNode?.id == "global-choices-container-menu") {
                    this.jumpTriggered = true
                }
                await this.executeBlock(option.action, sceneName);

            }
        });

        return button;
    }
    // Esperar click para continuar
    /**
     * Espera un click o una pulsación de tecla (Espacio/Enter) para continuar la ejecución.
     * @returns {Promise<boolean>} - Una promesa que se resuelve cuando ocurre una interacción.
     */
    waitForClick = (() => {
        /** @type {(() => void) | null} */
        this.clickHandler = null;
        /** @type {((e: KeyboardEvent) => void) | null} */
        this.keyHandler = null;

        return (time = Date.now()) => {
            console.log("espera", time);

            // ① Limpiar cualquier listener viejo
            if (this.clickHandler) document.removeEventListener("click", this.clickHandler);
            if (this.keyHandler) document.removeEventListener("keypress", this.keyHandler);

            return new Promise(resolve => {
                this.clickHandler = () => {
                    // ② Retirar los listeners actuales
                    if (this.clickHandler) document.removeEventListener("click", this.clickHandler);
                    if (this.keyHandler) document.removeEventListener("keypress", this.keyHandler);
                    this.clickHandler = this.keyHandler = null;        // liberar variables
                    resolve(true);
                    console.log("libera:", time);
                };

                this.keyHandler = e => {
                    if (e.key === " " || e.key === "Enter") {
                        if (this.clickHandler) this.clickHandler();
                    }
                };

                // ③ Registrar los nuevos listeners
                document.addEventListener("click", /** @type {EventListenerOrEventListenerObject} */(this.clickHandler));
                document.addEventListener("keypress", /** @type {EventListenerOrEventListenerObject} */(this.keyHandler));
            });
        };
    })();

    /**
     * Evalúa una condición booleana basada en variables de juego o la hora actual.
     * @param {boolean | Condition} condition - La condición a evaluar. Puede ser un booleano directo o un objeto Condition.
     * @returns {boolean} - El resultado de la evaluación de la condición.
     */
    evaluateCondition(condition) {
        if (typeof condition === "boolean") {
            return condition;
        }
        if (!condition) return true; // Si la condición es null o undefined, se considera verdadera
        console.log("ev:", condition);
        console.log("result:", condition.var, this.variables[condition.var ?? ""], this.variables[condition.var ?? ""] == condition.value);
        if (condition.var && !this.variables[condition.var]) { // Acceder a condition.var de forma segura
            this.variables[condition.var] = 0;
        }
        switch (condition.type) {
            case "variable":
                if (condition.var === undefined || condition.operator === undefined || condition.value === undefined) return false;
                const value = this.variables[condition.var];
                switch (condition.operator) {
                    case "==": return value == condition.value;
                    case "!=": return value != condition.value;
                    case ">": return value > condition.value;
                    case "<": return value < condition.value;
                    case ">=": return value >= condition.value;
                    case "<=": return value <= condition.value;
                    default: return false;
                }
            case "time":
                if (condition.operator === undefined || condition.value === undefined) return false;
                const currentHour = this.TimeSystem.getCurrentTime().hour;
                switch (condition.operator) {
                    case "==": return currentHour == condition.value;
                    case ">": return currentHour > condition.value;
                    case "<": return currentHour < condition.value;
                    case ">=": return currentHour >= condition.value;
                    case "<=": return currentHour <= condition.value;
                    default: return false;
                }
            case "and":
                return condition.conditions?.every(c => this.evaluateCondition(c)) ?? false; // Acceso seguro a conditions

            case "or":
                return condition.conditions?.some(c => this.evaluateCondition(c)) ?? false; // Acceso seguro a conditions

            case "not":
                return !this.evaluateCondition(condition.condition ?? false); // Acceso seguro a condition

            default:
                return false;
        }
    }

    //console.log("test", Vars);
    /**
     * Renderiza la vista de personajes en el contenedor de la interfaz de usuario.
     */
    CharacterView() {
        if (!this.uiElements.characterView) return;
        this.uiElements.characterView.innerHTML = "";
        this.uiElements.characterView.appendChild(new CharacterManagerView(this.Characters));
    }
    /**
     * Registra un nuevo personaje en el motor de la novela visual.
     * @param {CharacterModel} character - El modelo del personaje a registrar.
     */
    RegisterCharacter(character) {
        if (!this.Characters.find(char => char.Name == character.Name)) {
            this.Characters.push(character)
        }
    }
    /**
    * Obtiene el sistema de tiempo actual.
    * @returns {TimeSystem}
    */
    GetCurrenTime() {
        return this.TimeSystem
    }
    /**
     * Establece las propiedades de las variables del juego con valores proporcionados.
     * @param {Object.<string, any>} [Vars={}] - Un objeto con las variables a establecer.
     */
    SetProps(Vars = {}) {
        for (const key in this.variables) {
            if (Vars.hasOwnProperty(key)) { // Corregido: usar hasOwnProperty
                Vars[key] = this.variables[key]
            }
            //console.log("test", Vars);

        }

    }

    //GUARDADO 
    /**
     * Realiza un guardado rápido del estado del juego en un slot específico.
     * @param {string} [slot="slot0"] - El nombre del slot de guardado.
     */
    quickSave(slot = "slot0") {
        if (this.currentScene != "start") {
            saveSystem.saveToSlot(slot);
        }
    }

    /**
     * Carga un estado de juego desde un slot específico.
     * @param {string} [slot="slot0"] - El nombre del slot de guardado a cargar.
     */
    quickLoad(slot = "slot0") {
        saveSystem.loadFromSlot(slot);
    }
    /**
     * Obtiene el menú actual activo.
     * @returns {SceneCommand | undefined} - El objeto del menú actual o undefined si no hay ninguno.
     */
    GetActualMenu() {
        console.log(this.ActualMenu);
        return this.ActualMenu
    }
}
const vnEngine = new VisualNovelEngine();
const saveSystem = new SaveSystem(vnEngine);

export { vnEngine, saveSystem };