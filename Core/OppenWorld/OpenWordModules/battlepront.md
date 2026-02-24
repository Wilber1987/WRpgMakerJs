tengo este sistema de convate, y un canvas perparado para hacer uso de el:



```javascript
//@ts-check
// --------------------------------------------------
// Sistema de Batalla - Versión con Canvas y Sprites

import { CharacterModel } from "../../Common/CharacterModel.js";
import { TILE_SIZE, DPR } from "../OpenWorldEngineView.js";
//@ts-check
// --------------------------------------------------
// Sistema de Batalla

// --------------------------------------------------
export class BattleSystem {
    /**
     * @param {import("../OpenWorldEngineView.js").OpenWorldEngineView} engine
     */
    constructor(engine) {
        this.engine = engine;
        this.isActive = false;
        /**
         * @type {CharacterModel[]}
         */
        this.combatants = []; // Todos los participantes en la batalla
        this.turnOrder = [];
        this.currentTurnIndex = 0;
        this.battleLog = [];
        this.overlay = engine.shadowRoot.querySelector('#battle-overlay');
        this.battleLogEl = engine.shadowRoot.querySelector('#battle-log');
        this.turnIndicator = engine.shadowRoot.querySelector('#turn-indicator');
        this.partyCombatantsEl = engine.shadowRoot.querySelector('#party-combatants');
        this.enemyCombatantsEl = engine.shadowRoot.querySelector('#enemy-combatants');
        this.skillButtonsEl = engine.shadowRoot.querySelector('#skill-buttons');

        this.Canvas = engine.BattleCanvas
    }

    // Iniciar una batalla
    /**
     * @param {CharacterModel[]} party
     * @param {CharacterModel[]} enemies
     * */
    startBattle(party, enemies) {
        this.isActive = true;
        this.combatants = [...party, ...enemies];
        this.battleLog = [];

        // Inicializar combatientes si no tienen estadísticas
        this.combatants.forEach(combatant => {
            combatant.Stats.maxHp = combatant.Stats.maxHp || combatant.Stats.hp || 1;
            combatant.Stats.hp = combatant.Stats.hp || combatant.Stats.maxHp;
            combatant.Stats.strength = combatant.Stats.strength || 1;
            combatant.Stats.speed = combatant.Stats.speed || 1;
            combatant.Skills = combatant.Skills || [this.createBasicAttack()];
        });

        // Calcular orden de turnos basado en velocidad
        this.calculateTurnOrder();

        // Mostrar la interfaz de batalla
        this.overlay.style.display = 'flex';

        // Actualizar la UI
        this.updateBattleUI();
        this.logBattleMessage("¡La batalla ha comenzado!");

        // Iniciar el primer turno
        this.startNextTurn();
    }

    // Calcular orden de turnos basado en velocidad
    calculateTurnOrder() {
        // Ordenar por velocidad (mayor primero)
        this.turnOrder = [...this.combatants].sort((a, b) => b.Stats.speed - a.Stats.speed);
    }

    // Iniciar el siguiente turno
    startNextTurn() {
        // Buscar el siguiente combatiente vivo
        let nextIndex = this.currentTurnIndex;
        let attempts = 0;

        do {
            nextIndex = (nextIndex + 1) % this.turnOrder.length;
            attempts++;

            if (attempts > this.turnOrder.length) {
                // No hay combatientes vivos, terminar batalla
                this.endBattle();
                return;
            }
        } while (this.turnOrder[nextIndex].hp <= 0);

        this.currentTurnIndex = nextIndex;
        const currentCombatant = this.turnOrder[this.currentTurnIndex];

        this.updateBattleUI();
        this.logBattleMessage(`Turno de ${currentCombatant.Name}`);

        // Si es un enemigo, ejecutar su turno automáticamente
        if (currentCombatant.isEnemy) {
            setTimeout(() => this.executeEnemyTurn(currentCombatant), 1000);
        } else {
            // Si es un aliado, mostrar habilidades
            this.showSkills(currentCombatant);
        }
    }

    // Ejecutar turno de enemigo
    executeEnemyTurn(enemy) {
        // Seleccionar un objetivo aleatorio vivo del grupo aliado
        const targets = this.combatants.filter(c => !c.isEnemy && c.Stats.hp > 0);

        if (targets.length === 0) {
            // No hay objetivos vivos, terminar batalla
            this.endBattle();
            return;
        }

        const target = targets[Math.floor(Math.random() * targets.length)];
        const skill = enemy.Skills[0]; // Usar la primera habilidad (ataque básico)

        this.useSkill(enemy, skill, target);
    }

    // Mostrar habilidades del combatiente actual
    showSkills(combatant) {
        this.skillButtonsEl.innerHTML = '';

        combatant.Skills.forEach(skill => {
            const button = document.createElement('button');
            button.className = 'skill-btn';
            button.textContent = skill.Name;
            button.onclick = () => {
                // Para simplificar, seleccionar el primer enemigo vivo como objetivo
                const targets = this.combatants.filter(c => c.isEnemy && c.Stats.hp > 0);
                if (this.targetEnemy && this.targetEnemy > 0) {
                    this.useSkill(combatant, skill, this.targetEnemy);
                }
                else if (targets.length > 0) {
                    this.useSkill(combatant, skill, targets[0]);

                }
                button.disabled = true;

            };
            this.skillButtonsEl.appendChild(button);
        });
    }

    // Usar una habilidad
    useSkill(user, skill, target) {
        // Calcular daño
        const damage = skill.calculateDamage(user, target);
        target.Stats.hp = Math.max(0, target.Stats.hp - damage);

        // Registrar mensaje
        this.logBattleMessage(`${user.Name} usa ${skill.name} contra ${target.Name} y causa ${damage} de daño.`);

        // Verificar si el objetivo murió
        if (target.Stats.hp <= 0) {
            this.logBattleMessage(`¡${target.Name} ha sido derrotado!`);
        }

        // Actualizar UI
        this.updateBattleUI();

        // Pasar al siguiente turno después de un breve delay
        setTimeout(() => {
            this.startNextTurn();
        }, 1500);
    }

    // Actualizar la interfaz de batalla
    updateBattleUI() {
        // Actualizar combatientes del grupo
        this.partyCombatantsEl.innerHTML = '';
        this.enemyCombatantsEl.innerHTML = '';

        const currentCombatant = this.turnOrder[this.currentTurnIndex];
        this.turnIndicator.textContent = `Turno: ${currentCombatant.Name}`;

        // Mostrar combatientes del grupo aliado
        this.combatants
            .filter(c => !c.isEnemy)
            .forEach(combatant => {
                const combatantEl = this.createCombatantElement(combatant);
                this.partyCombatantsEl.appendChild(combatantEl);
            });

        // Mostrar enemigos
        this.combatants
            .filter(c => c.isEnemy)
            .forEach(combatant => {
                const combatantEl = this.createCombatantElement(combatant);
                combatantEl.classList += " enemyBlock"
                combatantEl.addEventListener("click", () => {
                    this.targetEnemy = combatant;
                    this.enemyCombatantsEl.querySelectorAll(".enemyBlock")?.forEach(enemyBlock => {
                        enemyBlock.style.boxShadow = "";
                    })
                    combatantEl.style.boxShadow = "0 0 5px 0 red"

                })
                this.enemyCombatantsEl.appendChild(combatantEl);
            });

        // Actualizar log de batalla
        this.battleLogEl.scrollTop = this.battleLogEl.scrollHeight;
    }

    // Crear elemento de combatiente para la UI
    createCombatantElement(combatant) {
        const el = document.createElement('div');
        el.className = 'combatant';

        if (combatant.hp <= 0) {
            el.classList.add('dead');
        }

        if (combatant === this.turnOrder[this.currentTurnIndex]) {
            el.classList.add('active');
        }

        const hpPercent = (combatant.Stats.hp / combatant.Stats.maxHp) * 100;

        el.innerHTML = `
                    <div>
                        <div>${combatant.Name}</div>
                        <div class="small">HP: ${combatant.Stats.hp}/${combatant.Stats.maxHp}</div>
                    </div>
                    <div class="hp-bar">
                        <div class="hp-fill ${hpPercent < 30 ? 'low' : ''}" style="width: ${hpPercent}%"></div>
                    </div>
                `;

        return el;
    }

    // Registrar mensaje en el log de batalla
    logBattleMessage(message) {
        this.battleLog.push(message);
        this.battleLogEl.innerHTML = this.battleLog.map(msg => `<div>${msg}</div>`).join('');
    }

    // Terminar la batalla
    endBattle() {
        const aliveParty = this.combatants.filter(c => !c.isEnemy && c.Stats.hp > 0);
        const aliveEnemies = this.combatants.filter(c => c.isEnemy && c.Stats.hp > 0);

        if (aliveParty.length > 0 && aliveEnemies.length === 0) {
            this.logBattleMessage("¡Victoria! Todos los enemigos han sido derrotados.");
        } else if (aliveParty.length === 0 && aliveEnemies.length > 0) {
            this.logBattleMessage("Derrota... Todos los miembros del grupo han caído.");
        } else {
            this.logBattleMessage("La batalla ha terminado en empate.");
        }

        // Ocultar la interfaz después de un tiempo
        setTimeout(() => {
            this.overlay.style.display = 'none';
            this.isActive = false;
        }, 3000);
    }

    // Crear ataque básico
    createBasicAttack() {
        return {
            Name: "Ataque Básico",
            calculateDamage: (user, target) => {
                return Math.max(1, user.Stats.strength);
            }
        };
    }
}

```

#CharacterModel
```javascript
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
            idle: props?.SpritesFrames?.idle ?? 66,
            walk: props?.SpritesFrames?.walk ?? 22,
            attack: props?.SpritesFrames?.attack ?? 22,
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

        this.Skills = []
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
        this.width = props?.width ?? 1;
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
    _loadSpriteSequence(basePath, frameCount, ext = 'png', startIndex = 0) {
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
        idle: 25,
        walk: 25,
        attack: 25
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
```

necesito lo siguiente: 

- que el canvas funcione con una grid de 8 * 6, definido en el constructor
- que tanto los enemigos como los aliados se renderizen en cada parte del canvas haciendo uso de sus sprite: ya que son charactermodel tenemos una lista de spritites disponibles para usar, usaremos Sprite.Normal (debe de ser definido cual va a ser el sprite por defecto que usara el battle sistem, ejemplo this.BasicSprite = "Normal", de tal manera que pueda referenciar al sprite correspondiente del personaje ejemplo chara.Sprites[this.BasicSprite]) por el momento  y cada personaje se ubicara en un cuadro de la grid usando las primeras 4 colunas para los aliados y las otras 4 para los enemigos
- como permitire a un maximo de 6  integrantes por equipo  la renderizacion iniciara a partir del cuadro 1 * 1 de cada bloque, por lo que el equipo de aliados quedara de esta manera en su primer bloque
    * aliados: 
        - col 1, fila 1 : primer poersonaje 
        - col 2, fila 1 : segundo personaje
        - col 1, fila 2  : tercer personaje
        - col 2, fila 2 :cuarto....
        - asi susesivamente .. hasta 6
    * el caso de los enemigos 
        - col 5, fila 1 : primer personaje 
        - col 6, fila 1 : primer personaje 
        - asi susesivamente .. hasta 6
- luego con cada accion el render deberia cambiar de estado, por ejemplo atacar, en este caso this.AttackSprite = "Attack" y este al dar click en ataque cambiara el estado hara un loop del sprite (25 fps por ejemplo) y luego regresara a su estado this.BasicSprite
- cuando el hp de un personaje llegue a 0 debera cambiar a estado  this.DeathSprite = "Death"
- por el momento no cambiaremos la logica de batalla actual

