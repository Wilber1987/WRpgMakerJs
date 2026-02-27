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
     * Registra una clase de personaje para serialización/deserialización.
     * 
     * @param {string} className - Nombre identificador único (debe coincidir con constructor.name)
     * @param {new (props: any, context?: any) => CharacterModel} Constructor - Constructor de la clase
     * @param {(savedData: import("./SaveSystem.js").SerializedCharacter, context?: any) => Promise<CharacterModel> | CharacterModel} [customFactory] - Factory opcional para lógica personalizada
     */
    register(className, Constructor, customFactory) {
        if (this._classes.has(className)) {
            console.warn(`⚠️ Clase "${className}" ya registrada. Sobrescribiendo...`);
        }
        this._classes.set(className, Constructor);
        if (customFactory) {
            this._customFactories.set(className, customFactory);
        }
        console.log(`✅ Registrado: ${className}`);
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
     * @returns {Promise<CharacterModel> | CharacterModel | null} Instancia restaurada o null si falla
     */
    async instantiate(savedData, context = {}) {
        if (!savedData?.__className) {
            console.warn('⚠️ Datos sin __className, usando CharacterModel base');
            return new CharacterModel(savedData.__props || {});
        }

        const className = savedData.__className;
        
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
     * Obtiene el nombre de clase de una instancia para serialización.
     * @param {CharacterModel} character 
     * @returns {string}
     */
    getClassName(character) {
        return character?.constructor?.name || 'CharacterModel';
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