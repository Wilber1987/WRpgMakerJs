//@ts-check

import { TimeSystem } from '../../Common/TimeSystem.js';

/**
 * Evaluador de condiciones para comandos if/choice
 * Soporta variables, tiempo, y operadores lógicos
 */
export class ConditionEvaluator {
    /**
     * @param {Object} dependencies
     * @param {import('../Core/VariableStore.js').VariableStore} dependencies.variableStore
     * @param {TimeSystem} [dependencies.timeSystem]
     */
    constructor(dependencies) {
        this.variableStore = dependencies.variableStore;
        this.timeSystem = dependencies.timeSystem;
    }
    
    /**
     * Evalúa una condición
     * @param {boolean | import('../VisualNovelEngine.js').Condition | Function} condition 
     * @returns {boolean}
     */
    evaluate(condition) {
        // Booleano directo
        if (typeof condition === 'boolean') {
            return condition;
        }
        
        // Función
        if (typeof condition === 'function') {
            try {
                return condition();
            } catch (error) {
                console.error('Error evaluando función de condición:', error);
                return false;
            }
        }
        
        // Null/undefined = true
        if (!condition) {
            return true;
        }
        
        // Objeto condición
        return this._evaluateObject(condition);
    }
    
    /**
     * Evalúa un objeto condición
     * @private
     * @param {import('../VisualNovelEngine.js').Condition} condition 
     * @returns {boolean}
     */
    _evaluateObject(condition) {
        switch (condition.type) {
            case 'variable':
                return this._evaluateVariable(condition);
            case 'time':
                return this._evaluateTime(condition);
            case 'and':
                return this._evaluateAnd(condition);
            case 'or':
                return this._evaluateOr(condition);
            case 'not':
                return this._evaluateNot(condition);
            default:
                console.warn('Tipo de condición desconocido:', condition.type);
                return false;
        }
    }
    
    /**
     * Evalúa condición de variable
     * @private
     * @param {import('../VisualNovelEngine.js').Condition} condition 
     * @returns {boolean}
     */
    _evaluateVariable(condition) {
        if (!condition.var || condition.operator === undefined || condition.value === undefined) {
            return false;
        }
        console.log(this.variableStore);
        
        
        const value = this.variableStore.get(condition.var);
        
        switch (condition.operator) {
            case '==': return value == condition.value;
            case '!=': return value != condition.value;
            case '>': return value > condition.value;
            case '<': return value < condition.value;
            case '>=': return value >= condition.value;
            case '<=': return value <= condition.value;
            default: return false;
        }
    }
    
    /**
     * Evalúa condición de tiempo
     * @private
     * @param {import('../VisualNovelEngine.js').Condition} condition 
     * @returns {boolean}
     */
    _evaluateTime(condition) {
        if (!this.timeSystem || condition.operator === undefined || condition.value === undefined) {
            return false;
        }
        
        const currentHour = this.timeSystem.hour;
        
        switch (condition.operator) {
            case '==': return currentHour == condition.value;
            case '>': return currentHour > condition.value;
            case '<': return currentHour < condition.value;
            case '>=': return currentHour >= condition.value;
            case '<=': return currentHour <= condition.value;
            default: return false;
        }
    }
    
    /**
     * Evalúa condición AND
     * @private
     * @param {import('../VisualNovelEngine.js').Condition} condition 
     * @returns {boolean}
     */
    _evaluateAnd(condition) {
        if (!condition.conditions || !Array.isArray(condition.conditions)) {
            return false;
        }
        return condition.conditions.every(c => this.evaluate(c));
    }
    
    /**
     * Evalúa condición OR
     * @private
     * @param {import('../VisualNovelEngine.js').Condition} condition 
     * @returns {boolean}
     */
    _evaluateOr(condition) {
        if (!condition.conditions || !Array.isArray(condition.conditions)) {
            return false;
        }
        return condition.conditions.some(c => this.evaluate(c));
    }
    
    /**
     * Evalúa condición NOT
     * @private
     * @param {import('../VisualNovelEngine.js').Condition} condition 
     * @returns {boolean}
     */
    _evaluateNot(condition) {
        if (!condition.condition) {
            return true;
        }
        return !this.evaluate(condition.condition);
    }
}