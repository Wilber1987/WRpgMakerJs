//@ts-check
import { CharacterModel } from "../Common/CharacterModel.js";
import { GameEngine } from "./GameEngine.js";
import { GameMap } from "./OpenWordModules/Models.js";
import { ComponentsManager, html, WRender } from "../WDevCore/WModules/WComponentsTools.js";
import { css } from "../WDevCore/WModules/WStyledRender.js";
import { saveSystem, vnEngine } from "../VisualNovel/VisualNovelEngine.js";
import { GameStartScreen } from "../Common/UIComponents/GameStartScreen.js";
import { LoadScreen } from "../Common/UIComponents/LoadScreen.js";
import { CharactersUtil } from "../Common/CharactersUtil.js";



class OpenWorldEngineView extends HTMLElement {
    /**
     * @typedef {Object} ComponentsConfig 
        * @property {CharacterModel} [character] objeto
        * @property {CharacterModel[]} [Characters]
        * @property {boolean} [isFullPerspective]
    **/
    /**
    * @param {ComponentsConfig} [Config] 
    */
    constructor(Config) {
        super();
        this.Config = Config;
        if (Config?.character) {
            Config?.character.RegisterWordMapCharacter(this.Config?.isFullPerspective)
        }
        this.attachShadow({ mode: 'open' });
        this.shadowRoot?.append(this.CustomStyle);
        WRender.SetStyle(this, {
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            opacity: "0",
            pointerEvents: "none",
            height: "100vh"
        });
        /**@type {HTMLCanvasElement} */
        // @ts-ignore
        this.Canvas = html`<canvas id="view"></canvas>`;
        /**@type {HTMLCanvasElement} */
        // @ts-ignore
        this.MinimapCanvas = html`<canvas id="minimap"></canvas>`;
        /**@type {HTMLCanvasElement} */
        // @ts-ignore
        this.BattleCanvas = html`<canvas id="battle-canvas"></canvas>`;
        this.Draw();

        this.character = Config?.character;
        /** @type {CharacterModel[]} */
        this.Characters = Config?.Characters ?? [];
        if (this.character && !this.Characters.includes(this.character)) {
            this.Characters.push(this.character)
        } else if(!this.character && this.Characters.length > 0) {
            this.character = this.Characters[0];
        }
        if (this.character) {
            CharactersUtil.assignLeader(this.character, this.Characters)
        }

        this.GameEngine = new GameEngine(this);
        
        saveSystem.openWorldEngine = this;
        /**@type { GameStartScreen? } */
        this.screenView = null;
        this.LoadScreen = this.LoadScreen ?? new LoadScreen();
    }
    connectedCallback() {
        //this.StartEngine();
        ComponentsManager.modalFunction(this);
    }
    Draw = async () => {
        const layout = html`<div id="stage-wrap">
            <div id="game">
                ${this.Canvas}
                <div id="hud"
                    style="position:absolute;left:8px;top:8px;color:#fff;font-family:monospace;background:rgba(0,0,0,0.35);padding:6px;border-radius:6px;font-size:13px">
                </div>
                <div id="battle-overlay">
                  
                </div>
            </div>
            <div id="ui">                
                <div class="panel">
                    <div class="row">
                        <label>Minimap</label>
                    </div>
                    ${this.MinimapCanvas}
                </div>
                <div class="panel">
                    <div class="row">
                        <label>Estado</label>
                    </div>
                    <div id="stateBox" class="small stat">Cargando...</div>
                </div>
            </div>
        </div>`;
        this.shadowRoot?.append(layout);
    }
    StartEngine() {
        this.GameEngine.active = true;

        const resizeCanvas = () => {
            /**@type {DOMRect} */
            // @ts-ignore
            const rect = this.Canvas.parentElement?.getBoundingClientRect();
            this.Canvas.style.width = rect.width + 'px'; this.Canvas.style.height = rect.height + 'px';
            this.Canvas.width = Math.floor(rect.width * DPR); this.Canvas.height = Math.floor(rect.height * DPR);
            this.GameEngine.cam.screenW = this.Canvas.width / DPR; this.GameEngine.cam.screenH = this.Canvas.height / DPR;
            // minimap
            this.MinimapCanvas.width = this.MinimapCanvas.clientWidth * DPR; this.MinimapCanvas.height = this.MinimapCanvas.clientHeight * DPR;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        requestAnimationFrame(this.GameEngine.update.bind(this.GameEngine));
    }
    /** 
     * @param {CharacterModel[]} aditionalMembers
     * @returns {CharacterModel[]} 
     * */
    GetParty(...aditionalMembers) {
        const party = this.GameEngine.Characters.filter(
            character => character.partyPosition != undefined
        )
        if (party.length == 0) {
            this.GameEngine.SelectedCharacter.partyPosition = 0;
            return this.GetParty(...aditionalMembers);
        }
        party.push(...aditionalMembers)
        // @ts-ignore
        return party.sort((a, b) => a.partyPosition - b.partyPosition);;
    }
    /**
    * @param {CharacterModel} character 
    */
    RegisterCharacter(character) {
        this.GameEngine.RegisterCharacter(character);
    }

    update() {
        this.Draw();
    }
    close = () => {
        ComponentsManager.modalFunction(this);
        setTimeout(() => {
            // @ts-ignore
            this.style.opacity = 0;
            this.style.pointerEvents = "none"
            this.GameEngine.active = false
        }, 500);
    }
    connectToDom = () => {
        ComponentsManager.modalFunction(this);
    }
    disconnectedCallback() {
        // Detener el motor
        if (this.GameEngine) {
            this.GameEngine.active = false;
        }

        // Opcional: limpiar listeners (aunque window listeners persisten)
        // Si quieres ser estricto, guarda referencias a los handlers y remuévelos.
    }
    /**
     * @param {GameMap} map
     */
    AddMap(map) {
        this.GameEngine.addMap(map);
    }
    /**
     * @param {string} mapName
     * @param {number} [xPos]
     * @param {number} [yPos]
     */
    GoToMap(mapName, xPos, yPos) {
        if (!this.isConnected) {
            this.Start(false);
        }
        this.StartEngine()
        // @ts-ignore
        this.GameEngine.GoToMap(mapName,
            xPos && yPos ? { x: xPos, y: yPos } : undefined);
    }
    Start(autoConnectMap = true) {
        document.body.append(this);
        if (autoConnectMap) {
            this.GoToMap(Object.keys(this.GameEngine.maps)[0])
        }
    }
    /**
     * @param {CharacterModel[]} enemies
     * @param {CharacterModel[]} [party]    
     */
    StartBattle = async (enemies, party = this.GetParty()) => {
        this.shadowRoot?.append(this.LoadScreen);
        try {
            for (const member of party) {
                await member.ChargeBattleSprites();
            }
            for (const member of enemies) {
                await member.ChargeBattleSprites();
            }
            setTimeout(() => {                
                this.LoadScreen.hide();
            }, 1000);
            this.GameEngine.battleSystem.startBattle(party, enemies);
        } catch (error) {
            console.error('❌ Error cargando sprites de batalla:', error);
            this.LoadScreen.hide();
            // Fallback: iniciar batalla aunque los sprites no estén completos
            this.GameEngine.battleSystem.startBattle(party, enemies);
        }        
    }


    SetTimeClass = () => {
        const hour = vnEngine.TimeSystem.getCurrentTime().hour;
        let time = "time-morning"
        if (hour >= 5 && hour < 15) time = "time-morning";
        else if (hour >= 15 && hour < 20) time = "time-afternoon";
        else if (hour >= 20 || hour < 1) time = "time-night";
        else if (hour >= 1 || hour < 5) time = "time-late-night";
        this.Canvas.className = time;
    }

    CustomStyle = css`
        :root {
            --ui-h: 48px
        }
        :host {
            font-family: system-ui;
        }

        html,
        body {
            height: 100%;
            margin: 0;            
        }

        .app {
            display: grid;
            grid-template-rows: var(--ui-h) 1fr;
            height: 100vh
        }

        header {
            height: var(--ui-h);
            display: flex;
            align-items: center;
            padding: 6px 12px;
            gap: 12px;
            background: #111;
            color: #fff
        }

        header label {
            font-size: 13px
        }

        #stage-wrap {
            display: flex;
            gap: 12px;
            overflow: hidden;
            background-color: #fff;
            height: 100%;
            box-sizing: border-box;
            width: 100%;
            margin: 0;
            padding: 0;
        }

        #game {
            flex: 1;
            position: relative;
            background: #222;
            border-radius: 8px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, .6)
        }

        canvas {
            display: block;
            width: 100%;
            height: 100%;
            border-radius: 6px;
            transition: all 1s;
        }

        #ui {
            width: 280px;
            flex: 0 0 280px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            position: absolute;
            right: 120px;
            top: 10px;
        }
        /* En OpenWorldEngineView.js - CustomStyle */


        .panel {
            background: rgba(0, 0, 0, .3);
            padding: 10px;
            border-radius: 8px;
            color: #ddd
        }

        .small {
            font-size: 13px
        }

        .controls {
            display: flex;
            gap: 6px;
            flex-wrap: wrap
        }

        button,
        input,
        select {
            font-size: 13px;
            padding: 6px;
            border-radius: 6px;
            border: 1px solid #333;
            background: #0f0f0f;
            color: #eee
        }

        #minimap {
            width: 100%;
            height: 160px;
            background: rgba(0, 0, 0, .3);
            border-radius: 6px
        }

        .row {
            display: flex;
            gap: 8px
        }

        .muted {
            color: #9aa
        }

        .stat {
            font-size: 12px
        }

                /* Estado base (mañana - sin cambios) */
        .time-morning {
          filter: none;
        }

        /* Tarde - un poco más cálido y suave */
        .time-afternoon {
          filter: 
            brightness(0.95)
            contrast(1.05)
            sepia(0.15)
            hue-rotate(-10deg);
        }

        /* Noche - más oscuro y ligeramente azulado */
        .time-night {
          filter: 
            brightness(0.6)
            contrast(1.1)
            saturate(0.8)
            hue-rotate(10deg);
        }

        /* Muy noche - oscuro profundo con tinte azul */
        .time-late-night {
          filter: 
            brightness(0.4)
            contrast(1.2)
            saturate(0.6)
            hue-rotate(20deg);
        }
                
     `
}
customElements.define('w-oppenworld-component', OpenWorldEngineView);
export { OpenWorldEngineView }


// --------------------------------------------------
// Config & Helpers
// --------------------------------------------------
export const DPR = Math.max(1, window.devicePixelRatio || 1);
export let TILE_SIZE = 32;
/**
 * @param {number} v
 * @param {number} a
 * @param {number} b
 */
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 */
export function lerp(a, b, t) { return a + (b - a) * t; }

//export const oppenWorldEngine = new OpenWorldEngineView();

