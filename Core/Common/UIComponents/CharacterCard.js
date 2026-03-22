//@ts-check
import { CharacterModel } from "../CharacterModel.js";
import { html } from "../../WDevCore/WModules/WComponentsTools.js";
import { css } from "../../WDevCore/WModules/WStyledRender.js";
import { CharacterDetailView } from "./CharacterDetailView.js";
import { CharacterManagerView } from "./CharacterManagerView.js";
import { CharactersUtil } from "../CharactersUtil.js";

class CharacterCard extends HTMLElement {
    /**
     * @param {CharacterModel} Character
     * @param {CharacterManagerView} manager
     */
    constructor(Character, manager) {
        super();
        this.Character = Character;
        this.manager = manager;
        this.characterIndex = manager.Characters.indexOf(Character)
        this.append(this.CustomStyle);
        this.followerOption = html`<div class="option">
            <label for="isFollowerCheck${this.characterIndex}">follower</label>
            <input type="checkbox" id="isFollowerCheck${this.characterIndex}" 
            ${this.isFollower()}
            onchange="${(/** @type {{ stopPropagation: Function ; target: any; }} */ e)=> this.AssignFollowerValue(e)}">
        </div>`
        if (this.Character.partyLeader) {
            this.disabledFollowOption();
        }
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
        const card = html`<div class="card">
            ${this.CustomStyle}
            <div class="gender-badge">${isFemale ? '♀' : '♂'}</div>                        
            <div class="image-container">
                <img src="./Media/${Sprites.Normal[0]}"  onclick="${()=> document.body.append(new CharacterDetailView(this.Character))}">
            </div>                        
            <div class="info-container">
                <div class="name">${Name}</div> 
                <div class="option">
                    <label for="isLeadeCheck${this.characterIndex}">leader</label>
                    <input type="radio" name="party" id="isLeadeCheck${this.characterIndex}" 
                        ${this.isLeader()}
                        onchange="${(/** @type {{ stopPropagation: Function ; target: any; }} */ e)=> this.AssignLeadeValue(e)}"> 
                </div>
                ${this.followerOption}        
            </div>
        </div>`;
        this.append(card)
    }
    CustomStyle = css`
         .card {
            width: 250px;
            height: 250px;
            background: linear-gradient(145deg, var(--primary-color), var(--secondary-color));
            border-radius: var(--border-radius);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
            cursor: pointer;
            transition: all 0.5s;
            border-radius: 40px;
        }
        
        .card:hover {
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
                width: 100%;
                object-fit: cover;
                object-position: top;
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
            padding: 10px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            position: absolute;
            bottom: 5px;
            left: 15px;
        }
        
        .name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
            text-align: center;
            color: #fafafa;
            border-bottom: 2px solid var(--accent-color);
            
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
         .option {
            text-transform: capitalize;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 5px;
            padding: 4px 8px;
            background: rgba(0,0,0,0.4);
            border-radius: 6px;
        }
        
        .option label {
            font-size: 12px;
            color: rgba(255,255,255,0.9);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            user-select: none;
        }
        
        /* Ocultar inputs nativos */
        .option input[type="radio"],
        .option input[type="checkbox"] {
            appearance: none;
            -webkit-appearance: none;
            width: 25px;
            height: 25px;
            border: 2px solid rgba(255,255,255,0.4);
            border-radius: 4px;
            background: rgba(255,255,255,0.1);
            cursor: pointer;
            position: relative;
            transition: all 0.2s ease;
            margin-left: 8px;
            flex-shrink: 0;
        }
        
        /* Radio button - forma circular */
        .option input[type="radio"] {
            border-radius: 50%;
        }
        
        /* Checkbox hover */
        .option input[type="checkbox"]:hover,
        .option input[type="radio"]:hover {
            border-color: rgba(74, 175, 255, 0.8);
            background: rgba(255,255,255,0.2);
        }
        
        /* Checkbox checked */
        .option input[type="checkbox"]:checked {
            background: linear-gradient(135deg, #38a169, #276749);
            border-color: #38a169;
        }
        
        /* Checkbox checked - checkmark */
        .option input[type="checkbox"]:checked::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 12px;
            font-weight: bold;
        }
        
        /* Radio checked */
        .option input[type="radio"]:checked {
            background: linear-gradient(135deg, #4299e1, #3182ce);
            border-color: #4299e1;
        }
        
        /* Radio checked - punto central */
        .option input[type="radio"]:checked::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
        }
        
        /* Focus visible */
        .option input[type="checkbox"]:focus,
        .option input[type="radio"]:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(74, 175, 255, 0.4);
        }
        `

    /** 
    * @returns {any}
    */
    isLeader() {
        return this.Character.partyLeader ? "checked" : "";
    }
    /** 
    * @returns {any}
    */
    isFollower() {
        return this.Character.isFollower ? "checked" : "";
    }

    /**
     * @param {{ stopPropagation: Function ; target: any; } } e
     */
    AssignFollowerValue(e) {
        const leader = CharactersUtil.getLeader(this.manager.Characters)
        if (e.target.checked == true && leader) {
           this.Character.follow(leader)
        } else {
            this.Character.isFollower = e.target.checked;
        }
        
    }

    /**
     * @param {{ stopPropagation: Function ; target: any; } } e
     */
    AssignLeadeValue(e) {
        if (e.target.checked == true) {
           CharactersUtil.assignLeader(this.Character, this.manager.Characters);   
           this.disabledFollowOption();       
        } else {
           this.Character.partyLeader = e.target.checked;
           const leader = CharactersUtil.verifyLeader(this.manager.Characters);           
           this.followerOption.style.pointerEvents = "all";
           if (leader == this.Character) {
               this.disabledFollowOption();      
           }

        }
        this.manager.Update();
    }

    disabledFollowOption() {
        this.Character.isFollower = false;
        this.followerOption.style.pointerEvents = "none";
    }
}
customElements.define('w-character-card', CharacterCard);
export { CharacterCard }