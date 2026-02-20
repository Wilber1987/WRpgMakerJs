//@ts-check

import { vnEngine } from "../VisualNovel/VisualNovelEngine.js";
import { Character, Dialogue, Flow } from "../VisualNovel/VisualNovelModules.js";

const translate = JSON.parse(localStorage.getItem("translate") ?? "[]");

let TILE_SIZE = 32;
export class CharacterModel {
    /**
     * @param {Partial<CharacterModel>} [props]
     */
    constructor(props) {
        /**
         * @type {any[]}
         */
        this.MapData = props?.MapData ?? []
        //Object.assign(this, props);
        // @ts-ignore
        /**@type {String} */
        this.Name = props?.Name ?? this.constructor.name.replace("Model", "");
        //esta propiedad refleja la ruta imagen que debe usar segun cada estado
        /**@type {Object.<string, any>} */
        this.Sprites = {
            Angry: props?.Sprites?.Angry ?? `Scene/sprites/${this.Name}/Angry.png`,
            Fear: props?.Sprites?.Fear ?? `Scene/sprites/${this.Name}/Fear.png`,
            Happy: props?.Sprites?.Happy ?? `Scene/sprites/${this.Name}/Happy.png`,
            Normal: props?.Sprites?.Normal ?? `Scene/sprites/${this.Name}/Normal.png`,
            idle: { down: [], up: [], left: [], right: [] },
            walk: { down: [], up: [], left: [], right: [] },
            attack: { down: [], up: [], left: [], right: [] }
        };

        /**@type {Object.<string, any>} */
        this.SpritesFrames = {
            idle: props?.SpritesFrames?.idle ?? 101,
            walk: props?.SpritesFrames?.walk ?? 53,
            attack: props?.SpritesFrames?.attack ?? 53,
        }
        //estado del personaje
        /**@type {Number} */
        this.x = props?.x ?? 2;
        /**@type {Number} */
        this.y = props?.y ?? 2;
        /**@type {Number} */
        this.speed = props?.speed ?? 6;
        /**@type {String} */
        this.state = props?.state ?? 'idle'; // idle, walk, attack, etc.
        /**@type {String} */
        this.direction = props?.direction ?? 'down'; // up, down, left, right
        /**@type {Number} */
        this.scale = props?.scale ?? 3; // factor de tamaño (1 = 1 bloque)
        //estadisticas del persaonaje
        /**@type {Object.<string, any>} */
        this.Stats = props?.Stats ?? {
            hp: 30,
            maxHp: 30,
            strength: 5,
            speed: 5 // Para batalla
        }
        /**@type {Number} */
        this.animFrame = props?.animFrame ?? 0;
        /**@type {Number} */
        this.animTimer = props?.animTimer ?? 0;

        // Habilidades del personaje
        this.Skills = [
            { name: "Ataque Fuerte", description: "Un ataque poderoso que inflige daño extra", level: Math.floor(Math.random() * 5) + 1 },
            { name: "Defensa", description: "Aumenta la defensa temporalmente", level: Math.floor(Math.random() * 5) + 1 },
            { name: "Curación", description: "Restaura puntos de vida", level: Math.floor(Math.random() * 5) + 1 }
        ];

        // Historia del personaje
        /**@type {String} */
        this.Backstory = props?.Backstory ??
            `Este es ${name}, un ${this.isFemale ? 'valiente heroína' : 'valiente héroe'} con una historia fascinante. Ha recorrido muchos lugares y enfrentado numerosos desafíos para llegar hasta donde está ahora.`;
        // Estado actual
        /**@type {String} */
        this.currentState = props?.currentState ?? "Normal";
        // Nivel y experiencia
        this.Level = Math.floor(Math.random() * 50) + 1;
        this.Experience = Math.floor(Math.random() * 1000);
        // Inventario simulado
        /**@type {Array<Object>} */
        this.Inventory = props?.Inventory ?? [
            { name: "Espada", type: "Arma", rarity: "Común" },
            { name: "Poción de Vida", type: "Consumible", rarity: "Común" },
            { name: "Amuleto Mágico", type: "Accesorio", rarity: "Raro" }
        ];
        /**
         * @type {number | undefined}
         */
        this.tileHeight = props?.tileHeight ?? 3;
        /**@type {Boolean} */
        this.isNPC = props?.isNPC ?? false;
        /**@type {Function} */
        this.Action = props?.Action ?? (() => { }) //TODO action de mapa;
        /**@type {Number} */
        this.width = props?.width ?? 2;
        /**@type {Number} */
        this.height = props?.height ?? 3;
        //Object.assign(this, props);
        vnEngine.RegisterCharacter(this);
    }

    RegisterWordMapCharacter = async () => {
        this.ChargeBasicSprites()
        this.Sprites.walk = {
            down: this._loadSpriteSequence(
                `Media/Scene/sprites/${this.Name}/walk_down/`, this.SpritesFrames.walk
            ),
            up: this._loadSpriteSequence(
                `Media/Scene/sprites/${this.Name}/walk_up/`, this.SpritesFrames.walk
            ),
            left: this._loadSpriteSequence(
                `Media/Scene/sprites/${this.Name}/walk_left/`, this.SpritesFrames.walk
            ),
            right: this._loadSpriteSequence(
                `Media/Scene/sprites/${this.Name}/walk_right/`, this.SpritesFrames.walk
            ),
        };

        this.Sprites.attack = {
            down: this._loadSpriteSequence(
                `Media/Scene/sprites/${this.Name}/attack_down`, 1
            ),
            up: this._loadSpriteSequence(
                `Media/Scene/sprites/${this.Name}/attack_up`, 1
            ),
            left: this._loadSpriteSequence(
                `Media/Scene/sprites/${this.Name}/attack_left`, 1
            ),
            right: this._loadSpriteSequence(
                `Media/Scene/sprites/${this.Name}/attack_right`, 1
            ),
        };
    }

    ChargeBasicSprites = async () => {
        this.Sprites.idle = {
            down: this._loadSpriteSequence(
                `Media/Scene/sprites/${this.Name}/idle_down/`, this.SpritesFrames.idle
            ),
            up: this._loadSpriteSequence(
                `Media/Scene/sprites/${this.Name}/idle_up/`, this.SpritesFrames.idle
            ),
            left: this._loadSpriteSequence(
                `Media/Scene/sprites/${this.Name}/idle_left/`,  this.SpritesFrames.idle
            ),
            right: this._loadSpriteSequence(
                `Media/Scene/sprites/${this.Name}/idle_right/`, this.SpritesFrames.idle
            ),
        };
    }

    isFemale = false
    /**
     * Carga una secuencia de sprites numerados automáticamente
     * Ej: walk_down1.png ... walk_down4.png
     *
     * @param {string} basePath  Ruta SIN el número final
     * @param {number} frameCount Número de frames
     * @param {string} ext Extensión (png, webp, etc)
     * @param {number} startIndex Índice inicial (default = 1)
     * @returns {HTMLImageElement[]}
     */
    _loadSpriteSequence(basePath, frameCount, ext = 'png', startIndex = 1) {
        const frames = [];
        for (let i = 0; i < frameCount; i++) {
            const img = new Image();
            img.src = `${basePath}${startIndex + i}.${ext}`;
            frames.push(img);
        }
        return frames;
    }
    /**
     * @param {any} text
     * @param {any|undefined} audio
     */
    Say(text, audio = undefined) {
        const translated = translate.find((/** @type {{ old: any; }} */ x) => x.old == text)?.new;
        return Dialogue.Say(this.Name, text, audio, this.isFemale);
    }
    /**
     * @param {string | number} name
     */
    GetVar(name) {
        this.Stats[name] = vnEngine.variables[name];
        return this.Stats[name];
    }
    /**
     * @param {string | number} name
    * @param {any} value
     */
    SetVar(name, value) {
        return Flow.Set(this.Name + name, value);
    }

    /**
     * @param {string} name
     */
    SetLocation(name) {
        this.Stats[this.Name + "_In_Location"] = name
        vnEngine.variables[this.Name + "_In_Location"] = name
        //return Flow.Set(this.Name + "_In_Location", name);
    }
    /**
     * @param {string} name
     */
    isLocation = (name) => {
        console.log(this.GetVar(this.Name + "_In_Location") == name);
        return this.GetVar(this.Name + "_In_Location") == name;
    }

    Show(state = "Normal", position = "center") {
        return Character.Show(this.Name, this.Sprites[state] ?? this.Sprites["Normal"], position)
    }
    /**
     * @param {string | undefined} state
     */
    ShowR(state = "Normal") {
        return this.Show(state, "right");
    }
    /**
     * @param {string | undefined} state
     */
    ShowL(state = "Normal") {
        return this.Show(state, "left");
    }
    Hide() {
        return Character.Hide(this.Name);
    }

    //acciones de openworl
    static SpriteCache = new Map();
    /**
     * @param {string} src
    */
    _loadSprite(src) {
        if (CharacterModel.SpriteCache.has(src)) {
            return CharacterModel.SpriteCache.get(src);
        }
        const img = new Image();
        img.src = src;
        CharacterModel.SpriteCache.set(src, img);
        return img;
    }
    animFPS = {
        idle: 60,
        walk: 60,
        attack: 60
    };
    /**
     * @param {number} dt
     * @param {boolean} moving
     */
    updateAnimation(dt, moving) {
        const nextState = moving ? 'walk' : 'idle';

        if (this.state !== nextState) {
            this.state = nextState;
            this.animFrame = 0;
            this.animTimer = 0;
        }

        // @ts-ignore
        const fps = this.animFPS[this.state] ?? 6;
        const frameTime = 1 / fps;

        this.animTimer += dt;
        while (this.animTimer >= frameTime) {
            this.animTimer -= frameTime;
            const frames = this.Sprites[this.state][this.direction];
            this.animFrame = (this.animFrame + 1) % frames.length;
        }
    }


    /**
     * @param {{ drawImage: (arg0: any, arg1: number, arg2: number, arg3: number, arg4: number) => void; }} ctx
     * @param {{ x: number; zoom: number; screenW: number; y: number; screenH: number; }} cam
     */
    draw(ctx, cam) {
        const spriteList = this.Sprites[this.state][this.direction];
        const img = spriteList[this.animFrame];
        if (!img || !img.complete || img.naturalWidth === 0) return;

        const px = (this.x - cam.x) * TILE_SIZE * cam.zoom + cam.screenW / 2;
        const py = (this.y - cam.y) * TILE_SIZE * cam.zoom + cam.screenH / 2;

        const tileHeight = this.tileHeight ?? 1.5;

        const drawH = TILE_SIZE * cam.zoom * tileHeight;
        const aspect = img.naturalWidth / img.naturalHeight;
        const drawW = drawH * aspect;
        ctx.drawImage(
            img,
            px - drawW / 2,
            py - drawH + (drawH * 0.15),
            drawW,
            drawH
        );
    }

    // En CharacterModel.js - método occupies() mejorado
    /**
     * Verifica si el NPC ocupa una posición específica en el grid
     * @param {number} tx - Coordenada X en tiles
     * @param {number} ty - Coordenada Y en tiles
     * @param {Object<string, any>} mapData
     * @returns {boolean}
     */
    occupies(tx, ty, mapData) {
        const npcTileX = Math.floor(mapData.posX);
        const npcTileY = Math.floor(mapData.posY);

        // Tamaño del NPC en tiles (por defecto 1x1)
        const width = this.width ?? 1;
        const height = this.height ?? 1.5;

        // Verificar si la posición está dentro del área del NPC
        return tx >= npcTileX && tx < npcTileX + width &&
            ty >= npcTileY && ty < npcTileY + height;
    }


    //------------

    /**
     * @param {any} arg0
     * @param {any} arg1
     */
    setLocation(arg0, arg1) {
        return "TODO";
    }
    /**
     * @param {any} arg0
     */
    SetNeedItem(arg0) {
        return "TODO";
    }
    /**
     * @param {any} arg0
     */
    GetNeedItem(arg0) {
        return "TODO";
    }

    GetLocation() {
        return "TODO";
    }

}