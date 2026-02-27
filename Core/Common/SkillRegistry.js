//@ts-check

import { SkillModel } from "../Common/SkillModel.js";
import { CharacterModel } from "./CharacterModel.js";

/**
 * Registry para serialización/deserialización de habilidades con tipado preservado.
 * Permite recrear instancias de clases derivadas de SkillModel desde datos JSON.
 * 
 * @example
 * // Registrar una skill personalizada
 * SkillRegistry.register('FireballSkill', FireballSkill);
 * 
 * // Instanciar desde datos guardados
 * const skill = SkillRegistry.instantiate(savedSkillData, { owner: character });
 * 
 * @namespace
 */
export const SkillRegistry = {
    /** 
     * @type {Map<string, new (props: any, context?: any) => SkillModel>} 
     * @private 
     */
    _classes: new Map(),
    
    /** 
     * @type {Map<string, (savedData: any, context?: any) => Promise<SkillModel> | SkillModel>} 
     * @private 
     */
    _customFactories: new Map(),

    /**
     * Registra una clase de skill para serialización/deserialización.
     * @param {string} className - Nombre identificador único (debe coincidir con constructor.name)
     * @param {new (props: any, context?: any) => SkillModel} Constructor - Constructor de la clase
     * @param {(savedData: any, context?: any) => Promise<SkillModel> | SkillModel} [customFactory] - Factory opcional
     */
    register(className, Constructor, customFactory) {
        if (this._classes.has(className)) {
            console.warn(`⚠️ Skill "${className}" ya registrada. Sobrescribiendo...`);
        }
        this._classes.set(className, Constructor);
        if (customFactory) {
            this._customFactories.set(className, customFactory);
        }
        console.log(`✅ Skill registrada: ${className}`);
    },

    /**
     * Crea una instancia de skill desde datos serializados preservando el tipo.
     * @param {import("./SaveSystem.js").SerializedSkill} savedData - Datos de la skill guardada
     * @param {{ owner?: CharacterModel, engine?: any }} [context] - Contexto opcional
     * @returns {Promise<SkillModel>} Instancia restaurada o null
     */
    async instantiate(savedData, context = {}) {
        if (!savedData?.__className) {
            // Fallback: SkillModel base con props planos
            return new SkillModel(savedData.__props || savedData);
        }

        const className = savedData.__className;
        
        // 1. Intentar factory personalizado
        const customFactory = this._customFactories.get(className);
        if (customFactory) {
            try {
                const result = customFactory(savedData, context);
                return result instanceof Promise ? await result : result;
            } catch (err) {
                console.error(`❌ Error en factory para ${className}:`, err);
            }
        }
        
        // 2. Usar constructor registrado
        const Constructor = this._classes.get(className);
        if (Constructor) {
            try {
                return new Constructor(savedData.__props || {}, context);
            } catch (err) {
                console.error(`❌ Error al instanciar ${className}:`, err);
                return new SkillModel(savedData.__props || {});
            }
        }
        
        // 3. Fallback seguro
        console.warn(`⚠️ Skill "${className}" no registrada. Usando SkillModel base.`);
        return new SkillModel(savedData.__props || savedData);
    },

    /**
     * Obtiene el nombre de clase de una instancia para serialización.
     * @param {SkillModel} skill 
     * @returns {string}
     */
    getClassName(skill) {
        return skill?.constructor?.name || 'SkillModel';
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
     * Lista todas las clases registradas.
     * @returns {string[]}
     */
    listRegistered() {
        return Array.from(this._classes.keys());
    }
};
