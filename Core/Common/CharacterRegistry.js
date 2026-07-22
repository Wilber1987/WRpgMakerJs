//@ts-check
import { CharacterModel } from "../Common/CharacterModel.js";

/**
 * Registry global para serialización/deserialización de personajes con tipado preservado.
 * Permite "reflexión controlada": recrear instancias de clases derivadas desde datos JSON.
 * 
 * @example
 * // Registrar una clase personalizada
 * CharacterRegistry.register('AlexandraCharacter', AlexandraCharacter);
 * 
 * // Instanciar desde datos guardados
 * const char = CharacterRegistry.instantiate(savedData, { engine });
 * 
 * @namespace
 */
export const CharacterRegistry = {
    /** 
     * @type {Map<string, new (props: any, context?: any) => CharacterModel>} 
     * @private 
     */
    _classes: new Map(),

    /** 
     * @type {Map<string, (savedData: any, context?: any) => Promise<CharacterModel> | CharacterModel>} 
     * @private 
     */
    _customFactories: new Map(),

    /** 
     * @type {Map<string, import('./CharacterModel.js').CharacterModel>} 
     * @private 
     */
    _singletons: new Map(),

    /** 
    * @type {Map<string, (savedData: any, instance: CharacterModel) => void>} 
    * @private 
    */
    _restoreHandlers: new Map(),

    /**
     * Registra una clase de personaje para serialización/deserialización.
     * 
     * @param {string} className - Nombre identificador único (debe coincidir con constructor.name)
     * @param {new (props: any, context?: any) => CharacterModel} Constructor - Constructor de la clase
     * @param {(savedData: import("./SaveSystem.js").SerializedCharacter, context?: any) => Promise<CharacterModel> | CharacterModel} [customFactory] - Factory opcional para lógica personalizada
     */
    register(className, Constructor, customFactory) {
        if (this._classes.has(className)) {
            console.warn(`⚠️ Clase "${className}" ya registrada. Sobrescribiendo...`);
            return;
        }
        this._classes.set(className, Constructor);
        if (customFactory) {
            this._customFactories.set(className, customFactory);
        }
        console.log(`✅ Registrado: ${className}`);
    },

    /**
    * Registra una instancia singleton para hidratación en lugar de creación.
    * Los singletons tienen prioridad sobre las clases registradas.
    * @param {import('./CharacterModel.js').CharacterModel} instance - La instancia singleton existente
    * @param {(savedData: any, instance: CharacterModel) => void} [restoreHandler] - Handler opcional para restauración personalizada
    */
    registerSingleton(instance, restoreHandler) {
        if (!instance?.Name) {
            console.error(`❌ No se puede registrar singleton: la instancia no tiene propiedad Name`);
            return;
        }
        this._singletons.set(instance?.Name, instance);
        if (restoreHandler) {
            this._restoreHandlers.set(instance?.Name, restoreHandler);
        } else if (typeof instance.restoreState === 'function') {
            // Usar método restoreState si existe en la instancia
            this._restoreHandlers.set(instance?.Name, (savedData, inst) => inst.restoreState(savedData));
        }

        console.log(`✅ Singleton registrado: ${instance?.Name} → ${instance.constructor.name}`);
    },

    /**
     * Crea una instancia de personaje desde datos serializados preservando el tipo.
     * 
     * Flujo:
     * 1. Busca factory personalizado si existe
     * 2. Si no, usa el constructor registrado con __props de inicialización
     * 3. Fallback a CharacterModel base si la clase no está registrada
     * 
     * @param {import("./SaveSystem.js").SerializedCharacter} savedData - Datos del personaje guardado
     * @param {{ engine?: any, openWorldEngine?: any, vnEngine?: any }} [context] - Contexto opcional para inicialización
     * @returns {Promise<CharacterModel>} Instancia restaurada o null si falla
     */
    async instantiate(savedData, context = {}) {
        // @ts-ignore
        if (!savedData?.__className) {
            console.warn('⚠️ Datos sin __className, usando CharacterModel base');
            return new CharacterModel(savedData.__props || {});
        }
        const characterName = savedData.Name;
        const className = savedData.__className;

        // 🔥 1. PRIORIDAD: Singleton registrado
        const singletonInstance = this._singletons.get(characterName);
        
        if (singletonInstance) {           
            return singletonInstance;
        }

        // 1. Intentar factory personalizado (para lógica compleja post-construcción)
        const customFactory = this._customFactories.get(className);
        if (customFactory) {
            try {
                const result = customFactory(savedData, context);
                return result instanceof Promise ? await result : result;
            } catch (err) {
                console.error(`❌ Error en factory personalizado para ${className}:`, err);
            }
        }

        // 2. Usar constructor registrado
        const Constructor = this._classes.get(className);
        if (Constructor) {
            try {
                // Pasar __props al constructor + contexto si lo soporta
                return new Constructor(savedData.__props || {}, context);
            } catch (err) {
                console.error(`❌ Error al instanciar ${className}:`, err);
                // Fallback seguro
                return new CharacterModel(savedData.__props || {});
            }
        }

        // 3. Fallback: advertir y usar base
        console.warn(`⚠️ Clase "${className}" no registrada. Usando CharacterModel base.`);
        console.warn('💡 Solución: Regístrala con CharacterRegistry.register()');
        return new CharacterModel(savedData.__props || {});
    },

    /**
     * Hidratación básica para personajes sin handler personalizado.
     * @param {CharacterModel} character 
     * @param {import("./SaveSystem.js").SerializedCharacter} savedData 
     * @private
     */
    _applyBasicHydration(character, savedData) {
        if (!savedData || !character) return;

        // Posición y animación
        if (savedData.position) {
            character.x = savedData.position.x ?? character.x;
            character.y = savedData.position.y ?? character.y;
        }
        if (savedData.direction) character.direction = savedData.direction;
        if (savedData.state) character.state = savedData.state;
        if (typeof savedData.animFrame === 'number') character.animFrame = savedData.animFrame;

        // Stats: fusión profunda
        if (savedData.Stats && character.Stats) {
            Object.assign(character.Stats, savedData.Stats);
        }

        // Nivel y experiencia
        if (typeof savedData.Level === 'number') character.Level = savedData.Level;
        if (typeof savedData.Experience === 'number') character.Experience = savedData.Experience;

        // Colecciones: reemplazo completo
        if (Array.isArray(savedData.Inventory)) {
            character.Inventory = JSON.parse(JSON.stringify(savedData.Inventory));
        }
        if (Array.isArray(savedData.Skills)) {
            character.Skills = JSON.parse(JSON.stringify(savedData.Skills));
        }
        if (Array.isArray(savedData.MapData)) {
            character.MapData = JSON.parse(JSON.stringify(savedData.MapData));
        }

        // Props personalizadas
        if (savedData.customProps) {
            Object.assign(character, savedData.customProps);
        }

        console.debug(`💧 "${character.Name}" hidratado`);
    },

    /**
     * Obtiene el nombre de clase de una instancia para serialización.
     * @param {CharacterModel} character 
     * @returns {string}
     */
    getClassName(character) {
        return character?.constructor?.name || 'CharacterModel';
    },

    /**
     * Verifica si un nombre corresponde a un singleton registrado.
     * @param {string} name 
     * @returns {boolean}
     */
    isSingleton(name) {
        return this._singletons.has(name);
    },
    /**
    * Lista todos los singletons registrados (para debug).
    * @returns {string[]}
    */
    listSingletons() {
        return Array.from(this._singletons.keys());
    },
    /**
     * Verifica si una clase está registrada.
     * @param {string} className 
     * @returns {boolean}
     */
    isRegistered(className) {
        return this._classes.has(className);
    },

    /**
     * Lista todas las clases registradas (para debug).
     * @returns {string[]}
     */
    listRegistered() {
        return Array.from(this._classes.keys());
    }
};

// Registrar CharacterModel por defecto
//CharacterRegistry.register('CharacterModel', CharacterModel);