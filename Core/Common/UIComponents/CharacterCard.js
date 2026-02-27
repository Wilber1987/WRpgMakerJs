//@ts-check
import { CharacterModel } from "../CharacterModel.js";
import { html } from "../../WDevCore/WModules/WComponentsTools.js";
import { css } from "../../WDevCore/WModules/WStyledRender.js";
import { CharacterDetailView } from "./CharacterDetailView.js";

class CharacterCard extends HTMLElement {
    /**
     * @param {CharacterModel} Character
     */
    constructor(Character) {
        super();
        this.Character = Character;
        this.append(this.CustomStyle);
        this.render();
    }
    connectedCallback() { }

    // Método para actualizar la tarjeta
    update() {
        this.render();
    }
    render() {
        if (!this.Character) {
            this.innerHTML = `<div style="color: white; padding: 20px; text-align: center;">Personaje no disponible</div>`;
            return;
        }
        const { Name, isFemale, Sprites, Stats } = this.Character;
        const card = html`<div class="card" onclick="${()=> this.append(new CharacterDetailView(this.Character))}">
            ${this.CustomStyle}
            <div class="gender-badge">${isFemale ? '♀' : '♂'}</div>                        
            <div class="image-container">
                <img src="./Media/${Sprites.Normal[0]}">
            </div>                        
            <div class="info-container">
                <div class="name">${Name}</div>                
            </div>
        </div>`;
        this.append(card)
    }
    CustomStyle = css`
         .card {
            width: 250px;
            height: 350px;
            background: linear-gradient(145deg, var(--primary-color), var(--secondary-color));
            border-radius: var(--border-radius);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
            cursor: pointer;
            transition: all 0.5s;
            border-radius: 15px;
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow:  0 10px 20px rgba(0, 0, 0, 0.4);
        }
        
        .gender-badge {
            position: absolute;
            top: 15px;
            right: 15px;
            background: var(--accent-color);
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            z-index: 2;
        }
        
        .image-container {
            height: 300px;
            background-color: #2d3748;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
            img {
                height: 100%;
            }
        }
        
        .character-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0.9;
        }
        
        .image-placeholder {
            color: #a0aec0;
            font-size: 14px;
            text-align: center;
            padding: 20px;
        }
        
        .state-badge {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: rgba(45, 55, 72, 0.8);
            color: white;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .info-container {
            padding: 20px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }
        
        .name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
            color: #2d3748;
            border-bottom: 2px solid var(--accent-color);
            padding-bottom: 10px;
        }
        
        .stats-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .stat {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 6px;
        }
        
        .stat-name {
            font-weight: bold;
            font-size: 14px;
        }
        
        .stat-value {
            font-weight: bold;
            color: var(--accent-color);
            font-size: 16px;
        }
        
        .stat-bar {
            height: 6px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            margin-top: 5px;
            overflow: hidden;
        }
        
        .stat-fill {
            height: 100%;
            background: var(--accent-color);
            border-radius: 3px;
            transition: width 0.5s ease;
        }           
     `
}
customElements.define('w-character-card', CharacterCard);
export { CharacterCard }