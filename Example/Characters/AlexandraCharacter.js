//@ts-check

import { CharacterModel } from "../../Core/Common/CharacterModel.js";
import { SkillModel } from "../../Core/Common/SkillModel.js";

class AlexandraCharacter extends CharacterModel {
    /**
    * @param {Partial<CharacterModel>} [props] 
    */
    constructor(props = {}) {
        // @ts-ignore
        props.SpritesFrames = { attack : 100 }
        super(props)
        this.Skills = [
            new SkillModel({ numberTargets: 10 })
        ]
        
        
        /*Stats: {
            hp: 1500,
            maxHp: 1500,
            strength: 100,
            speed: 30,
        },*/
    }
}

export const Alexandra = new AlexandraCharacter();