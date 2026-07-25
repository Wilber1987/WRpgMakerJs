//@ts-check

import { VisualNovelEngine } from "../VisualNovel/VisualNovelEngine.js";
import { CharacterModel } from "../Common/CharacterModel.js";
import { GameEngine } from "../OppenWorld/GameEngine.js";
import { SaveLoadView } from "./UIComponents/SaveLoadView.js";
import { OpenWorldEngineView } from "../OppenWorld/OpenWorldEngineView.js";
import { CharacterRegistry } from "./CharacterRegistry.js";
import { SkillRegistry } from "./SkillRegistry.js";
import { SkillModel } from "./SkillModel.js";

// ============================================================
// ==================== TYPE DEFINITIONS ======================
// ============================================================

/**
 * @typedef {Object} TimeState
 * @property {number} hour - Hora actual (0-23)
 * @property {number} minute - Minuto actual (0-59)
 * @property {string} [period] - Período del día (opcional)
 */

/**
 * @typedef {Object} VisualNovelSaveData
 * @property {Object.<string, any>} variables - Variables globales de la novela visual
 * @property {Array<Object.<string, string>>} history - Historial de diálogos mostrados
 * @property {string | number } currentScene - Nombre de la escena actual
 * @property {number} currentCommandIndex - Índice del comando actual en ejecución
 * @property {string[]} activeCharacters - Lista de personajes actualmente visibles
 * @property {TimeState | null} timeState - Estado del sistema de tiempo
 * @property {string[]} sceneRegistry - Registro de nombres de escenas definidas
* @property {string} lastBackground - Registro de nombres de escenas definidas
* @property {boolean} active - Estado de actividad del motor VN
 */

/**
 * @typedef {Object} SerializedCharacter
 * @property {string} Name - Nombre identificador del personaje
 * @property {string} __className - Nombre identificador de la clase
 * @property {Object.<string, any>} __props
 * @property {boolean} isNPC - Indica si es un personaje no jugador
 * @property {boolean} isFollower - Indica si es un personaje es seguidor
 * @property {boolean} isFemale - Indica si es un personaje es seguidor
 * @property {{x: number, y: number}} position - Posición en coordenadas del mapa
 * @property {string} direction - Dirección actual de la animación
 * @property {string} state - Estado de animación actual (idle, walk, attack, etc.)
 * @property {number} animFrame - Frame actual de la animación
 * @property {Object.<string, any>} Stats - Estadísticas del personaje (hp, strength, etc.)
 * @property {number} Level - Nivel de experiencia del personaje
 * @property {number} Experience - Puntos de experiencia acumulados
 * @property {Array<any>} Inventory - Array de objetos en el inventario
 * @property {Array<any>} Skills - Array de habilidades aprendidas
 * @property {Array<NpcMapData>} MapData - Datos específicos de posición por mapa
 * @property {Object.<string, any>} customProps - Propiedades personalizadas serializables
 */

/**
 * @typedef {Object} NpcMapData
 * @property {string} name - Nombre del mapa al que aplica esta configuración
 * @property {number} posX - Coordenada X de spawn en este mapa
 * @property {number} posY - Coordenada Y de spawn en este mapa
 * @property {Function} [action] - Función de acción específica para este mapa
 * @property {Function} [ActionQuestion] - Función de pregunta de acción para este mapa
 */

/**
 * @typedef {Object} CameraState
 * @property {number} x - Posición X de la cámara en tiles
 * @property {number} y - Posición Y de la cámara en tiles
 * @property {number} zoom - Factor de zoom actual de la cámara
 */

/**
 * @typedef {Object.<string, SerializedCharacter[]>} NPCsByMap
 * @description Mapa de nombres de mapa a arrays de NPCs serializados
 */

/**
 * @typedef {Object} OpenWorldSaveData
 * @property {SerializedCharacter | null} player - Datos serializados del personaje principal
 * @property {SerializedCharacter[]} characters - Array de todos los personajes del mundo
 * @property {string | null} currentMap - Nombre del mapa actual
 * @property {{x: number, y: number} | null} playerPosition - Posición del jugador al momento del guardado
 * @property {CameraState} camera - Estado de la cámara
 * @property {NPCsByMap} npcs - NPCs organizados por mapa
 * @property {Object.<string, any>} [worldVars] - Variables globales del mundo (opcional)
 */

/**
 * @typedef {Object} SaveState
 * @property {number} timestamp - Marca de tiempo del guardado (Unix epoch ms)
 * @property {string} version - Versión del formato de guardado para compatibilidad
 * @property {VisualNovelSaveData | null} visualNovel - Estado del motor VisualNovel
 * @property {OpenWorldSaveData | null} openWorld - Estado del motor OpenWorld
 */

/**
 * @typedef {Object} SlotMetadata
 * @property {string} slot - Nombre identificador del slot (ej: 'slot1', 'autosave')
 * @property {number} timestamp - Marca de tiempo del guardado
 * @property {string} [map] - Nombre del mapa actual (solo OpenWorld)
 * @property {string | number} [scene] - Nombre de la escena actual (solo VisualNovel)
 * @property {string} [characterName] - Nombre del personaje principal
 * @property {string} [miniature] - Nombre del personaje principal
 * @property {{x: number, y: number}} [playerPosition] - Posición del jugador
 */

/**
 * Representación serializable de una instancia de SkillModel (o derivadas) para guardado.
 * Incluye metadata de clase para reflexión y reconstrucción de instancias con tipado preservado.
 * 
 * @typedef {Object} SerializedSkill
 * 
 * === METADATA PARA REFLEXIÓN (requeridos para reconstrucción de instancias) ===
 * @property {string} __className - Nombre de la clase para registro/reflexión (ej: 'SkillModel', 'FireballSkill')
 * @property {Object.<string, any>} __props - Props de inicialización para pasar al constructor
 * @property {string} icon
* @property {Function} calculateDamage
* @property {string} numberTargets
* @property {string} spriteSkillAnimation
 * === PROPIEDADES BASE DE SKILL (configuración estática) ===
 * @property {string} name - Nombre identificador de la habilidad
 * @property {string} description - Descripción textual de la habilidad
 * @property {number} level - Nivel actual de la habilidad (1-10, por ejemplo)
 * @property {number} [damage] - Daño base que inflige la habilidad (si aplica)
 * @property {number} [manaCost] - Costo de recursos (mana/energía) para usar la habilidad
 * @property {number} [cooldown] - Tiempo de recarga base en segundos
 * @property {string} [type] - Tipo o categoría de la habilidad (ej: 'attack', 'heal', 'buff')
 * @property {string} [targetType] - Tipo de objetivo (ej: 'single', 'aoe', 'self')
 * @property {number} [range] - Rango de alcance en tiles o unidades
 * 
 * === ESTADO DINÁMICO (se actualiza durante el gameplay) ===
 * @property {number} [currentCooldown] - Tiempo restante de recarga actual (en segundos o ticks)
 * @property {number|null} [usesRemaining] - Usos restantes (para habilidades con cargas limitadas)
 * @property {boolean} [unlocked] - Indica si la habilidad está desbloqueada para el personaje
 * @property {number} [experience] - Puntos de experiencia acumulados en esta habilidad
 * @property {number} [lastUsedTimestamp] - Marca de tiempo del último uso (para cooldowns precisos)
 * 
 * === PROPIEDADES EXTENDIDAS (opcionales, según implementación) ===
 * @property {Object.<string, any>} [modifiers] - Modificadores activos aplicados a la skill
 * @property {string[]} [prerequisites] - Habilidades requeridas para desbloquear esta
 * @property {number} [maxLevel] - Nivel máximo alcanzable por esta habilidad
 * @property {Object.<string, any>} [scaling] - Fórmulas o valores de escalado por nivel
 * 
 * === PROPIEDADES PERSONALIZADAS SERIALIZABLES ===
 * @property {Object.<string, any>} [customProps] - Props adicionales serializables específicas de subclases
 * 
 * @example
 * // Skill básica serializada
 * {
 *   __className: 'SkillModel',
 *   __props: { name: 'Ataque Básico', damage: 10, manaCost: 5 },
 *   level: 3,
 *   unlocked: true,
 *   experience: 150
 * }
 * 
 * @example
 * // Skill personalizada con estado dinámico
 * {
 *   __className: 'FireballSkill',
 *   __props: { name: 'Bola de Fuego', damage: 25, manaCost: 15, element: 'fire' },
 *   level: 5,
 *   currentCooldown: 2.5,
 *   usesRemaining: 3,
 *   unlocked: true,
 *   customProps: { elementalBonus: 1.2, critChance: 0.15 }
 * }
 */

// ============================================================
// ==================== SAVE SYSTEM CLASS =====================
// ============================================================

/**
 * Sistema de guardado unificado para VisualNovelEngine y OpenWorldEngine.
 * 
 * Gestiona la serialización, almacenamiento y restauración del estado completo
 * del juego, incluyendo: variables, historia, personajes, posición en mapa,
 * estado de NPCs y configuración de cámara.
 * 
 * @example
 * // Inicialización
 * const saveSystem = new SaveSystem(vnEngine, openWorldEngine);
 * 
 * // Guardar en slot específico
 * saveSystem.saveToSlot('slot1');
 * 
 * // Cargar desde slot
 * await saveSystem.loadFromSlot('slot1');
 * 
 * // Mostrar UI de guardado/carga
 * saveSystem.showSaveLoadScreen(true); // true = modo carga, false = modo guardado
 * 
 * @class
 */
export class SaveSystem {

    /**
     * Crea una nueva instancia del sistema de guardado.
     * 
     * @constructor
     * @param {VisualNovelEngine} vnEngine - Instancia del motor de novela visual
     * @param {OpenWorldEngineView} openWorldEngine - Instancia del motor de mundo abierto
     */
    constructor(vnEngine, openWorldEngine) {
        /** 
         * @type {VisualNovelEngine} 
         */
        this.vnEngine = vnEngine;

        vnEngine.saveSystem = this

        /** 
         * @type {OpenWorldEngineView} 
         */
        this.openWorldEngine = openWorldEngine;

        /** 
         * @type {Storage} 
         * @description Backend de almacenamiento (localStorage por defecto)
         */
        this.storage = localStorage;

        /** 
         * @type {string} 
         * @description Prefijo para las keys de localStorage
         */
        this.savePrefix = 'owvn-save-';
    }

    /**
     * Actualiza o establece la referencia al motor OpenWorld.
     * Útil si el motor se inicializa después del SaveSystem.
     * 
     * @param {OpenWorldEngineView} engine - Nueva instancia del motor OpenWorld
     * @public
     */
    setOpenWorldEngine(engine) {
        this.openWorldEngine = engine;
    }

    /**
     * Guarda el estado completo del juego en un slot específico.
     * 
     * Captura automáticamente el estado actual si no se proporciona un estado explícito.
     * Los datos se serializan a JSON y se almacenan en localStorage con el prefijo configurado.
     * 
     * @param {string} slot - Nombre identificador del slot de guardado (ej: 'slot1', 'autosave')
     * @param {SaveState | null} [state=null] - Estado a guardar. Si es null, se captura automáticamente
     * @returns {boolean} Verdadero si el guardado fue exitoso, falso en caso de error
     * @public
     */
    saveState(slot, state = null) {
        try {
            const gameState = state || this.captureGameState();
            const serializedState = JSON.stringify(gameState);
            this.storage.setItem(`${this.savePrefix}${slot}`, serializedState);
            console.log(`✅ Estado guardado en ${slot}`);
            return true;
        } catch (err) {
            console.error('❌ Error al guardar el estado:', err);
            return false;
        }
    }

    /**
     * Carga y deserializa un estado previamente guardado desde un slot.
     * 
     * @param {string} slot - Nombre del slot de guardado a cargar
     * @returns {SaveState | null} El estado deserializado, o null si no existe o hay error
     * @public
     */
    loadState(slot) {
        try {
            const serializedState = this.storage.getItem(`${this.savePrefix}${slot}`);
            return serializedState ? JSON.parse(serializedState) : null;
        } catch (err) {
            console.error('❌ Error al cargar el estado:', err);
            return null;
        }
    }

    /**
     * Elimina permanentemente un estado guardado de un slot específico.
     * 
     * @param {string} slot - Nombre del slot a eliminar
     * @public
     */
    deleteState(slot) {
        this.storage.removeItem(`${this.savePrefix}${slot}`);
        console.log(`🗑️ Estado eliminado de ${slot}`);
    }

    /**
     * Obtiene metadata de todos los slots de guardado disponibles.
     * 
     * Itera sobre localStorage filtrando keys con el prefijo de guardado,
     * parsea los datos básicos y retorna información útil para la UI.
     * 
     * @returns {SlotMetadata[]} Array de metadata de slots, ordenado por timestamp descendente
     * @public
     */
    getAvailableSlots() {
        const slots = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key?.startsWith(this.savePrefix)) {
                const slotName = key.replace(this.savePrefix, '');
                try {
                    const data = JSON.parse(this.storage.getItem(key) ?? "{}");
                    slots.push({
                        slot: slotName,
                        timestamp: data.timestamp || 0,
                        map: data.openWorld?.currentMap,
                        scene: data.visualNovel?.currentScene,
                        characterName: data.openWorld?.player?.Name,
                        playerPosition: data.openWorld?.player?.position,
                        miniature: data.visualNovel.active ? data.visualNovel.lastBackground : ""
                    });
                } catch {
                    slots.push({ slot: slotName, timestamp: 0 });
                }
            }
        }
        return slots.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Captura y serializa el estado actual de ambos motores de juego.
     * 
     * Este método es el corazón del sistema de guardado. Recopila:
     * - Variables, historia y escena actual del VisualNovelEngine
     * - Posición, stats, inventario y MapData de personajes del OpenWorldEngine
     * - Estado de la cámara y mapa actual
     * - NPCs organizados por mapa con sus posiciones específicas
     * 
     * @returns {SaveState} Objeto de estado completo listo para serialización JSON
     * @private
     */
    captureGameState() {
        const state = {
            timestamp: Date.now(),
            version: '1.0.0',
            visualNovel: null,
            openWorld: null
        };

        // === CAPTURAR VISUAL NOVEL ===
        if (this.vnEngine) {
            // @ts-ignore
            state.visualNovel = {
                variables: { ...this.vnEngine.variables },
                history: [...this.vnEngine.history],
                currentScene: this.vnEngine.currentScene,
                currentCommandIndex: this.vnEngine.currentCommandIndex ?? 0,
                activeCharacters: Array.from(this.vnEngine.activeCharacters),
                timeState: this.vnEngine.TimeSystem?.getCurrentTime?.() || null,
                // Guardar escenas definidas (referencia, no contenido completo para ahorrar espacio)
                sceneRegistry: Object.keys(this.vnEngine.scenes),
                active: this.vnEngine.active,
                lastBackground: this.vnEngine.uiElements.background?.innerHTML,
            };
        }

        // === CAPTURAR OPEN WORLD ===
        if (this.openWorldEngine) {
            const worldEngine = this.openWorldEngine.GameEngine;
            const player = worldEngine.SelectedCharacter;
            // @ts-ignore
            state.openWorld = {
                // Jugador principal
                player: player ? this._serializeCharacter(player) : null,
                characters: worldEngine.Characters
                    .map(character => this._serializeCharacter(character)),
                // Estado del mundo
                currentMap: worldEngine.currentMap?.name || null,
                playerPosition: player ? { x: player.x, y: player.y } : null,
                camera: {
                    x: worldEngine.cam.x,
                    y: worldEngine.cam.y,
                    zoom: worldEngine.cam.zoom
                },
                // NPCs y sus estados por mapa
                npcs: this._serializeNPCs(),
                // Objetos del mapa que puedan tener estado (opcional)
                // mapObjects: this._serializeMapObjects(),
                // Variables globales del mundo (si existen)
                //worldVars: { ...worldEngine.variables } 
            };
        }

        return state;
    }

    /**
     * Serializa un CharacterModel para almacenamiento persistente.
     * 
     * Extrae propiedades serializables manteniendo la estructura necesaria
     * para restauración posterior. Filtra métodos y referencias no-JSON.
     * 
     * @param {CharacterModel | null} character - Personaje a serializar
     * @returns {SerializedCharacter | null} Datos serializados o null si character es null
     * @private
     */
    /**
  * Serializa un CharacterModel para almacenamiento persistente.
  * Incluye metadata de clase para restauración con tipado preservado.
  * 
  * @param {CharacterModel | null} character - Personaje a serializar
  * @returns {SerializedCharacter | null} Datos serializados o null
  * @private
  */
    _serializeCharacter(character) {
        if (!character) return null;

        // 🔥 METADATA PARA REFLEXIÓN
        const className = CharacterRegistry.getClassName(character);

        // Separar: props de inicialización vs estado dinámico
        // Props que deberían ir al constructor (configuración base)
        const initProps = {
            Name: character.Name,
            isNPC: character.isNPC ?? false,
            Stats: { ...character.Stats },
            Level: character.Level,
            Experience: character.Experience,
            // Agregar aquí otras props de configuración que tu constructor espere
            // Ej: isFemale, tileHeight, speed, etc.
        };

        // Estado dinámico que se fusiona POST-construcción
        return {
            // === METADATA DE REFLEXIÓN ===
            __className: className,
            __props: initProps,

            // === ESTADO DINÁMICO (se aplica con Object.assign) ===
            // Posición y animación
            position: { x: character.x, y: character.y },
            direction: character.direction,
            isFollower: character.isFollower ?? false,
            isFemale: character.isFemale,
            state: character.state,
            animFrame: character.animFrame,
            Name: character.Name,
            // Colecciones (serialización profunda)
            Inventory: JSON.parse(JSON.stringify(character.Inventory || [])),
            Skills: this._serializeSkills(character.Skills || []),
            MapData: character.MapData ? JSON.parse(JSON.stringify(character.MapData)) : [],
            Stats: { ...character.Stats },
            Level: character.Level,
            Experience: character.Experience,
            isNPC: character.isNPC ?? false,
            // Props personalizadas serializables
            customProps: this._extractCustomProps(character)
        };
    }

    /**
     * Serializa array de Skills preservando tipo con metadata de clase.
     * @param {Array<SkillModel>} skills 
     * @returns {Array<SerializedSkill>}
     * @private
     */
    _serializeSkills(skills) {
        if (!Array.isArray(skills)) return [];
        // @ts-ignore
        return skills.map(skill => {
            // Si es instancia con constructor válido
            if (skill?.constructor?.name && skill.constructor.name !== 'Object') {
                const className = SkillRegistry.getClassName(skill);

                // Props de inicialización (configuración base)
                const initProps = {
                    name: skill.name,
                    description: skill.description,
                    icon: skill.icon,
                    //calculateDamage: skill.calculateDamage,
                    numberTargets: skill.numberTargets,
                    spriteSkillAnimation: skill.spriteSkillAnimation,
                    manaCost: skill.manaCost,
                    level: skill.level,
                    cooldown: skill.cooldown,
                    // Agregar aquí otras props que tu constructor de SkillModel espere
                };

                return {
                    // === METADATA PARA REFLEXIÓN ===
                    __className: className,
                    __props: initProps,

                    // === ESTADO DINÁMICO ===
                    name: skill.name,
                    description: skill.description,
                    icon: skill.icon,
                    //calculateDamage: skill.calculateDamage,
                    numberTargets: skill.numberTargets,
                    spriteSkillAnimation: skill.spriteSkillAnimation,
                    manaCost: skill.manaCost,
                    level: skill.level,
                    cooldown: skill.cooldown,
                };
            }

            // Fallback: objeto plano (skills que no son instancias)
            return {
                __className: 'SkillModel',
                __props: { ...skill },
                ...skill
            };
        });
    }

    /**
     * Extrae propiedades personalizadas de un personaje que son serializables.
     * 
     * Filtra automáticamente:
     * - Funciones/métodos
     * - Propiedades del prototipo
     * - Objetos no-JSON (como Image, Canvas, etc.)
     * - Propiedades del sistema ya manejadas explícitamente
     * 
     * @param {CharacterModel} character - Personaje del cual extraer props
     * @returns {Object.<string, any>} Objeto con propiedades personalizadas serializables
     * @private
     */
    _extractCustomProps(character) {
        const props = {};
        // Copiar propiedades que no son métodos ni del prototipo
        for (const key of Object.keys(character)) {
            // @ts-ignore
            if (typeof character[key] !== 'function' &&
                !['MapData', 'Sprites', 'Stats', 'Inventory', 'Skills'].includes(key)) {
                try {
                    // @ts-ignore
                    JSON.stringify(character[key]); // Verificar que sea serializable
                    // @ts-ignore
                    props[key] = character[key];
                } catch {
                    // Ignorar propiedades no serializables
                }
            }
        }
        return props;
    }

    /**
     * Serializa todos los NPCs organizados por mapa.
     * 
     * @returns {NPCsByMap} Objeto con NPCs agrupados por nombre de mapa
     * @private
     */
    _serializeNPCs() {
        const npcsByMap = {};

        // @ts-ignore
        if (!this.openWorldEngine?.GameEngine?.maps) return npcsByMap;
        for (const [mapName, map] of Object.entries(this.openWorldEngine.GameEngine?.maps)) {
            if (map?.NPCs?.length) {
                // @ts-ignore
                npcsByMap[mapName] = map.NPCs
                    .filter(npc => npc?.Name) // Solo NPCs válidos
                    .map(npc => this._serializeCharacter(npc));
            }
        }
        // @ts-ignore
        return npcsByMap;
    }

    /**
     * Restaura el estado completo del juego desde datos serializados.
     * 
     * Orquesta la restauración coordinada de ambos motores:
     * 1. Primero OpenWorld (para establecer mapa y posición base)
     * 2. Luego VisualNovel (para restaurar escena y variables)
     * 3. Finalmente reanuda la ejecución si estaba activa
     * 
     * @param {SaveState} state - Estado previamente capturado a restaurar
     * @returns {Promise<boolean>} Verdadero si la restauración fue exitosa
     * @public
     * @async
     */
    async restoreGameState(state) {
        try {
            console.log('🔄 Restaurando estado del juego...');
            console.log(state);
            // === RESTAURAR OPEN WORLD ===
            if (state.openWorld && this.openWorldEngine) {
                await this._restoreOpenWorld(state.openWorld);
            }

            // === RESTAURAR VISUAL NOVEL ===
            if (state.visualNovel && this.vnEngine) {
                await this._restoreVisualNovel(state.visualNovel);
                if (this.vnEngine.active == true) {
                    // @ts-ignore
                    this.vnEngine.uiElements.background.innerHTML = state.visualNovel.lastBackground

                    // @ts-ignore
                    this.vnEngine.startScene(state.visualNovel.currentScene);
                    //this.vnEngine.waitForClick();
                }
            }
            console.log('✅ Estado restaurado correctamente');
            this.SaveLoadView?.close();
            return true;
        } catch (err) {
            console.error('❌ Error al restaurar estado:', err);
            return false;
        }
    }

    /**
     * Restaura específicamente el estado del VisualNovelEngine.
     * 
     * @param {VisualNovelSaveData} vnState - Datos de estado de la novela visual
     * @returns {Promise<void>}
     * @private
     * @async
     */
    async _restoreVisualNovel(vnState) {
        const engine = this.vnEngine;

        // Restaurar variables y estado básico
        Object.assign(engine.variables, vnState.variables || {});
        engine.history = vnState.history || [];
        engine.currentCommandIndex = vnState.currentCommandIndex || 0;

        engine.variableStore.setMultiple(engine.variables)

        // Restaurar personajes activos
        if (vnState.activeCharacters) {
            engine.activeCharacters = new Set(vnState.activeCharacters);
        }

        // Restaurar sistema de tiempo si existe
        if (vnState.timeState && engine.TimeSystem?.currentTime) {
            Object.assign(engine.TimeSystem.currentTime, vnState.timeState);
        }

        // Si hay escena actual, prepararla (no ejecutar automáticamente)
        if (vnState.currentScene && engine.scenes[vnState.currentScene]) {
            // @ts-ignore
            engine.currentScene = vnState.currentScene;
            engine.currentsBlocks = engine.scenes[vnState.currentScene];
        }
        engine.active = vnState.active;

    }

    /**
  * Restaura específicamente el estado del OpenWorldEngine.
  * Ahora usa búsqueda por Name para personajes, permitiendo creación dinámica.
  * 
  * @param {OpenWorldSaveData} owState - Datos de estado del mundo abierto
  * @returns {Promise<void>}
  * @private
  * @async
  */
    async _restoreOpenWorld(owState) {
        const engine = this.openWorldEngine.GameEngine;
        const context = { engine, openWorldEngine: this.openWorldEngine };

        // === 1. Restaurar personaje principal ===
        if (owState.player) {
            // Buscar existente por Name (clave única) o usar SelectedCharacter
            let playerChar = engine.SelectedCharacter;
            if (owState.player.Name && (!playerChar || playerChar.Name !== owState.player.Name)) {
                // @ts-ignore
                playerChar = engine.Characters.find(c => c.Name === owState.player?.Name) || null;
            }

            const restored = await this._restoreCharacterFromData(playerChar, owState.player, context);

            // Asegurar que SelectedCharacter apunte al restaurado
            if (restored && owState.player.Name === restored.Name) {
                engine.SelectedCharacter = restored;
            }

            // Restaurar posición
            if (owState.playerPosition && engine.SelectedCharacter) {
                engine.SelectedCharacter.x = owState.playerPosition.x;
                engine.SelectedCharacter.y = owState.playerPosition.y;
            }
        }

        // === 2. Restaurar/crear personajes dinámicos (NO por índice, por Name) ===
        if (owState.characters && Array.isArray(owState.characters)) {
            for (const savedChar of owState.characters) {
                if (!savedChar.Name) continue; // Skip sin nombre

                // Buscar existente por Name (clave única)
                const existingChar = engine.Characters.find(c => c.Name === savedChar.Name) || null;

                // Restaurar o crear
                await this._restoreCharacterFromData(existingChar, savedChar, context);
            }
        }

        // === 3. Cambiar al mapa guardado (si aplica) ===
        if (owState.currentMap && engine.maps[owState.currentMap]) {
            this.openWorldEngine.GoToMap(owState.currentMap);
            this.openWorldEngine.screenView?.hide();

            // Restaurar posición post-cambio
            if (owState.playerPosition && engine.SelectedCharacter) {
                engine.SelectedCharacter.x = owState.playerPosition.x;
                engine.SelectedCharacter.y = owState.playerPosition.y;
            }
        }

        // === 4. Restaurar cámara ===
        if (owState.camera && engine.cam) {
            Object.assign(engine.cam, owState.camera);
        }

        // === 5. Restaurar NPCs por mapa (usando MapData como fuente de verdad) ===
        if (owState.npcs) {
            //await this._restoreNPCs(owState.npcs);
        }

        // === 6. Variables del mundo ===
        /*if (owState.worldVars && engine.variables) {
            Object.assign(engine.variables, owState.worldVars);
        }*/
    }


    /**
     * Restaura o CREA un personaje desde datos guardados, preservando su tipo de clase.
     * 
     * Si existingCharacter es null y hay __className, usa CharacterRegistry para instanciar.
     * Luego fusiona estado dinámico con Object.assign para mantener métodos del prototipo.
     * 
     * @param {CharacterModel | null} existingCharacter - Instancia existente o null para crear nueva
     * @param {SerializedCharacter} savedData - Datos serializados a aplicar
     * @param {{ engine?: GameEngine, openWorldEngine?: any }} [context] - Contexto para factory personalizado
     * @returns {Promise<CharacterModel | null>} Personaje restaurado o null si falla
     * @public
     * @async
     */
    async _restoreCharacterFromData(existingCharacter, savedData, context = {}) {
        if (!savedData) return null;

        let character = existingCharacter;

        // 🔥 CREAR INSTANCIA NUEVA SI NO EXISTE (personajes dinámicos)
        // @ts-ignore
        if (!character && savedData.__className) {
            try {
                character = await CharacterRegistry.instantiate(savedData, {
                    engine: context.engine,
                    openWorldEngine: context.openWorldEngine,
                    vnEngine: this.vnEngine
                });

                // Registrar en el motor si es nuevo y tiene Name válido
                if (character?.Name && context.engine?.Characters) {
                    const exists = context.engine.Characters.some(c => c.Name === character?.Name);
                    if (!exists) {
                        context.engine.Characters.push(character);
                        // @ts-ignore
                        console.log(`✨ Personaje dinámico "${character.Name}" (${savedData.__className}) registrado`);
                    }
                }
            } catch (err) {
                // @ts-ignore
                console.error(`❌ Error al crear personaje "${savedData.__className}":`, err);
                return null;
            }
        }

        if (!character) {
            console.warn(`⚠️ No se pudo restaurar personaje: ${savedData.Name || 'sin nombre'}`);
            return null;
        }

        // 🔥 FUSIONAR ESTADO DINÁMICO (mantiene métodos del prototipo)
        Object.assign(character, {
            x: savedData.position?.x ?? character.x,
            y: savedData.position?.y ?? character.y,
            direction: savedData.direction ?? character.direction,
            state: savedData.state ?? character.state,
            animFrame: savedData.animFrame ?? character.animFrame,
            Level: savedData.Level ?? character.Level,
            Experience: savedData.Experience ?? character.Experience
        });

        // Stats: fusión profunda
        if (savedData.Stats && character.Stats) {
            this._assignSafe(character.Stats, savedData.Stats);
        }

        // Inventory: reemplazo completo (objetos planos)
        if (savedData.Inventory !== undefined) {
            character.Inventory = JSON.parse(JSON.stringify(savedData.Inventory));
        }

        // Skills: recrear instancias si es posible



        // MapData: reemplazo completo
        if (savedData.MapData !== undefined) {
            //character.MapData = JSON.parse(JSON.stringify(savedData.MapData));
        }

        // Props personalizadas
        if (savedData.customProps) {
            //Object.assign(character, savedData.customProps);
            this._assignSafe(character, savedData.customProps, [
                "SpritesFrames", "Outfits"
            ]);
        }

        // @ts-ignore
        console.log(`👤 "${character.Name}" restaurado como ${savedData.__className}`);

        // Skills: recrear instancias con reflexión
        if (savedData.Skills !== undefined) {
            // 🔥 ESPERAR la promesa porque _restoreSkills es ahora async
            character.Skills = await this._restoreSkills(savedData.Skills, character);
        }
        await character.RegisterWordMapCharacter();
        return character;
    }

    /**
     * Copia valores de `source` a `target`, evitando pisar métodos,
     * propiedades internas (_prefijo) y claves ya manejadas explícitamente.
     * @param {Object<string, any>} target
     * @param {Object<string, any>} source
     * @param {string[]} [skipKeys] - claves que ya se asignaron manualmente y no deben duplicarse
     */
    _assignSafe(target, source, skipKeys = []) {
        if (!source) return;

        for (const key of Object.keys(source)) {
            if (skipKeys.includes(key)) {
                continue
            };
            if (key.startsWith('_')) continue;
            if (key.startsWith('_')) continue;

            const val = source[key];
            if (typeof val === 'function') continue; // nunca pisar métodos del prototipo

            target[key] = val;
        }
    }

    /**
 * Restaura array de Skills, recreando instancias con reflexión vía SkillRegistry.
 * @param {Array<SerializedSkill>} savedSkills 
 * @param {CharacterModel} ownerCharacter - Personaje dueño para contexto
 * @returns {Promise<Array<SkillModel>>}
 * @private
 * @async
 */
    async _restoreSkills(savedSkills, ownerCharacter) {
        if (!Array.isArray(savedSkills)) return [];

        const restored = [];
        const context = { owner: ownerCharacter, engine: this.openWorldEngine?.GameEngine };

        for (const skillData of savedSkills) {
            try {
                // 🔥 USAR SkillRegistry PARA REFLEXIÓN REAL
                const skill = await SkillRegistry.instantiate(skillData, context);

                // Fusionar estado dinámico post-construcción
                if (skill && skillData) {
                    Object.assign(skill, {
                        name: skillData.name,
                        description: skillData.description,
                        icon: skillData.icon,
                        //calculateDamage: skillData.calculateDamage,
                        numberTargets: skillData.numberTargets,
                        spriteSkillAnimation: skillData.spriteSkillAnimation,
                        manaCost: skill.manaCost,
                        level: skill.level,
                        cooldown: skillData.cooldown,
                    });

                    // Props personalizadas
                    if (skillData.customProps) {
                        Object.assign(skill, skillData.customProps);
                    }
                }

                restored.push(skill);
            } catch (err) {
                console.error(`❌ Error al restaurar skill "${skillData?.name}":`, err);
                // Fallback: objeto plano funcional
                restored.push({
                    name: skillData?.name ?? 'Unknown',
                    description: skillData?.description ?? '',
                    level: skillData?.level ?? 1,
                    // ... propiedades mínimas para evitar crashes
                });
            }
        }

        // @ts-ignore
        return restored;
    }
    /**
     * Restaura NPCs en sus respectivos mapas desde datos serializados.
     * 
     * Para cada mapa en los datos guardados:
     * - Busca NPCs existentes por nombre (clave única)
     * - Si existe, fusiona estado guardado manteniendo referencias
     * - Restaura posición específica desde MapData si está definida
     * - Ignora NPCs que no existen en la configuración actual del mapa
     * 
     * @param {NPCsByMap} npcsByMap - NPCs serializados organizados por mapa
     * @private
     */
    _restoreNPCs(npcsByMap) {
        if (!this.openWorldEngine?.GameEngine.maps) return;

        for (const [mapName, npcList] of Object.entries(npcsByMap)) {
            const map = this.openWorldEngine.GameEngine.maps[mapName];
            if (!map?.NPCs) continue;

            // Crear mapa de NPCs existentes por nombre para búsqueda rápida
            const existingNPCs = new Map(
                map.NPCs.filter(n => n?.Name).map(n => [n.Name, n])
            );

            // Restaurar cada NPC guardado
            for (const savedNPC of npcList) {
                const existingNPC = existingNPCs.get(savedNPC.Name);
                if (existingNPC) {
                    // NPC existe: restaurar su estado
                    this._restoreCharacterFromData(existingNPC, savedNPC);

                    // Asegurar posición desde MapData si está definido para este mapa
                    const mapData = savedNPC.MapData?.find(d => d.name === mapName);
                    if (mapData && typeof mapData.posX === 'number') {
                        existingNPC.x = mapData.posX;
                        existingNPC.y = mapData.posY;
                    }
                }
                // Si el NPC no existe en el mapa actual, se ignora
                // (podría agregarse lógica para spawnearlo dinámicamente si es necesario)
            }
        }
    }

    // ==================== MÉTODOS PÚBLICOS DE GUARDADO/CARGA ====================

    /**
     * Guarda el estado actual del juego en un slot específico.
     * 
     * Método de conveniencia que delega a saveState().
     * 
     * @param {string} slot - Nombre del slot de guardado
     * @returns {boolean} Resultado de la operación de guardado
     * @public
     */
    saveToSlot(slot) {
        return this.saveState(slot);
    }

    /**
     * Carga un estado desde un slot y restaura ambos motores.
     * 
     * Flujo completo:
     * 1. Limpia menús de UI activos
     * 2. Carga y valida datos del slot
     * 3. Restaura estado de ambos motores
     * 4. Reanuda ejecución del VisualNovel si estaba activo
     * 
     * @param {string} slot - Nombre del slot de guardado a cargar
     * @returns {Promise<boolean>} Verdadero si la carga y restauración fueron exitosas
     * @public
     * @async
     */
    async loadFromSlot(slot) {
        // Limpiar UI de menús primero
        this.vnEngine?.clearMenus?.();

        const savedState = this.loadState(slot);
        if (!savedState) {
            console.warn(`⚠️ No hay partida guardada en el slot "${slot}"`);
            return false;
        }

        const success = await this.restoreGameState(savedState);

        if (success && this.vnEngine) {
            // Reanudar espera de input si está en una escena
            if (this.vnEngine.currentScene) {
                //this.vnEngine.waitForClick?.();
            }
        }

        return success;
    }

    /**
     * Muestra la interfaz de usuario para guardar o cargar partidas.
     * 
     * Crea y conecta una instancia de SaveLoadView que presenta:
     * - Grid de slots (1-8) con preview de metadata
     * - Modo carga: clic para cargar partida guardada
     * - Modo guardado: clic para sobrescribir slot
     * - Botón de retorno para cerrar la pantalla
     * 
     * @param {boolean} [isLoadMode=true] - true para modo carga, false para modo guardado
     * @param {Function} [action]
     * @public
     */
    showSaveLoadScreen(isLoadMode = true, action) {
        this.SaveLoadView = new SaveLoadView(isLoadMode, action);
        this.SaveLoadView.Connect();
    }

    /**
     * Realiza un guardado rápido en un slot de autosave.
     * 
     * Solo ejecuta el guardado si:
     * - No estamos en la escena de inicio ("start")
     * - El motor VisualNovel está activo
     * 
     * @param {string} [slot="autosave"] - Nombre del slot para autosave
     * @returns {boolean} Resultado de la operación
     * @public
     */
    quickSave(slot = "autosave") {
        // Solo guardar si no estamos en el menú principal
        if (this.vnEngine?.currentScene !== "start") {
            return this.saveToSlot(slot);
        }
        return false;
    }

    /**
     * Carga rápidamente desde un slot de autosave.
     * 
     * @param {string} [slot="autosave"] - Nombre del slot de autosave a cargar
     * @returns {Promise<boolean>} Resultado de la carga
     * @public
     * @async
     */
    async quickLoad(slot = "autosave") {
        return await this.loadFromSlot(slot);
    }
}