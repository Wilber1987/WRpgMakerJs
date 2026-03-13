//@ts-check
import { CharacterModel } from "../Common/CharacterModel.js";
import { clamp, DPR, lerp, OpenWorldEngineView, TILE_SIZE } from "./OpenWorldEngineView.js";
import { Camera } from "./Camera.js";
import { GameMap } from "./OpenWordModules/Models.js";
import { BattleSystem } from "./BattleModule/BattleSystem.js";
import { vnEngine } from "../VisualNovel/VisualNovelEngine.js";
import { CharactersUtil } from "../Common/CharactersUtil.js";

/**
 * @typedef {Object} MapObject
 * @property {number} x - La posición X del objeto en el mapa.
 * @property {number} y - La posición Y del objeto en el mapa.
 * @property {number} w - El ancho del objeto en el mapa (en tiles).
 * @property {number} h - La altura del objeto en el mapa (en tiles).
 * @property {string} [color] - El color del objeto para dibujado básico.
 * @property {HTMLImageElement | undefined} [icon] - El ícono del objeto (si es una imagen).
 * @property {number} [iconWidth] - El ancho del ícono (si es diferente al tamaño del tile).
 * @property {number} [iconHeight] - La altura del ícono (si es diferente al tamaño del tile).
 * @property {function(GameEngine): void} [Action] - La función de acción a ejecutar cuando se interactúa con el objeto.
 * @property {function(GameEngine): (boolean | Promise<boolean>)} [ActionQuestion] - La función de pregunta de acción a ejecutar.
 * @property {function(number, number): boolean} occupies - Método para verificar si el objeto ocupa un tile dado.
 * @property {number} [_lastTriggered] - Marca de tiempo del último trigger (para debounce).
 */

/**
 * @typedef {Object} NpcMapData
 * @property {string} name - El nombre del mapa al que se aplica esta configuración de NPC.
 * @property {number} posX - La posición X del NPC en este mapa.
 * @property {number} posY - La posición Y del NPC en este mapa.
 * @property {function(GameEngine): void} [action] - La función de acción específica para este NPC en este mapa.
 * @property {function(GameEngine): (boolean | Promise<boolean>)} [ActionQuestion] - La función de pregunta de acción específica para este NPC en este mapa.
 */

/**
 * @typedef {CharacterModel} NPC
 * @property {boolean} [isNPC] - Indica si el personaje es un NPC.
 * @property {Array<NpcMapData>} [MapData] - Datos específicos de posición y acción del NPC por mapa.
 * @property {string} [state] - El estado actual de la animación del NPC (e.g., 'idle').
 * @property {'up'|'down'|'left'|'right'} [direction] - La dirección actual del NPC (e.g., 'down').
 * @property {number} [animFrame] - El frame actual de la animación del NPC.
 * @property {number} [animTimer] - El temporizador de animación del NPC.
 * @property {Object.<string, Object.<string, HTMLImageElement[]>>} [Sprites] - Sprites del NPC por estado y dirección.
 * @property {number} [tileHeight] - Altura del NPC en unidades de tile.
 * @property {function(GameEngine): void} [Action] - La función de acción a ejecutar cuando se interactúa con el NPC (si no está en MapData).
 * @property {function(GameEngine): (boolean | Promise<boolean>)} [ActionQuestion] - La función de pregunta de acción a ejecutar cuando se interactúa con el NPC (si no está en MapData).
 */

/**
 * @typedef {Object} NpcPositionData
 * @property {number} x - La posición X calculada del NPC.
 * @property {number} y - La posición Y calculada del NPC.
 * @property {function(GameEngine): void | null} [action] - La función de acción del NPC.
 * @property {function(GameEngine): (boolean | Promise<boolean>) | null} [ActionQuestion] - La función de pregunta de acción del NPC.
 * @property {boolean} hasMapData - Indica si la posición se obtuvo de MapData o fue aleatoria.
 */

/**
 * @typedef {Object} AlertTarget
 * @property {number} x - La posición X del objetivo de la alerta.
 * @property {number} y - La posición Y del objetivo de la alerta.
 * @property {Function} [Action] - La función de acción del objetivo.
 * @property {Function} [ActionQuestion] - La función de pregunta de acción del objetivo.
 * @property {boolean} isNPC - Indica si el objetivo es un NPC.
 * @property {MapObject} [objRef] - Referencia al objeto del mapa (si no es NPC).
 * @property {NPC} [npcRef] - Referencia al NPC (si es NPC).
 * @property {boolean} [autoTrigger] 
 * @property {Function}Action
 * @property {Function} ActionQuestion
 */

// --------------------------------------------------
// Engine
// --------------------------------------------------
export class GameEngine {
    /**
    * @param {OpenWorldEngineView} openWorldInstance
    */
    constructor(openWorldInstance) {
        /** @type {OpenWorldEngineView} */
        this.OpenWorldInstance = openWorldInstance;
        /** @type {Object.<string, GameMap>} */
        this.maps = {};
        /**@type {GameMap | null} */
        this.currentMap = null;


        /** @type {CharacterModel[]} */
        this.Characters = openWorldInstance.Characters;

        /** @type {CharacterModel} */
        this.SelectedCharacter = CharactersUtil.getLeader(this.Characters) ?? new CharacterModel();

        /** @type {Camera} */
        this.cam = new Camera(100, 100);
        /** @type {Object.<string, boolean>} */
        this.keys = {};
        /** @type {number} */
        this.lastTs = 0;
        /** @type {Set<MapObject>} */
        this.overlaps = new Set(); // objects currently overlapped  

        /** @type {HTMLElement} */// @ts-ignore
        this.hud = this.OpenWorldInstance.shadowRoot?.querySelector('#hud');
        /** @type {HTMLCanvasElement} */

        this.minimapCanvas = this.OpenWorldInstance.MinimapCanvas;
        /** @type {CanvasRenderingContext2D} */// @ts-ignore
        this.minictx = this.minimapCanvas?.getContext('2d');
        // Sistema de batalla
        /** @type {BattleSystem} */
        this.battleSystem = new BattleSystem(openWorldInstance);

        /** @type {number} */
        this.minZoom = 0.4; // valor por defecto
        /** @type {number} */

        this.maxZoom = 5; // valor por defecto
        /** @type {boolean} */

        this.active = true;
        this._bindInputs();

        // Sistema de alertas
        /** @type {boolean} */
        this.alertVisible = false;
        /** @type {AlertTarget | null} */
        this.alertTarget = null;
        /** @type {number} */
        this.alertRadius = 1.5;  // Aumentar radio para probar
        /** @type {{x: number, y: number}} */
        this.alertOffset = { x: 0, y: -20 };
        // 🔧 CORRECCIÓN 4: Agregar gestión de foco (evita bugs con alert())
        this._isActionExecuting = false; // 👈 Flag para evitar reanudar durante diálogos
        this._bindFocusHandlers();
    }

    /**
     * Agrega un mapa al diccionario de mapas del motor.
     * @param {GameMap} map - El objeto GameMap a agregar.
     */
    addMap(map) { this.maps[map.name] = map; }

    handleContinueGame() {
        throw new Error("Method not implemented.");
    }

    /**
     * Cambia al mapa especificado y posiciona al personaje. Actualiza la cámara.
     * @param {string} name - El nombre del mapa al que ir.
     * @param {{x: number, y: number}} [pos] - La posición (x, y) opcional para el personaje en el nuevo mapa. Si no se proporciona, usa el spawn del mapa.
     */
    GoToMap(name, pos) {
        this.RegisterCharacter(this.SelectedCharacter, this.OpenWorldInstance.Config?.isFullPerspective ?? false);
        this.Characters.forEach(character => {
            this.RegisterCharacter(character, this.OpenWorldInstance.Config?.isFullPerspective ?? false);
        });
        const target = this.maps[name];
        if (!target) { console.warn('Mapa no encontrado:', name); return; }
        this.currentMap = target;

        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            this.SelectedCharacter.x = pos.x;
            this.SelectedCharacter.y = pos.y;
        } else {
            this.SelectedCharacter.x = target.spawnX;
            this.SelectedCharacter.y = target.spawnY;
        }
        const followers = this.Characters.filter(c => c.isFollower).forEach(char => {
            char.follow(this.SelectedCharacter)
        });

        // reset overlaps y teclas
        this.overlaps.clear();
        this.keys = {}; // 👈 importante para que no "herede" teclas apretadas
        // centrar cámara
        this.cam.x = this.SelectedCharacter.x;
        this.cam.y = this.SelectedCharacter.y;

        // 👇 Actualizar límites de zoom según el mapa
        this.minZoom = this.cam.GetMinZoom(this.currentMap);
        console.log(`this.minZoom ${this.minZoom}`);
        this.maxZoom = this.cam.GetMaxZoom(this.currentMap);

        // Asegurar que el zoom actual esté dentro de los nuevos límites
        this.cam.zoom = clamp(this.cam.zoom, this.minZoom, this.maxZoom);

        // Centrar cámara en el jugador
        this.cam.x = this.SelectedCharacter.x;
        this.cam.y = this.SelectedCharacter.y;

        this._setState(`Entró a: ${target.name}`);
    }

    /**
     * Configura los escuchadores de eventos para la entrada del usuario (teclado, rueda del ratón, clic en minimapa).
     * @private
     */
    _bindInputs() {
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            // movement keys & action keys
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'z', 'x'].includes(k)) {
                e.preventDefault();
            }
            this.keys[k] = true;
            if (k === 'z') {
                this._onActionKey();
            }
        });
        window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });

        // canvas wheel -> zoom
        const canvasEl = this.OpenWorldInstance.shadowRoot?.querySelector('#view');
        if (canvasEl) { // Added null check
            canvasEl.addEventListener('wheel', (e) => {
                e.preventDefault();
                // @ts-ignore
                const delta = -Math.sign(e.deltaY) * 0.12;
                this.cam.zoom = clamp(this.cam.zoom + delta, this.minZoom, this.maxZoom);
            }, { passive: false });
        }

        // minimap click to center
        if (this.minimapCanvas) { // Added null check
            this.minimapCanvas.addEventListener('click', (e) => {
                const r = this.minimapCanvas.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width;
                const y = (e.clientY - r.top) / r.height;
                if (this.currentMap) { this.cam.x = x * this.currentMap.w; this.cam.y = y * this.currentMap.h; }
            });
        }
    }

    /**
     * Maneja la acción del usuario (tecla 'z') usando la MISMA lógica que las alertas
     * @private
     */
    _onActionKey() {
        if (this.battleSystem.isActive || !this.currentMap) return;

        // ✅ Usa la MISMA lógica que _checkAlertProximity() 
        //    pero con datos FRESOS (no el cacheado)
        const target = this._findClosestInteractiveTarget(this.alertRadius);

        if (!target) return;

        // Ejecutar ActionQuestion/Action según corresponda
        if (target.ActionQuestion) {
            try {
                const res = target.ActionQuestion(this);
                if (res instanceof Promise) {
                    res.then(ok => {
                        if (ok && target.Action) target.Action(this);
                    });
                } else if (res && target.Action) {
                    target.Action(this);
                }
            } catch (err) {
                console.error('Error in ActionQuestion', err);
            }
        } else if (target.Action) {
            target.Action(this);
        }
    }

    // 🔧 MEJORAR _onActionKey para usar el mismo patrón de pausa
    _onActionKeyo() {
        if (this.battleSystem.isActive || !this.currentMap || this._isActionExecuting) return;

        const target = this._findClosestInteractiveTarget(this.alertRadius);
        if (!target || (!target.Action && !target.ActionQuestion)) return;

        this._isActionExecuting = true;
        this.pause();

        const handleResult = (/** @type {boolean | null} */ shouldExecute) => {
            if (shouldExecute && target.Action) {
                try {
                    const result = target.Action(this);
                    // @ts-ignore
                    if (result instanceof Promise) {
                        result.finally(() => {
                            setTimeout(() => {
                                this._isActionExecuting = false;
                                this.resume();
                            }, 100);
                        });
                    } else {
                        setTimeout(() => {
                            this._isActionExecuting = false;
                            this.resume();
                        }, 150);
                    }
                } catch (err) {
                    console.error('Error ejecutando acción manual', err);
                    this._isActionExecuting = false;
                    this.resume();
                }
            } else {
                setTimeout(() => {
                    this._isActionExecuting = false;
                    this.resume();
                }, 150);
            }
        };

        try {
            if (target.ActionQuestion) {
                const res = target.ActionQuestion(this);
                if (res instanceof Promise) {
                    res.then(handleResult).catch(err => {
                        console.error('Error en ActionQuestion', err);
                        this._isActionExecuting = false;
                        this.resume();
                    });
                } else {
                    handleResult(res);
                }
            } else {
                handleResult(true);
            }
        } catch (err) {
            console.error('Excepción en _onActionKey', err);
            this._isActionExecuting = false;
            this.resume();
        }
    }


    /**
     * Actualiza el estado del juego en cada fotograma.
     * @param {number} ts - Marca de tiempo del fotograma actual.
     */
    update(ts) {
        if (!this.active) return; // 👈 detener si no está activo
        if (!this.lastTs) this.lastTs = ts; const dt = (ts - this.lastTs) / 1000; this.lastTs = ts;
        if (!this.currentMap) { requestAnimationFrame(this.update.bind(this)); return; }
        this.SelectedCharacter = CharactersUtil.getLeader(this.Characters) ?? new CharacterModel();
        const followers = this.Characters.filter(c => c.isFollower);

        if (!this.battleSystem.isActive) {
            let dx = 0, dy = 0;
            ({ dy, dx } = this.UpdateCharacterStateDirection(dy, dx, this.SelectedCharacter));

            followers.push(...this.currentMap.NPCs.filter(npc => npc.isFollower && !followers.includes(npc)))

            followers.forEach((character) => {
                this.UpdateCharacterStateDirection(dy, dx, character);
            })

            if (dx !== 0 && dy !== 0) { const inv = 1 / Math.sqrt(2); dx *= inv; dy *= inv; }

            const moving = (dx || dy) !== 0;
            this.SelectedCharacter.updateAnimation(dt, moving);
            followers.forEach((character) => {
                character.updateAnimation(dt, moving);
            })
            if (dx || dy) {
                const sp = this.SelectedCharacter.speed * dt;
                const nx = this.SelectedCharacter.x + dx * sp;
                const ny = this.SelectedCharacter.y + dy * sp;
                // simple collision: check destination tile
                if (!this.currentMap.isBlocked(Math.floor(nx), Math.floor(ny))) {
                    this.SelectedCharacter.x = nx;
                    this.SelectedCharacter.y = ny;
                    this.updateFollowerState(nx, ny, followers, dt, moving);
                }
            }
            // 👇 NUEVO: Verificar proximidad para alertas
            this._checkAlertProximity();
        }
        // camera follow
        this.cam.follow(this.SelectedCharacter, this.currentMap);
        this.currentMap.NPCs.forEach(npc => {
            if (npc.isFollower) {
                return;
            }
            npc.updateAnimation(dt, false);
        })
        // draw
        this.draw(followers);
        requestAnimationFrame(this.update.bind(this));
    }

    /**
     * @param {number} nx
     * @param {number} ny
     * @param {any[]} followers
     * @param {number} dt
     * @param {boolean} moving
     */
    updateFollowerState(nx, ny, followers, dt, moving) {
        let prevX = nx, prevY = ny;
        const spacing = 1.2 * (this.currentMap?.usarPerspectiva ? this.currentMap?.factorPerspectiva + 1 : 1); // distancia en tiles entre personajes

        followers.forEach((character, index) => {
            // Posicionar detrás del anterior (no del líder directo)
            const pos = this._getFollowerPosition(prevX, prevY, this.SelectedCharacter.direction, spacing);

            // Suavizado opcional: interpolación para movimiento fluido
            character.x = lerp(character.x, pos.x, 0.2);
            character.y = lerp(character.y, pos.y, 0.2);
            // Guardar posición para el siguiente follower
            prevX = character.x;
            prevY = character.y;
        });
    }

    /**
     * @param {number} dy
     * @param {number} dx
     * @param {CharacterModel} character
     */
    UpdateCharacterStateDirection(dy, dx, character) {
        // 🔹 PASO 1: Leer inputs y establecer valores base
        let inputDx = 0, inputDy = 0;

        if (this.keys["arrowup"] || this.keys["w"]) { inputDy = -1; }
        if (this.keys["arrowdown"] || this.keys["s"]) { inputDy = 1; }
        if (this.keys["arrowleft"] || this.keys["a"]) { inputDx = -1; }
        if (this.keys["arrowright"] || this.keys["d"]) { inputDx = 1; }

        // 🔹 PASO 2: Determinar dirección (8 direcciones) basado en input COMBINADO
        let newDirection = character.direction;

        const isFullPerspective = this.OpenWorldInstance.Config?.isFullPerspective

        if (inputDx < 0 && inputDy < 0 && isFullPerspective) {
            newDirection = "up_left";
        } else if (inputDx > 0 && inputDy < 0 && isFullPerspective) {
            newDirection = "up_right";
        } else if (inputDx < 0 && inputDy > 0 && isFullPerspective) {
            newDirection = "down_left";
        } else if (inputDx > 0 && inputDy > 0 && isFullPerspective) {
            newDirection = "down_right";
        } else if (inputDy < 0) {
            newDirection = "up";
        } else if (inputDy > 0) {
            newDirection = "down";
        } else if (inputDx < 0) {
            newDirection = "left";
        } else if (inputDx > 0) {
            newDirection = "right";
        }
        // Si no hay input, mantiene la dirección anterior

        // 🔹 PASO 3: Actualizar dirección SOLO si hay movimiento
        if (inputDx !== 0 || inputDy !== 0) {
            character.direction = newDirection;
        }

        // 🔹 PASO 4: Normalizar velocidad diagonal (para que no sea más rápido en diagonal)
        dx = inputDx;
        dy = inputDy;
        if (dx !== 0 && dy !== 0) {
            const inv = 1 / Math.sqrt(2);
            dx *= inv;
            dy *= inv;
        }

        return { dy, dx };
    }

    /**
     * @param {number} leaderX
     * @param {number} leaderY
     * @param {string} direction
     * @param {number} offsetTiles
     */
    _getFollowerPosition(leaderX, leaderY, direction, offsetTiles) {
        switch (direction) {
            case 'up': return { x: leaderX, y: leaderY + offsetTiles };
            case 'down': return { x: leaderX, y: leaderY - offsetTiles };
            case 'left': return { x: leaderX + offsetTiles, y: leaderY };
            case 'right': return { x: leaderX - offsetTiles, y: leaderY };
            case 'up_left': return { x: leaderX + offsetTiles * 0.7, y: leaderY + offsetTiles * 0.7 };
            case 'up_right': return { x: leaderX - offsetTiles * 0.7, y: leaderY + offsetTiles * 0.7 };
            case 'down_left': return { x: leaderX + offsetTiles * 0.7, y: leaderY - offsetTiles * 0.7 };
            case 'down_right': return { x: leaderX - offsetTiles * 0.7, y: leaderY - offsetTiles * 0.7 };
            default: return { x: leaderX, y: leaderY };
        }
    }
    /**
     * Dibuja todos los elementos con perspectiva 2.5D, Y-sorting, y lógica de followers por dirección
     * @param {CharacterModel[]} followers
     */
    draw(followers) {
        /** @type {HTMLCanvasElement | null | undefined} */
        const canvas = this.OpenWorldInstance.shadowRoot?.querySelector('#view');
        this.OpenWorldInstance.SetTimeClass();
        if (!canvas) return;
        /** @type {CanvasRenderingContext2D | null | undefined} */
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(DPR, DPR);

        // --- Fondo y grid (sin cambios) ---
        ctx.fillStyle = this.currentMap?.bgColor;
        ctx.fillRect(0, 0, this.cam.screenW, this.cam.screenH);

        const leftTile = Math.floor(this.cam.x - (this.cam.screenW / TILE_SIZE) / (2 * this.cam.zoom)) - 1;
        const rightTile = Math.ceil(this.cam.x + (this.cam.screenW / TILE_SIZE) / (2 * this.cam.zoom)) + 1;
        const topTile = Math.floor(this.cam.y - (this.cam.screenH / TILE_SIZE) / (2 * this.cam.zoom)) - 1;
        const bottomTile = Math.ceil(this.cam.y + (this.cam.screenH / TILE_SIZE) / (2 * this.cam.zoom)) + 1;

        ctx.lineWidth = 1 / this.cam.zoom;
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        for (let tx = leftTile; tx <= rightTile; tx++) {
            for (let ty = topTile; ty <= bottomTile; ty++) {
                if (!this.currentMap || tx < 0 || ty < 0 || tx >= this.currentMap.w || ty >= this.currentMap.h) continue;
                const px = (tx - this.cam.x) * TILE_SIZE * this.cam.zoom + this.cam.screenW / 2;
                const py = (ty - this.cam.y) * TILE_SIZE * this.cam.zoom + this.cam.screenH / 2;
                ctx.strokeRect(px, py, TILE_SIZE * this.cam.zoom, TILE_SIZE * this.cam.zoom);
            }
        }

        // --- Dibujar background image ---
        const bg = this.currentMap;
        if (!bg) return;
        const offsetX = -this.cam.x * TILE_SIZE * this.cam.zoom + this.cam.screenW / 2;
        const offsetY = -this.cam.y * TILE_SIZE * this.cam.zoom + this.cam.screenH / 2;

        if (bg.backgroundImage && bg.backgroundImage.complete) {
            const mapPxW = bg.w * TILE_SIZE;
            const mapPxH = bg.h * TILE_SIZE;
            ctx.drawImage(bg.backgroundImage, 0, 0, bg.backgroundImage.naturalWidth, bg.backgroundImage.naturalHeight,
                offsetX, offsetY, mapPxW * this.cam.zoom, mapPxH * this.cam.zoom);
        }



        const renderQueue = [];

        // 1. Agregar objetos del mapa
        if (this.currentMap?.objects) {
            for (const obj of this.currentMap.objects) {
                if (obj.icon || (obj.color && obj.color !== '')) {
                    const scale = this.getScale(obj.y);
                    renderQueue.push({
                        type: 'object',
                        ref: obj,
                        sortY: obj.y + obj.h / 2,  // Centro del objeto para sorting
                        scale: scale
                    });
                }
            }
        }
        // 2. Agregar NPCs (excluyendo followers)
        if (this.currentMap?.NPCs) {
            for (const npc of this.currentMap.NPCs) {
                if (npc.isFollower) continue;
                let npcX = npc.x, npcY = npc.y;
                const mapData = npc.MapData?.find(d => d.name === this.currentMap?.name);
                if (mapData) {
                    if (mapData.rendered instanceof Function && mapData.rendered() === false) continue;
                    npcX = mapData.posX;
                    npcY = mapData.posY;
                }
                const scale = this.getScale(npcY);
                renderQueue.push({
                    type: 'npc',
                    ref: npc,
                    sortY: npcY,  // Posición Y para sorting
                    scale: scale
                });
            }
        }
        // 🔧 3. AGREGAR GRUPO JUGADOR + FOLLOWERS (con orden interno por dirección)
        const playerY = this.SelectedCharacter.y;
        const playerScale = this.getScale(playerY);
        const isDown = this.SelectedCharacter.direction.includes("down");

        // Offset mínimo para forzar orden dentro del grupo (0.001 tiles)
        const GROUP_OFFSET = 0.001;

        if (isDown) {
            // 🔽 Dirección DOWN: followers se dibujan PRIMERO (detrás del jugador)
            for (const follower of followers) {
                const scale = this.getScale(follower.y);
                renderQueue.push({
                    type: 'follower',
                    ref: follower,
                    sortY: playerY - GROUP_OFFSET,  // ⬅️ LIGERAMENTE ARRIBA del jugador
                    scale: scale
                });
            }
            // Jugador se dibuja DESPUÉS (encima de followers)
            renderQueue.push({
                type: 'player',
                ref: this.SelectedCharacter,
                sortY: playerY,  // Posición real del jugador
                scale: playerScale
            });
        } else {
            // 🔼/◀️/▶️ Otras direcciones: jugador se dibuja PRIMERO (detrás de followers)
            renderQueue.push({
                type: 'player',
                /**@type {CharacterModel} */ ref: this.SelectedCharacter,
                sortY: playerY,  // Posición real del jugador
                scale: playerScale
            });
            for (const follower of followers) {
                const scale = this.getScale(follower.y);
                renderQueue.push({
                    type: 'follower',
                    ref: follower,
                    sortY: playerY + GROUP_OFFSET,  // ⬅️ LIGERAMENTE ABAJO del jugador
                    scale: scale
                });
            }
        }

        // 🔧 ORDENAR POR sortY (Y-SORTING)
        // Entidades con mayor sortY se dibujan después (encima)
        renderQueue.sort((a, b) => a.sortY - b.sortY);

        // 🔧 DIBUJAR TODO EN ORDEN
        for (const entity of renderQueue) {
            if (entity.type === 'npc' || entity.type === 'player' || entity.type === 'follower') {
                /**@type {CharacterModel} */// @ts-ignore
                const npc = entity.ref
                if (this.currentMap && !npc.isFollower) { // Added null check for currentMap
                    const mapData = npc.MapData?.find(d => d.name === this.currentMap?.name); // Added null check for currentMap
                    if (mapData?.rendered instanceof Function && mapData.rendered() == false) return;
                    if (mapData) {
                        npc.x = mapData.posX;
                        npc.y = mapData.posY;
                    }
                }
                npc.draw(ctx, this.cam, entity.scale);
            } else if (entity.type === 'object') {
                // @ts-ignore
                this.BuildObject(ctx, entity.ref, entity.scale)
            }
        }

        // --- HUD y elementos UI (sin escala de perspectiva) ---
        const Character = this.SelectedCharacter;
        if (this.hud) {
            this.hud.innerText = `Time: Hora: ${vnEngine.TimeSystem.getFormattedHour()} | Día: ${vnEngine.TimeSystem.currentTime.day}
                Pos: ${Character.x.toFixed(2)}, ${Character.y.toFixed(2)}
                Map: ${this.currentMap?.name} • Zoom: ${this.cam.zoom.toFixed(2)}
                Overlaps: ${this.overlaps.size}
                ${this.alertVisible ? '💡 Z para interactuar' : ''}`;
        }

        this._drawMinimap();
        this._drawAlertIcon(ctx);
    }

    getScale = (/** @type {number} */ entityY) => {
        if (!this.currentMap?.usarPerspectiva) return 1;
        const normalizedY = Math.max(0, Math.min(1, entityY / this.currentMap.h));
        return 1 + (normalizedY * this.currentMap.factorPerspectiva);
    };


    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ x: number; zoom: number; screenW: number; y: number; screenH: number; }} cam
     * @param {import("./OpenWordModules/Models.js").BlockObject} obj
     * @param {number} scale
     */
    _drawObjectWithScale(ctx, cam, obj, scale) {
        const px = (obj.x - cam.x) * TILE_SIZE * cam.zoom + cam.screenW / 2;
        const py = (obj.y - cam.y) * TILE_SIZE * cam.zoom + cam.screenH / 2;

        if (obj.icon instanceof Image && obj.icon.complete) {
            const baseW = (obj.iconWidth ?? obj.w * TILE_SIZE) * cam.zoom;
            const baseH = (obj.iconHeight ?? obj.h * TILE_SIZE) * cam.zoom;

            // Aplicar escala
            const drawW = baseW * scale;
            const drawH = baseH * scale;

            // Anclar por la base para que no "floten"
            ctx.drawImage(obj.icon,
                px,
                py - drawH,
                drawW,
                drawH);
        } else if (obj.color && obj.color !== '') {
            ctx.fillStyle = obj.color;
            const drawW = obj.w * TILE_SIZE * cam.zoom * scale;
            const drawH = obj.h * TILE_SIZE * cam.zoom * scale;
            ctx.fillRect(px, py - drawH, drawW, drawH);

            // Highlight si está overlap
            if (this.overlaps.has(obj)) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 / cam.zoom;
                ctx.strokeRect(px, py - drawH, drawW, drawH);
            }
        }
    }

    /**
     * Agrega un NPC al juego. Si el NPC tiene MapData, intenta posicionarlo según el mapa, de lo contrario, lo coloca aleatoriamente.
     * @param {NPC} npc - El objeto NPC a agregar.
     */
    addNPC(npc) {

        // Importante: NO crear una copia superficial, usar el mismo objeto NPC
        // o crear una instancia adecuada que mantenga las referencias a sprites
        const npcInstance = npc;
        npcInstance.isNPC = true;

        // Buscar datos del mapa para este NPC
        let mapData = null;
        if (npc.MapData) {
            mapData = npc.MapData.find(data => data.name === this.currentMap?.name);
        }

        if (mapData && this.currentMap) { // Add null check for currentMap
            // Intentar colocar en la posición especificada
            let finalX = mapData.posX;
            let finalY = mapData.posY;

            // Verificar si la posición está bloqueada y recalcular si es necesario
            if (this.currentMap._isPositionBlocked(finalX, finalY)) {
                const finalPost = this.currentMap._findAlternativePosition(finalX, finalY);
                finalX = finalPost.x;
                finalY = finalPost.y
            }

            npcInstance.x = finalX;
            npcInstance.y = finalY;

            // Asignar la acción si existe
            if (mapData.action) {
                npcInstance.Action = mapData.action;
            }
        } else if (this.currentMap) { // Add null check for currentMap
            // Sin MapData, colocar en posición aleatoria
            const randomPos = this.currentMap._findRandomUnblockedPosition();
            npcInstance.x = randomPos.x;
            npcInstance.y = randomPos.y;
        }
        // @ts-ignore // NPCs property is not defined on GameEngine, likely belongs to GameMap
        this.NPCs.push(npcInstance); // This is likely an error. NPCs should be part of currentMap

        // Inicializar el estado de animación para el NPC
        npcInstance.state = 'idle';
        npcInstance.direction = 'down';
        npcInstance.animFrame = 0;
        npcInstance.animTimer = 0;
    }

    /**
     * Dibuja todos los objetos del mapa en el canvas.
     * @param {CanvasRenderingContext2D} ctx - El contexto de renderizado 2D del canvas.
     * @param {MapObject} mapObject
     * @param {number} scale
     * @private
     */
    BuildObject(ctx, mapObject, scale) {
        if (!this.currentMap) return; // Add null check
        const px = (mapObject.x - this.cam.x) * TILE_SIZE * this.cam.zoom + this.cam.screenW / 2;
        const py = (mapObject.y - this.cam.y) * TILE_SIZE * this.cam.zoom + this.cam.screenH / 2;

        if (mapObject.icon instanceof Image) {
            if (!mapObject.icon.complete || mapObject.icon.naturalWidth === 0) return;

            const baseW = (mapObject.iconWidth ?? mapObject.w * TILE_SIZE) * this.cam.zoom;
            const baseH = (mapObject.iconHeight ?? mapObject.h * TILE_SIZE) * this.cam.zoom;

            // Aplicar escala
            const drawW = baseW * scale;
            const drawH = baseH * scale;

            ctx.drawImage(mapObject.icon, px, py, drawW, drawH);

        } else {
            // Solo dibujar si tiene un color definido

            if (mapObject.color && mapObject.color !== '') {
                ctx.fillStyle = mapObject.color;
                ctx.fillRect(
                    px,
                    py,
                    mapObject.w * TILE_SIZE * this.cam.zoom,
                    mapObject.h * TILE_SIZE * this.cam.zoom
                );

                if (this.overlaps.has(mapObject)) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2 / this.cam.zoom;
                    ctx.strokeRect(
                        px,
                        py,
                        mapObject.w * TILE_SIZE * this.cam.zoom,
                        mapObject.h * TILE_SIZE * this.cam.zoom
                    );
                }
            }
            // Si no hay color, no se dibuja nada → objeto "invisible"
            // ¡Pero sigue existiendo en this.currentMap.objects!
        }
    }


    // Actualizar el minimapa para usar solo posiciones desde MapData
    /**
     * Dibuja el minimapa en el canvas dedicado.
     * @private
     */
    _drawMinimap() {
        const c = /** @type {HTMLCanvasElement | null | undefined} */(this.minimapCanvas);
        const ctx = /** @type {CanvasRenderingContext2D | null | undefined} */(this.minictx);
        if (!c || !ctx || !this.currentMap) return; // Add null checks

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.scale(DPR, DPR);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, c.width / DPR, c.height / DPR);
        const px = (c.width / DPR) / this.currentMap.w;
        const py = (c.height / DPR) / this.currentMap.h;

        // Objetos regulares
        for (const o of this.currentMap.objects) {
            ctx.fillStyle = o.color ?? '#eee';
            ctx.fillRect(o.x * px, o.y * py, o.w * px, o.h * py);
        }

        // NPCs en el minimapa - usando solo posiciones desde MapData
        if (this.currentMap.NPCs) {
            for (const npc of this.currentMap.NPCs) {
                const npcPositionData = this.currentMap._getNPCPosition(npc, this.currentMap);
                ctx.fillStyle = '#ff6b6b'; // Color distintivo para NPCs
                ctx.fillRect(npcPositionData.x * px - 1, npcPositionData.y * py - 1, 2, 2);
            }
        }

        // Jugador
        ctx.fillStyle = '#4af';
        ctx.fillRect(this.SelectedCharacter.x * px - 2, this.SelectedCharacter.y * py - 2, 4, 4);

        const camPW = (this.cam.screenW / TILE_SIZE) / this.cam.zoom;
        const camPH = (this.cam.screenH / TILE_SIZE) / this.cam.zoom;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect((this.cam.x - camPW / 2) * px, (this.cam.y - camPH / 2) * py, camPW * px, camPH * py);
    }

    /**
     * Establece el texto en la caja de estado del HUD.
     * @param {string} text - El texto a mostrar.
     * @private
     */
    _setState(text) {
        const el = this.OpenWorldInstance.shadowRoot?.querySelector('#stateBox');
        if (el) { // Add null check
            // @ts-ignore
            el.innerText = text || '...';
        }
    }

    /**
    * Encuentra el objetivo interactivo (objeto/NPC) MÁS CERCANO al jugador
    * usando distancia al RECTÁNGULO (no solo al punto).
    * @param {number} maxRadius - Radio máximo de búsqueda en tiles
    * @returns {AlertTarget | null}
    * @private
    */
    _findClosestInteractiveTarget(maxRadius) {
        if (!this.currentMap || !this.SelectedCharacter) return null;

        const playerX = this.SelectedCharacter.x;
        const playerY = this.SelectedCharacter.y;
        /**@type {AlertTarget} */
        // @ts-ignore
        let closestTarget = null;
        let closestDist = maxRadius * (this.currentMap.factorPerspectiva + 1);

        // ─── Helper: distancia mínima al rectángulo ───
        const distanceToRect = (/** @type {number} */ px,
            /** @type {number} */ py,
            /** @type {number} */ rx,
            /** @type {number} */ ry,
            /** @type {number} */ rw,
            /** @type {number} */ rh
        ) => {
            const closestX = clamp(px, rx, rx + rw);
            const closestY = clamp(py, ry, ry + rh);
            const dx = px - closestX;
            const dy = py - closestY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        // ─── 1. Buscar en objetos ───
        for (const obj of this.currentMap.objects) {
            if (!obj.Action && !obj.ActionQuestion) continue;

            const dist = distanceToRect(
                playerX, playerY,
                obj.x, obj.y,
                obj.w, obj.h
            );

            if (dist <= maxRadius && dist < closestDist) {
                closestDist = dist;
                closestTarget = {
                    x: obj.x + obj.w / 2,  // Centro visual
                    y: obj.y + obj.h / 2,
                    Action: obj.Action,
                    ActionQuestion: obj.ActionQuestion,
                    isNPC: false,
                    objRef: obj,
                    // @ts-ignore
                    autoTrigger: obj.autoTrigger
                };
            }
        }

        // ─── 2. Buscar en NPCs ───
        if (this.currentMap.NPCs) {
            for (const npc of this.currentMap.NPCs) {
                if (npc.isFollower) {
                    continue
                }
                const mapData = npc.MapData?.find(data => data.name === this.currentMap?.name);
                if (!mapData || (!mapData.action && !mapData.ActionQuestion)) continue;

                const npcPos = this.currentMap._getNPCPosition(npc, this.currentMap);
                const npcWidth = npc.width ?? 1;
                const npcHeight = npc.height ?? 1.5;

                const dist = distanceToRect(
                    playerX, playerY,
                    npcPos.x, npcPos.y,
                    npcWidth, npcHeight
                );

                if (dist <= maxRadius && dist < closestDist) {
                    closestDist = dist;
                    closestTarget = {
                        x: npcPos.x + npcWidth / 2,
                        y: npcPos.y + npcHeight / 2,
                        Action: mapData.action,
                        ActionQuestion: mapData.ActionQuestion,
                        isNPC: true,
                        npcRef: npc,
                        // @ts-ignore
                        autoTrigger: mapData.autoTrigger
                    };
                }
            }
        }

        return closestTarget;
    }

    /**
     * Verifica proximidad para mostrar/ocultar icono de alerta visual
     * @private
     */
    _checkAlertProximity() {
        const target = this._findClosestInteractiveTarget(this.alertRadius);
        this.alertVisible = !!target;
        this.alertTarget = target;

        // ✅ SOLO ejecutar si: 
        //   - Está activo (no en batalla/pausa)
        //   - Tiene autoTrigger explícitamente true (no undefined)
        //   - NO se está ejecutando ya una acción
        if (target?.autoTrigger === true &&
            target.Action &&
            this.active &&
            !this._isActionExecuting) {

            this._isActionExecuting = true; // Flag para evitar triggers múltiples
            this.pause(); // ✅ ¡PAUSAR ANTES DE EJECUTAR!

            try {
                const result = target.Action(this);
                // Reanudar después de acción (con delay para diálogos)
                const resumeAfter = (ms = 0) => {
                    setTimeout(() => {
                        this._isActionExecuting = false;
                        console.log("resume");
                        this.resume();
                    }, ms);
                };

                // @ts-ignore
                if (result instanceof Promise) {
                    result.finally(() => resumeAfter(100));
                } else {
                    resumeAfter(0);
                }
            } catch (err) {
                console.error('Error en auto-trigger', err);
                this._isActionExecuting = false;
                //this.resume();
            }
        }
    }

    // Nuevo método privado
    // Nuevo método: dibujar icono de alerta
    // Método actualizado: dibujar icono de alerta discreto
    /**
     * Dibuja el icono de alerta sobre el personaje cuando hay un objetivo interactivo cercano.
     * @param {CanvasRenderingContext2D} ctx - El contexto de renderizado 2D del canvas.
     * @private
     */
    _drawAlertIcon(ctx) {
        if (!this.alertVisible || !this.SelectedCharacter) return;

        // === 📍 POSICIÓN ===
        const playerPx = (this.SelectedCharacter.x - this.cam.x) * TILE_SIZE * this.cam.zoom + this.cam.screenW / 2;
        const playerPy = (this.SelectedCharacter.y - this.cam.y) * TILE_SIZE * this.cam.zoom + this.cam.screenH / 2;

        const tileHeight = this.SelectedCharacter.tileHeight ?? 1.5;
        const baseDrawH = TILE_SIZE * this.cam.zoom * tileHeight;
        const drawH = TILE_SIZE * this.cam.zoom * tileHeight
        const drawW = drawH * 0.7;

        // Posicionar icono en esquina superior del sprite
        const offsetX = -drawW / 2 + 6 * this.cam.zoom;
        const offsetY = -(drawH + 4 * this.cam.zoom) * this.getScale(playerPy)
        const px = playerPx + offsetX;
        const pyBase = (playerPy + offsetY * 0.45)
        const py = pyBase

        // === 🎨 CONFIGURACIÓN VISUAL ===
        const baseRadius = 8 * this.cam.zoom;
        const pulseSpeed = 0.005;
        const pulseAmount = 0.2;

        // Animación de pulso suave (0.8 → 1.2)
        const pulse = 1 + pulseAmount * Math.sin(Date.now() * pulseSpeed);
        const radius = baseRadius * pulse;

        // Animación de "flotación" vertical sutil
        const floatOffset = 2 * Math.sin(Date.now() * 0.008) * this.cam.zoom;

        // === 1. GLOW EXTERIOR (anillo que pulsa) ===
        ctx.save();
        const glowRadius = radius * 1.8;
        const glowAlpha = 0.4 + 0.2 * Math.sin(Date.now() * 0.01);

        // Gradiente radial para el glow
        const glowGradient = ctx.createRadialGradient(px, py, radius, px, py, glowRadius);
        glowGradient.addColorStop(0, `rgba(255, 215, 0, ${glowAlpha})`);    // Dorado intenso cerca
        glowGradient.addColorStop(0.5, `rgba(255, 215, 0, ${glowAlpha * 0.5})`);
        glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');                // Transparente afuera

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // === 2. CÍRCULO PRINCIPAL (con borde y sombra) ===
        ctx.save();

        // Sombra para profundidad
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4 * this.cam.zoom;
        ctx.shadowOffsetY = 2 * this.cam.zoom;

        // Círculo con gradiente dorado/amarillo
        const mainGradient = ctx.createRadialGradient(
            px - radius * 0.3, py - radius * 0.3, 0,  // Punto de luz
            px, py, radius                             // Radio total
        );
        mainGradient.addColorStop(0, '#fff7cc');  // Casi blanco en el centro
        mainGradient.addColorStop(0.6, '#ffd700'); // Dorado
        mainGradient.addColorStop(1, '#ffb700');   // Dorado oscuro en borde

        ctx.fillStyle = mainGradient;
        ctx.beginPath();
        ctx.arc(px, py + floatOffset, radius, 0, Math.PI * 2);
        ctx.fill();

        // Borde definido
        ctx.strokeStyle = '#b8860b'; // Dorado oscuro
        ctx.lineWidth = 2 * this.cam.zoom;
        ctx.stroke();

        ctx.restore();

        // === 3. ICONO "?" (más visible y con contraste) ===
        ctx.save();
        ctx.translate(px, py + floatOffset);

        // Texto con sombra para legibilidad
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 2 * this.cam.zoom;
        ctx.shadowOffsetY = 1 * this.cam.zoom;

        ctx.fillStyle = '#fff'; // Azul oscuro casi negro (alto contraste)
        ctx.font = `bold ${12 * this.cam.zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 0);

        // Borde blanco sutil alrededor del texto para pop
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5 * this.cam.zoom;
        ctx.strokeText('!', 0, 0);

        ctx.restore();

        // === 4. PUNTOS DECORATIVOS (opcional, da sensación de "activo") ===
        // Tres pequeños puntos que rotan alrededor del icono
        const dotCount = 3;
        const dotRadius = 2 * this.cam.zoom;
        const dotDistance = radius * 1.6;
        const rotation = Date.now() * 0.002;

        ctx.save();
        for (let i = 0; i < dotCount; i++) {
            const angle = (i / dotCount) * Math.PI * 2 + rotation;
            const dotX = px + Math.cos(angle) * dotDistance;
            const dotY = py + floatOffset + Math.sin(angle) * dotDistance;

            const dotAlpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.01 + i);
            ctx.fillStyle = `rgba(255, 215, 0, ${dotAlpha})`;
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    /**
     * Pausa el motor de juego (detiene update loop y limpia estado de entrada)
     * @param {boolean} [clearKeys=true] - Limpiar estado de teclas para evitar "teclas atascadas"
     */
    pause(clearKeys = true) {
        if (!this.active) return; // Ya está pausado

        this.active = false;

        if (clearKeys) {
            this.keys = {}; // ¡CRÍTICO! Evita teclas "atrapadas" al reanudar
        }

        // Opcional: guardar timestamp para cálculo correcto de dt al reanudar
        this._pauseTimestamp = performance.now();
    }

    /**
     * Reanuda el motor de juego
     * @param {boolean} [resetTimestamp=true] - Reiniciar timestamp para evitar dt gigante
     */
    resume(resetTimestamp = true) {
        if (this.active) return; // Ya está activo
        this.keys = {}
        if (resetTimestamp) {
            this.lastTs = 0; // Fuerza reinicio de dt en el próximo frame
        }
        this.active = true;
        requestAnimationFrame(this.update.bind(this));
    }

    _bindFocusHandlers() {
        window.addEventListener('blur', () => {
            if (this.active && !this.battleSystem.isActive) {
                this.pause();
            }
        });

        window.addEventListener('focus', () => {
            this.keys = {};
            this.resume();
        });
    }

    /**
     * @param {CharacterModel} character
     * @param {boolean} [isFullPerspective]
     */
    RegisterCharacter(character, isFullPerspective = this.OpenWorldInstance.Config?.isFullPerspective) {
        if (this.Characters.some(chara => chara == character)) {
            return;
        }
        character.RegisterWordMapCharacter(isFullPerspective)
        this.Characters.push(character);
    }
}
