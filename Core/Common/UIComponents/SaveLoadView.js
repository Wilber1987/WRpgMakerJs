//@ts-check

import { saveSystem } from "../../VisualNovel/VisualNovelEngine.js";
import { ComponentsManager, html } from "../../WDevCore/WModules/WComponentsTools.js";
import { css } from "../../WDevCore/WModules/WStyledRender.js";

export class SaveLoadView extends HTMLElement {
    /**
   * Muestra menú de guardado/carga con slots
   * @param {boolean} isLoadMode 
   * @param {Function} [loadAction]
   */
    constructor(isLoadMode, loadAction) {
        super();
        this.loadAction = loadAction;
        this.attachShadow({ mode: 'open' });       
        this.Draw(isLoadMode);
    }
    connectedCallback() {

    }
    Draw = async (/** @type {boolean | undefined} */ isLoadMode) => {
        this.showSaveLoadScreen(isLoadMode);
    }
    /**
   * Muestra menú de guardado/carga con slots
   * @param {boolean} [isLoadMode] 
   */
    showSaveLoadScreen(isLoadMode = true) {
        // @ts-ignore
        this.shadowRoot.innerHTML = "";
        this.shadowRoot?.append(this.CustomStyle);
        const screen = html`<div class="save-load-screen"></div>`
        const grid = html`<div class="save-load-grid"></div>`
        saveSystem.vnEngine?.UI?.GetUIElement?.('save-load-screen');
        if (!screen || !grid) {
            console.warn('Elementos de UI para save/load no encontrados');
            return;
        }
        const availableSlots = saveSystem.getAvailableSlots();
        // Mostrar slots (máximo 8)
        for (let i = 1; i <= 8; i++) {
            const slotName = `slot${i}`;
            const slotData = availableSlots.find(s => s.slot === slotName);

            const div = html`<div class="save-slot" data-slot="${slotName}">
                <div class="slot-header">
                <label>Slot ${i}</label>
                    ${slotData?.timestamp ? `<span class="slot-time">${new Date(slotData.timestamp).toLocaleDateString()}</span>` : ''}
                </div>
                <div class="slot-info">
                ${slotData?.map ? `<div>${slotData.map}</div>` : '<div class="empty">Vacío</div>'}
                ${
                // @ts-ignore
                slotData?.playerPosition ? `<div>${slotData.playerPosition.x.toFixed(1)}, ${slotData.playerPosition.y.toFixed(1)}</div>` : ''}
                ${slotData?.scene ? `<div>🎬 ${slotData.scene}</div>` : ''}
                </div>
            </div>`;

            // Preview de fondo si hay estado guardado
            if (isLoadMode && slotData?.timestamp) {
                div.classList.add('has-save');
                div.addEventListener('click', async () => {
                    const success = await saveSystem.loadFromSlot(slotName);
                    if (success) {
                        if (this.loadAction) {
                            this.loadAction(this);
                        }
                        this.close();
                    }
                });
            } else if (!isLoadMode) {
                // Modo guardado: clic para sobrescribir
                div.addEventListener('click', () => {
                    const confirmed = confirm(`¿Sobrescribir "${slotName}"?`);
                    if (confirmed) {
                        saveSystem.saveToSlot(slotName);
                        // @ts-ignore
                        this.close();
                        // Refrescar vista si es necesario
                        this.showSaveLoadScreen(false);
                    }
                });
            } else {
                div.classList.add('empty');
            }
            grid.appendChild(div);
        }
        // Botón de retorno
        const divReturn = document.createElement('div');
        divReturn.className = 'save-slot return';
        divReturn.textContent = '⟵ Volver';
        divReturn.addEventListener('click', () => {
            this.close();
        });
        grid.appendChild(divReturn);
        screen.append(grid)
        screen.style.display = 'flex';
        this.shadowRoot?.append(screen)
    }

    update(/** @type {boolean | undefined} */ isLoadMode) {
        this.Draw(isLoadMode);
    }
    Connect() {
        ComponentsManager.modalFunction(this);
        if (!this.isConnected) {
            document.body.append(this);
        }
    }
    close() {
        ComponentsManager.modalFunction(this);
        setTimeout(() => {
            this.parentNode?.removeChild(this);
        }, 500);
    }
    CustomStyle = css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            font-family: 'Arial', sans-serif;
            color: #fff;
            position: fixed;
            top: 0;
            left: 0;
            opacity: 0;
            transition: all 0.3s;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 10003;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            border-radius: 6px;
        }
        /*pantalla de carga*/
        .save-load-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }
        .save-load-grid {
            display: grid;
            grid-template-columns: repeat(4, 250px);
            gap: 20px;
            justify-content: center;
        }
        .save-slot {
            background-color: #222;
            color: white;
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            height: 180px;
            overflow: hidden;
        }
        .save-slot:hover {
            background-color: #444;
        }

        .save-slot.empty {
            background-color: #111;
            opacity: 0.6;
            cursor: not-allowed;
        }    
        .return {
            padding: 10px;
            height: 20px;
        }      
     `
}
customElements.define('w-save-load', SaveLoadView);