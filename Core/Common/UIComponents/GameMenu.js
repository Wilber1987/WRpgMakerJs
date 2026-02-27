//@ts-check

import { saveSystem, vnEngine } from "../../VisualNovel/VisualNovelEngine.js";
import { ComponentsManager, html } from "../../WDevCore/WModules/WComponentsTools.js";
import { css } from "../../WDevCore/WModules/WStyledRender.js";
import { CharacterManagerView } from "./CharacterManagerView.js";

export class GameMenu extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot?.append(this.CustomStyle);
        this.Draw();
    }
    connectedCallback() { }
    Draw = async () => {
        const menu = html`<div class="menu-wrapper menu-floating-container">            
            <button class="choice-button menu-floating-item" onclick="${this.handlerSave}">                
                <img src="./Media/assets/icons/icon_save.png" class="menu-icon">                
                <label>Guardar Partida</label>
            </button>
            <button class="choice-button menu-floating-item" onclick="${this.handlerLoad}">
                <img src="./Media/assets/icons/icon_download.png" class="menu-icon">
                <label>Cargar Partida</label>
            </button>
            <button class="choice-button menu-floating-item" onclick="${this.handlerTimeSkip}">
                <img src="./Media/assets/icons/time_skip.png" class="menu-icon">
                <label></label>
            </button>
            <button class="choice-button menu-floating-item" onclick="${this.handlerCharacters}">
                <img src="./Media/assets/icons/icon_character.png" class="menu-icon">
                <label>Personajes</label>
            </button> 
            <button class="choice-button menu-floating-item" onclick="${this.handlerOptions}">
                <img src="./Media/assets/icons/icon_patchnote.png" class="menu-icon">
                <label>Opciones</label>
            </button>
            <button class="choice-button menu-floating-item" onclick="${this.handlerExit}">
                <img src="./Media/assets/icons/icon_mainmenu.png" class="menu-icon">
                <label>Salir al Menú</label>
            </button>
        </div>`;
        this.shadowRoot?.append(menu);
    }

    update() {
        this.Draw();
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
    handlerSave = () => {
        saveSystem.showSaveLoadScreen(false)
    }
    handlerLoad = () => {
        saveSystem.showSaveLoadScreen(true)
    }
    handlerTimeSkip = () => {
        vnEngine.TimeSystem.autoAdvanceTime(4)
    }
    handlerCharacters = () => {
        new CharacterManagerView(vnEngine.Characters).Connect();
    }
    handlerOptions = () => {

    }
    handlerExit = () => {
        //TODO IMPLEMENTAR UNA SALIDA ADECUADA DESPUES
        document.location.reload()
    }
    CustomStyle = css`        
        .menu-floating-container {
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            background-color: rgba(0, 0, 0, 0.3);
            padding: 10px;
            border-radius: 8px;
            z-index: 10002;
            width: 80px;
        }
        .menu-floating-item {
            background-color: #333;
            color: white;
            border: none;
            padding: 5px;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.5s ease;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-size: 10px;

            & img {
                height: 30px;
                object-fit: cover;
            }
        }

        .menu-floating-item:hover {
            background-color: #555;
        }

        /*pantalla de carga*/

        .save-load-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
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
            label {
              padding: 5px;
              display: block;
            }
            .background-image {
              position: relative !important;
            }
        }
        .return {
            padding: 10px;
            height: 20px;
        }

        .save-slot:hover {
            background-color: #444;
        }

        .save-slot.empty {
            background-color: #111;
            opacity: 0.6;
            cursor: not-allowed;
        }        
    `
}
customElements.define('w-component', GameMenu);