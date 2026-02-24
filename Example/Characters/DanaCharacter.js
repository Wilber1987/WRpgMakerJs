//@ts-check

import { CharacterModel } from "../../Core/Common/CharacterModel.js";

class DanaCharacterModel extends CharacterModel {    
    /**
    * @param {Partial<CharacterModel>} [props] 
    */
    constructor(props) {
        super(props)
        /*Stats: {
            hp: 1500,
            maxHp: 1500,
            strength: 100,
            speed: 30,
        },*/
    }
}

export const DanaCharacter = new DanaCharacterModel();