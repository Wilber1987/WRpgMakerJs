//@ts-check

import { CharacterModel } from "./CharacterModel.js";

export class CharactersUtil {

    /**
     * Obtiene los personajes actualmente en el party ordenados por posición
     * @param {CharacterModel[]} characters 
     * @param {number} maxPartySize 
     * @returns {CharacterModel[]}
     */
    static getPartyMembers(characters, maxPartySize) {
        return characters
            .filter(c => c.partyPosition !== undefined && c.partyPosition >= 0 && c.partyPosition < maxPartySize)
            .sort((a, b) => (a.partyPosition ?? 0) - (b.partyPosition ?? 0));
    }

    /**
     * @param {CharacterModel} selectedChar
     * @param {CharacterModel[]} characters 
     */
    static assignLeader(selectedChar, characters) {
        const actualLeader = this.getLeader(characters);
        selectedChar.x = actualLeader?.x;
        selectedChar.y = actualLeader?.y;
        characters.forEach(char => char.partyLeader = false);
        selectedChar.partyLeader = true;
    }

    /**
     * @param {CharacterModel[]} characters 
     * @returns {CharacterModel}
     */
    static verifyLeader(characters) {
        if (!characters.some(char => char.partyLeader) && characters[0]) {
            characters[0].partyLeader = true;
        }
        // @ts-ignore
        return characters.find(char => char.partyLeader)
    }
    /**
     * @param {CharacterModel[]} characters 
     * @returns {CharacterModel}
     */
    static getLeader(characters) {
        this.verifyLeader(characters);
        // @ts-ignore
        return characters.find(char => char.partyLeader)
    }

}