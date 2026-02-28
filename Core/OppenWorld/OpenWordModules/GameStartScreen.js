//@ts-check

import { OpenWorldEngineView } from "../OpenWorldEngineView.js";

import { ComponentsManager, html } from "../../WDevCore/WModules/WComponentsTools.js";
import { css } from "../../WDevCore/WModules/WStyledRender.js";
import { BannerStyle } from "./BannerStyle.js";

export class GameStartScreen extends HTMLElement {
    /**
     * @typedef {Object} GameStartScreenConfig 
        * @property {{ name: string; action: Function; startGame: boolean? }[]} screenOptions
    **/
    /**
     * @param { GameStartScreenConfig } Config
     */
    constructor(Config) {
        super();
        this.Config = Config
        this.screenOptions = Config.screenOptions;
        this.attachShadow({ mode: 'open' });
        this.initializeComponent();
    }

    connectedCallback() {
        this.show();
    }

    initializeComponent() {        
        const colors = ["#52b641", "#52b641", "#52b641", "#52b641", "#52b641", "#52b641", "#52b641"];
        // Crear estructura HTML
        const container = html`<div class="container banner-body">
            ${BannerStyle}
            ${this.Banner}
            <div class="options-container">
                <h1 class="game-title">OPEN WORLD ENGINE</h1>
                <div class="menu-container">
                    ${this.screenOptions.map((option, index) => html`<button class="menu-button" 
                        style="background-color: ${colors[index]}"
                        onclick="${() => this.handleOpenOptions(option.action, option.startGame ?? true)}">${option.name}</button>`)}
                </div>  
            </div>            
            <div class="version-info">v1.0.0</div>
        </div>`;

        // Agregar al shadow DOM
        this.shadowRoot?.appendChild(this.Style);
        this.shadowRoot?.appendChild(container);
    }

   
    /**
     * @param {Function} action
     * @param {boolean} [start]
     */
    handleOpenOptions(action, start = true) {     
        if (start) {            
            this.hide()
        }   
        action(this)
    }
    show() {
        ComponentsManager.modalFunction(this);
    }
    hide() {
        ComponentsManager.modalFunction(this);
        setTimeout(() => {
            this.remove();
        }, 500);
    }


    Style = css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            font-family: 'Arial', sans-serif;
            color: #fff;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 1000;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            border-radius: 6px;
        }

        .container {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;    
            gap: 100px;       
        }

        .game-title {
            font-size: 8rem;
            color: #FFF;
            color: rgba(0, 0, 0, 0.6);
            text-align: center;
            font-family: "lato", sans-serif;
            font-weight: 300;
            font-size: 50px;
            letter-spacing: 10px;
            line-height: 1.15;
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;
        }
        .options-container {
            display: flex;
            gap: 100px;

        }

        .menu-container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            width: 300px;
        }

        .menu-button {
            padding: 1.2rem 2rem;
            font-size: 1.2rem;
            font-weight: bold;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            //background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
            color: #fff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            text-align: center;
            width: 100%;
        }

        .menu-button:hover {
            //background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
        }

        .menu-button:active {
            transform: translateY(0);
        }

        .menu-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .menu-button.new-game {
            background: linear-gradient(135deg, #38a169 0%, #276749 100%);
        }

        .menu-button.new-game:hover:not(:disabled) {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        }

        .menu-button.continue {
            background: linear-gradient(135deg, #2b6cb0 0%, #2c5282 100%);
        }

        .menu-button.continue:hover:not(:disabled) {
            background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
        }

        .menu-button.save {
            background: linear-gradient(135deg, #dd6b20 0%, #c05621 100%);
        }

        .menu-button.save:hover:not(:disabled) {
            background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
        }

        .menu-button.options {
            background: linear-gradient(135deg, #718096 0%, #4a5568 100%);
        }

        .menu-button.options:hover:not(:disabled) {
            background: linear-gradient(135deg, #a0aec0 0%, #718096 100%);
        }

        .version-info {
            margin-top: 2rem;
            font-size: 0.9rem;
            color: rgba(0, 0, 0, 0.6);
            position: absolute;
            bottom: 30px;
        }
    `;
    Banner = html`<div class='wrap'>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
        <div class='tri'></div>
    </div>`
}

// Registrar el webcomponent
customElements.define('game-start-screen', GameStartScreen);