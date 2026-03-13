//@ts-check
// --------------------------------------------------
// Sistema de Batalla - Versión FINAL con Animación y Cámara

import { CharacterModel } from "../../Common/CharacterModel.js";
import { SkillModel, SkillsType } from "../../Common/SkillModel.js";
import { ComponentsManager, html } from "../../WDevCore/WModules/WComponentsTools.js";
import { Camera } from "../Camera.js";
import { DPR, TILE_SIZE } from "../OpenWorldEngineView.js";
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
        this.gridCols = 12;
        this.gridRows = 8;
        this.cellWidth = 0;
        this.cellHeight = 0;

        // === CONFIGURACIÓN DE SPRITES ===
        this.BasicSprite = "battle";      // Sprite por defecto (animado)
        this.AttackSprite = "attack";   // Sprite para ataque (animado)
        this.DeathSprite = "death";      // Sprite para muerte (estático)
        this.SpriteFPS = 25;// FPS para animaciones de batalla

        // === CÁMARA DE BATALLA ===
        this.battleCamera = new Camera(100, 100)


        // Referencias UI
        this.overlay = engine.shadowRoot?.querySelector('#battle-overlay');
        this.battleLogEl = html`<div class="battle-log" id="battle-log"></div>`;
        this.turnIndicator = html`<div class="turn-indicator" id="turn-indicator"></div>`;
        this.battleMessageContainer = html`<div class="message-container" id="turn-indicator"></div>`;
        this.partyCombatantsEl = html`<div class="party" id="party-combatants"></div>`;
        this.enemyCombatantsEl = html`<div class="enemies" id="enemy-combatants"></div>`;
        this.skillButtonsEl = html`<div class="skills" id="skill-buttons"></div>`;
        // Canvas para batalla
        this.Canvas = engine.BattleCanvas;

        /** @type {CharacterModel[]} */
        this.combatants = [];
        /**
         * @type {{ target?: CharacterModel; skillElement?: string;  damage: number; isCritical: boolean; 
         * startTime: number | null; spriteSkillAnimation?: HTMLImageElement[]; }[]}
         */
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

        // 2. NUEVO: Array para rastrear movimientos de ataque          
        /**
         *  @type {{ character: CharacterModel, startX: number, startY: number, 
         * targetX: number, targetY: number, progress: number, speed: number,
         * damageTriggered: boolean, skill: SkillModel, target: CharacterModel,
         * direction: string, onComplete: () => void,
         * elapsedTime: number ,frameCount: number, duration: number }[]} 
         * */
        this.activeMovements = [];
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
                    ${this.battleMessageContainer}
                </div>
            </div>
        </div>`;
        this.shadowRoot?.append(layout);
    }


    InitProps() {
        this.currentTurnIndex = 0;
        /**
         * @type {any[]}
         */
        this.battleLog = [];
        // Loop de animación
        this.lastFrameTime = 0;
        this.animationFrameId = null;
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
        }, 10);
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
                case 0: return { col: 1, row: 1.5 };
                case 1: return { col: 1, row: 4 };
                case 2: return { col: 2.5, row: 3 };
                case 3: return { col: 2.5, row: 5 };
                default: break
            }
        } else {
            switch (index) {
                case 0: return { col: 8, row: 1.5 };
                case 1: return { col: 8, row: 4 };
                case 2: return { col: 6.5, row: 3 };
                case 3: return { col: 6.5, row: 5 };
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


        // 3.1 VERIFICAR SI HAY MOVIMIENTO ACTIVO PARA ESTE PERSONAJE
        let drawPos = { x: pos.x, y: pos.y };
        const movement = this.activeMovements.find(m => m.character === npc);
        let renderdamage = false;
        if (movement) {
            // Interpolación lineal con PAUSA en el punto de impacto
            let lerpFactor = 0;

            // === CONFIGURACIÓN DE FASES ===
            // 0.0 - 0.45: Ida (45% del tiempo)
            // 0.45 - 0.55: Pausa en target (10% del tiempo) ⬅️ NUEVO
            // 0.55 - 1.0: Vuelta (45% del tiempo)

            const pauseStart = movement.skill.animationPause ?? 0.45;
            const pauseEnd =  movement.skill.animationPauseEnd ?? 0.7;

            if (movement.progress < pauseStart) {
                // === FASE 1: IDA ===
                // Mapear 0.0->0.45 a 0.0->1.0
                lerpFactor = movement.progress / pauseStart;

            } else if (movement.progress <= pauseEnd) {
                // === FASE 2: PAUSA ===
                // Mantener en posición del target (lerpFactor = 1.0)
                lerpFactor = 1.0;
                renderdamage = true

            } else {
                // === FASE 3: VUELTA ===
                // Mapear 0.55->1.0 a 1.0->0.0
                const returnProgress = (movement.progress - pauseEnd) / (1.0 - pauseEnd);
                lerpFactor = 1.0 - returnProgress;
                renderdamage = false;
            }

            // Aplicar interpolación
            drawPos.x = movement.startX + (movement.targetX - movement.startX) * lerpFactor;
            drawPos.y = movement.startY + (movement.targetY - movement.startY) * lerpFactor;
        }

        // Verificar que el NPC tenga sprites cargados
        if (!npc.Sprites || !npc.Sprites.idle || !npc.Sprites.idle[direction]) {
            this._drawCharacterFallback(ctx, npc, drawPos);
        } else {
            const currentState = npc.BattleState ?? this.BasicSprite;
            const currentDirection = direction;
            if (npc.Sprites[currentState] && npc.Sprites[currentState][currentDirection]) {
                const spriteList = npc.Sprites[currentState][currentDirection];
                //const animFrame = npc.animFrame || 0;

                const animFrame = movement ? movement.character.animFrame : (npc.animFrame || 0);

                if (spriteList[animFrame]) {
                    const img = spriteList[animFrame];
                    if (img && img.complete && img.naturalWidth > 0) {
                        // Calcular tamaño con zoom
                        const maxHeight = this.cellHeight * npc.height * cam.zoom;
                        const aspect = img.naturalWidth / img.naturalHeight;
                        const drawH = maxHeight;
                        const drawW = drawH * aspect;
                        // Dibujar con transformaciones de cámara
                        ctx.save();
                        ctx.translate(drawPos.x, drawPos.y);
                        ctx.scale(cam.zoom, cam.zoom);
                        const isAlly = !npc.isEnemy;
                        // === SELECCIÓN: Dibujar anillo en el piso ===
                        if (npc === this.selectedEnemyTarget || npc === this.selectedAllyTarget) {
                            this._drawSelectionRing(ctx, drawPos, isAlly, cam, npc);
                        }
                        if (npc.BattleState?.includes("attack")) {
                            this._drawChargeAuraAnimation(ctx, drawPos, cam, npc);
                        }
                        this._drawShadow(ctx, drawPos, cam);
                        ctx.drawImage(
                            img,
                            -drawW / 2 / cam.zoom,
                            -drawH / cam.zoom,
                            drawW / cam.zoom,
                            drawH / cam.zoom
                        );
                        if (this.targetDamage) {
                            const targetDamage = this.targetDamage.find(t => t.target == npc)
                            if (targetDamage) {
                                // @ts-ignore
                                this._drawSelectionDamage(ctx, targetDamage, !npc.isEnemy, cam, targetDamage.skillElement);
                            }
                        }
                        ctx.restore();
                    }
                }
            }
        }
        // HP bar
        this._drawHPBar(ctx, npc, drawPos.x, drawPos.y + 10 * cam.zoom, this.cellWidth * 0.7 * cam.zoom);

        // Turn indicator
        if (npc === this.turnOrder[this.currentTurnIndex]) {
            this._drawTurnIndicator(ctx, drawPos.x, drawPos.y - 40 * cam.zoom);
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
        const radius = Math.min(this.cellWidth, this.cellHeight) * 0.3 * cam.zoom * character.height;

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

        if (this.engine.GameEngine.currentMap?.battleBackgrond != null) {
            const bgImage = this.engine.GameEngine.currentMap.battleBackgrond;

            // Verificar que la imagen esté cargada
            if (bgImage.complete && bgImage.naturalWidth > 0) {
                // Calcular dimensiones manteniendo aspect ratio (modo "cover")
                const imgAspect = bgImage.naturalWidth / bgImage.naturalHeight;
                const screenAspect = cssWidth / cssHeight;

                let drawW, drawH, drawX, drawY;

                if (imgAspect > screenAspect) {
                    // Imagen más ancha: ajustar por altura
                    drawH = cssHeight;
                    drawW = drawH * imgAspect;
                    drawX = (cssWidth - drawW) / 2; // Centrar horizontalmente
                    drawY = 0;
                } else {
                    // Imagen más alta: ajustar por ancho
                    drawW = cssWidth;
                    drawH = drawW / imgAspect;
                    drawX = 0;
                    drawY = (cssHeight - drawH) / 2; // Centrar verticalmente
                }

                ctx.drawImage(bgImage, drawX, drawY, drawW, drawH);
            }

        } else {
            // Fondo con gradiente
            const bgGradient = ctx.createLinearGradient(0, 0, 0, cssHeight);
            bgGradient.addColorStop(0, '#1a1a2e');
            bgGradient.addColorStop(1, '#16213e');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, cssWidth, cssHeight);

        }


        // Línea divisoria entre equipos
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cssWidth / 2, 0);
        ctx.lineTo(cssWidth / 2, cssHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Separar aliados y enemigos VIVOS
        const allies = this.combatants.filter(c => !c.isEnemy);
        const enemies = this.combatants.filter(c => c.isEnemy);

        // Debug: mostrar conteo
        //console.log('🎨 Render:', { allies: allies.length, enemies: enemies.length, total: this.combatants.length });

        // Dibujar aliados (cols 0-3)
        allies.slice(0, 6).forEach((ally, index) => {
            const { col, row } = this._getGridPosition(index, true);
            ally.direction = "right"
            if (ally.Stats.hp == 0) {
                ally.BattleState = this.DeathSprite
            }
            this._drawCharacter(ctx, ally, col + 1, row + 1, "right");
        });

        // Dibujar enemigos (cols 4-7)
        enemies.slice(0, 6).forEach((enemy, index) => {
            const { col, row } = this._getGridPosition(index, false);
            enemy.direction = "left"
            if (enemy.Stats.hp == 0) {
                enemy.BattleState = this.DeathSprite
            }
            this._drawCharacter(ctx, enemy, col + 1, row + 1, "left");
        });
    }
    // 4. NUEVA FUNCIÓN: Finalizar ataque (Daño y Siguiente Turno)
    /**
     * @param {CharacterModel} user
     * @param {SkillModel} skill
     * @param {CharacterModel} target
     * @param {string} direction
     */
    finalizeAttack(user, skill, target, direction) {
        // Lógica de daño original
        user.BattleState = this.BasicSprite;
        if (skill.skillType == SkillsType.LONG_RANGE) {            
            this.setDamage(skill, target, user, direction);
        }
        this.updateBattleUI();
        this._renderBattleScene();
        const verify = this.verifyBattleState();
        if (verify) {
            setTimeout(() => {
                user.Skills.forEach(skill => skill.reduceCooldDown());
                this.startNextTurn();
            }, 100);
        }
    }


    /**
     * @param {SkillModel} skill
     * @param {CharacterModel} target
     * @param {CharacterModel} user
     * @param {string} direction
     */
    setDamage(skill, target, user, direction) {
        if (skill.numberTargets == 1) {
            this.setSkillDamage(target, user, skill, direction);
        } else {
            if (user.isEnemy) {
                for (let index = 0; index < skill.numberTargets; index++) {
                    const elementTarget = this.combatants.filter(c => !c.isEnemy && c.Stats.hp > 0)[index];
                    if (elementTarget) {
                        this.setSkillDamage(elementTarget, user, skill, direction);
                    }
                }
            } else {
                const combatants = this.combatants.filter(c => c.isEnemy && c.Stats.hp > 0);
                for (let index = 0; index < skill.numberTargets; index++) {
                    const elementTarget = combatants[index];
                    if (elementTarget) {
                        this.setSkillDamage(elementTarget, user, skill, direction);
                    }
                }
            }
        }
    }

    // 5. NUEVA FUNCIÓN: Ejecutar Ataque Melee con Movimiento Sincronizado
    /**
     * @param {CharacterModel} user
     * @param {SkillModel} skill
     * @param {CharacterModel} target
     * @param {string} direction
     */
    executeMeleAttack(user, skill, target, direction) {
        // Obtener posiciones actuales en Canvas
        const userIndex = this.combatants.filter(c => c.isEnemy === user.isEnemy).indexOf(user);
        const targetIndex = this.combatants.filter(c => c.isEnemy === target.isEnemy).indexOf(target);

        // Calcular posiciones grid
        const userGrid = this._getGridPosition(userIndex, !user.isEnemy);
        const targetGrid = this._getGridPosition(targetIndex, !target.isEnemy);

        // Convertir a Canvas
        const startPos = this._gridToCanvas(userGrid.col + 1, userGrid.row + 1);
        const targetPos = this._gridToCanvas(targetGrid.col + 1, targetGrid.row + 1);

        // Calcular punto de impacto (no encima del target, sino cerca)
        const dx = targetPos.x - startPos.x;
        const dy = targetPos.y - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const meleeRange = this.cellWidth * 0.8; // Distancia para detenerse

        let endX = startPos.x;
        let endY = startPos.y;

        if (distance > meleeRange) {
            const ratio = (distance - meleeRange) / distance;
            endX = startPos.x + dx * ratio;
            endY = startPos.y + dy * ratio;
        } else {
            endX = startPos.x + dx * 0.5;
            endY = startPos.y + dy * 0.5;
        }

        // 5.1 CALCULAR DURACIÓN BASADA EN FRAMES DEL SPRITE
        const spriteData = user.Sprites[this.AttackSprite];
        let frameCount = 1;
        if (spriteData && spriteData[direction] && Array.isArray(spriteData[direction])) {
            frameCount = spriteData[direction].length;
        }
        // Duración total = frames / fps (Ej: 75 frames / 25 fps = 3 segundos)
        const totalDuration = frameCount / this.SpriteFPS;

        // 5.2 CONFIGURAR MOVIMIENTO
        const movement = {
            character: user,
            startX: startPos.x,
            startY: startPos.y,
            targetX: endX,
            targetY: endY,
            progress: 0,          // 0.0 a 1.0 (toda la animación)
            duration: totalDuration,
            elapsedTime: 0,
            damageTriggered: false,
            skill: skill,
            target: target,
            direction: direction,
            frameCount: frameCount,
            onComplete: () => {
                this.finalizeAttack(user, skill, target, direction);
            }
        };

        // Activar estado de ataque
        user.BattleState = this.AttackSprite;
        user.animFrame = 0; // Resetear frame al inicio
        // @ts-ignore
        this.activeMovements.push(movement);
    }


    /**
     * @param {CharacterModel} character
     * @param {string} spriteKey
     * @param {{ (): void; (): void; }} onComplete
     * @param {string} direction
     */
    _startAnimation(character, spriteKey, fps = this.SpriteFPS, onComplete, direction) {

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
            const isMoving = this.activeMovements.some(m => m.character === char);
            if (!isMoving) {
                char.updateAnimation(dt, false, true);
            }
        });


        // 6.1 Actualizar movimientos de ataque
        for (let i = this.activeMovements.length - 1; i >= 0; i--) {
            const move = this.activeMovements[i];

            // Actualizar tiempo y progreso
            move.elapsedTime += dt;
            move.progress = Math.min(move.elapsedTime / move.duration, 1.0);

            // 6.2 SINCRONIZAR FRAME DEL SPRITE MANUALMENTE
            // El sprite debe avanzar constantemente durante TODA la duración
            if (move.character.Sprites[this.AttackSprite]?.[move.direction]) {
                const totalFrames = move.frameCount;
                // Frame actual basado en el tiempo transcurrido (0 a totalFrames)
                const currentFrame = Math.floor((move.elapsedTime / move.duration) * totalFrames);
                move.character.animFrame = Math.min(currentFrame, totalFrames - 1);
            }

            // 6.3 LÓGICA DE IDA Y VUELTA (Movimiento)
            // Progreso 0.0 a 0.5: Ida hacia el enemigo (50% del tiempo)
            // Progreso 0.5 a 1.0: Vuelta a la posición original (50% del tiempo)
            let lerpFactor = 0;

            if (move.progress <= 0.5) {
                // === IDA: 0.0 -> 0.5 se mapea a 0.0 -> 1.0 ===
                lerpFactor = move.progress * 2; // 0.5 * 2 = 1.0 (llega al target)
            } else {
                // === VUELTA: 0.5 -> 1.0 se mapea a 1.0 -> 0.0 ===
                lerpFactor = 1.0 - ((move.progress - 0.5) * 2); // 0.5 -> 1.0 = 1.0 -> 0.0
            }

            // 6.4 DISPARAR DAÑO EN EL PUNTO MEDIO (0.5) - Exactamente cuando llega al target
            if (move.progress >= 0.5 && !move.damageTriggered) {
                move.damageTriggered = true;
                this.setDamage( move.skill, move.target, move.character,  move.direction);
            }
            // 6.5 FINALIZAR MOVIMIENTO
            if (move.progress >= 1.0) {
                move.onComplete();
                this.activeMovements.splice(i, 1);
            }
        }

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
     * @param {CharacterModel[]} enemies
     * @param {CharacterModel[]} party    
     */
    async startBattle(party, enemies) {
        this.InitProps();
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
        console.log(this.turnOrder);

    }

    startNextTurn() {
        let nextIndex = this.currentTurnIndex;
        let attempts = 0;
        const currentCombatant = this.turnOrder[this.currentTurnIndex];
        this.updateBattleUI();
        this.logBattleMessage(`Turno de ${currentCombatant.Name}`);
        this._renderBattleScene();
        if (currentCombatant.isEnemy) {
            setTimeout(() => this.executeEnemyTurn(currentCombatant), 10);
        } else {
            this.showSkills(currentCombatant);
        }
        do {
            nextIndex = (nextIndex + 1) % this.turnOrder.length;
            attempts++;
            if (attempts > this.turnOrder.length) {
                this.verifyBattleState();
                return;
            }
        } while (this.turnOrder[nextIndex].Stats.hp <= 0);
        this.currentTurnIndex = nextIndex;
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
            const button = html`<img class='skill-btn ${skill.actualCooldown > 0 ? "disabled" : ""}' alt="${skill.name}" src="${skill.icon}" 
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

    // 8. MODIFICAR useSkill para branchear según tipo
    /**
     * @param {CharacterModel} user
     * @param {SkillModel} skill
     * @param {CharacterModel} target
     */
    useSkill(user, skill, target) {
        const direction = user.isEnemy ? "left" : "right";

        // 8.1 VERIFICAR TIPO DE SKILL
        if (skill.skillType === SkillsType.MELE) {
            // Animación de movimiento + ataque
            this.executeMeleAttack(user, skill, target, direction);
        } else {
            // Comportamiento original (Long Range)
            this._startAnimation(user, this.AttackSprite, this.SpriteFPS, () => {
                this.finalizeAttack(user, skill, target, direction);
            }, direction);
        }
    }

    /**
     * @param {CharacterModel} user
     * @param {SkillModel} skill
     * @param {CharacterModel} target
     */
    useSkillOld(user, skill, target) {
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
                    const combatants = this.combatants.filter(c => c.isEnemy && c.Stats.hp > 0);
                    //const targetsToApplyDamage = [];
                    for (let index = 0; index < skill.numberTargets; index++) {
                        const elementTarget = combatants[index]
                        if (elementTarget) {
                            this.setSkillDamage(elementTarget, user, skill, direction);
                        }
                    }
                }
            }
            this.updateBattleUI();
            this._renderBattleScene();
            const verify = this.verifyBattleState();
            if (verify) {
                setTimeout(() => {
                    user.Skills.forEach(skill => skill.reduceCooldDown());
                    this.startNextTurn();
                }, 100);
            }

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
                skillElement: skill.element,
                spriteSkillAnimation: skill.spriteSkillAnimation,
                isCritical: false,              // Opcional: golpe crítico
                startTime: null                 // Se asigna automáticamente en el primer frame
            })
            if (target.Stats.hp <= 0) {
                this.logBattleMessage(`¡${target.Name} ha sido derrotado!`);
                this._setDeathState(target, direction);
                if (target.isEnemy) this.selectedEnemyTarget = undefined;
            }

        } else {
            this.logBattleMessage(`¡${skill.name} en coldDown, ${skill.actualCooldown}!`);
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
            .filter(c => !c.isEnemy)
            .forEach(combatant => {
                const combatantEl = this.createCombatantElement(combatant);
                this.partyCombatantsEl.appendChild(combatantEl);
            });

        // Mostrar enemigos VIVOS
        this.combatants
            .filter(c => c.isEnemy)
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
            setTimeout(() => {
                const battleMessage = this.showBattleEndMessage("Victory");
                setTimeout(() => {
                    this._stopAnimationLoop();
                    this.hideBattleEndMessage(battleMessage);
                    this.close()
                }, 3000);
            }, 50);

            return false;
        } else if (aliveParty.length === 0 && aliveEnemies.length > 0) {
            this.logBattleMessage("Derrota... Todos los miembros del grupo han caído.");
            setTimeout(() => {
                const battleMessage = this.showBattleEndMessage("Defeat", "defeat");
                setTimeout(() => {
                    this._stopAnimationLoop();
                    this.hideBattleEndMessage(battleMessage);
                    this.close()
                }, 3000);
            }, 50);
            this.combatants.forEach(combatant => {
                combatant.BattleState = undefined;
            });
            return false;
        } else if (aliveParty.length === 0 && aliveEnemies.length === 0) {
            this.logBattleMessage("La batalla ha terminado en empate.");
            setTimeout(() => {
                const battleMessage = this.showBattleEndMessage("Draw", "draw");
                setTimeout(() => {
                    this._stopAnimationLoop();
                    this.hideBattleEndMessage(battleMessage);
                    this.close()
                }, 3000);
            }, 50);
            return false;
        }
        this.logBattleMessage("La batalla continua");
        return true;
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
     * @param {CharacterModel} npc 
     * @private
     */
    _drawSelectionRing(ctx, pos, isAlly, cam, npc) {
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
        const scaledWidth = ringWidth * pulse * npc.height;
        const scaledHeight = ringHeight * pulse * npc.height;

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
 * Dibuja un aura de carga mágica con anillos horizontales ascendentes
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number}} pos - Posición (NO USADA: contexto ya trasladado)
 * @param {Camera} cam - Cámara para aplicar zoom
 * @param {string} [element='light'] - Elemento: 'fire', 'water', 'earth', 'air', 'light', 'dark', 'lightning'
 * @param {CharacterModel} npc 
 * @private
 */
    _drawChargeAuraAnimation(ctx, pos, cam, npc, element = 'light') {
        ctx.save();

        // === POSICIÓN: (0,0) porque el contexto YA está trasladado al personaje ===
        const centerX = 0;
        const centerY = 0;

        // === PALETA DE COLORES POR ELEMENTO ===
        const elementColors = {
            fire: { r: 255, g: 100, b: 30, glow: 'rgba(255, 150, 50, 0.7)', trail: 'rgba(255, 80, 0, 0.5)' },
            water: { r: 50, g: 180, b: 255, glow: 'rgba(100, 200, 255, 0.7)', trail: 'rgba(50, 150, 255, 0.5)' },
            earth: { r: 139, g: 90, b: 43, glow: 'rgba(160, 120, 70, 0.6)', trail: 'rgba(100, 70, 30, 0.5)' },
            air: { r: 200, g: 230, b: 255, glow: 'rgba(220, 240, 255, 0.7)', trail: 'rgba(180, 210, 255, 0.5)' },
            light: { r: 255, g: 240, b: 180, glow: 'rgba(255, 255, 200, 0.8)', trail: 'rgba(255, 255, 150, 0.6)' },
            dark: { r: 120, g: 80, b: 180, glow: 'rgba(180, 120, 255, 0.6)', trail: 'rgba(80, 40, 120, 0.5)' },
            lightning: { r: 255, g: 255, b: 100, glow: 'rgba(255, 255, 150, 0.9)', trail: 'rgba(255, 255, 50, 0.7)' },
            default: { r: 100, g: 180, b: 255, glow: 'rgba(150, 200, 255, 0.7)', trail: 'rgba(100, 150, 255, 0.5)' }
        };

        // @ts-ignore
        const colors = elementColors[element] || elementColors.default;
        const time = Date.now() / 1000;

        // === CONFIGURACIÓN DE ANILLOS HORIZONTALES ASCENDENTES ===
        const ringCount = 4;                     // Número de anillos horizontales
        const baseRadiusX = this.cellWidth * 0.7 * cam.zoom;   // Radio horizontal (ancho)
        const baseRadiusY = this.cellHeight * 0.25 * cam.zoom; // Radio vertical (alto - achatado)
        const ascentHeight = baseRadiusX * 2.0 * npc.height / 2;   // Altura total del recorrido ascendente
        const ascentSpeed = 1.2;                  // Velocidad de ascenso

        // === Capa 0: Aura base difusa (fondo sutil en los pies) ===
        const basePulse = 1 + 0.1 * Math.sin(time * 2.5);
        const baseGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, baseRadiusX * 1.2 * basePulse
        );
        baseGradient.addColorStop(0, `rgba(${colors.r}, ${colors.g}, ${colors.b}, 0.5)`);
        baseGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, baseRadiusX * 0.9, baseRadiusY * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = baseGradient;
        ctx.fill();

        // === Capa principal: Anillos HORIZONTALES ascendentes ===
        // ✅ ESTOS son los anillos que suben (como en tu dibujo)
        for (let i = 0; i < ringCount; i++) {
            // Cada anillo tiene su propio ciclo de vida desfasado
            const ringDelay = i * 0.35;
            const ringCycle = (time * ascentSpeed + ringDelay) % 2.0;

            // Progreso de ascenso: 0 = pies (abajo), 1 = cabeza (arriba, desaparece)
            const riseProgress = ringCycle < 1.4 ? ringCycle / 1.4 : 1;
            const fadeProgress = ringCycle >= 1.4 ? (ringCycle - 1.4) / 0.6 : 0;

            const isActive = ringCycle < 2.0;
            if (!isActive) continue;

            // Posición vertical: desde los pies (centerY) hacia arriba
            const verticalOffset = -ascentHeight * riseProgress;
            const currentY = centerY + verticalOffset;

            // Tamaño: se expande ligeramente al subir
            const sizeFactor = 0.8 + riseProgress * 0.3;
            const currentRadiusX = baseRadiusX * sizeFactor;
            const currentRadiusY = baseRadiusY * sizeFactor;

            // Opacidad: aparece suave, se mantiene, luego desaparece
            const alpha = riseProgress < 0.15
                ? riseProgress / 0.15 * 0.7
                : 0.7 * (1 - fadeProgress);

            // Grosor de línea: más fino arriba
            const lineWidth = (3 - i * 0.3) * cam.zoom * (1 - fadeProgress * 0.5);

            // === Anillo horizontal principal (elipse achatada) ===
            ctx.beginPath();
            ctx.ellipse(
                centerX,
                currentY,
                currentRadiusX,
                currentRadiusY,
                0, 0, Math.PI * 2
            );
            ctx.strokeStyle = `rgba(${colors.r}, ${colors.g}, ${colors.b}, ${alpha})`;
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            // === Brillo interior del anillo ===
            if (alpha > 0.3 && riseProgress > 0.2) {
                ctx.beginPath();
                ctx.ellipse(
                    centerX,
                    currentY,
                    currentRadiusX * 0.85,
                    currentRadiusY * 0.85,
                    0, 0, Math.PI * 2
                );
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
                ctx.lineWidth = lineWidth * 0.4;
                ctx.stroke();
            }

            // === Partículas en el borde del anillo ===
            if (riseProgress > 0.15 && fadeProgress < 0.6) {
                const particleCount = 4;
                for (let p = 0; p < particleCount; p++) {
                    const pAngle = (p / particleCount) * Math.PI * 2 + time * 0.5 + i;
                    const px = centerX + Math.cos(pAngle) * currentRadiusX;
                    const py = currentY + Math.sin(pAngle) * currentRadiusY;

                    ctx.beginPath();
                    ctx.arc(px, py, (2 + riseProgress * 2) * cam.zoom, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${colors.r}, ${colors.g}, ${colors.b}, ${alpha * 0.8})`;
                    ctx.fill();
                }
            }
        }

        // === LÍNEAS VERTICALES FIRMES (rectas, conectan los anillos) ===
        ctx.save();
        ctx.translate(centerX, centerY);

        const streamCount = 6;
        for (let s = 0; s < streamCount; s++) {
            const streamAngle = (s / streamCount) * Math.PI * 2;
            const streamX = Math.cos(streamAngle) * baseRadiusX * 0.7;
            const streamY = Math.sin(streamAngle) * baseRadiusY * 0.7;

            // ✅ LÍNEA COMPLETAMENTE RECTA VERTICAL (sin ondulación)
            ctx.beginPath();
            ctx.moveTo(streamX, baseRadiusY);           // Inicio: en los pies
            ctx.lineTo(streamX, -ascentHeight * 0.85);  // Final: arriba del aura
            ctx.strokeStyle = colors.trail;
            ctx.lineWidth = 2 * cam.zoom;
            ctx.lineCap = 'round';

            // Efecto de pulso en opacidad (cada línea parpadea independientemente)
            const streamPulse = 0.35 + 0.65 * Math.sin(time * 2.5 + s * 1.3);
            ctx.globalAlpha = streamPulse;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        ctx.restore();

        // === Glow exterior pulsante (en los pies) ===
        const glowPulse = 1 + 0.08 * Math.sin(time * 3);
        ctx.beginPath();
        ctx.ellipse(
            centerX,
            centerY,
            baseRadiusX * 1.1 * glowPulse,
            baseRadiusY * 0.9 * glowPulse,
            0, 0, Math.PI * 2
        );
        ctx.strokeStyle = colors.glow;
        ctx.lineWidth = 4 * cam.zoom;
        ctx.stroke();

        // === Destello central intermitente (en los pies) ===
        const flashIntensity = 0.3 + 0.7 * Math.sin(time * 6);
        if (flashIntensity > 0.5) {
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, baseRadiusX * 0.3 * flashIntensity, baseRadiusY * 0.3 * flashIntensity, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${(flashIntensity - 0.5) * 2})`;
            ctx.fill();
        }

        // === Sombra proyectada en el suelo ===
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 3, baseRadiusX * 0.6, baseRadiusY * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        ctx.restore();
    }
    /**
     * Dibuja una sombra elíptica debajo del personaje
     * @param {CanvasRenderingContext2D} ctx
     * @param {{x: number, y: number}} pos - Posición en canvas (pies del personaje)
     * @param {Camera} cam - Cámara de batalla para aplicar zoom
     * @private
     */
    _drawShadow(ctx, pos, cam) {
        ctx.save();

        // === Configuración de la sombra ===
        const shadowWidth = this.cellWidth * 0.55 * cam.zoom;
        const shadowHeight = this.cellHeight * 0.18 * cam.zoom;

        // 👉 ESCALAR contexto para que el gradiente radial se adapte a la elipse
        ctx.scale(1, shadowHeight / shadowWidth); // 👈 Clave: comprime Y para que el radial parezca elíptico

        // === Gradiente radial AHORA se ve elíptico por el scale ===
        const gradient = ctx.createRadialGradient(
            0, 0, 0,
            0, 0, shadowWidth  // 👈 Radio basado en el ancho (antes del scale)
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
        gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.15)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // === Dibujar elipse (ahora círculo por el scale, pero visualmente elipse) ===
        ctx.beginPath();
        ctx.ellipse(0, 0, shadowWidth, shadowWidth, 0, 0, Math.PI * 2); // 👈 Usar shadowWidth en ambos ejes
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
    }

    /**
     * Dibuja indicador visual de daño recibido (impacto fuerte + elemento)
     * @param {CanvasRenderingContext2D} ctx
     * @param  {{ target?: CharacterModel; damage: number; isCritical: boolean; startTime: number | null; spriteSkillAnimation?: HTMLImageElement[]; }} targetDamage
     * @param {boolean} isAlly
     * @param {Camera} cam
     * @param {string} elementType - 'fire' | 'ice' | 'thunder' | 'poison' | 'earth' | undefined
     */
    _drawSelectionDamage(ctx, targetDamage, isAlly, cam, elementType) {

        const CONFIG = {
            duration: 0.9,
            ringMaxProgress: 0.6,
            flashMaxProgress: targetDamage?.isCritical ? 0.35 : 0.2,

            elements: {
                none: { primary: 'rgba(255,255,255,1)', glow: 'rgba(255,255,255,0.5)' },
                fire: { primary: 'rgba(255,90,0,1)', glow: 'rgba(255,120,0,0.5)' },
                ice: { primary: 'rgba(120,220,255,1)', glow: 'rgba(180,240,255,0.5)' },
                thunder: { primary: 'rgba(255,240,0,1)', glow: 'rgba(255,255,150,0.5)' },
                poison: { primary: 'rgba(170,0,255,1)', glow: 'rgba(200,120,255,0.5)' },
                earth: { primary: 'rgba(160,110,60,1)', glow: 'rgba(200,160,120,0.5)' },
                light: { primary: 'rgba(160,110,60,1)', glow: 'rgba(200,160,120,0.5)' },
                dark: { primary: 'rgba(160,110,60,1)', glow: 'rgba(200,160,120,0.5)' }
            }
        };

        const basePosX = 0;
        const basePosY = -200;

        const now = performance.now();
        if (!targetDamage.startTime) {
            targetDamage.startTime = now;
            // @ts-ignore
            targetDamage.particles = this._createElementParticles(elementType);
        }

        const elapsed = (now - targetDamage.startTime) / 1000;
        const t = Math.min(elapsed / CONFIG.duration, 1);

        // @ts-ignore
        const colorSet = CONFIG.elements[elementType] || CONFIG.elements.none;

        /* ============================
           💥 PARTÍCULAS ELEMENTALES
        ============================ */

        // @ts-ignore
        if (targetDamage.particles) {
            ctx.save();
            ctx.translate(basePosX, basePosY);

            // @ts-ignore
            targetDamage.particles.forEach(p => {
                p.life -= 0.016;
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;

                const alpha = Math.max(p.life / p.maxLife, 0);

                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;

                ctx.beginPath();
                ctx.arc(p.x * cam.zoom, p.y * cam.zoom, p.size * cam.zoom, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.globalAlpha = 1;

            // @ts-ignore
            targetDamage.particles = targetDamage.particles.filter(p => p.life > 0);
            ctx.restore();
        }

        /* ============================
           💥 SHOCKWAVE
        ============================ */

        if (t < CONFIG.ringMaxProgress) {
            const ringT = t / CONFIG.ringMaxProgress;
            const radius = 60 * ringT * cam.zoom;
            const alpha = (1 - ringT) * 0.8;

            ctx.save();
            ctx.beginPath();
            ctx.arc(basePosX, basePosY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = colorSet.glow.replace('0.5', alpha.toString());
            ctx.lineWidth = 8 * (1 - ringT);
            ctx.stroke();
            ctx.restore();
        }

        /* ============================
           🔢 TEXTO DAÑO IMPACTO
        ============================ */

        const floatOffset = 45 * (1 - Math.pow(1 - t, 3)) * cam.zoom;
        const textPosY = basePosY - 40 * cam.zoom - floatOffset;

        ctx.save();

        const shake = (1 - t) * 6;
        ctx.translate(basePosX + (Math.random() - 0.5) * shake,
            textPosY + (Math.random() - 0.5) * shake);

        let scale = t < 0.15
            ? 1.8 - (t * 4)
            : 1.2 - ((t - 0.15) * 0.3);

        if (targetDamage.isCritical) scale *= 1.4;

        ctx.scale(scale, scale);

        ctx.font = `bold 30px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const alpha = 1 - t;

        ctx.fillStyle = `rgba(0,0,0,${alpha * 0.7})`;
        ctx.fillText(`-${targetDamage.damage}`, 3, 3);

        const gradient = ctx.createLinearGradient(0, -15, 0, 15);

        if (targetDamage.isCritical) {
            gradient.addColorStop(0, `rgba(255,255,180,${alpha})`);
            gradient.addColorStop(1, `rgba(255,215,0,${alpha})`);
        } else {
            gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
            gradient.addColorStop(1, colorSet.primary.replace('1)', `${alpha})`));
        }

        ctx.fillStyle = gradient;
        ctx.fillText(`-${targetDamage.damage}`, 0, 0);

        ctx.restore();

        /* ============================
           ✨ FLASH
        ============================ */

        if (t < CONFIG.flashMaxProgress) {
            const flashAlpha = (1 - t / CONFIG.flashMaxProgress) * 0.9;
            ctx.save();
            ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
            ctx.beginPath();
            ctx.arc(basePosX, basePosY, 70 * cam.zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (t >= 1) {
            this.targetDamage.splice(this.targetDamage.indexOf(targetDamage), 1);
        }
    }


    /**
     * @param {string} elementType
     */
    _createElementParticles(elementType) {

        const particles = [];
        const count = 20;

        for (let i = 0; i < count; i++) {

            let color = "white";
            let gravity = 0.05;

            switch (elementType) {
                case "fire": color = "orange"; break;
                case "ice": color = "cyan"; gravity = 0.01; break;
                case "thunder": color = "yellow"; break;
                case "poison": color = "violet"; gravity = -0.01; break;
                case "earth": color = "#8B5A2B"; gravity = 0.15; break;
            }

            particles.push({
                x: 0,
                y: 0,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                size: 3 + Math.random() * 3,
                life: 0.6,
                maxLife: 0.6,
                gravity,
                color
            });
        }

        return particles;
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

    /**
     * Muestra un mensaje de fin de batalla centrado en pantalla
     * @param {string} message - Texto a mostrar
     * @param {string} type - 'victory', 'defeat' o 'draw' para estilos diferentes
     */
    showBattleEndMessage(message, type = 'victory') {
        // Crear overlay si no existe
        // Estilos según el tipo de resultado        
        // @ts-ignore

        const battleMassage = html`<div class="end-battle-message ${type}">
        <style>
           .end-battle-message {
                font-size: 4rem;
                font-weight: bold;
                letter-spacing: 8px;
                animation: pulse 0.5s ease-in-out forwards;
                Z-INDEX: 10000;
                position: fixed;
                top: 50%;                
                left: 50%;
                box-shadow: 0 0 10px 0 #000;
                background: rgba(0,0,0,0.4);
                padding: 20px;
                border-radius: 20px;
            }
            .victory {
                color: #ffffff;
                text-shadow: 0 0 5px #07e345;
            }
            .defeat {
                color: #ffffff;
                text-shadow: 0 0 5px #f87171;
            }
            .draw {
                color: #ffffff;
                text-shadow: 0 0 5px #fbbf24;
            }
            @keyframes pulse {
                0% { 
                    transform: translate(-50%, -50%) scale(0.8); 
                    opacity: 0;                 
                }
                100% { 
                    transform: translate(-50%, -50%) scale(2); 
                    opacity: 1;
                 }
            }
            .victory {
               
                overflow: hidden;   /* oculta el destello fuera del contenedor */
                color: #ffffff;
                text-shadow: 0 0 5px #07e345;
            }

            /* DESTELLOS */
            .victory::before,
            .victory::after {
                content: "";
                position: absolute;
                width: 150%;
                height: 6px;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255,255,255,0.8),
                    transparent
                );
                transform: translateX(-100%);
                animation: shine 1s linear infinite;
                border-radius: 5px;
            }

            /* Parte superior */
            .victory::before {
                top: 0px;
            }

            /* Parte inferior */
            .victory::after {
                bottom: 0px;
                animation: shineInverse 1s linear infinite;
                transform: translateX(100%);
                 /*animation-delay: 1s; desfase para que no coincidan */
            }

            @keyframes shine {
                0% {
                    transform: translateX(-100%);
                }
                100% {
                    transform: translateX(100%);
                }
            }
            @keyframes shineInverse {
                0% {
                    transform: translateX(100%);
                }
                100% {
                    transform: translateX(-100%);
                }
            }
        </style>
        ${message}</div>`;
        this.battleMessageContainer?.append(battleMassage)
        return battleMassage;
    }

    /**
     * Oculta el mensaje de fin de batalla
     * @param {HTMLElement} battleMassage
     */
    hideBattleEndMessage(battleMassage) {
        setTimeout(() => {
            battleMassage.remove()
        }, 200);
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