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
        props.Stats = {
            hp: 30,
            maxHp: 30,
            strength: 5,
            speed: 3000,
        }
        super(props)
        this.Skills = [
            new SkillModel({ numberTargets: 100 })
        ]
    }
}

export const Alexandra = new AlexandraCharacter();