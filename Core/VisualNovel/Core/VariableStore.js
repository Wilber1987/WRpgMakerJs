//@ts-check

/**
 * Almacén centralizado de variables del juego
 * Maneja persistencia y cambios de variables
 */
export class VariableStore {    
    constructor() {
        /** @type {Object.<string, any>} */
        this.variables = {};
        
        /** @type {Set<Function>} */
        this.changeListeners = new Set();
        
        // Variables del sistema
        this.variables['g_time'] = 0;
    }
    
    /**
     * Obtiene el valor de una variable
     * @param {string} name 
     * @param {any} [defaultValue] - Valor por defecto si no existe
     * @returns {any}
     */
    get(name, defaultValue = undefined) {
        if (!(name in this.variables)) {
            return defaultValue;
        }
        return this.variables[name];
    }
    
    /**
     * Establece el valor de una variable
     * @param {string} name 
     * @param {any} value 
     * @returns {boolean} - True si el valor cambió
     */
    set(name, value) {
        const oldValue = this.variables[name];
        this.variables[name] = value;
        
        if (oldValue !== value) {
            this._notifyChange(name, value, oldValue);
            return true;
        }
        return false;
    }
    
    /**
     * Incrementa el valor de una variable numérica
     * @param {string} name 
     * @param {number} amount 
     * @returns {number} - Nuevo valor
     */
    increment(name, amount = 1) {
        const currentValue = this.get(name, 0);
        const newValue = currentValue + amount;
        this.set(name, newValue);
        return newValue;
    }
    
    /**
     * Decrementa el valor de una variable numérica
     * @param {string} name 
     * @param {number} amount 
     * @returns {number} - Nuevo valor
     */
    decrement(name, amount = 1) {
        return this.increment(name, -amount);
    }
    
    /**
     * Verifica si una variable existe
     * @param {string} name 
     * @returns {boolean}
     */
    has(name) {
        return name in this.variables;
    }
    
    /**
     * Elimina una variable
     * @param {string} name 
     * @returns {boolean} - True si existía y fue eliminada
     */
    delete(name) {
        if (this.has(name)) {
            const oldValue = this.variables[name];
            delete this.variables[name];
            this._notifyChange(name, undefined, oldValue);
            return true;
        }
        return false;
    }
    
    /**
     * Obtiene todas las variables como objeto
     * @returns {Object.<string, any>}
     */
    getAll() {
        return { ...this.variables };
    }
    
    /**
     * Establece múltiples variables desde un objeto
     * @param {Object.<string, any>} vars 
     */
    setMultiple(vars) {
        Object.entries(vars).forEach(([name, value]) => {
            this.set(name, value);
        });
    }
    
    /**
     * Serializa las variables para guardado
     * @returns {string} - JSON string
     */
    serialize() {
        return JSON.stringify(this.variables);
    }
    
    /**
     * Deserializa variables desde un guardado
     * @param {string} jsonString 
     */
    deserialize(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            this.variables = { ...parsed };
        } catch (error) {
            console.error('Error al deserializar variables:', error);
        }
    }
    
    /**
     * Registra un listener para cambios de variables
     * @param {Function} listener - (name, newValue, oldValue) => void
     * @returns {Function} - Función para remover el listener
     */
    onChange(listener) {
        this.changeListeners.add(listener);
        return () => this.changeListeners.delete(listener);
    }
    
    /**
     * Notifica a los listeners sobre un cambio
     * @private
     * @param {string} name 
     * @param {any} newValue 
     * @param {any} oldValue 
     */
    _notifyChange(name, newValue, oldValue) {
        this.changeListeners.forEach(listener => {
            try {
                listener(name, newValue, oldValue);
            } catch (error) {
                console.error('Error en listener de variable:', error);
            }
        });
    }
    
    /**
     * Resetea todas las variables (excepto las del sistema)
     */
    reset() {
        const systemVars = { g_time: this.variables.g_time };
        this.variables = systemVars;
    }
}