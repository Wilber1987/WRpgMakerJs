//@ts-check
import { CharacterModel } from "./CharacterModel.js";
import { CharacterRegistry } from "./CharacterRegistry.js";
import { SkillRegistry } from "./SkillRegistry.js";

export const ElementsType = {
    FIRE: "fire",
    ICE: "ice",
    THUNDER: "thunder",
    POISON: "poison",
    EARTH: "earth",
    LIGHT: "light",
    DARK: "dark",
}

export const SkillsType = {
    MELE: "MELE",
    LONG_RANGE: "LONG_RANGE"
}

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
        };
        /**@type {Number} */
        this.manaCost = props.manaCost ?? 0;
        /**@type {Number} */
        this.level = props.level ?? 1;
        /**
         * @type {string|undefined}
         */
        this.element = props.element ?? ElementsType.LIGHT;
        /**
         * @type {number}
         */
        this.level = props.level ?? 1;
        /**
         * @type {string}
         */
        this.skillType = props.skillType ?? SkillsType.MELE;
        /**
         * @type {number|undefined}
         */
        this.animationPause = props.animationPause;
        /**
         * @type {number|undefined}
         */
        this.animationPauseEnd = props.animationPauseEnd;
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