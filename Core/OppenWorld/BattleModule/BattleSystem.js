//@ts-check
// --------------------------------------------------
// Sistema de Batalla - Versión FINAL con Animación y Cámara

import { CharacterModel } from "../../Common/CharacterModel.js";
import { SkillModel } from "../../Common/SkillModel.js";
import { ComponentsManager, html } from "../../WDevCore/WModules/WComponentsTools.js";
import { Camera } from "../Camera.js";
import { DPR } from "../OpenWorldEngineView.js";
import { battleStyle } from "./BattleSystemStyle.js";

export class BattleSystem extends HTMLElement {
    /**
     * @param {import("../OpenWorldEngineView.js").OpenWorldEngineView} engine
     */
    constructor(engine) {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot?.append(battleStyle);
        this.engine = engine;
        this.isActive = false;

        // === CONFIGURACIÓN DEL GRID ===
        this.gridCols = 8;
        this.gridRows = 4;
        this.cellWidth = 0;
        this.cellHeight = 0;

        // === CONFIGURACIÓN DE SPRITES ===
        this.BasicSprite = "battle";      // Sprite por defecto (animado)
        this.AttackSprite = "attack";   // Sprite para ataque (animado)
        this.DeathSprite = "death";      // Sprite para muerte (estático)
        this.SpriteFPS = 25;            // FPS para animaciones de batalla

        // === CÁMARA DE BATALLA ===
        this.battleCamera = new Camera(100, 100)



        /** @type {CharacterModel[]} */
        this.combatants = [];
        this.targetDamage = [];
        /**
         * @type {string | any[]}
         */
        this.turnOrder = [];
        this.currentTurnIndex = 0;
        /**
         * @type {any[]}
         */
        this.battleLog = [];

        // Referencias UI
        this.overlay = engine.shadowRoot?.querySelector('#battle-overlay');
        this.battleLogEl = html`<div class="battle-log" id="battle-log"></div>`;
        this.turnIndicator = html`<div class="turn-indicator" id="turn-indicator"></div>`;
        this.partyCombatantsEl = html`<div class="party" id="party-combatants"></div>`;
        this.enemyCombatantsEl = html`<div class="enemies" id="enemy-combatants"></div>`;
        this.skillButtonsEl = html`<div class="skills" id="skill-buttons"></div>`;

        // Canvas para batalla
        this.Canvas = engine.BattleCanvas;

        /** @type {CanvasRenderingContext2D | null} */
        this.ctx = null;

        // Loop de animación
        this.lastFrameTime = 0;
        this.animationFrameId = null;
        this.Draw();

        // Inicializar canvas
        this._initCanvas();
        this._setupResizeListener();
        this._setupClickListener();
        /**
         * @type {CharacterModel | undefined}
         */
        this.selectedEnemyTarget = undefined;
        /**
         * @type {CharacterModel | undefined}
         */
        this.selectedAllyTarget = undefined;
    }
    Draw = async () => {
        const layout = html`<div id="battle-overlay">
            <div id="battle-ui" >
                ${this.Canvas}          
                <div class="combat-panel">
                    ${this.turnIndicator}
                    <div class="combatants">
                        ${this.partyCombatantsEl}
                        ${this.enemyCombatantsEl}
                    </div>
                    ${this.skillButtonsEl}
                </div>
            </div>
        </div>`;
        this.shadowRoot?.append(layout);
    }

    /**
     * Configura el listener para detectar clicks en el canvas de batalla
     * @private
     */
    _setupClickListener() {
        if (!this.Canvas) return;

        this.Canvas.addEventListener('click', (event) => {
            console.log("click canvas");
            if (!this.isActive) return;
            this._handleCanvasClick(event);
        });
    }

    // === INICIALIZACIÓN DEL CANVAS ===
    _initCanvas() {
        if (!this.Canvas) {
            console.warn('⚠️ BattleCanvas no encontrado');
            return;
        }
        this.ctx = this.Canvas.getContext('2d');
        //this._resizeCanvas();
    }

    connectedCallback() {
        //this.StartEngine();
        ComponentsManager.modalFunction(this);
        // 👇 CRÍTICO: Esperar a que el elemento esté renderizado
        requestAnimationFrame(() => {
            this._resizeCanvas();
            if (this.isActive) {
                this._renderBattleScene();
            }
        });
    }

    disconnectedCallback() {
        // Limpiar animaciones al remover el componente
        this._stopAnimationLoop();
        window.removeEventListener('resize', this._resizeHandler);
    }
    _resizeHandler = () => this._resizeCanvas();

    close = () => {
        // 👇 CRÍTICO: Detener animaciones ANTES de cerrar
        this._stopAnimationLoop();
        ComponentsManager.modalFunction(this);

        setTimeout(() => {
            // @ts-ignore
            this.style.opacity = 0;
            this.style.pointerEvents = "none"
            this.engine.GameEngine.resume();
            this.remove();
            this.isActive = false;
        }, 500);
    }

    _resizeCanvas() {
        if (!this.Canvas || !this.ctx) return;

        const rect = this.Canvas.parentElement?.getBoundingClientRect();
        if (!rect) return;

        this.Canvas.width = Math.floor(rect.width * DPR);
        this.Canvas.height = Math.floor(rect.height * DPR);
        this.Canvas.style.width = rect.width + 'px';
        this.Canvas.style.height = rect.height + 'px';

        this.cellWidth = rect.width / this.gridCols;
        this.cellHeight = rect.height / this.gridRows;

        if (this.isActive) {
            this._renderBattleScene();
        }
    }

    _setupResizeListener() {
        window.addEventListener('resize', () => this._resizeCanvas());
    }

    // === CÁLCULO DE POSICIONES EN GRID ===
    /**
     * @param {number} index
     * @param {boolean} isAlly
     */
    _getGridPosition(index, isAlly) {
        const baseCol = isAlly ? 0 : 4;
        if (isAlly) {
            switch (index) {
                case 0: return { col: 1, row: 0 };
                case 1: return { col: 1, row: 1 };
                case 2: return { col: 0, row: 0.2 };
                case 3: return { col: 0, row: 1.2 };
                default: break
            }
        } else {
            switch (index) {
                case 0: return { col: 4, row: 0 };
                case 1: return { col: 4, row: 1 };
                case 2: return { col: 5, row: 0.2 };
                case 3: return { col: 5, row: 1.2 };
                default: break
            }
        }


        const colInTeam = index % 2;
        const rowInTeam = Math.floor(index / 2);

        return {
            col: baseCol + colInTeam,
            row: rowInTeam
        };
    }

    /**
     * @param {number} col
     * @param {number} row
     */
    _gridToCanvas(col, row) {
        return {
            x: col * this.cellWidth + this.cellWidth / 2,
            y: row * this.cellHeight + this.cellHeight * 0.7
        };
    }

    /**
     * Dibuja un personaje en el canvas - VERSIÓN SIMPLIFICADA
     * @param {CanvasRenderingContext2D} ctx
     * @param {CharacterModel} npc
     * @param {number} col
     * @param {number} row
     * @param {string} direction
     */
    _drawCharacter(ctx, npc, col, row, direction) {
        const pos = this._gridToCanvas(col, row);
        const cam = this.battleCamera;


        // Verificar que el NPC tenga sprites cargados
        if (!npc.Sprites || !npc.Sprites.idle || !npc.Sprites.idle[direction]) {
            this._drawCharacterFallback(ctx, npc, pos);
        } else {

            const currentState = npc.BattleState ?? this.BasicSprite;
            const currentDirection = direction;
            if (npc.Sprites[currentState] && npc.Sprites[currentState][currentDirection]) {
                const spriteList = npc.Sprites[currentState][currentDirection];
                const animFrame = npc.animFrame || 0;
                if (spriteList[animFrame]) {
                    const img = spriteList[animFrame];
                    if (img && img.complete && img.naturalWidth > 0) {
                        // Calcular tamaño con zoom
                        const maxHeight = this.cellHeight * 1.5 * cam.zoom;
                        const aspect = img.naturalWidth / img.naturalHeight;
                        const drawH = maxHeight;
                        const drawW = drawH * aspect;

                        // Dibujar con transformaciones de cámara
                        ctx.save();
                        ctx.translate(pos.x, pos.y);
                        ctx.scale(cam.zoom, cam.zoom);
                        // === SELECCIÓN: Dibujar anillo en el piso ===
                        if (npc === this.selectedEnemyTarget || npc === this.selectedAllyTarget) {
                            const isAlly = !npc.isEnemy;
                            this._drawSelectionRing(ctx, pos, isAlly, cam);
                        }
                        ctx.drawImage(
                            img,
                            -drawW / 2 / cam.zoom,
                            -drawH / cam.zoom,
                            drawW / cam.zoom,
                            drawH / cam.zoom
                        );

                        if (this.targetDamage) {
                            const targetDamage = this.targetDamage.find(t => t.target == npc )
                            if (targetDamage) {
                                this._drawSelectionDamage(ctx, targetDamage, !npc.isEnemy, cam);
                            }
                        }
                        ctx.restore();


                    }
                }
            }
        }
        // HP bar
        this._drawHPBar(ctx, npc, pos.x, pos.y + 10 * cam.zoom, this.cellWidth * 0.7 * cam.zoom);

        // Turn indicator
        if (npc === this.turnOrder[this.currentTurnIndex]) {
            this._drawTurnIndicator(ctx, pos.x, pos.y - 40 * cam.zoom);
        }
    }


    /**
     * Dibuja un personaje en el canvas con animación
     * @param {CanvasRenderingContext2D} ctx
     * @param {CharacterModel} character
     * @param {{ x: any; y: any; }} pos
     */
    _drawCharacterFallback(ctx, character, pos) {
        const cam = this.battleCamera;
        const radius = Math.min(this.cellWidth, this.cellHeight) * 0.3 * cam.zoom;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y - radius / 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = character.isEnemy ? '#c44' : '#4ac';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${radius}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(character.Name.charAt(0).toUpperCase(), pos.x, pos.y - radius / 2);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     */
    _drawTurnIndicator(ctx, x, y) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();

        const pulse = 3 * Math.sin(Date.now() / 100);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 8 + pulse, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {CharacterModel} character
     * @param {number} x
     * @param {number} y
     * @param {number} width
     */
    _drawHPBar(ctx, character, x, y, width) {
        const hpPercent = Math.max(0, Math.min(1, character.Stats.hp / character.Stats.maxHp));

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - width / 2, y, width, 6);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(x - width / 2, y, width, 6);

        const gradient = ctx.createLinearGradient(x - width / 2, y, x + width / 2, y);
        if (hpPercent < 0.3) {
            gradient.addColorStop(0, '#f44');
            gradient.addColorStop(1, '#f88');
        } else {
            gradient.addColorStop(0, '#4af');
            gradient.addColorStop(1, '#8cf');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(x - width / 2, y, width * hpPercent, 6);

        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${character.Stats.hp}/${character.Stats.maxHp}`, x, y - 8);
    }

    /**
     * Renderiza toda la escena de batalla
     */
    _renderBattleScene() {
        if (!this.ctx || !this.Canvas) return;

        const ctx = this.ctx;
        const cssWidth = this.Canvas.width / DPR;
        const cssHeight = this.Canvas.height / DPR;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.Canvas.width, this.Canvas.height);
        ctx.scale(DPR, DPR);

        // Fondo con gradiente
        const bgGradient = ctx.createLinearGradient(0, 0, 0, cssHeight);
        bgGradient.addColorStop(0, '#1a1a2e');
        bgGradient.addColorStop(1, '#16213e');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, cssWidth, cssHeight);

        // Línea divisoria entre equipos
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cssWidth / 2, 0);
        ctx.lineTo(cssWidth / 2, cssHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Separar aliados y enemigos VIVOS
        const allies = this.combatants.filter(c => !c.isEnemy && c.Stats.hp > 0);
        const enemies = this.combatants.filter(c => c.isEnemy && c.Stats.hp > 0);

        // Debug: mostrar conteo
        //console.log('🎨 Render:', { allies: allies.length, enemies: enemies.length, total: this.combatants.length });

        // Dibujar aliados (cols 0-3)
        allies.slice(0, 6).forEach((ally, index) => {
            const { col, row } = this._getGridPosition(index, true);
            ally.direction = "right"
            this._drawCharacter(ctx, ally, col + 1, row + 1, "right");
        });

        // Dibujar enemigos (cols 4-7)
        enemies.slice(0, 6).forEach((enemy, index) => {
            const { col, row } = this._getGridPosition(index, false);
            enemy.direction = "left"
            this._drawCharacter(ctx, enemy, col + 1, row + 1, "left");
        });
    }
    /**
     * @param {CharacterModel} character
     * @param {string} spriteKey
     * @param {{ (): void; (): void; }} onComplete
     * @param {string} direction
     */
    _startAnimation(character, spriteKey, fps = 25, onComplete, direction) {

        //spriteKey = "walk"
        const spriteData = character.Sprites[spriteKey];

        // Contar frames disponibles
        let frameCount = 1;

        if (spriteData[direction] && Array.isArray(spriteData[direction])) {
            frameCount = spriteData[direction].length;
        }
        var time = frameCount / fps;
        character.BattleState = spriteKey
        setTimeout(() => {
            character.BattleState = this.BasicSprite
            if (onComplete) onComplete();
        }, time * 1000)
    }

    /**
     * @param {number} dt
     */
    _updateAnimations(dt) {
        let needsRender = true;
        this.combatants.forEach(char => {
            char.updateAnimation(dt, false, true)
        });

        return needsRender;
    }

    /**
     * @param {CharacterModel} character
     * @param {string} direction
     */
    _setDeathState(character, direction) {
        const deathSprite = character.Sprites[this.DeathSprite];
        if (deathSprite && (typeof deathSprite === 'string' || deathSprite[direction]?.length > 0)) {
            character.BattleState = "death"
        }
    }


    // === 🔄 GAME LOOP PRINCIPAL ===

    _startAnimationLoop() {
        if (this.animationFrameId) return;

        const loop = (/** @type {number} */ timestamp) => {
            if (!this.isActive) {
                this.animationFrameId = null;
                return;
            }

            const dt = (timestamp - this.lastFrameTime) / 1000;
            this.lastFrameTime = timestamp;

            // Actualizar cámara
            //this._updateCamera(dt);

            // Actualizar animaciones de sprites
            const needsRender = this._updateAnimations(dt);

            if (needsRender) {
                this._renderBattleScene();
            }

            this.animationFrameId = requestAnimationFrame(loop);
        };

        this.lastFrameTime = performance.now();
        this.animationFrameId = requestAnimationFrame(loop);
    }

    _stopAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * @param {CharacterModel[]} party
     * @param {CharacterModel[]} enemies
     */
    async startBattle(party, enemies) {
        this.isActive = true;
        this.combatants = [...party, ...enemies];
        this.battleLog = [];
        // Resetear cámara
        this.battleCamera.zoom = 1.0;
        // Inicializar combatientes y CARGAR SPRITES

        for (const combatant of this.combatants) {
            if (Array.isArray(combatant.Skills) && combatant.Skills.length == 0) {
                combatant.Skills.push(this.createBasicAttack())
            }
            combatant.Stats.maxHp = combatant.Stats.maxHp || combatant.Stats.hp || 1;
            combatant.Stats.hp = combatant.Stats.hp || combatant.Stats.maxHp;
            combatant.Stats.strength = combatant.Stats.strength || 1;
            combatant.Stats.speed = combatant.Stats.speed || 1;
            combatant.Skills = combatant.Skills || [this.createBasicAttack()];
            combatant.BattleState = this.BasicSprite
        }

        this.calculateTurnOrder();

        // @ts-ignore
        if (this.overlay) this.overlay.style.display = 'flex';
        if (this.Canvas) {
            this.Canvas.style.display = 'block';
            this._resizeCanvas();
        }
        this.updateBattleUI();
        this.logBattleMessage("¡La batalla ha comenzado!");
        // Primer render
        this._renderBattleScene();
        // Iniciar game loop para animaciones
        this._startAnimationLoop();
        this.startNextTurn();

        this.engine.GameEngine.pause();
        this.overlay?.append(this)
    }

    calculateTurnOrder() {
        this.turnOrder = [...this.combatants].sort((a, b) => b.Stats.speed - a.Stats.speed);
    }

    startNextTurn() {
        let nextIndex = this.currentTurnIndex;
        let attempts = 0;

        do {
            nextIndex = (nextIndex + 1) % this.turnOrder.length;
            attempts++;
            if (attempts > this.turnOrder.length) {
                this.verifyBattleState();
                return;
            }
        } while (this.turnOrder[nextIndex].Stats.hp <= 0);

        this.currentTurnIndex = nextIndex;
        const currentCombatant = this.turnOrder[this.currentTurnIndex];

        this.updateBattleUI();
        this.logBattleMessage(`Turno de ${currentCombatant.Name}`);
        this._renderBattleScene();

        if (currentCombatant.isEnemy) {
            setTimeout(() => this.executeEnemyTurn(currentCombatant), 1000);
        } else {
            this.showSkills(currentCombatant);
        }
    }

    /**
     * @param {CharacterModel} enemy
     */
    executeEnemyTurn(enemy) {
        const targets = this.combatants.filter(c => !c.isEnemy && c.Stats.hp > 0);
        if (targets.length === 0) {
            this.verifyBattleState();
            return;
        }
        const target = targets[Math.floor(Math.random() * targets.length)];
        const skill = enemy.Skills[0];
        this.useSkill(enemy, skill, target);
    }

    /**
     * @param {CharacterModel} combatant
     */
    showSkills(combatant) {
        this.skillButtonsEl.innerHTML = '';
        combatant.Skills.forEach((/** @type {SkillModel} */ skill) => {
            const button = html`<img class='skill-btn ${skill.actualColdown > 0 ? "disabled" : ""}' alt="${skill.name}" src="${skill.icon}" 
                onclick="${() => {
                    // @ts-ignore
                    if (button.disabled) {
                        return;
                    }
                    const targets = this.combatants.filter(c => c.isEnemy && c.Stats.hp > 0);
                    if (this.targetEnemy && this.targetEnemy.Stats.hp > 0) {
                        this.useSkill(combatant, skill, this.targetEnemy);
                    } else if (targets.length > 0) {
                        this.useSkill(combatant, skill, this.selectedEnemyTarget ?? targets[0]);
                    }
                    // @ts-ignore
                    button.disabled = true;
                    button.className += " disabled"
                }}"/>`;
            this.skillButtonsEl.appendChild(button);
        });
        this.skillButtonsEl.appendChild(html`<button class='skill-btn' onclick="${() => this.close()}">salir</button>`);
    }

    /**
     * @param {CharacterModel} user
     * @param {SkillModel} skill
     * @param {CharacterModel} target
     */
    useSkill(user, skill, target) {
        // Iniciar animación de ataque
        const direction = user.isEnemy ? "left" : "right";
        this._startAnimation(user, this.AttackSprite, this.SpriteFPS, () => {
            //this.setSkillDamage(target, user, skill, direction); return
            if (skill.numberTargets == 1) {
                this.setSkillDamage(target, user, skill, direction);
            } else {
                if (user.isEnemy) {
                    //const targetsToApplyDamage = [];
                    for (let index = 0; index < skill.numberTargets; index++) {
                        const elementTarget = this.combatants.filter(c => !c.isEnemy && c.Stats.hp > 0)[index];
                        if (elementTarget) {
                            this.setSkillDamage(elementTarget, user, skill, direction);
                        }
                    }
                } else {
                    //const targetsToApplyDamage = [];
                    for (let index = 0; index < skill.numberTargets; index++) {
                        const elementTarget = this.combatants.filter(c => c.isEnemy && c.Stats.hp > 0)[index];
                        if (elementTarget) {
                            this.setSkillDamage(elementTarget, user, skill, direction);
                        }
                    }
                }
            }
            this.updateBattleUI();
            this._renderBattleScene();
            this.verifyBattleState();
            setTimeout(() => {
                user.Skills.forEach(skill => skill.reduceColdDown());
                this.startNextTurn();
            }, 1000);
        }, direction);
    }

    /**
     * @param {CharacterModel} target
     * @param {CharacterModel} user
     * @param {SkillModel} skill
     * @param {string} direction
     */
    setSkillDamage(target, user, skill, direction) {
        const damage = skill.excute(user, target);
        if (damage) {
            target.Stats.hp = Math.max(0, target.Stats.hp - damage);
            this.logBattleMessage(`${user.Name} usa ${skill.name} contra ${target.Name} y causa ${damage} de daño.`);
            this.targetDamage.push({
                target: target,
                damage: damage,
                isCritical: false,              // Opcional: golpe crítico
                startTime: null                 // Se asigna automáticamente en el primer frame
            })
            if (target.Stats.hp <= 0) {
                this.logBattleMessage(`¡${target.Name} ha sido derrotado!`);
                this._setDeathState(target, direction);
                if (target.isEnemy) this.selectedEnemyTarget = undefined;
            }

        } else {
            this.logBattleMessage(`¡${skill.name} en coldDown, ${skill.actualColdown}!`);
        }
    }

    updateBattleUI() {
        this.partyCombatantsEl.innerHTML = '';
        this.enemyCombatantsEl.innerHTML = '';

        const currentCombatant = this.turnOrder[this.currentTurnIndex];
        if (currentCombatant) {
            this.turnIndicator.textContent = `Turno: ${currentCombatant.Name}`;
        }

        // Mostrar aliados VIVOS
        this.combatants
            .filter(c => !c.isEnemy && c.Stats.hp > 0)
            .forEach(combatant => {
                const combatantEl = this.createCombatantElement(combatant);
                this.partyCombatantsEl.appendChild(combatantEl);
            });

        // Mostrar enemigos VIVOS
        this.combatants
            .filter(c => c.isEnemy && c.Stats.hp > 0)
            .forEach(combatant => {
                const combatantEl = this.createCombatantElement(combatant);
                combatantEl.classList.add("enemyBlock");
                combatantEl.addEventListener("click", () => {
                    this.targetEnemy = this.selectedEnemyTarget ?? combatant;
                    this.enemyCombatantsEl.querySelectorAll(".enemyBlock")?.forEach(enemyBlock => {
                        // @ts-ignore
                        enemyBlock.style.boxShadow = "";
                    });
                    combatantEl.style.boxShadow = "0 0 5px 0 red";
                });
                this.enemyCombatantsEl.appendChild(combatantEl);
            });

        this.battleLogEl.scrollTop = this.battleLogEl.scrollHeight;
    }

    /**
     * @param {CharacterModel} combatant
     */
    createCombatantElement(combatant) {
        const el = document.createElement('div');
        el.className = 'combatant';

        if (combatant.Stats.hp <= 0) {
            el.classList.add('dead');
        }
        if (combatant === this.turnOrder[this.currentTurnIndex]) {
            el.classList.add('active');
        }

        const hpPercent = (combatant.Stats.hp / combatant.Stats.maxHp) * 100;
        el.innerHTML = `
            <div class="data">
                <div>${combatant.Name}</div>
                <div class="small">HP: ${combatant.Stats.hp}/${combatant.Stats.maxHp}</div>
            </div>
            <div class="hp-bar">
                <div class="hp-fill ${hpPercent < 30 ? 'low' : ''}" style="width: ${hpPercent}%"></div>
            </div>
        `;
        return el;
    }

    /**
     * @param {string} message
     */
    logBattleMessage(message) {
        this.battleLog.push(message);
        this.battleLogEl.innerHTML = this.battleLog.map(msg => `<div>${msg}</div>`).join('');
        console.log(message);

    }

    verifyBattleState() {
        const aliveParty = this.combatants.filter(c => !c.isEnemy && c.Stats.hp > 0);
        const aliveEnemies = this.combatants.filter(c => c.isEnemy && c.Stats.hp > 0);

        if (aliveParty.length > 0 && aliveEnemies.length === 0) {
            this.logBattleMessage("¡Victoria! Todos los enemigos han sido derrotados.");
            // Detener animaciones
            this._stopAnimationLoop();
            this.close()
        } else if (aliveParty.length === 0 && aliveEnemies.length > 0) {
            this.logBattleMessage("Derrota... Todos los miembros del grupo han caído.");
            // Detener animaciones
            this._stopAnimationLoop();
            this.close()
            this.combatants.forEach(combatant => {
                combatant.BattleState = undefined;
            });
        } else if (aliveParty.length === 0 && aliveEnemies.length === 0) {
            this.logBattleMessage("La batalla ha terminado en empate.");
            this._stopAnimationLoop();
            this.close()
        }
        this.logBattleMessage("La batalla continua");
    }
    /**
 * Maneja el click en el canvas para seleccionar objetivos
 * @param {MouseEvent} event 
 * @private
 */
    _handleCanvasClick(event) {
        if (!this.ctx || !this.Canvas) return;

        const rect = this.Canvas.getBoundingClientRect();

        // Coordenadas del mouse relativas al canvas (en CSS pixels)
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Obtener combatientes vivos separados por bando
        const allies = this.combatants.filter(c => !c.isEnemy && c.Stats.hp > 0);
        const enemies = this.combatants.filter(c => c.isEnemy && c.Stats.hp > 0);

        // Buscar primero enemigos (si queremos priorizar selección de enemigos)
        // o buscar en orden inverso para priorizar los dibujados "encima"
        const allCharacters = [...enemies, ...allies];

        for (let i = allCharacters.length - 1; i >= 0; i--) {
            const npc = allCharacters[i];
            const isAlly = !npc.isEnemy;

            // Obtener posición en grid según su índice en el bando
            const teamList = isAlly ? allies : enemies;
            const index = teamList.indexOf(npc);
            if (index === -1) continue;

            const { col, row } = this._getGridPosition(index, isAlly);
            const gridCol = col + 1; // +1 como en _renderBattleScene
            const gridRow = row + 1;

            // Calcular posición en canvas (MISMO CÁLCULO que en _drawCharacter)
            const pos = this._gridToCanvas(gridCol, gridRow);
            const cam = this.battleCamera;

            // Calcular dimensiones del sprite (EXACTAMENTE como en _drawCharacter)
            if (!npc.Sprites?.idle) continue;

            const currentState = npc.BattleState ?? this.BasicSprite;
            const direction = isAlly ? "right" : "left";
            const spriteList = npc.Sprites[currentState]?.[direction];
            const animFrame = npc.animFrame || 0;
            const img = spriteList?.[animFrame];

            if (!img?.complete || img.naturalWidth === 0) continue;

            const maxHeight = this.cellHeight * 1.5 * cam.zoom;
            const aspect = img.naturalWidth / img.naturalHeight;
            const drawH = maxHeight;
            const drawW = drawH * aspect;

            // Hitbox en coordenadas de canvas (considerando transformaciones)
            // El sprite se dibuja centrado en X, con pies anclados en Y
            const hitbox = {
                x: pos.x - drawW / 2,
                y: pos.y - drawH,  // Anclado por los pies
                width: drawW,
                height: drawH
            };

            // Verificar colisión con margen opcional para mejor UX
            const margin = 5; // pixels de tolerancia
            if (mouseX >= hitbox.x - margin &&
                mouseX <= hitbox.x + hitbox.width + margin &&
                mouseY >= hitbox.y - margin &&
                mouseY <= hitbox.y + hitbox.height + margin) {

                // ✅ SELECCIONAR OBJETIVO
                this._selectTarget(npc, isAlly);
                return; // Detener después de la primera coincidencia
            }
        }

        // Si no se hizo click en ningún personaje, deseleccionar
        this._clearSelection();
    }

    /**
     * Selecciona un personaje como objetivo
     * @param {CharacterModel} npc 
     * @param {boolean} isAlly 
     * @private
     */
    _selectTarget(npc, isAlly) {
        if (isAlly) {
            this.selectedAllyTarget = npc;
            this.selectedEnemyTarget = undefined;
            this.logBattleMessage(`Aliado seleccionado: ${npc.Name}`);
        } else {
            this.selectedEnemyTarget = npc;
            this.selectedAllyTarget = undefined;
            this.logBattleMessage(`Enemigo seleccionado: ${npc.Name}`);
        }

        // Feedback visual: forzar re-render para mostrar highlight
        this._renderBattleScene();

        // Disparar evento personalizado para que otros sistemas puedan reaccionar
        this.dispatchEvent(new CustomEvent('battleTargetSelected', {
            detail: { target: npc, isAlly }
        }));
    }

    /**
     * Dibuja un anillo de selección en el piso bajo el personaje
     * @param {CanvasRenderingContext2D} ctx
     * @param {{x: number, y: number}} pos - Posición en canvas (pies del personaje)
     * @param {boolean} isAlly - true para aliado (verde), false para enemigo (naranjo)
     * @param {Camera} cam - Cámara de batalla para aplicar zoom
     * @private
     */
    _drawSelectionRing(ctx, pos, isAlly, cam) {
        ctx.save();

        // Colores según bando
        const color = isAlly ? 'rgba(74, 222, 128, 0.9)'    // Verde brillante para aliados
            : 'rgba(249, 115, 22, 0.9)';   // Naranjo para enemigos

        const glowColor = isAlly ? 'rgba(74, 222, 128, 0.3)' : 'rgba(249, 115, 22, 0.3)';

        // Tamaño del anillo (proporcional al cellHeight)
        const ringWidth = this.cellWidth / 2 * 0.6 * cam.zoom;   // Ancho del óvalo
        const ringHeight = this.cellHeight / 2 * 0.25 * cam.zoom; // Altura (aplastado como sombra)

        // Efecto de pulso suave
        const pulse = 1 + 0.05 * Math.sin(Date.now() / 150);
        const scaledWidth = ringWidth * pulse;
        const scaledHeight = ringHeight * pulse;

        // Posición: centrada en pos.x, anclada en los pies (pos.y)
        const x = 0;
        const y = 0;
        // === Capa de brillo exterior (glow) ===
        ctx.beginPath();
        ctx.ellipse(x, y, scaledWidth, scaledHeight, 0, 0, Math.PI * 2);
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 8 * cam.zoom;
        ctx.stroke();

        // === Anillo principal ===
        ctx.beginPath();
        ctx.ellipse(x, y, scaledWidth, scaledHeight, 0, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3 * cam.zoom;
        ctx.stroke();

        // === Borde interior para definición ===
        ctx.beginPath();
        ctx.ellipse(x, y, scaledWidth * 0.85, scaledHeight * 0.85, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1 * cam.zoom;
        ctx.stroke();

        ctx.restore();
    }

    /**
 * Dibuja indicador visual de daño recibido (número flotante + efecto de impacto)
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} targetDamage - Posición de los PIES del personaje (referencia)
 * @param {boolean} isAlly - true para aliado, false para enemigo
 * @param {Camera} cam - Cámara para aplicar zoom
 * @private
 */
    _drawSelectionDamage(ctx, targetDamage, isAlly, cam) {
        // ⚠️ Este método se llama DENTRO del contexto transformado del sprite
        // El origen (0,0) corresponde a pos.x, pos.y gracias al translate()

        // === 🎛️ CONFIGURACIÓN CENTRALIZADA ===
        const CONFIG = {
            // ⏱️ Animación
            duration: 0.8,
            ringMaxProgress: 0.7,
            flashMaxProgress: 0.2,

            // 🎨 Colores
            colors: {
                ally: { primary: 'rgba(249, 115, 22, 1)', glow: 'rgba(249, 115, 22, 0.4)' },
                enemy: { primary: 'rgba(74, 222, 128, 1)', glow: 'rgba(74, 222, 128, 0.4)' }
            },

            // 💥 Anillo de impacto
            ring: {
                baseWidthFactor: 0.4,
                baseHeightFactor: 0.12,
                lineWidth: 5,
                maxAlpha: 0.8
            },

            // 🔢 Texto de daño
            damageText: {
                startYOffset: -40,
                floatDistance: 35,
                floatEasePower: 3,
                scaleStart: 0.8,
                scaleEnd: 1.2,
                fontSize: 24,
                shadowOffsetX: 2,
                shadowOffsetY: 2,
                shadowAlpha: 0.6,
                gradientStartY: -12,
                gradientEndY: 12,
                critBorderWidth: 2
            },

            // ✨ Flash
            flash: {
                yOffset: -30,
                radius: 20,
                maxAlpha: 0.5
            }
        };

        // === 📍 VARIABLES DE POSICIÓN BASE (ajustar aquí si hay que desplazar todo) ===
        // Estas coordenadas son RELATIVAS al contexto transformado (origen = pies del personaje)
        const basePosX = 0;  // ← Ajustar para desplazar horizontalmente el efecto completo
        const basePosY = -200;  // ← Ajustar para desplazar verticalmente el efecto completo

        // === ⏱️ TIEMPO DE ANIMACIÓN ===
        const now = performance.now();
        if (!targetDamage?.startTime) {
            // @ts-ignore
            targetDamage.startTime = now;
        }
        // @ts-ignore
        const elapsed = (now - targetDamage.startTime) / 1000;
        const t = Math.min(elapsed / CONFIG.duration, 1);

        // === 🎨 COLORES ===
        const colorSet = isAlly ? CONFIG.colors.ally : CONFIG.colors.enemy;

        // === 💥 1. ANILLO DE IMPACTO ===
        if (t < CONFIG.ringMaxProgress) {
            const ringT = Math.min(t / CONFIG.ringMaxProgress, 1);
            const ringRadiusX = this.cellWidth * CONFIG.ring.baseWidthFactor * ringT * cam.zoom;
            const ringRadiusY = this.cellHeight * CONFIG.ring.baseHeightFactor * ringT * cam.zoom;
            const ringAlpha = (1 - ringT) * CONFIG.ring.maxAlpha;

            // Posición del anillo (centrado en basePosX, basePosY)
            const ringPosX = basePosX;
            const ringPosY = basePosY;

            ctx.beginPath();
            ctx.ellipse(ringPosX, ringPosY, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
            ctx.strokeStyle = colorSet.glow.replace('1)', `${ringAlpha})`);
            ctx.lineWidth = CONFIG.ring.lineWidth * (1 - ringT) * cam.zoom;
            ctx.stroke();
        }

        // === 🔢 2. NÚMERO DE DAÑO FLOTANTE ===
        const easeFactor = 1 - Math.pow(1 - t, CONFIG.damageText.floatEasePower);
        const floatOffset = CONFIG.damageText.floatDistance * easeFactor * cam.zoom;
        const damageYOffset = CONFIG.damageText.startYOffset * cam.zoom - floatOffset;

        // Posición del texto (X centrada, Y con offset desde basePosY)
        const textPosX = basePosX;
        const textPosY = basePosY + damageYOffset;

        ctx.save();
        ctx.translate(textPosX, textPosY);

        const scale = CONFIG.damageText.scaleStart + t * (CONFIG.damageText.scaleEnd - CONFIG.damageText.scaleStart);
        const alpha = 1 - t;
        ctx.scale(scale, scale);

        // Sombra
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * CONFIG.damageText.shadowAlpha})`;
        ctx.font = `bold ${CONFIG.damageText.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // @ts-ignore
        ctx.fillText(`-${targetDamage?.damage}`, CONFIG.damageText.shadowOffsetX, CONFIG.damageText.shadowOffsetY);

        // Texto principal con gradiente
        const gradient = ctx.createLinearGradient(0, CONFIG.damageText.gradientStartY, 0, CONFIG.damageText.gradientEndY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(1, colorSet.primary.replace('1)', `${alpha})`));

        ctx.fillStyle = gradient;
        ctx.fillText(`-${targetDamage?.damage}`, 0, 0);

        // Borde para crítico
        if (targetDamage?.isCritical) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = CONFIG.damageText.critBorderWidth;
            ctx.strokeText(`-${targetDamage?.damage}`, 0, 0);
        }

        ctx.restore();

        // === ✨ 3. FLASH DE IMPACTO ===
        if (t < CONFIG.flashMaxProgress) {
            const flashAlpha = (1 - t / CONFIG.flashMaxProgress) * CONFIG.flash.maxAlpha;

            // Posición del flash
            const flashPosX = basePosX;
            const flashPosY = basePosY + (CONFIG.flash.yOffset * cam.zoom);

            ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
            ctx.beginPath();
            ctx.arc(flashPosX, flashPosY, CONFIG.flash.radius * cam.zoom, 0, Math.PI * 2);
            ctx.fill();
        }

        // === 🧹 LIMPIEZA ===
        if (t >= 1) {
            this.targetDamage.splice(this.targetDamage.indexOf(targetDamage), 1);
        }
    }

    /**
     * Limpia la selección actual
     * @private
     */
    _clearSelection() {
        if (this.selectedEnemyTarget || this.selectedAllyTarget) {
            this.selectedEnemyTarget = undefined;
            this.selectedAllyTarget = undefined;
            this._renderBattleScene();
        }
    }


    createBasicAttack() {
        // @ts-ignore
        return new SkillModel({ name: "Ataque Básico" });
    }

    // Métodos públicos para configurar
    /**
     * @param {string} spriteKey
     */
    setBasicSprite(spriteKey) { this.BasicSprite = spriteKey; }
    /**
     * @param {string} spriteKey
     */
    setAttackSprite(spriteKey) { this.AttackSprite = spriteKey; }
    /**
     * @param {string} spriteKey
     */
    setDeathSprite(spriteKey) { this.DeathSprite = spriteKey; }
    /**
     * @param {number} fps
     */
    setSpriteFPS(fps) { this.SpriteFPS = fps; }


    getZoom() { return this.battleCamera.zoom; }
}
customElements.define('w-oppenworld-battle', BattleSystem);