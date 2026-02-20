//@ts-check
import { CharacterModel } from "../Common/CharacterModel.js";
import { BattleSystem } from "./OpenWordModules/BattleSystem.js";
import { clamp, DPR, OpenWorldEngineView, TILE_SIZE } from "./OpenWorldEngineView.js";
import { Camera } from "./Camera.js";
import { GameMap } from "./OpenWordModules/Models.js";

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
 * @property {function(GameEngine): void | null} [Action] - La función de acción del objetivo.
 * @property {function(GameEngine): (boolean | Promise<boolean>) | null} [ActionQuestion] - La función de pregunta de acción del objetivo.
 * @property {boolean} isNPC - Indica si el objetivo es un NPC.
 * @property {MapObject} [objRef] - Referencia al objeto del mapa (si no es NPC).
 * @property {NPC} [npcRef] - Referencia al NPC (si es NPC).
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
        /** @type {CharacterModel} */
        this.SelectedCharacter = openWorldInstance.Config?.character ?? new CharacterModel();
        /** @type {Camera} */
        this.cam = new Camera(100, 100);
        /** @type {Object.<string, boolean>} */
        this.keys = {};
        /** @type {number} */
        this.lastTs = 0;
        /** @type {Set<MapObject>} */
        this.overlaps = new Set(); // objects currently overlapped  

        /** @type {HTMLElement} */
        // @ts-ignore
        this.hud = this.OpenWorldInstance.shadowRoot?.querySelector('#hud');
        /** @type {HTMLCanvasElement} */

        this.minimapCanvas = this.OpenWorldInstance.MinimapCanvas;
        /** @type {CanvasRenderingContext2D} */
        // @ts-ignore
        this.minictx = this.minimapCanvas?.getContext('2d');
        // Sistema de batalla
        /** @type {BattleSystem} */
        this.battleSystem = new BattleSystem(openWorldInstance);
        // En constructor de GameEngine
        /** @type {number} */
        this.minZoom = 0.4; // valor por defecto
        /** @type {number} */
        this.maxZoom = 2.5; // valor por defecto
        // input
        // En GameEngine.constructor()
        /** @type {boolean} */
        this.active = true;
        this._bindInputs();

        // Sistema de alertas
        /** @type {boolean} */
        this.alertVisible = false;
        /** @type {AlertTarget | null} */
        this.alertTarget = null;
        /** @type {number} */
        this.alertRadius = 0.5;  // Aumentar radio para probar
        /** @type {{x: number, y: number}} */
        this.alertOffset = { x: 0, y: -20 };
    }

    /**
     * Agrega un mapa al diccionario de mapas del motor.
     * @param {GameMap} map - El objeto GameMap a agregar.
     */
    addMap(map) { this.maps[map.name] = map; }

    /**
     * Cambia al mapa especificado y posiciona al personaje. Actualiza la cámara.
     * @param {string} name - El nombre del mapa al que ir.
     * @param {{x: number, y: number}} [pos] - La posición (x, y) opcional para el personaje en el nuevo mapa. Si no se proporciona, usa el spawn del mapa.
     */
    GoToMap(name, pos) {
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

        // reset overlaps y teclas
        this.overlaps.clear();
        this.keys = {}; // 👈 importante para que no "herede" teclas apretadas
        // centrar cámara
        this.cam.x = this.SelectedCharacter.x;
        this.cam.y = this.SelectedCharacter.y;

        // 👇 Actualizar límites de zoom según el mapa
        this.minZoom = 1.2
        console.log(`this.minZoom ${this.minZoom}`);
        this.maxZoom = 10;
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
     * Maneja la acción del usuario (tecla 'z') para interactuar con objetos o NPCs cercanos.
     * @private
     */
    _onActionKey() {
        // Si hay una batalla activa, no procesar otras acciones
        if (this.battleSystem.isActive) return;
        if (!this.currentMap) return; // Add null check for currentMap

        // Primero: objetos regulares
        const tileX = Math.floor(this.SelectedCharacter.x);
        const tileY = Math.floor(this.SelectedCharacter.y);
        for (const mapObject of this.currentMap.objects) {
            if (!mapObject) continue;

            let isNow = mapObject.occupies(tileX, tileY);
            if (!isNow) isNow = mapObject.occupies(tileX + 1, tileY + 1);
            if (!isNow) isNow = mapObject.occupies(tileX - 1, tileY - 1);
            if (!isNow) isNow = mapObject.occupies(tileX, tileY + 1);
            if (!isNow) isNow = mapObject.occupies(tileX, tileY - 1);
            if (!isNow) isNow = mapObject.occupies(tileX - 1, tileY);
            if (!isNow) isNow = mapObject.occupies(tileX + 1, tileY);

            if (!isNow) continue;
            if (mapObject.ActionQuestion) {
                try {
                    const res = mapObject.ActionQuestion(this);
                    if (res instanceof Promise) {
                        res.then(ok => { if (ok && mapObject.Action) mapObject.Action(this); });
                    } else {
                        if (res && mapObject.Action) mapObject.Action(this);
                    }
                } catch (err) { console.error('Error in ActionQuestion', err); }
            } else if (mapObject.Action) {
                mapObject.Action(this);
            }
        }
        // Segundo: NPCs (interacción por proximidad) - usando solo posiciones desde MapData
        if (this.currentMap.NPCs) {
            for (const npc of this.currentMap.NPCs) {
                // 👉 USAR MÉTODO DEL MAPA
                const npcPositionData = this.currentMap._getNPCPosition(npc, this.currentMap);
                const npcTileX = Math.floor(npcPositionData.x);
                const npcTileY = Math.floor(npcPositionData.y);

                // Verificar si el jugador está adyacente al NPC
                const isAdjacent = Math.abs(tileX - npcTileX) <= 1 && Math.abs(tileY - npcTileY) <= 1;

                if (isAdjacent && npcPositionData.action) {
                    try {
                        if (npcPositionData.ActionQuestion) {
                            const res = npcPositionData.ActionQuestion(this);
                            if (res instanceof Promise) {
                                res.then(ok => { if (ok && npcPositionData.action) npcPositionData.action(this); });
                            } else {
                                if (res && npcPositionData.action) npcPositionData.action(this);
                            }
                        } else {
                            npcPositionData.action(this);
                        }
                    } catch (err) { console.error('Error in NPC Action', err); }
                }
            }
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

        // Si hay una batalla activa, no procesar movimiento
        if (!this.battleSystem.isActive) {
            // movement
            // movimiento
            let dx = 0, dy = 0;
            if (this.keys["arrowup"] || this.keys["w"]) { dy = -1; this.SelectedCharacter.direction = "up"; }
            if (this.keys["arrowdown"] || this.keys["s"]) { dy = 1; this.SelectedCharacter.direction = "down"; }
            if (this.keys["arrowleft"] || this.keys["a"]) { dx = -1; this.SelectedCharacter.direction = "left"; }
            if (this.keys["arrowright"] || this.keys["d"]) { dx = 1; this.SelectedCharacter.direction = "right"; }

            if (dx !== 0 && dy !== 0) { const inv = 1 / Math.sqrt(2); dx *= inv; dy *= inv; }

            const moving = (dx || dy) !== 0;
            this.SelectedCharacter.updateAnimation(dt, moving);
            if (dx || dy) {
                const sp = this.SelectedCharacter.speed * dt;
                const nx = this.SelectedCharacter.x + dx * sp;
                const ny = this.SelectedCharacter.y + dy * sp;
                // simple collision: check destination tile
                if (!this.currentMap.isBlocked(Math.floor(nx), Math.floor(ny))) {
                    this.SelectedCharacter.x = nx; this.SelectedCharacter.y = ny;
                }
            }

            // overlap detection: onEnter triggers
            const tileX = Math.floor(this.SelectedCharacter.x);
            const tileY = Math.floor(this.SelectedCharacter.y);
            // 👇 NUEVO: Verificar proximidad para alertas
            this._checkAlertProximity();
        }

        // camera follow
        this.cam.follow(this.SelectedCharacter, this.currentMap);

        // draw
        this.draw();
        requestAnimationFrame(this.update.bind(this));
    }

    /**
     * Intenta activar una acción para un objeto si no se ha activado recientemente.
     * @param {MapObject} o - El objeto del mapa.
     * @param {number} [ts] - Marca de tiempo opcional para el debounce.
     * @private
     */
    _tryTrigger(o, ts) {
        const now = ts || performance.now();
        if (now - (o._lastTriggered || 0) < 300) return; // tiny debounce
        o._lastTriggered = now;
        if (o.Action) o.Action(this);
    }

    /**
     * Dibuja todos los elementos del juego en el canvas (fondo, cuadrícula, objetos, NPCs, jugador, HUD, minimapa, alertas).
     */
    draw() {
        const canvas = /** @type {HTMLCanvasElement | null | undefined} */(this.OpenWorldInstance.shadowRoot?.querySelector('#view'));
        if (!canvas) return; // Add null check for canvas

        const ctx = /** @type {CanvasRenderingContext2D | null | undefined} */(canvas.getContext('2d'));
        if (!ctx) return; // Add null check for ctx

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(DPR, DPR);

        // background
        ctx.fillStyle = this.currentMap?.bgColor;
        ctx.fillRect(0, 0, this.cam.screenW, this.cam.screenH);

        // grid (optional subtle)
        const leftTile = Math.floor(this.cam.x - (this.cam.screenW / TILE_SIZE) / (2 * this.cam.zoom)) - 1;
        const rightTile = Math.ceil(this.cam.x + (this.cam.screenW / TILE_SIZE) / (2 * this.cam.zoom)) + 1;
        const topTile = Math.floor(this.cam.y - (this.cam.screenH / TILE_SIZE) / (2 * this.cam.zoom)) - 1;
        const bottomTile = Math.ceil(this.cam.y + (this.cam.screenH / TILE_SIZE) / (2 * this.cam.zoom)) + 1;
        ctx.lineWidth = 1 / this.cam.zoom; ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        for (let tx = leftTile; tx <= rightTile; tx++) {
            for (let ty = topTile; ty <= bottomTile; ty++) {
                if (!this.currentMap) continue; // Added null check for currentMap
                if (tx < 0 || ty < 0 || tx >= this.currentMap.w || ty >= this.currentMap.h) continue;
                const px = (tx - this.cam.x) * TILE_SIZE * this.cam.zoom + this.cam.screenW / 2;
                const py = (ty - this.cam.y) * TILE_SIZE * this.cam.zoom + this.cam.screenH / 2;
                ctx.strokeRect(px, py, TILE_SIZE * this.cam.zoom, TILE_SIZE * this.cam.zoom);
            }
        }

        const bg = this.currentMap;
        if (!bg) return; // Add null check for bg

        // Dentro de draw(), justo antes de dibujar el fondo:
        const offsetX = -this.cam.x * TILE_SIZE * this.cam.zoom + this.cam.screenW / 2;
        const offsetY = -this.cam.y * TILE_SIZE * this.cam.zoom + this.cam.screenH / 2;
        // Dibujar fondo
        if (bg.backgroundImage && bg.backgroundImage.complete) {
            const mapPxW = bg.w * TILE_SIZE;
            const mapPxH = bg.h * TILE_SIZE;

            ctx.drawImage(
                bg.backgroundImage,
                0, 0,
                bg.backgroundImage.naturalWidth, bg.backgroundImage.naturalHeight,
                offsetX, offsetY,                 // 👈 posición relativa a la cámara
                mapPxW * this.cam.zoom,
                mapPxH * this.cam.zoom
            );
        } else {
            ctx.fillStyle = bg.bgColor;
            ctx.fillRect(0, 0, this.cam.screenW, this.cam.screenH);
        }

        // objects
        this.BuildObjects(ctx);

        // NPCs (dibujados después para que aparezcan encima de los objetos)
        this.BuildNPCs(ctx);

        // player
        const Character = this.SelectedCharacter;
        const ppx = (Character.x - this.cam.x) * TILE_SIZE * this.cam.zoom + this.cam.screenW / 2;
        const ppy = (Character.y - this.cam.y) * TILE_SIZE * this.cam.zoom + this.cam.screenH / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(ppx, ppy, 12 * this.cam.zoom, 0, Math.PI * 2);
        ctx.fill();
        this.SelectedCharacter.draw(ctx, this.cam);
        // HUD text
        if (this.hud) { // Add null check for hud
            this.hud.innerText = `Pos: ${Character.x.toFixed(2)}, ${Character.y.toFixed(2)}
                        Map: ${this.currentMap?.name} • Zoom: ${this.cam.zoom.toFixed(2)}
                        Overlaps: ${this.overlaps.size}`;
        }
        // minimap
        this._drawMinimap();

        // 👉 NUEVO: Dibujar alerta ÚLTIMO (encima de todo)
        this._drawAlertIcon(ctx);

        // HUD text (ya existe)
        if (this.hud) { // Add null check for hud
            this.hud.innerText = `Pos: ${Character.x.toFixed(2)}, ${Character.y.toFixed(2)}
                    Map: ${this.currentMap?.name} • Zoom: ${this.cam.zoom.toFixed(2)}
                    Overlaps: ${this.overlaps.size}
                    ${this.alertVisible ? '💡 Z para interactuar' : ''}`;
        }
    }

    // Método BuildNPCs actualizado - usa solo MapData, nunca las propiedades x/y del personaje
    // En GameEngine.js - método BuildNPCs() actualizado
    /**
     * Dibuja todos los NPCs en el canvas.
     * @param {CanvasRenderingContext2D} ctx - El contexto de renderizado 2D del canvas.
     * @private
     */
    BuildNPCs(ctx) {
        if (!this.currentMap?.NPCs) return;

        for (const npc of this.currentMap.NPCs) {
            // Obtener posición desde MapData
            let npcX = npc.x, npcY = npc.y; // Fallback to npc.x/y if MapData not found/valid
            if (this.currentMap) { // Added null check for currentMap
                const mapData = npc.MapData?.find(d => d.name === this.currentMap?.name); // Added null check for currentMap
                if (mapData) {
                    npcX = mapData.posX;
                    npcY = mapData.posY;
                }
            }

            // Verificar que el NPC tenga sprites cargados
            if (!npc.Sprites || !npc.Sprites.idle || !npc.Sprites.idle.down) {
                // Dibujar círculo de respaldo centrado en el tile
                const px = (npcX - this.cam.x) * TILE_SIZE * this.cam.zoom + this.cam.screenW / 2;
                const py = (npcY - this.cam.y) * TILE_SIZE * this.cam.zoom + this.cam.screenH / 2;
                ctx.fillStyle = '#ff6b6b';
                ctx.beginPath();
                ctx.arc(px, py, 8 * this.cam.zoom, 0, Math.PI * 2);
                ctx.fill();
                continue;
            }
            

            // Estado y dirección actual
            const currentState = npc.state || 'idle';
            const currentDirection = npc.direction || 'down';

            if (npc.Sprites[currentState] && npc.Sprites[currentState][currentDirection]) {
                const spriteList = npc.Sprites[currentState][currentDirection];
                const animFrame = npc.animFrame || 0;
                
                if (spriteList[animFrame]) {
                    const img = spriteList[animFrame];
                    if (img && img.complete && img.naturalWidth > 0) {
                        // Posición del centro del tile en pantalla
                        const px = (npcX - this.cam.x) * TILE_SIZE * this.cam.zoom + this.cam.screenW / 2;
                        const py = (npcY - this.cam.y) * TILE_SIZE * this.cam.zoom + this.cam.screenH / 2;

                        const tileHeight = npc.tileHeight ?? 1.5;
                        const drawH = TILE_SIZE * this.cam.zoom * tileHeight;
                        const aspect = img.naturalWidth / img.naturalHeight;
                        const drawW = drawH * aspect;


                        ctx.fillStyle = 'rgba(0,0,0,0.3)';
                        ctx.beginPath();
                        ctx.arc(
                            px + drawW / 6,
                            py + drawH - 5,                              
                            13 * this.cam.zoom,
                            0, 
                            Math.PI * 2);
                        ctx.fill();

                        // ✅ CENTRADO: Restar la mitad de las dimensiones para alinear el centro de la imagen con (px, py)
                        ctx.drawImage(
                            img,
                            px - drawW / 3,  // ← Centro horizontal (equivalente a translateX(-50%))
                            py,  // ← Centro vertical
                            drawW,
                            drawH
                        );
                    }
                }
            }
        }
    }
    // Método auxiliar para dibujar punto básico de NPC
    /**
     * Dibuja un punto básico para un NPC en el minimapa.
     * @param {{x: number, y: number}} npcPosition - La posición del NPC.
     * @param {CanvasRenderingContext2D} ctx - El contexto de renderizado 2D del canvas.
     * @private
     */
    BasicNpcPoint(npcPosition, ctx) {
        const px = (npcPosition.x - this.cam.x) * TILE_SIZE * this.cam.zoom + this.cam.screenW / 2;
        const py = (npcPosition.y - this.cam.y) * TILE_SIZE * this.cam.zoom + this.cam.screenH / 2;
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(px, py, 8 * this.cam.zoom, 0, Math.PI * 2);
        ctx.fill();
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
            // @ts-ignore // this.name is not defined in GameEngine
            mapData = npc.MapData.find(data => data.name === this.name);
        }

        if (mapData && this.currentMap) { // Add null check for currentMap
            // Intentar colocar en la posición especificada
            let finalX = mapData.posX;
            let finalY = mapData.posY;

            // Verificar si la posición está bloqueada y recalcular si es necesario
            if (this.currentMap._isPositionBlocked(finalX, finalY)) {
                finalX = this.currentMap._findAlternativePosition(finalX, finalY);
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
     * @private
     */
    BuildObjects(ctx) {
        if (!this.currentMap) return; // Add null check
        for (const mapObject of this.currentMap.objects) {
            const px = (mapObject.x - this.cam.x) * TILE_SIZE * this.cam.zoom + this.cam.screenW / 2;
            const py = (mapObject.y - this.cam.y) * TILE_SIZE * this.cam.zoom + this.cam.screenH / 2;

            if (mapObject.icon instanceof Image) {
                if (!mapObject.icon.complete || mapObject.icon.naturalWidth === 0) continue;

                const w = (mapObject.iconWidth ?? mapObject.w * TILE_SIZE) * this.cam.zoom;
                const h = (mapObject.iconHeight ?? mapObject.h * TILE_SIZE) * this.cam.zoom;

                ctx.drawImage(mapObject.icon, px, py, w, h);

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
        ctx.fillStyle = '#0b0b0b';
        ctx.fillRect(0, 0, c.width / DPR, c.height / DPR);
        const px = (c.width / DPR) / this.currentMap.w;
        const py = (c.height / DPR) / this.currentMap.h;

        // Objetos regulares
        for (const o of this.currentMap.objects) {
            ctx.fillStyle = o.color;
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
    // En GameEngine.js - nuevo método
    // Nuevo método: verificar objetos/NPCs interactivos cercanos
    /**
     * Verifica la proximidad del personaje a objetos o NPCs interactivos y actualiza el estado de la alerta.
     * @private
     */
    /**
     * Verifica la proximidad del personaje a objetos o NPCs interactivos y actualiza el estado de la alerta.
     * @private
     */
    _checkAlertProximity() {
        if (!this.currentMap || !this.SelectedCharacter) {
            this.alertVisible = false;
            return;
        }

        const playerX = this.SelectedCharacter.x;
        const playerY = this.SelectedCharacter.y;
        let closestTarget = null;
        let closestDist = this.alertRadius;

        // ────────────────────────────────────────────────────────────────
        // 1. Helper: distancia desde jugador al rectángulo MÁS CERCANO
        // ────────────────────────────────────────────────────────────────
        /**
         * Calcula distancia mínima desde (px, py) al rectángulo (rx, ry, rw, rh)
         * @param {number} px
         * @param {number} py
         * @param {number} rx
         * @param {number} ry
         * @param {number} rw
         * @param {number} rh
         * @returns {number}
         */
        const distanceToRect = (px, py, rx, ry, rw, rh) => {
            // Punto más cercano en el rectángulo al jugador
            const closestX = clamp(px, rx, rx + rw);
            const closestY = clamp(py, ry, ry + rh);

            // Distancia euclidiana al punto más cercano
            const dx = px - closestX;
            const dy = py - closestY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        // ────────────────────────────────────────────────────────────────
        // 2. Verificar BlockObjects con Action/ActionQuestion
        // ────────────────────────────────────────────────────────────────
        for (const obj of this.currentMap.objects) {
            if (obj.Action || obj.ActionQuestion) {
                // Calcular distancia al RECTÁNGULO del objeto (no solo a su esquina)
                const dist = distanceToRect(
                    playerX,
                    playerY,
                    obj.x,
                    obj.y,
                    obj.w,   // ancho del objeto
                    obj.h    // alto del objeto
                );

                if (dist <= this.alertRadius && dist < closestDist) {
                    closestDist = dist;
                    closestTarget = {
                        x: obj.x + obj.w / 2,  // Centro visual para posición de alerta
                        y: obj.y + obj.h / 2,
                        Action: obj.Action,
                        ActionQuestion: obj.ActionQuestion,
                        isNPC: false,
                        objRef: obj
                    };
                }
            }
        }

        // ────────────────────────────────────────────────────────────────
        // 3. Verificar NPCs con acciones en MapData
        // ────────────────────────────────────────────────────────────────
        if (this.currentMap.NPCs) {
            for (const npc of this.currentMap.NPCs) {
                const mapData = npc.MapData?.find(data => data.name === this.currentMap?.name);
                if (mapData && (mapData.action || mapData.ActionQuestion)) {
                    // Obtener posición actual del NPC (usando MapData)
                    const npcPos = this.currentMap._getNPCPosition(npc, this.currentMap);

                    // Dimensiones del NPC (por defecto 1 tile de ancho, 1.5 de alto)
                    const npcWidth = npc.width ?? 1;
                    const npcHeight = npc.height ?? 1.5;

                    // Calcular distancia al RECTÁNGULO del NPC
                    const dist = distanceToRect(
                        playerX,
                        playerY,
                        npcPos.x,
                        npcPos.y,
                        npcWidth,
                        npcHeight
                    );

                    if (dist <= this.alertRadius && dist < closestDist) {
                        closestDist = dist;
                        closestTarget = {
                            x: npcPos.x + npcWidth / 2,  // Centro visual
                            y: npcPos.y + npcHeight / 2,
                            Action: mapData.action,
                            ActionQuestion: mapData.ActionQuestion,
                            isNPC: true,
                            npcRef: npc
                        };
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────────────
        // 4. Actualizar estado de alerta
        // ────────────────────────────────────────────────────────────────
        this.alertVisible = !!closestTarget;
        this.alertTarget = closestTarget;
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

        // Calcular posición del jugador en pantalla
        const playerPx = (this.SelectedCharacter.x - this.cam.x) * TILE_SIZE * this.cam.zoom + this.cam.screenW / 2;
        const playerPy = (this.SelectedCharacter.y - this.cam.y) * TILE_SIZE * this.cam.zoom + this.cam.screenH / 2;

        // Calcular tamaño del sprite del jugador
        const tileHeight = this.SelectedCharacter.tileHeight ?? 1.5;
        const drawH = TILE_SIZE * this.cam.zoom * tileHeight;
        const drawW = drawH * 0.7; // Asumiendo aspect ratio aproximado

        // Posicionar icono en esquina superior izquierda del sprite
        // Offset adicional para que no quede pegado al sprite
        const offsetX = -drawW / 2 + 4 * this.cam.zoom;
        const offsetY = -drawH + 2 * this.cam.zoom;

        const px = playerPx + offsetX;
        const py = playerPy + (offsetY / 2);

        // Círculo blanco discreto
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(px, py, 6 * this.cam.zoom, 0, Math.PI * 2);
        ctx.fill();

        // Borde gris ligero
        ctx.strokeStyle = 'rgba(180, 180, 180, 0.7)';
        ctx.lineWidth = 1.5 * this.cam.zoom;
        ctx.stroke();

        // Signo de interrogación pequeño y sutil
        ctx.fillStyle = 'rgba(60, 60, 60, 0.9)';
        ctx.font = `bold ${10 * this.cam.zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', px, py);

        // Efecto de parpadeo muy sutil
        const pulse = 0.08 * Math.sin(Date.now() / 200);
        ctx.globalAlpha = 0.7 + pulse;
        ctx.globalAlpha = 1.0;
    }
}
