//@ts-check
import { CharacterModel } from "../CharacterModel.js";
import { ComponentsManager, html } from "../../WDevCore/WModules/WComponentsTools.js";
import { css } from "../../WDevCore/WModules/WStyledRender.js";
import { CharacterCard } from "./CharacterCard.js";
import { OpenWorldEngineView } from "../../OppenWorld/OpenWorldEngineView.js";
import { VisualNovelEngine } from "../../VisualNovel/VisualNovelEngine.js";
import { CharactersUtil } from "../CharactersUtil.js";

export class CharacterManagerView extends HTMLElement {

    /**
     * @param { CharacterModel[] } Characters
     * @param {{ maxPartySize?: number , oppenWord?: OpenWorldEngineView, vnEngine?: VisualNovelEngine}} [Config]
     */
    constructor(Characters, Config) {
        super();
        // Soporte para formato anterior (array directo) o nuevo (objeto config)
        this.Characters = Characters ?? [];
        this.maxPartySize = Config?.maxPartySize ?? 4;
        this.oppenWorld = Config?.oppenWord
        this.vnEngine = Config?.vnEngine
        this.append(this.CustomStyle);
        this._draggedChar = null;
        this._dragSource = null;
        this.CharactersContainer = html`<div class="characters-container" 
            data-zone="available"
            ondragover="${(/** @type {DragEvent} */ e) => this._handleDragOver(e)}"
            ondragleave="${(/** @type {DragEvent} */ e) => this._handleDragLeave(e)}"
            ondrop="${(/** @type {DragEvent} */ e) => this._handleDrop(e, 'available')}">
        </div>`
        this.CharactersPartyContainer = html`<div class="party-slots" 
            data-zone="party"
            ondragover="${(/** @type {DragEvent} */ e) => this._handleDragOver(e)}"
            ondragleave="${(/** @type {DragEvent} */ e) => this._handleDragLeave(e)}"
            ondrop="${(/** @type {DragEvent} */ e) => this._handleDrop(e, 'party')}">
        </div>`
        this.Draw();
    }

    connectedCallback() {
        ComponentsManager.modalFunction(this);
        this._bindGlobalDragEvents();
        this.Update();
    }

    disconnectedCallback() {
        this._unbindGlobalDragEvents();
    }

    close = () => {
        ComponentsManager.modalFunction(this);
        setTimeout(() => {
            this.remove();
        }, 500);
    }

    Draw = async () => {
        // Separar personajes disponibles y del party
        CharactersUtil.verifyLeader(this.Characters);
        this.Update();
        const content = html`<div class="character-view">
            <div class="close-btn" onclick="${() => this.close()}" id="closeBtn">×</div>
            <div class="main-container">
                <!-- Sección: Personajes Disponibles -->
                <div class="section available-section">
                    <h3>Personajes Disponibles</h3>
                    ${this.CharactersContainer}          
                </div>
                
                <!-- Sección: Equipo (Party) -->
                <div class="party-section">
                    <h3>Team</h3>
                    ${this.CharactersPartyContainer}
                </div>
            </div>
        </div>`

        // Limpiar contenido previo manteniendo el estilo
        const style = this.CustomStyle;
        this.innerHTML = '';
        this.append(style, content);

        // Setup listeners adicionales para drag fuera de zonas
        this._setupZoneHighlightListeners();
    }

    Update() {
        const partyCharacters = this.Characters
            .filter(c => c.partyPosition !== undefined && c.partyPosition >= 0 && c.partyPosition < this.maxPartySize)
            .sort((a, b) => (a.partyPosition ?? 0) - (b.partyPosition ?? 0));

        const availableCharacters = this.Characters.filter(c => c.partyPosition === undefined || c.partyPosition < 0 || c.partyPosition >= this.maxPartySize
        );

        this.CharactersContainer.innerHTML = "";
        this.CharactersPartyContainer.innerHTML = "";

        this.CharactersContainer.append(...availableCharacters.map(char => this._createAvailableCard(char)));
        if (availableCharacters.length === 0) {
            this.CharactersContainer.append(html`<div class="empty-message">Arrastra personajes aquí para removerlos del equipo</div>`);
        }
        this.CharactersPartyContainer.append(...this.BuildPartySlots(partyCharacters));
    }

    /**
     * @param {any[]} partyCharacters
     */
    BuildPartySlots(partyCharacters) {
        return Array.from({ length: this.maxPartySize }, (_, index) => {
            const char = partyCharacters.find(c => c.partyPosition === index);
            return this._createPartySlot(index, char);
        });
    }

    // ============ MÉTODOS DE CREACIÓN DE ELEMENTOS ============

    /**
     * Crea tarjeta de personaje disponible (draggable)
     * @param {CharacterModel} char 
     */
    _createAvailableCard(char) {
        const charId = char.Name || char.constructor.name;
        return html`<div class="character-card draggable available" 
            draggable="true" 
            charId="${charId}"
            dataSource="available"
            ondragstart="${(/** @type {DragEvent} */ e) => this._onDragStart(e, char, 'available')}"
            ondragend="${(/** @type {DragEvent} */ e) => this._onDragEnd(e)}">
            <div class="card-content">
                ${new CharacterCard(char, this)}
            </div>
        </div>`;
    }

    /**
     * Crea slot del party (vacío o con personaje)
     * @param {number} slotIndex 
     * @param {CharacterModel|undefined} char 
     */
    _createPartySlot(slotIndex, char) {
        if (char) {
            const charId = char.Name || char.constructor.name;
            return html`<div class="party-slot filled" 
                index="${slotIndex}"
                data-zone="party">
                 <div class="character-card draggable in-party" 
                     draggable="true" 
                     charId="${charId}"
                     dataSource="party"
                     position="${char.partyPosition ?? ""}"
                     ondragstart="${(/** @type {DragEvent} */ e) => this._onDragStart(e, char, 'party')}"
                     ondragend="${(/** @type {DragEvent} */ e) => this._onDragEnd(e)}">
                    <button class="remove-btn" 
                        title="Remover del equipo"
                        onclick="${(/** @type {{ stopPropagation: () => void; }} */ e) => { e.stopPropagation(); this._removeFromParty(char) }}">✕</button>
                    <div class="slot-badge">Pos. ${slotIndex + 1}</div>
                    <div class="card-content">  ${new CharacterCard(char, this)}</div>
                 </div>
            </div>`;
        }
        // Slot vacío
        return html`<div class="party-slot empty" 
            index="${slotIndex}"
            data-zone="party"
            ondragover="${(/** @type {DragEvent} */ e) => this._handleDragOver(e)}"
            ondrop="${(/** @type {DragEvent} */ e) => this._handleDrop(e, 'party', slotIndex)}">
            <span class="slot-placeholder">+ Slot ${slotIndex + 1}</span>
            <span class="slot-hint">Arrastra un personaje aquí</span>
        </div>`;
    }

    // ============ EVENTOS DRAG & DROP ============


    /**
     * Al iniciar arrastre
     * @param {DragEvent} e 
     * @param {CharacterModel} char 
     * @param {'available'|'party'} source
     */
    _onDragStart(e, char, source) {
        this._draggedChar = char;
        this._dragSource = source;

        // Datos para transferir - VERIFICACIÓN SEGURA
        if (e.dataTransfer) {
            e.dataTransfer.setData('application/json', JSON.stringify({
                charId: char.Name || char.constructor.name,
                source: source,
                oldPosition: char.partyPosition
            }));
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.dropEffect = 'move';

            // 👇 CREAR IMAGEN PERSONALIZADA PARA DRAG
            const dragElement = /** @type {HTMLElement} */ (e.target);
            /**@type {HTMLElement} */
            // @ts-ignore
            const clone = dragElement.cloneNode(true);

            // Estilos para el clone durante el drag
            clone.style.position = 'absolute';
            clone.style.top = '-1000px';
            clone.style.left = '-1000px';
            clone.style.width = dragElement.offsetWidth + 'px';
            clone.style.opacity = '0.8';
            clone.style.pointerEvents = 'none';
            clone.style.transform = 'rotate(3deg) scale(1.05)';
            clone.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
            clone.style.zIndex = '10000';

            // Agregar al body temporalmente
            document.body.appendChild(clone);

            // Configurar la imagen de drag
            e.dataTransfer.setDragImage(clone, e.offsetX, e.offsetY);

            // Remover el clone después de un breve momento
            setTimeout(() => {
                if (clone.parentNode) {
                    clone.parentNode.removeChild(clone);
                }
            }, 0);
        }

        // Feedback visual en el elemento original
        setTimeout(() => {
            /**@type {HTMLElement} */
            // @ts-ignore
            const target = e.target;
            if (target) {
                target.classList.add('dragging');
                target.style.opacity = '0.4';
            }
            document.body.classList.add('drag-active');
        }, 0);
    }

    /**
     * Permitir drop en zona válida
     * @param {DragEvent} e 
     */
    _handleDragOver(e) {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
        }

        // Highlight visual del drop zone
        const zone = e.currentTarget;
        // @ts-ignore
        if (!zone?.classList?.contains('drop-highlight')) {
            // @ts-ignore
            zone?.classList?.add('drop-highlight');
        }
    }

    /**
     * Procesar drop en zona
     * @param {DragEvent} e 
     * @param {'available'|'party'} targetZone 
     * @param {number} [targetSlotIndex] Índice específico del slot (si aplica)
     */
    _handleDrop(e, targetZone, targetSlotIndex) {
        e.preventDefault();
        e.stopPropagation();

        // Limpiar highlights
        // @ts-ignore
        e.currentTarget?.classList?.remove('drop-highlight');
        document.querySelectorAll('.drop-highlight').forEach(el =>
            el.classList.remove('drop-highlight')
        );

        if (!this._draggedChar) return;

        const char = this._draggedChar;
        const source = this._dragSource;

        try {
            if (targetZone === 'party' && targetSlotIndex !== undefined) {
                this._assignToPartySlot(char, targetSlotIndex);
            }
            else if (targetZone === 'party' && targetSlotIndex === undefined) {
                const freeSlot = this._findFirstFreePartySlot();
                if (freeSlot !== null) {
                    this._assignToPartySlot(char, freeSlot);
                }
            }
            else if (targetZone === 'available') {
                if (source === 'party') {
                    this._removeFromParty(char);
                }
            }

            this.update();
        } catch (err) {
            console.error('Error en drop:', err);
        }
    }

    /**
     * Quitar highlight al salir de zona
     * @param {DragEvent} e 
     */
    _handleDragLeave(e) {
        // Solo quitar si realmente salimos del elemento (no por entrar en un hijo)
        // @ts-ignore
        const rect = e.currentTarget?.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right ||
            e.clientY < rect.top || e.clientY > rect.bottom) {
            // @ts-ignore
            e.currentTarget?.classList?.remove('drop-highlight');
        }
    }
    /**
     * Al finalizar arrastre
     * @param {DragEvent} e 
     */
    _onDragEnd(e) {
        /**@type {HTMLElement} */
        // @ts-ignore
        const target = e.target;
        if (target) {
            target.classList.remove('dragging');
            target.style.opacity = '';
        }
        document.body.classList.remove('drag-active');
        document.querySelectorAll('.drop-highlight').forEach(el =>
            el.classList.remove('drop-highlight')
        );
        this._draggedChar = null;
        this._dragSource = null;
    }

    /**
     * Asignar personaje a slot del party (maneja swaps)
     * @param {CharacterModel} char 
     * @param {number} targetSlot 
     */
    _assignToPartySlot(char, targetSlot) {
        // Validar rango
        if (targetSlot < 0 || targetSlot >= this.maxPartySize) return;

        // Buscar si hay personaje ocupando ese slot
        const occupyingChar = this.Characters.find(c =>
            c.partyPosition === targetSlot && c !== char
        );

        if (this._dragSource === 'party' && char.partyPosition !== undefined) {
            // === Movimiento dentro del party (swap o reordenar) ===
            if (occupyingChar) {
                // Swap: intercambiar posiciones
                occupyingChar.partyPosition = char.partyPosition;
            }
            char.partyPosition = targetSlot;
        }
        else if (this._dragSource === 'available') {
            // === Agregar desde disponibles al party ===
            if (occupyingChar) {
                // Slot ocupado: remover al que estaba y poner al nuevo
                occupyingChar.partyPosition = undefined;
            }
            char.partyPosition = targetSlot;
        }
    }

    /**
     * Remover personaje del party (vía botón o drag-out)
     * @param {CharacterModel} char 
     */
    _removeFromParty(char) {
        char.partyPosition = undefined;
        this.Update()
    }

    /**
     * Encontrar primer slot libre en el party
     * @returns {number|null} Índice del slot libre o null si está lleno
     */
    _findFirstFreePartySlot() {
        for (let i = 0; i < this.maxPartySize; i++) {
            if (!this.Characters.some(c => c.partyPosition === i)) {
                return i;
            }
        }
        return null;
    }

    // ============ LISTENERS GLOBALES PARA DRAG-OUT ============

    _bindGlobalDragEvents() {
        // Detectar drop fuera de zonas válidas para remover del party
        document.addEventListener('drop', this._onGlobalDrop);
        document.addEventListener('dragover', this._onGlobalDragOver);
    }

    _unbindGlobalDragEvents() {
        document.removeEventListener('drop', this._onGlobalDrop);
        document.removeEventListener('dragover', this._onGlobalDragOver);
    }

    _onGlobalDrop = (/**@type {Event} */ e) => {
        // Si se suelta fuera del componente y venía del party, remover
        // @ts-ignore
        if (!e.target?.closest?.('w-character-view') && this._draggedChar && this._dragSource === 'party') {
            e.preventDefault();
            this._removeFromParty(this._draggedChar);
            this.update();
        }
    }

    _onGlobalDragOver = (/** @type {{ preventDefault: () => void; }} */ e) => {
        // Permitir drop global para detectar drag-out
        if (this._draggedChar) {
            e.preventDefault();
        }
    }

    _setupZoneHighlightListeners() {
        // Listener para quitar highlight si el drag sale del viewport
        document.addEventListener('dragend', () => {
            document.querySelectorAll('.drop-highlight').forEach(el =>
                el.classList.remove('drop-highlight')
            );
        });
    }

    // ============ MÉTODOS PÚBLICOS ============

    Connect() {
        ComponentsManager.modalFunction(this);
        if (!this.isConnected) {
            document.body.append(this);
        }
    }

    /**
    * @param {Array<CharacterModel>} characters 
    */
    registerCharacter(...characters) {
        this.Characters.push(...characters);
        if (this.oppenWorld) {
            this.Characters.forEach(char =>  this.oppenWorld?.RegisterCharacter(char))
        } 
        if (this.vnEngine) {
            this.Characters.forEach(char =>  this.vnEngine?.RegisterCharacter(char))
        }
        this.update();
    }

    /**
     * Actualiza la vista (re-render)
     */
    update() {
        this.Draw();
    }

    
    // ============ ESTILOS CSS ============

    CustomStyle = css`
        w-character-view {
            position: absolute;
            opacity: 0;
            pointer-events: none;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 10002;
            transition: opacity 0.5s ease;
            background-color: rgba(0,0,0,0.7);
            display: block;
            height: 100vh;            
            font-family: system-ui, -apple-system, sans-serif;
        }
        
        w-character-view[active] {
            opacity: 1;
            pointer-events: auto;
        }
        
        .character-view {  
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            padding: 20px;
            box-sizing: border-box;
            color: #fff;
        }
        
        .main-container {
            display: grid;
            grid-template-rows: calc(100% - 380px) 360px;
            gap: 24px;
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
            height: calc(100vh - 80px)
        }
        
        .section {
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 16px;            
            padding: 10px;
        }

        .party-section {
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);
            display: flex;
            border-radius: 16px;
            padding: 10px;
            flex-direction: column;
        }
        
        .section h3 , .party-section h3 {
            margin: 0 0 20px 0;
            font-size: 1.3rem;
            font-weight: 600;
            padding-bottom: 12px;
            border-bottom: 2px solid rgba(74, 175, 255, 0.5);
            color: #fff;
        }
        
        .section h3 small {
            font-weight: 400;
            opacity: 0.8;
            font-size: 0.9em;
        }
        
        .characters-container {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            padding: 10px;
            min-height: 200px;
            
        }
        
        .party-slots {
            display: flex;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            padding: 10px;
            border-radius: 10px;
        }
        
       .character-card {
            background: rgba(255,255,255,0.12);
            border-radius: 40px;
            cursor: grab;
            transition: opacity 0.2s ease, box-shadow 0.2s ease;
            min-width: 140px;
            position: relative; /* 👈 IMPORTANTE */
            overflow: hidden; /* 👈 Evita desbordamientos */
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            border-color: rgba(74, 175, 255, 0.2);
        }

        .character-card:hover {
            box-shadow: 0 8px 25px rgba(0,0,0,0.4);
            border-color: rgba(74, 175, 255, 0.6);
        }

        .character-card.dragging {
            opacity: 0.4 !important; /* 👈 Más transparente durante drag */
            cursor: grabbing;
            transform: scale(0.98); /* 👈 Ligera reducción */
        }

        

        .character-card .drag-handle {
            pointer-events: none; /* 👈 También esto */
        }

        /* Estado global de drag */
        body.drag-active {
            cursor: grabbing !important;
            user-select: none !important;
        }

        body.drag-active * {
            user-select: none !important;
            -webkit-user-select: none !important;
        }

        /* Prevenir selección de texto durante drag */
        .character-card {
            -webkit-user-drag: element; /* 👈 Safari */
            user-select: none;
        }
        .drag-handle {
            text-align: center;
            font-size: 11px;
            color: rgba(255,255,255,0.6);
            padding: 4px 0;
            margin-top: 6px;
            border-top: 1px dashed rgba(255,255,255,0.2);
            user-select: none;
        }
        
        /* Slots del party */
        .party-slot {
            background: rgba(255,255,255,0.05);
            border: 2px dashed rgba(255,255,255,0.25);
            border-radius: 12px;
            min-height: 160px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: all 0.25s ease;
        }
        
        .party-slot.empty {
            color: rgba(255,255,255,0.4);
        }
        
        .party-slot.empty:hover {
            border-color: rgba(74, 175, 255, 0.6);
            background: rgba(74, 175, 255, 0.08);
            color: rgba(255,255,255,0.7);
        }
        
        .party-slot.drop-highlight {
            border-color: #4af !important;
            background: rgba(74, 175, 255, 0.25) !important;
            box-shadow: 0 0 0 3px rgba(74, 175, 255, 0.3);
        }
        
        .slot-placeholder {
            font-size: 1.1rem;
            font-weight: 500;
        }
        
        .slot-hint {
            display: block;
            font-size: 0.85rem;
            opacity: 0.7;
            margin-top: 4px;
        }
        
        .slot-badge {
            position: absolute;
            top: 8px;
            left: 8px;
            background: rgba(74, 175, 255, 0.3);
            color: #fff;
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 10px;
            font-weight: 600;
        }
        
        /* Botón remover */
        .remove-btn {
            position: absolute;
            top: 6px;
            right: 6px;
            background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
            color: white;
            border: none;
            border-radius: 50%;
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 15px;
            padding: 0;
            line-height: 1;
            z-index: 5;
            transition: all 0.2s;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .remove-btn:hover {
            background: linear-gradient(135deg, #fc8181 0%, #6d5555 100%);
            
        }
        
        /* Botón cerrar */
        .close-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
            color: white;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-weight: bold;
            font-size: 22px;
            z-index: 20;
            transition: all 0.2s;
            border: 2px solid rgba(255,255,255,0.2);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .close-btn:hover {
            background: linear-gradient(135deg, #718096 0%, #4a5568 100%);
            
        }
        
        /* Mensaje vacío */
        .empty-message {
            width: 100%;
            text-align: center;
            padding: 30px;
            color: rgba(255,255,255,0.5);
            font-style: italic;
            border: 2px dashed rgba(255,255,255,0.15);
            border-radius: 12px;
        }
        
       
        /* Responsive */
        @media (max-width: 900px) {
            .main-container {
                grid-template-columns: 1fr;
            }
            
            .party-slots {
                grid-template-columns: repeat(4, 1fr);
            }
        }
        
        @media (max-width: 600px) {
            .party-slots {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .character-card {
                min-width: 120px;
            }
        }
    `
}
customElements.define('w-character-view', CharacterManagerView);