//@ts-check
import { ComponentsManager, html } from "../WDevCore/WModules/WComponentsTools.js";
import { css } from "../WDevCore/WModules/WStyledRender.js";

export class CharacterContainer extends HTMLElement {
    /**
     * @param {string} character
     * @param {string} imageUrl
     * @param {string} [position]
     */
    constructor(character, imageUrl, position = "center") {
        super();
        this.append(this.CustomStyle);
        this.className = this.className + " character-container character-" + character;
        this.Draw(character, imageUrl, position);
    }
    connectedCallback() {
        ComponentsManager.modalFunction(this);
    }
    close() {
        ComponentsManager.modalFunction(this);
        setTimeout(() => {
            this.parentNode?.removeChild(this);
        }, 500);
    }
    /**
     * @param {string} character
     * @param {string} imageUrl
     * @param {string} [position]
     */
    Draw = async (character, imageUrl, position = "center") => {
        this.append(html`<img 
            src="${imageUrl}"
            class="character ${position}"
            alt="${character}"
        />`)
    }
    CustomStyle = css`
        w-character-container {            
            opacity: 0;
            transition: all 1s;
        }
    `
}
customElements.define('w-character-container', CharacterContainer);