//@ts-check
const translate = JSON.parse(localStorage.getItem("translate") ?? "[]");

const domainUrl = "./Media";
export class Scene {
    static Show(url, audio, loopAudio = true, isAffectedByTime = false) {
        return {
            type: "scene",
            image: `${domainUrl}/${url}`,
            audio: audio ? `${domainUrl}/${audio}` : null,
            isAffectedByTime: isAffectedByTime,
            loopAudio
        };
    }
    static ShowV(url, audio, loopScene = true, loopAudio = true) {
        return {
            type: "scene",
            video: `${domainUrl}/${url}`,
            audio: audio ? `${domainUrl}/${audio}` : null,
            loopScene,
            loopAudio
        };
    }
}

export class Character {
    /**
     * @param {any} who
     * @param {any} image
     */
    static Show(who, image, position = "center") {
        return {
            type: "show", who,
            image: `${domainUrl}/${image}`,
            position
        };
    }

    /**
     * @param {any} who
     * @param {any} image
     */
    static ShowR(who, image) {
        return this.Show(who, image, "right");
    }

    /**
     * @param {any} who
     * @param {any} image
     */
    static ShowL(who, image) {
        return this.Show(who, image, "left");
    }

    /**
     * @param {any} who
     */
    static Hide(who) {
        return { type: "hide", who };
    }
}

export class Dialogue {
    /**
     * @param {string} name
     * @param {string} text
     * @param {null | undefined} [audio]
     */
    static Say(name, text, audio, isFemale = false) {
        return { type: "say", name, text, audio: audio ? `${domainUrl}/${audio}` : null, isFemale };
    }

    /**
     * @param {string} text
     */
    static Narrate(text, audio = null) {
        return this.Say("", text, audio);
    }
}

export class Flow {
    /**
     * @param {string} target
     */
    static Jump(target) {
        return { type: "jump", target };
    }
    /**
    * @param {string} text
    * @param {Array<any>} action
    * @param {{ icon?: string, typeMenu?: string, render?: { type?: string, var?: string, operator?: string , value?: any } , position?: { xpos: number, ypos: number, heightPercent?: number, widthPercent?: number} }} [config] 
    * @returns {any}
    */
    static Action(text, action, config) {
        if (config?.position?.heightPercent) {
            console.log(config);
        }
        const translated = translate.find(x => x.old == text)?.new;
        return {
            text: translated ?? text,
            action,
            icon: config?.icon ? `./Media/${config?.icon}` : undefined,
            typeMenu: config?.typeMenu,
            xpos: config?.position?.xpos,
            ypos: config?.position?.ypos,
            heightPercent: config?.position?.heightPercent,
            widthPercent: config?.position?.widthPercent,
            render: config?.render
        };
    }

    /**
     * @param {({ type: string; who: any; image: string; position: string; } | (() => { type: string; target: string; }))[] | ({ type: string; image: string; audio: string | null; isAffectedByTime: boolean; loopAudio: boolean; } | { type: string; name: string; text: string; audio: string | null; isFemale: boolean; } | { type: string; target: string; } | { type: string; var: any; value: any; } | (() => { type: string; target: string; }))[] | ({ type: string; who: any; image: string; position: string; } | (() => { type: string; options: any; }))[] | ({ type: string; image: string; audio: string | null; isAffectedByTime: boolean; loopAudio: boolean; } | { type: string; name: string; text: string; audio: string | null; isFemale: boolean; } | { type: string; options: any; })[]} commands
     */
    static Block(commands) {
        return { type: "block", commands: commands };
    }

    /**
     * @param {any[]} options
     */
    static Choice(options) {
        return { type: "choice", options };
    }

    static If(condition, thenBlock, elseBlock = []) {
        return { type: "if", condition, then: thenBlock, else: elseBlock };
    }

    /**
     * @param {string | number} variable
     * @param {string | number | boolean | undefined} [value]
     */
    static Set(variable, value) {
        return { type: "set", var: variable, value };
    }

    /**
     * @param {any} duration
     */
    static Wait(duration) {
        return { type: "wait", duration };
    }

    // Operadores para condiciones
    /**
     * @param {string} name
     * @param {string | undefined} [operator]
     * @param {number | boolean | undefined | string} [value]
      *  @returns {{ type: String, var: String, operator: String, value: any } }
     */
    static Var(name, operator, value) {
        return { type: "variable", var: name, operator: operator ?? "==", value: value ?? true };
    }

    // Operadores para condiciones
    /**
     * @param {string} name
     * @param {number} [value]
      *  @returns {{ type: String, var: String, operator: String, value: any } }
     */
    static Sum(name, value) {
        return { type: "sum", var: name, operator: "+", value: value ?? 1 };
    }
    /**
    * @param {string} name
    * @param {number} [value]
     *  @returns {{ type: String, var: String, operator: String, value: any } }
    */
    static Substract(name, value) {
        return { type: "substrac", var: name, operator: "-", value: value ?? 1 };
    }

    /**
     * @param {{ type: string; operator: any; value: any; var?: string; }[]} conditions
     */
    static And(...conditions) {
        return { type: "and", conditions };
    }
/**
     * @param {{ type: string; operator: any; value: any; var?: string; }[]} conditions
     */
    static Or(...conditions) {
        return { type: "or", conditions };
    }

    /**
     * @param {{ type: string; var: string; operator: string; value: any; }} condition
     */
    static Not(condition) {
        return { type: "not", condition };
    }
    /**
     * @param {any[]} options
     * @param {Object<string, any>} config
     */
    static Menu(options, config = {}) {
        return {
            type: 'choice',
            options: options.map(option => ({
                ...option,
                typeMenu: config.typeMenu || 'FLOATING'
            }))
        };
    }
    /**
     * @param {string} hourOperator
     * @param {number} hourValue
     */
    static Time(hourOperator, hourValue) {
        return { type: "time", operator: hourOperator, value: hourValue };
    }
    /**
     * @param {string} audio
     */
    static PlayAudio(audio, loopAudio = true) {
        return {
            type: "audio",
            audio: audio ? `${domainUrl}/${audio}` : null,
            loopAudio
        };
    }
}
const mapBack = Flow.Action("", [Flow.Jump('MainMap')], { typeMenu: "TAB", icon: "Icons/map" });

export class MapScene {
    /**
     * @param {string} MapName
     * @param {any[]} Options
     * @param {{ type: string; audio: string | null; loopAudio: boolean; }} audio
     */
    static Go(MapName, Options, OptionalsMenus = [], audio, isAffectedByTime = false, aditionalBlocks = []) {
        //Options?.forEach();
        return [
            Scene.Show(MapName, undefined, true, isAffectedByTime),
            ...OptionalsMenus,
            Flow.Choice([mapBack, ...Options]),
            ...aditionalBlocks,
            audio
        ]
    }
}

const roomBack = Flow.Action("", [Flow.Jump('MainMap')], { typeMenu: "TAB", icon: "Icons/map" });

export class RoomScene {
    static Go(RoomName, Commands, Options, audio, isAffectedByTime) {
        Options?.forEach(option => {
            if (!option.position) {
                option.typeMenu = 'TAB'
            }
        });
        return [
            Scene.Show(RoomName, audio, true, isAffectedByTime),
            ...Commands,
            Flow.Choice([roomBack, ...Options])
        ]
    }
}
