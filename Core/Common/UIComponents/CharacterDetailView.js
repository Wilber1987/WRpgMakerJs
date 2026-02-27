//@ts-check
import { CharacterModel } from "../CharacterModel.js";
import { ComponentsManager, html } from "../../WDevCore/WModules/WComponentsTools.js";
import { css } from "../../WDevCore/WModules/WStyledRender.js";
import { WCarousel } from "../../WDevCore/WComponents/UIComponents/WCarousel.js";
import { CharacterContainer } from "./CharacterContainer.js";

const domainUrl = "./Media";
class CharacterDetailView extends HTMLElement {

    /**
     * @param {CharacterModel} Character
     */
    constructor(Character) {
        super();
        this.Character = Character;
        this.append(this.CustomStyle);
        this.Draw();
    }
    connectedCallback() {
        ComponentsManager.modalFunction(this);
    }
    close = () => {
        ComponentsManager.modalFunction(this);
        setTimeout(() => {
            this.remove();
        }, 500);
    }
    Draw = async () => {
        const { Name, isFemale, Sprites, Stats, Skills, Backstory, Level, Experience, Inventory }
            = this.Character;

        const content = html`<div class="character-detail-view">
            <div class="close-btn" onclick="${() => this.close()}" id="closeBtn">×</div>
            <div class="character-sprite">
                ${this.GetSprites()}               
            </div>
            <div class="character-detail">
                <h1>${this.Character.Name}</h1>
                <p>${Backstory}</p>
                <div class="detail-content">
                    <div class="detail-sidebar">
                        <div class="section">
                            <div class="section-title">Estadísticas</div>
                                <div class="stats-grid">
                                     ${Object.entries(Stats).map(([statName, value]) => html`<div class="stat-item">
                                            <span>${statName}</span>
                                            <span class="stat-value">${value}</span>
                                        </div>`)}
                                </div>
                            </div>
                        </div>                            
                        <div class="detail-main">
                        <div class="section">
                            <div class="section-title">Habilidades</div>
                            <div class="skills-list">
                                ${Skills.map(skill => html`<div class="skill-item">
                                    <div class="skill-header">
                                        <img src="${skill.icon}"/>
                                        <span class="skill-name">${skill.name}</span>
                                        <span class="skill-level">Target: ${skill.numberTargets}</span>
                                    </div>
                                    <div class="skill-description">${skill.description}</div>
                                </div>`)}
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">Historia</div>
                            <div class="backstory">${Backstory}</div>
                        </div>

                        <div class="section">
                            <div class="section-title">Inventario</div>
                            <div class="inventory-grid">
                                ${Inventory.map(item => html`<div class="inventory-item">
                                    <div class="item-name">${item.name}</div>
                                    <div class="item-type">${item.type}</div>
                                    <div class="item-rarity rarity-${item.rarity.toLowerCase()}">${item.rarity}</div>
                                </div>`)}
                            </div>
                        </div>
                    </div>                
                </div>
            </div> 
    </div>`
        this.append(content)
    }

    GetSprites() {
        return new WCarousel(Object.keys(this.Character.Sprites)
            .filter(prop => prop == "Normal")
            // @ts-ignore
            .filter(prop => typeof this.Character.Sprites[prop] === "string" || Array.isArray(this.Character.Sprites[prop]))
            .map(
                // @ts-ignore
                prop => new CharacterContainer(this.Character.Name,
                     this.Character.Sprites[prop].map((/** @type {String} */ img) => `${domainUrl}/${img}`))
            ));
    }

    update() {
        this.Draw();
    }
    CustomStyle = css`
        w-character-detail-view {
            position: absolute;
            opacity: 0;
            pointer-events: none;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10001;
            transition: all 1s;
            background-color: #fff;
            display: block;
            height:100vh;
            font-family: system-ui;
        }
        .character-detail-view{
            display: block;
            display: grid;
            position: relative;
            grid-template-columns:  40% 60%;
            .character-sprite {
                height: 100vh;
                width: 100%;
                background-color:#010b10;
            }
        }
        .character-detail {
            display: flex; 
            flex-direction: column;
            height: -webkit-fill-available;
            border-left: solid 1px #cfcfcf;
            h1 {
                color: #2b6cb0;
                font-size: 3em;
                border-bottom: 3px solid #4a5568;
                margin: 0px;
                padding: 20px;
            }
            p {
                border-top: solid 1px #cfcfcf;
                border-bottom: solid 1px #cfcfcf;
                padding: 20px;
                margin: 0px;
            }
        }
        .detail-content {
            display: flex;
            flex-grow: 1;
            overflow: hidden;
        }
        
        .detail-sidebar {
            width: 200px;
            background: rgba(0, 0, 0, 0.1);
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .detail-main {
            flex-grow: 1;
            padding: 20px;
            overflow-y: auto;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: var(--accent-color);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 5px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(1, 1fr);
            gap: 10px;
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 6px;
        }
        
        .stat-value {
            font-weight: bold;
            color: #2b6cb0
        }
        
        .skills-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .skill-item {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            border: 1px solid #d3d3d3;
            margin: 5px;
        }
        
        .skill-header {
            display: flex;
            gap: 20px;
            border-bottom: 1px solid #d3d3d3;
            padding: 15px;
            img {
                min-height: 80px;
                min-width: 80px;
                height: 80px;
                width: 80px;
                border-radius: 50%;
                box-shadow: 0 0 5px 0 #292929;
            }
        }
        
        .skill-name {
            font-weight: bold;
        }
        
        .skill-level {
            color: var(--accent-color);
            font-weight: bold;
        }
        
        .skill-description {
            padding: 15px;
            font-size: 16px;
            color: #293442;
        }
        
        .backstory {
            line-height: 1.6;
            font-size: 14px;
        }
        
        .inventory-grid {
            display: grid;
            grid-template-columns: repeat(1, 1fr);
            gap: 10px;
        }
        
        .inventory-item {
            background: #d1d1d1;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
        }
        
        .item-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .item-type {
            font-size: 12px;
            color: #a0aec0;
        }
        
        .item-rarity {
            font-size: 11px;
            margin-top: 5px;
            padding: 2px 5px;
            border-radius: 10px;
            display: inline-block;
        }
        
        .rarity-common {
            background: #4a5568;
        }
        
        .rarity-rare {
            background: #2b6cb0;
        }
        
        .close-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: #4a5568;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-weight: bold;
            font-size: 18px;
            z-index: 10;
        }
     `
}
customElements.define('w-character-detail-view', CharacterDetailView);
export { CharacterDetailView }