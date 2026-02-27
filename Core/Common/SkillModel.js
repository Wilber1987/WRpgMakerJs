//@ts-check
import { CharacterModel } from "./CharacterModel.js";
import { CharacterRegistry } from "./CharacterRegistry.js";
import { SkillRegistry } from "./SkillRegistry.js";

export class SkillModel {
    static _registeredClasses = new Set();
    /**
    * @param {Partial<SkillModel>} props 
    */
    constructor(props) {
         /**@type {String} */
        this.name = props.name ?? "Basic Attack";
        /**@type {String} */
        this.icon = `./Media/assets/sprites/skills/${props.icon ?? "basic_attack"}.png`;
        this.actualCooldown = 0;
        this.cooldown = this.cooldown ?? 0;
        /**@type {Function} */
        this.calculateDamage = props.calculateDamage ?? this.basicSkill();
        /**@type {Number} */
        this.numberTargets = props.numberTargets ?? 1;
        /**@type {HTMLImageElement[]} */
        this.spriteSkillAnimation = props.spriteSkillAnimation ?? [];
        /**@type {String} */
        this.description = props.description ?? "Ataque";
        // 🔥 Auto-registro UNA VEZ por tipo de clase
        const className = this.constructor.name;
        if (!SkillModel._registeredClasses.has(className)) {            
            // @ts-ignore
            SkillRegistry.register(className, this.constructor);
            SkillModel._registeredClasses.add(className);
        }
    }

    excute(
        /** @type {CharacterModel} */ user,
        /** @type {CharacterModel} */ target) {
        if (this.actualCooldown == 0) {
            this.actualCooldown = this.cooldown;
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

    reduceCooldDown() {
        this.actualCooldown--;
        if (this.actualCooldown < 0) {
            this.reset()
        }
    }

    reset() {
        this.actualCooldown = 0;
    }
}