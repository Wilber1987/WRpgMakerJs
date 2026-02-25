import { CharacterModel } from "./CharacterModel.js";

export class SkillModel {    
    /**
    * @param {Partial<SkillModel>} props 
    */
    constructor(props) {
        this.name = props.name ?? "Basic Attack";
        this.icon = `./Media/assets/sprites/skills/${props.icon ?? "basic_attack"}.png`;
        this.actualColdown = 0;
        this.coldown = this.coldown ?? 0;
        this.calculateDamage = props.calculateDamage ?? this.basicSkill();
        this.numberTargets = props.numberTargets ?? 1; 
        /**@type {HTMLImageElement[]} */
        this.spriteSkillAnimation = props.spriteSkillAnimation ?? [];
    }

    excute( 
        /** @type {CharacterModel} */ user,
        /** @type {CharacterModel} */ target)
    {
        if (this.actualColdown == 0) {            
            this.actualColdown = this.coldown;
            return this.calculateDamage(user, target);
        } else {
            return undefined;
        }
    }

    basicSkill() {
        return (
            /** @type {CharacterModel} */ user,
            /** @type {CharacterModel} */ target
        ) => {
            return Math.max(1, user.Stats.strength);
        }
    }

    reduceColdDown() {
        this.actualColdown--;
        if (this.actualColdown < 0) {
            this.reset()
        }
    }

    reset() {
        this.actualColdown = 0;
    }
}