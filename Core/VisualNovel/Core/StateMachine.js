//@ts-check

/**
 * @typedef {'IDLE' | 'RUNNING' | 'WAITING' | 'PAUSED' | 'ERROR'} EngineState
 */

/**
 * Máquina de estados finita para el motor de Visual Novel
 * Controla el ciclo de vida y transiciones del engine
 */
export class StateMachine {
    constructor() {
        /** @type {EngineState} */
        this.currentState = 'IDLE';
        
        /** @type {Set<Function>} */
        this.stateChangeListeners = new Set();
        
        /** @type {Object.<EngineState, EngineState[]>} */
        this.validTransitions = {
            'IDLE': ['RUNNING', 'ERROR'],
            'RUNNING': ['WAITING', 'PAUSED', 'IDLE', 'ERROR'],
            'WAITING': ['RUNNING', 'PAUSED', 'IDLE', 'ERROR'],
            'PAUSED': ['RUNNING', 'IDLE', 'ERROR'],
            'ERROR': ['IDLE']
        };
    }
    
    /**
     * Intenta transicionar a un nuevo estado
     * @param {EngineState} newState 
     * @returns {boolean} - True si la transición fue exitosa
     */
    transition(newState) {
        const allowedTransitions = this.validTransitions[this.currentState];
        
        if (!allowedTransitions || !allowedTransitions.includes(newState)) {
            console.warn(`Transición inválida: ${this.currentState} -> ${newState}`);
            return false;
        }
        
        const previousState = this.currentState;
        this.currentState = newState;
        
        // Notificar listeners
        this.stateChangeListeners.forEach(listener => {
            listener(newState, previousState);
        });
        
        console.log(`[StateMachine] ${previousState} -> ${newState}`);
        return true;
    }
    
    /**
     * Verifica si el estado actual es el especificado
     * @param {EngineState} state 
     * @returns {boolean}
     */
    is(state) {
        return this.currentState === state;
    }
    
    /**
     * Verifica si el engine está activo (no IDLE, PAUSED o ERROR)
     * @returns {boolean}
     */
    isActive() {
        return this.currentState === 'RUNNING' || this.currentState === 'WAITING';
    }
    
    /**
     * Registra un listener para cambios de estado
     * @param {Function} listener 
     * @returns {Function} - Función para remover el listener
     */
    onStateChange(listener) {
        this.stateChangeListeners.add(listener);
        return () => this.stateChangeListeners.delete(listener);
    }
    
    /**
     * Obtiene el estado actual
     * @returns {EngineState}
     */
    getState() {
        return this.currentState;
    }
    
    /**
     * Resetea la máquina de estados a IDLE
     */
    reset() {
        this.transition('IDLE');
    }
}