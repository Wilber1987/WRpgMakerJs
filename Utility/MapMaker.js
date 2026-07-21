//@ts-check

import { html } from "../Core/WDevCore/WModules/WComponentsTools.js";
import { css } from "../Core/WDevCore/WModules/WStyledRender.js";

// ============================================
// 🎮 ESTADO GLOBAL
// ============================================


// ============================================
// 📦 CATÁLOGO
// ============================================
const SpriteCatalog = {
    npcs: [
        { id: 'npc_villager', name: 'Aldeano', type: 'npc', icon: '👤', code: 'VillagerNPC' },
        { id: 'npc_merchant', name: 'Mercader', type: 'npc', icon: '🧑‍💼', code: 'MerchantNPC' },
        { id: 'npc_guard', name: 'Guardia', type: 'npc', icon: '🛡️', code: 'GuardNPC' }
    ],
    objects: [
        { id: 'obj_chest', name: 'Cofre', type: 'object', icon: '📦', code: 'ChestObject' },
        { id: 'obj_door', name: 'Puerta', type: 'object', icon: '🚪', code: 'DoorObject' },
        { id: 'obj_sign', name: 'Letrero', type: 'object', icon: '🪧', code: 'SignObject' }
    ],
    decor: [
        { id: 'dec_bush', name: 'Arbusto', type: 'decor', icon: '🌿', code: 'BushDecor' },
        { id: 'dec_tree', name: 'Árbol', type: 'decor', icon: '🌳', code: 'TreeDecor' },
        { id: 'dec_rock', name: 'Roca', type: 'decor', icon: '🪨', code: 'RockDecor' }
    ],
    triggers: [
        { id: 'trg_teleport', name: 'Teletransporte', type: 'trigger', icon: '🌀', code: 'TeleportTrigger' },
        { id: 'trg_dialog', name: 'Diálogo', type: 'trigger', icon: '💬', code: 'DialogTrigger' }
    ],
    invisible: [
        { id: 'inv_trigger', name: 'Trigger Invisible', type: 'invisible', icon: '👻', code: 'InvisibleTrigger', isInvisible: true }
    ],
    getAll() { return [...this.npcs, ...this.objects, ...this.decor, ...this.triggers, ...this.invisible]; },
    /**
     * @param {string} t
     */
    // @ts-ignore
    getByType(t) { return t === 'all' ? this.getAll() : (this[t + 's'] || []); },
    /**
     * @param {string} id
     */
    getById(id) { return this.getAll().find(s => s.id === id); },
    /**
     * @param {string} type
     * @param {{ id: any; name: any; icon: any; code: any; isInvisible: any; }} config
     */
    addSprite(type, config) {
        // @ts-ignore
        if (!this[type + 's']) this[type + 's'] = [];
        const s = { id: config.id || `custom_${Date.now()}`, name: config.name || 'Nuevo', type, icon: config.icon || '❓', code: config.code || 'CustomSprite', custom: true, ...(config.isInvisible && { isInvisible: true }) };
        // @ts-ignore
        this[type + 's'].push(s); return s;
    }
};
// Estado para drag-to-paint (independiente del drag de elementos)
const PaintState = {
    isPainting: false,
    paintButton: 0,        // 0 = izquierdo (pintar), 2 = derecho (borrar)
    lastPaintedCell: null,
    paintSize: { w: 1, h: 1 }  // Tamaño a pintar (usa placeWidth/placeHeight por defecto)
};

/**
 * @type {{ height: number; width: number; x: number; y: number; id: any; } | null}
 */
let currentActionElement = null;
// Drag & Drop desde catálogo
/**
 * @type {{ icon: any; name: any; id: any; type: any; } | null}
 */
let draggedSprite = null;


export class MapMaker extends HTMLElement {
    /**
     * @typedef {Object} ComponentsConfig 
        * @property {Function} [portalAction] 
        * @property {Blob | undefined} [file] 
    **/
    /**
    * @param {ComponentsConfig} Config 
    */
    constructor(Config) {
        super();
        this.init = false
        /**
         * @type {((arg0: HTMLTableCellElement, arg1: this) => void) | null}
         */
        this.CellAction = null;
        this.PortalAction = Config.portalAction
        /**@type {HTMLInputElement} */
        // @ts-ignore
        this.mapNameInput = html`<input type="text" id="mapName" value="city">`

        this.File = Config.file;
        // @ts-ignore
        this.FileInput = html`<input type="file" id="backgroundImage" accept="image/*">`

        this.Draw();
    }
    connectedCallback() {
        if (!this.init) {
            this.initControls();
            this.initCatalog();
            this.initGrid();
            this.initDragAndDrop();
            this.initElementDrag();
            this.initResizeHandles(); this.initZoom();
            this.initModal();
            this.initPerspectivePreview();
            this.initPropertiesPanel();
            this.initPaintEvents();
            this.updatePerspectivePreview();
            this.generateCode();
            this.init = true;
            this.AppState.mapName = this.id;
            this.mapNameInput.value = this.id;
        }

    }
    Draw = async () => {
        this.BuildContent();
    }
    update() {
        this.Draw();
    }
    BuildContent() {
        this.innerHTML = "";
        this.append(this.CustomStyle);
        this.Content = html`<div class= "content"><div class="container">
        <aside class="sidebar">
            <div class="panel">
                <h3>⚙️ Mapa</h3>
                <div class="control-group">
                    <label for="mapName">Nombre:</label>
                    ${this.mapNameInput}
                </div>
                <div class="control-row">
                    <div class="control-group">
                        <label for="gridWidth">Ancho:</label>
                        <input type="number" id="gridWidth" min="5" max="300" value="48">
                    </div>
                    <div class="control-group">
                        <label for="gridHeight">Alto:</label>
                        <input type="number" id="gridHeight" min="5" max="300" value="27">
                    </div>
                </div>
                <div class="control-row">
                    <div class="control-group">
                        <label for="cellSize">Celda (px):</label>
                        <input type="number" id="cellSize" min="20" max="80" value="40">
                    </div>
                    <div class="control-group">
                        <label for="tileHeight">TileHeight NPC:</label>
                        <input type="number" id="tileHeight" min="1" max="10" value="3">
                    </div>
                </div>
                <button class="btn" id="generateGridBtn">🔄 Regenerar</button>
                <button class="btn btn-danger" id="clearGridBtn">🗑️ Limpiar Todo</button>
            </div>
            <div class="panel">
                <h3>🖼️ Fondo</h3>
                <div class="control-group">
                    <label for="backgroundImage">Imagen:</label>
                    ${this.FileInput}
                </div>
                <div class="control-group">
                    <label for="bgPath">Ruta export:</label>
                    <input type="text" id="bgPath" placeholder="/Media/assets/Maps/...">
                </div>
            </div>
            <div class="panel">
                <h3>🎮 Herramientas</h3>
                <button class="tool-btn active" data-tool="place">📍 Colocar</button>
                <button class="tool-btn" data-tool="select">✋ Seleccionar</button>
                <button class="tool-btn" data-tool="resize">📐 Redimensionar</button>
                <button class="tool-btn" data-tool="erase">🧹 Borrar</button>
                <button class="tool-btn" data-tool="invisible">👻 Invisible</button>
            </div>
            <div class="panel perspective-config">
                <h3>📐 Perspectiva</h3>
                <div class="control-row">
                    <div class="control-group">
                        <label>minScale:</label>
                        <input type="number" id="minScale" min="0.1" max="1" step="0.1" value="0.7">
                    </div>
                    <div class="control-group">
                        <label>factor:</label>
                        <input type="number" id="factorPersp" min="0" max="5" step="0.5" value="3">
                    </div>
                </div>
                <div class="perspective-preview">
                    <strong>📏 Fórmula:</strong>
                    <code>scale = min + (y/H * ((1+factor) - min))</code>
                    <div style="margin-top:6px">
                        <strong>Ejemplo Y=<span id="previewY">13</span>:</strong><br>
                        Alto NPC (<span id="previewTileHeight">3</span> tiles): <span id="previewScale">1.00</span>x |
                        Alto NPC: <strong id="previewEffectiveHeight">3.00</strong> tiles
                    </div>
                </div>
            </div>
            <div class="legend">
                <div class="legend-item">
                    <div class="legend-color npc"></div> NPC
                </div>
                <div class="legend-item">
                    <div class="legend-color object"></div> Objeto
                </div>
                <div class="legend-item">
                    <div class="legend-color decor"></div> Decoración
                </div>
                <div class="legend-item">
                    <div class="legend-color selected"></div> Seleccionado
                </div>
            </div>
        </aside>

        <main class="main-area">
            <div class="toolbar">
                <span id="mapInfo" style="font-weight:600;color:#2c3e50;font-size:13px;"></span>
                <div class="zoom-controls">
                    <button class="tool-btn" id="zoomOut">−</button>
                    <span class="zoom-level" id="zoomLevel">100%</span>
                    <button class="tool-btn" id="zoomIn">+</button>
                    <button class="tool-btn" id="zoomReset">⟲</button>
                </div>
            </div>
            <div class="grid-container-viewer">
                <div id="gridContainer" class="grid-container"></div>
            </div>
        </main>

        <aside class="sidebar">
            <div class="sprite-catalog">
                <div class="catalog-header">
                    <h3>📦 Catálogo</h3>
                    <button class="btn btn-sm" id="addSpriteBtn">+ Nuevo</button>
                </div>
                <div class="catalog-filters">
                    <button class="filter-btn active" data-filter="all">Todos</button>
                    <button class="filter-btn" data-filter="npc">👤</button>
                    <button class="filter-btn" data-filter="object">📦</button>
                    <button class="filter-btn" data-filter="decor">🌿</button>
                </div>
                <div class="size-selector">
                    <label>Tamaño:</label>
                    <input type="number" id="placeWidth" min="1" max="20" value="1">
                    <span>×</span>
                    <input type="number" id="placeHeight" min="1" max="20" value="1">
                    <button class="btn btn-sm btn-warning" id="applySize">✓</button>
                </div>
                <div class="sprite-grid" id="spriteCatalog"></div>
            </div>
            <div class="properties-panel" id="propertiesPanel">
                <h4>🔧 Propiedades</h4>
                <div class="prop-row">
                    <label>Posición:</label>
                    <span class="prop-value" id="propPosition">(0, 0)</span>
                </div>
                <div class="prop-row">
                    <label>Tamaño:</label>
                    <input type="number" id="propWidth" min="1" max="50" value="1">
                    <span>×</span>
                    <input type="number" id="propHeight" min="1" max="50" value="1">
                    <button class="btn btn-sm" id="applyPropSize">Aplicar</button>
                </div>
                <div class="prop-row"><label>Ancla:</label></div>
                <div class="anchor-selector" id="anchorSelector">
                    <button class="anchor-btn" data-anchor="nw">↖</button>
                    <button class="anchor-btn" data-anchor="n">↑</button>
                    <button class="anchor-btn" data-anchor="ne">↗</button>
                    <button class="anchor-btn" data-anchor="w">←</button>
                    <button class="anchor-btn active" data-anchor="center">◉</button>
                    <button class="anchor-btn" data-anchor="e">→</button>
                    <button class="anchor-btn" data-anchor="sw">↙</button>
                    <button class="anchor-btn" data-anchor="s">↓</button>
                    <button class="anchor-btn" data-anchor="se">↘</button>
                </div>
                <button class="btn btn-danger btn-sm" id="deleteSelected">🗑️ Eliminar</button>
            </div>
            <div class="placed-items">
                <h4 style="margin-bottom:8px;color:#2c3e50;font-size:13px;">📋 En mapa: <span id="placedCount">0</span>
                </h4>
                <div id="placedList"></div>
            </div>
            <div class="output-container">
                <div class="output-header">
                    <h3>💻 Código</h3>
                    <div class="output-actions">
                        <button class="btn btn-purple btn-sm" id="copyBtn">📋</button>
                        <button class="btn btn-success btn-sm" id="downloadBtn">💾</button>
                        <button class="btn btn-sm" id="copyActionsBtn">⚡</button>
                    </div>
                </div>
                <textarea id="output" readonly placeholder="// El código se generará automáticamente..."></textarea>
            </div>
        </aside>
    </div>
    <div class="modal" id="actionModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>⚡ Configurar Acción</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group"><label>Posición:</label><input type="text" id="actionPosition" readonly></div>
                <div class="form-group"><label>Tamaño:</label><input type="text" id="actionSize" readonly></div>
                <div class="form-group">
                    <label>Tipo:</label>
                    <select id="actionType">
                        <option value="dialog">💬 Diálogo</option>
                        <option value="teleport">🌀 Teletransporte</option>
                        <option value="custom">⚙️ Código</option>
                    </select>
                </div>
                <div class="form-group" id="actionDialogGroup"><label>ID diálogo:</label><input type="text"
                        id="actionDialogId"></div>
                <div class="form-group" id="actionTeleportGroup" style="display:none;">
                    <label>Mapa:</label><input type="text" id="actionTargetMap">
                    <div class="control-row"><input type="number" id="actionTargetX" placeholder="X"><input
                            type="number" id="actionTargetY" placeholder="Y"></div>
                </div>
                <div class="form-group" id="actionCustomGroup" style="display:none;"><label>Código:</label><textarea
                        id="actionCustomCode"></textarea></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-danger" id="actionRemoveBtn">🗑️ Quitar</button>
                <button class="btn" id="actionCancelBtn">Cancelar</button>
                <button class="btn btn-success" id="actionSaveBtn">✅ Guardar</button>
            </div>
        </div>
    </div>
    <div class="drag-preview" id="dragPreview" style="display:none;">
        <div class="sprite-preview" id="dragPreviewIcon">👤</div>
        <div class="sprite-name" id="dragPreviewName">NPC</div>
        <div class="size-info" id="dragPreviewSize">1×1</div>
    </div>
    <div class="scale-preview" id="scalePreview" style="display:none;">
        <strong>📊 Escala</strong><br>
        Y: <span id="spY">0</span> | Escala: <strong id="spScale">1.00</strong>x<br>
        Alto NPC: <strong id="spHeight">3.00</strong> tiles
        <div class="formula" id="spFormula">scale = ...</div>
    </div>
    <!-- ✅ CORREGIDO: Elemento resize-preview garantizado en DOM -->
    <div class="resize-preview" id="resizePreview" style="display:none;">
        <div class="preview-size" id="resizePreviewSize">1×1</div>
    </div></div>`
        this.append(this.Content);
    }
    //            document.addEventListener('DOMContentLoaded', () => {
    //     initControls(); initCatalog(); initGrid(); initDragAndDrop();
    //     initElementDrag(); initResizeHandles(); initZoom(); initModal();
    //     initPerspectivePreview(); initPropertiesPanel();
    //     initPaintEvents();
    //     updatePerspectivePreview(); generateCode();
    // });

    initControls = () => {
        ['mapName', 'gridWidth', 'gridHeight', 'cellSize', 'tileHeight', 'minScale', 'factorPersp', 'bgPath'].forEach(id => {
            const el = this.querySelector("#" + id); if (el) el.addEventListener('change', this.updateConfig);
        });
        this.querySelector('#generateGridBtn')?.addEventListener('click', () => { this.updateConfig(); this.renderGrid(); });
        this.querySelector('#clearGridBtn')?.addEventListener('click', this.clearGrid);
        this.querySelector('#backgroundImage')?.addEventListener('change', this.handleBackgroundUpload);

        document.querySelectorAll('.tool-btn[data-tool]')?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn[data-tool]')?.forEach(b => b.classList.remove('active'));
                // @ts-ignore
                e.currentTarget.classList.add('active');
                // @ts-ignore
                this.AppState.currentTool = e.currentTarget.dataset.tool;
                if (this.AppState.currentTool !== 'select' && this.AppState.currentTool !== 'resize') this.deselectElement();
            });
        });

        ['placeWidth', 'placeHeight'].forEach(id => {
            this.querySelector(`#${id}`)?.addEventListener('change', (e) => {
                // @ts-ignore
                const v = Math.max(1, Math.min(50, parseInt(e.target.value) || 1)); e.target.value = v;
                if (id === 'placeWidth') this.AppState.placeWidth = v; else this.AppState.placeHeight = v;
                this.updateDragPreviewSize();
            });
        });
        this.querySelector('#applySize')?.addEventListener('click', () => this.showToast(`📐 Tamaño: ${this.AppState.placeWidth}×${this.AppState.placeHeight}`));
        this.querySelector('#copyBtn')?.addEventListener('click', this.copyCode);
        this.querySelector('#downloadBtn')?.addEventListener('click', this.downloadCode);
        this.querySelector('#copyActionsBtn')?.addEventListener('click', this.copyActionsOnly);

    }

    updateConfig = () => {
        // @ts-ignore
        this.AppState.mapName = this.querySelector('#mapName')?.value.trim() || 'city';
        // @ts-ignore
        this.AppState.gridWidth = parseInt(this.querySelector('#gridWidth')?.value) || 48;
        // @ts-ignore
        this.AppState.gridHeight = parseInt(this.querySelector('#gridHeight')?.value) || 27;
        // @ts-ignore
        this.AppState.cellSize = parseInt(this.querySelector('#cellSize')?.value) || 40;
        // @ts-ignore
        this.AppState.tileHeight = parseInt(this.querySelector('#tileHeight')?.value) || 3;
        // @ts-ignore
        this.AppState.minScalePerspectiva = parseFloat(this.querySelector('#minScale')?.value) || 0.7;
        // @ts-ignore
        this.AppState.factorPerspectiva = parseFloat(this.querySelector('#factorPersp')?.value) || 3;
        // @ts-ignore
        this.AppState.backgroundRelativePath = this.querySelector('#bgPath')?.value || `/Media/assets/Maps/${this.AppState.mapName}/`;
        // @ts-ignore
        this.querySelector('#mapInfo').textContent = `${this.AppState.mapName} • ${this.AppState.gridWidth}×${this.AppState.gridHeight} • ${this.AppState.cellSize}px`;
        this.updatePerspectivePreview(); this.generateCode();
    }


    // @ts-ignore
    handleBackgroundUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        this.processBackgroundFile(file);
    }
    processBackgroundFile = ( /** @type {Blob | undefined} */ file) => {
        if (!file) {
            return;
        }
        this.File = file;

        const reader = new FileReader();

        reader.onload = (event) => {
            // @ts-ignore
            this.AppState.backgroundImage = `url(${event.target.result})`;

            const container = this.querySelector('#gridContainer');

            // @ts-ignore
            container.style.backgroundImage = this.AppState.backgroundImage;
            // @ts-ignore
            container.style.backgroundSize = "100% 100%";

            // @ts-ignore
            if (!this.querySelector('#bgPath')?.value) {
                // @ts-ignore
                this.AppState.backgroundRelativePath = `/Media/assets/Maps/${this.AppState.mapName}/${file.name}`;
                // @ts-ignore
                this.AppState.backgroundRelativePath = `/Media/assets/Maps/mapName/${file.name}`;

                // @ts-ignore
                this.querySelector('#bgPath').value =
                    this.AppState.backgroundRelativePath;
            }

            this.generateCode();
        };

        reader.readAsDataURL(file);
    }

    initCatalog = () => {
        this.renderCatalog('all');
        document.querySelectorAll('.filter-btn')?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn')?.forEach(b => b.classList.remove('active'));
                // @ts-ignore
                e.currentTarget.classList.add('active'); this.renderCatalog(e.currentTarget.dataset.filter);
            });
        });
        this.querySelector('#addSpriteBtn')?.addEventListener('click', () => alert('🔧 SpriteCatalog.addSprite("type" id, name, icon, code })'));
    }

    renderCatalog = (filter = 'all') => {
        const container = this.querySelector('#spriteCatalog');
        // @ts-ignore
        container.innerHTML = '';
        const sprites = SpriteCatalog.getByType(filter);
        sprites.forEach((/** @type {{ id: string | undefined; type: string | undefined; isInvisible: any; icon: string; name: any; }} */ sprite) => {
            const item = document.createElement('div');
            item.className = 'sprite-item'; item.draggable = true;
            item.dataset.spriteId = sprite.id; item.dataset.spriteType = sprite.type;
            item.innerHTML = `<div class="sprite-type ${sprite.isInvisible ? 'invisible' : sprite.type}">${sprite.icon.charAt(0)}</div><div class="sprite-preview">${sprite.icon}</div><div class="sprite-name">${sprite.name}</div>`;
            // @ts-ignore
            item.addEventListener('dragstart', (e) => { e.dataTransfer.effectAllowed = 'copy'; });
            // @ts-ignore
            item.addEventListener('dragend', (e) => e.target.classList.remove('dragging'));
            item.addEventListener('click', () => {
                if (this.AppState.currentTool === 'place') {
                    document.querySelectorAll('.sprite-item')?.forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected'); setTimeout(() => item.classList.remove('selected'), 200);
                }
            });
            container?.appendChild(item);
        });
    }

    // ============================================
    // 🗺️ GRID
    // ============================================
    initGrid = () => { this.updateConfig(); this.renderGrid(); }

    renderGrid = () => {
        // @ts-ignore
        const container = this.querySelector('#gridContainer'); container.innerHTML = '';
        // @ts-ignore
        container.style.width = `${this.AppState.gridWidth * this.AppState.cellSize}px`;
        // @ts-ignore
        container.style.height = `${this.AppState.gridHeight * this.AppState.cellSize}px`;
        const table = document.createElement('table'); table.className = 'grid';
        table.style.width = '100%'; table.style.height = '100%'; table.style.tableLayout = 'fixed';

        for (let y = 0; y < this.AppState.gridHeight; y++) {
            const row = table.insertRow();
            for (let x = 0; x < this.AppState.gridWidth; x++) {
                const cell = row.insertCell(); cell.className = 'cell';
                // @ts-ignore
                cell.dataset.x = x; cell.dataset.y = y;
                // @ts-ignore
                cell.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); });
                // @ts-ignore
                cell.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
                // @ts-ignore
                cell.addEventListener('drop', (e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); this.handleDrop(e); });
                cell.addEventListener('click', this.handleCellClick);

                cell.addEventListener('dblclick', (e) => this.handleCellDoubleClick(e, cell));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.handleCellRightClick(e, cell);
                });
                cell.addEventListener('mouseenter', (e) => this.showScalePreview(e, x, y));
                cell.addEventListener('mousemove', (e) => this.showScalePreview(e, x, y));
                cell.addEventListener('mouseleave', this.hideScalePreview);
            }
        }
        container?.appendChild(table);
        // @ts-ignore
        this.AppState.placedElements.forEach(el => this.renderPlacedElement(el));
        this.updatePlacedList();
    }

    // Modificar renderPlacedElement para manejar bloques genéricos
    /**
     * @param {{ height: number; width: number; x: number; y: number; id: any; } | null} element
     */
    renderPlacedElement = (element) => {
        // @ts-ignore
        const sprite = SpriteCatalog.getById(element?.spriteId);

        // Si es bloque genérico, usar sprite fallback
        // @ts-ignore
        const displaySprite = element.isGeneric
            // @ts-ignore
            ? { icon: element.isInvisible ? '👻' : ' ', code: element.code }
            : sprite;

        if (!displaySprite) return;

        // Renderizar celdas ocupadas por el elemento
        // @ts-ignore
        for (let dy = 0; dy < element.height; dy++) {
            // @ts-ignore
            for (let dx = 0; dx < element.width; dx++) {
                // @ts-ignore
                const cell = document.querySelector(`.cell[data-x="${element.x + dx}"][data-y="${element.y + dy}"]`);
                if (!cell) continue;

                if (dx === 0 && dy === 0) {
                    // === Celda principal: sprite visual ===

                    // Solo mostrar sprite si NO es genérico invisible
                    // @ts-ignore
                    if (!element.isGeneric || !element.isInvisible) {
                        const spriteEl = document.createElement('div');
                        // @ts-ignore
                        spriteEl.className = 'cell-sprite' + (this.AppState.selectedElement?.id === element.id ? ' selected' : '');
                        spriteEl.innerHTML = displaySprite.icon;
                        // @ts-ignore
                        spriteEl.dataset.elementId = element.id;
                        // @ts-ignore
                        spriteEl.style.width = `${Math.min(element.width * this.AppState.cellSize - 4, 100)}px`;
                        // @ts-ignore
                        spriteEl.style.height = `${Math.min(element.height * this.AppState.cellSize - 4, 100)}px`;
                        // @ts-ignore
                        spriteEl.style.fontSize = `${Math.min(element.width, element.height) * 8 + 12}px`;

                        // Eventos para interacción
                        if (this.AppState.currentTool !== 'erase') {
                            spriteEl.addEventListener('mousedown', (e) => {
                                // Prevenir que inicie pintura al hacer drag en sprite
                                e.stopPropagation();
                                // @ts-ignore
                                this.startElementDrag(e, element, cell);
                            });
                            spriteEl.addEventListener('click', (e) => {
                                e.stopPropagation();
                                if (this.AppState.currentTool === 'select' || this.AppState.currentTool === 'resize') {
                                    this.selectElement(element, cell);
                                }
                            });
                        }
                        cell.appendChild(spriteEl);
                    }

                    // Overlay de acción si corresponde
                    // @ts-ignore
                    if (element.hasAction) {
                        const actionEl = document.createElement('div');
                        actionEl.className = 'action-overlay active';
                        actionEl.innerHTML = '⚡';
                        // @ts-ignore
                        actionEl.dataset.elementId = element.id;
                        actionEl.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.openActionModal(element);
                        });
                        cell.appendChild(actionEl);
                    }

                    // Indicador de perspectiva para NPCs
                    // @ts-ignore
                    if (element.type === 'npc') {
                        // @ts-ignore
                        const scale = this.calculateScale(element.y, this.AppState.gridHeight, this.AppState.minScalePerspectiva, this.AppState.factorPerspectiva);
                        const indicator = document.createElement('div');
                        indicator.className = 'scale-indicator';
                        indicator.textContent = `${scale.toFixed(2)}x`;
                        cell.appendChild(indicator);
                    }

                    // Handles de redimensión si está seleccionado
                    // @ts-ignore
                    if (this.AppState.selectedElement?.id === element.id) {
                        this.createResizeHandles(element, cell);
                    }

                } else {
                    // === Celdas secundarias: solo marcar como ocupadas ===
                    cell.classList.add('occupied');
                    // @ts-ignore
                    cell.dataset.occupiedBy = element.id;
                }

                // Estilos especiales para invisibles
                // @ts-ignore
                if (element.isInvisible) {
                    cell.classList.add('invisible-block');
                }

                // Highlight si está seleccionado
                // @ts-ignore
                if (this.AppState.selectedElement?.id === element.id) {
                    cell.classList.add('selected');
                }
            }
        }
    }


    // ============================================
    // ✅ CORREGIDO: SISTEMA DE RESIZE ROBUSTO
    // ============================================
    initResizeHandles = () => {
        document.addEventListener('mousemove', this.handleResizeMove);
        document.addEventListener('mouseup', this.handleResizeEnd);
    }

    /**
     * @param {{ x: any; y: any; width: any; height: any; } | null} element
     * @param {Element} anchorCell
     */
    createResizeHandles = (element, anchorCell) => {
        // Eliminar handles previos
        this.clearResizeUI();

        const container = this.querySelector('#gridContainer');
        if (!container) return;

        const cellSize = this.AppState.cellSize;
        const zoom = this.AppState.zoom;

        // Calcular posición y tamaño en píxeles
        // @ts-ignore
        const left = element.x * cellSize;
        // @ts-ignore
        const top = element.y * cellSize;
        // @ts-ignore
        const width = element.width * cellSize;
        // @ts-ignore
        const height = element.height * cellSize;

        // Crear contenedor de handles
        const handleContainer = document.createElement('div');
        handleContainer.className = 'resize-container';
        handleContainer.style.position = 'absolute';
        handleContainer.style.left = `${left / zoom}px`;
        handleContainer.style.top = `${top / zoom}px`;
        handleContainer.style.width = `${width / zoom}px`;
        handleContainer.style.height = `${height / zoom}px`;
        handleContainer.style.pointerEvents = 'none';
        handleContainer.style.zIndex = '45';

        // Borde de selección
        const border = document.createElement('div');
        border.className = 'selection-border';
        border.style.left = '0'; border.style.top = '0';
        border.style.width = `${width / zoom}px`;
        border.style.height = `${height / zoom}px`;
        // @ts-ignore
        border.innerHTML = `<div class="size-badge">${element.width}×${element.height}</div>`;
        handleContainer.appendChild(border);

        // Definir handles
        const handles = [
            { pos: 'nw', offsetLeft: 0, offsetTop: 0 },
            { pos: 'ne', offsetLeft: (width / zoom) - 7, offsetTop: 0 },
            { pos: 'sw', offsetLeft: 0, offsetTop: (height / zoom) - 7 },
            { pos: 'se', offsetLeft: (width / zoom) - 7, offsetTop: (height / zoom) - 7 },
            { pos: 'n', offsetLeft: (width / zoom / 2) - 7, offsetTop: 0 },
            { pos: 's', offsetLeft: (width / zoom / 2) - 7, offsetTop: (height / zoom) - 7 },
            { pos: 'w', offsetLeft: 0, offsetTop: (height / zoom / 2) - 7 },
            { pos: 'e', offsetLeft: (width / zoom) - 7, offsetTop: (height / zoom / 2) - 7 }
        ];

        handles.forEach(h => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${h.pos}`;
            handle.style.left = `${h.offsetLeft}px`;
            handle.style.top = `${h.offsetTop}px`;
            handle.style.pointerEvents = 'auto';
            // @ts-ignore
            handle.dataset.elementId = element.id;
            handle.dataset.handlePos = h.pos;

            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startResize(e, element, h.pos);
            });

            handleContainer.appendChild(handle);
        });

        container.appendChild(handleContainer);
    }

    // ✅ CORREGIDO: startResize con validaciones
    /**
     * @param {MouseEvent} e
     * @param {{ x: any; y: any; width: any; height: any; } | null} element
     * @param {string | null} handlePos
     */
    startResize = (e, element, handlePos) => {
        if (!element) {
            console.error('startResize: elemento es null');
            return;
        }

        // @ts-ignore
        this.AppState.resizingElement = element;
        // @ts-ignore
        this.AppState.resizeHandle = handlePos;

        // Guardar estado inicial
        this.AppState.resizeStart = {
            x: element.x, y: element.y, width: element.width, height: element.height,
            // @ts-ignore
            mouseX: e.clientX, mouseY: e.clientY
        };

        // Mostrar preview (con verificación de existencia)
        const preview = this.querySelector('#resizePreview');
        if (preview) {
            // @ts-ignore
            preview.style.display = 'block';
            this.updateResizePreview(element.x, element.y, element.width, element.height);
        } else {
            console.error('startResize: #resizePreview no encontrado en DOM');
        }

        // Cursor según handle
        const cursors = { 'nw': 'nw-resize', 'ne': 'ne-resize', 'sw': 'sw-resize', 'se': 'se-resize', 'n': 'n-resize', 's': 's-resize', 'w': 'w-resize', 'e': 'e-resize' };
        // @ts-ignore
        if (document.body) document.body.style.cursor = cursors[handlePos] || 'pointer';
    }

    // ✅ CORREGIDO: updateResizePreview con verificaciones
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    updateResizePreview = (x, y, width, height, invalid = false) => {
        const preview = this.querySelector('#resizePreview');
        const sizeEl = this.querySelector('#resizePreviewSize');
        const container = this.querySelector('#gridContainer');

        if (!preview) {
            console.error('updateResizePreview: #resizePreview no existe');
            return;
        }
        if (!container) return;
        if (sizeEl) sizeEl.textContent = `${width}×${height}`;

        const containerRect = container.getBoundingClientRect();
        const cellSize = this.AppState.cellSize;

        // @ts-ignore
        preview.style.display = 'block';
        preview.className = 'resize-preview' + (invalid ? ' invalid' : '');
        // @ts-ignore
        preview.style.left = `${(x * cellSize) / this.AppState.zoom + containerRect.left - container.scrollLeft}px`;
        // @ts-ignore
        preview.style.top = `${(y * cellSize) / this.AppState.zoom + containerRect.top - container.scrollTop}px`;
        // @ts-ignore
        preview.style.width = `${(width * cellSize) / this.AppState.zoom - 2}px`;
        // @ts-ignore
        preview.style.height = `${(height * cellSize) / this.AppState.zoom - 2}px`;
    }

    // ✅ CORREGIDO: handleResizeMove con validaciones
    /**
     * @param {{ clientX: number; clientY: number; }} e
     */
    handleResizeMove = (e) => {
        if (!this.AppState.resizingElement) return;

        const container = this.querySelector('#gridContainer');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const zoom = this.AppState.zoom;
        const cellSize = this.AppState.cellSize;

        // Posición relativa al grid
        const relX = (e.clientX - containerRect.left + container.scrollLeft) / zoom;
        const relY = (e.clientY - containerRect.top + container.scrollTop) / zoom;
        const cellX = Math.floor(relX / cellSize);
        const cellY = Math.floor(relY / cellSize);

        const el = this.AppState.resizingElement;
        const start = this.AppState.resizeStart;
        const handle = this.AppState.resizeHandle;

        // Mapeo de handles a cambios
        const changes = {
            'nw': { dx: -1, dy: -1, dw: 1, dh: 1 },
            'ne': { dx: 1, dy: -1, dw: -1, dh: 1 },
            'sw': { dx: -1, dy: 1, dw: 1, dh: -1 },
            'se': { dx: 1, dy: 1, dw: -1, dh: -1 },
            'n': { dx: 0, dy: -1, dw: 0, dh: 1 },
            's': { dx: 0, dy: 1, dw: 0, dh: -1 },
            'w': { dx: -1, dy: 0, dw: 1, dh: 0 },
            'e': { dx: 1, dy: 0, dw: -1, dh: 0 }
        };

        // @ts-ignore
        const c = changes[handle];
        if (!c) return;

        // Calcular nuevas dimensiones
        let newX = start.x, newY = start.y;
        let newWidth = start.width, newHeight = start.height;

        const targetX = cellX;
        const targetY = cellY;

        if (c.dw !== 0) {
            if (c.dx < 0) { // Redimensionando desde izquierda
                const delta = start.x + start.width - targetX;
                newWidth = Math.max(1, delta);
                newX = Math.max(0, targetX);
            } else { // Redimensionando desde derecha
                newWidth = Math.max(1, targetX - start.x + 1);
            }
        }
        if (c.dh !== 0) {
            if (c.dy < 0) { // Redimensionando desde arriba
                const delta = start.y + start.height - targetY;
                newHeight = Math.max(1, delta);
                newY = Math.max(0, targetY);
            } else { // Redimensionando desde abajo
                newHeight = Math.max(1, targetY - start.y + 1);
            }
        }

        // Validar límites
        if (newX < 0) { newWidth += newX; newX = 0; }
        if (newY < 0) { newHeight += newY; newY = 0; }
        if (newX + newWidth > this.AppState.gridWidth) newWidth = this.AppState.gridWidth - newX;
        if (newY + newHeight > this.AppState.gridHeight) newHeight = this.AppState.gridHeight - newY;

        // Validar colisiones
        // @ts-ignore
        const isValid = this.isAreaAvailable(newX, newY, newWidth, newHeight, el.id);

        // Actualizar preview
        this.updateResizePreview(newX, newY, Math.max(1, newWidth), Math.max(1, newHeight), !isValid);
    }

    // ✅ CORREGIDO: handleResizeEnd con verificaciones
    /**
     * @param {{ clientX: number; clientY: number; }} e
     */
    handleResizeEnd = (e) => {
        if (!this.AppState.resizingElement) return;

        const container = this.querySelector('#gridContainer');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const zoom = this.AppState.zoom;
        const cellSize = this.AppState.cellSize;
        const relX = (e.clientX - containerRect.left + container.scrollLeft) / zoom;
        const relY = (e.clientY - containerRect.top + container.scrollTop) / zoom;
        const cellX = Math.floor(relX / cellSize);
        const cellY = Math.floor(relY / cellSize);

        const el = this.AppState.resizingElement;
        const start = this.AppState.resizeStart;
        const handle = this.AppState.resizeHandle;

        const changes = {
            'nw': { dx: -1, dy: -1, dw: 1, dh: 1 }, 'ne': { dx: 1, dy: -1, dw: -1, dh: 1 },
            'sw': { dx: -1, dy: 1, dw: 1, dh: -1 }, 'se': { dx: 1, dy: 1, dw: -1, dh: -1 },
            'n': { dx: 0, dy: -1, dw: 0, dh: 1 }, 's': { dx: 0, dy: 1, dw: 0, dh: -1 },
            'w': { dx: -1, dy: 0, dw: 1, dh: 0 }, 'e': { dx: 1, dy: 0, dw: -1, dh: 0 }
        };
        // @ts-ignore
        const c = changes[handle];
        let newX = start.x, newY = start.y;
        let newWidth = start.width, newHeight = start.height;

        if (c) {
            if (c.dw !== 0) {
                if (c.dx < 0) { newWidth = Math.max(1, start.x + start.width - cellX); newX = Math.max(0, cellX); }
                else { newWidth = Math.max(1, cellX - start.x + 1); }
            }
            if (c.dh !== 0) {
                if (c.dy < 0) { newHeight = Math.max(1, start.y + start.height - cellY); newY = Math.max(0, cellY); }
                else { newHeight = Math.max(1, cellY - start.y + 1); }
            }
        }

        // Validar y aplicar
        const finalWidth = Math.max(1, Math.min(newWidth, this.AppState.gridWidth - newX));
        const finalHeight = Math.max(1, Math.min(newHeight, this.AppState.gridHeight - newY));

        // @ts-ignore
        if (newX >= 0 && newY >= 0 && this.isAreaAvailable(newX, newY, finalWidth, finalHeight, el.id)) {
            // @ts-ignore
            const index = this.AppState.placedElements.findIndex(e => e.id === el.id);
            if (index >= 0) {
                // @ts-ignore
                this.AppState.placedElements[index].x = newX;
                // @ts-ignore
                this.AppState.placedElements[index].y = newY;
                // @ts-ignore
                this.AppState.placedElements[index].width = finalWidth;
                // @ts-ignore
                this.AppState.placedElements[index].height = finalHeight;

                this.renderGrid();
                this.updatePlacedList();
                this.updatePropertiesPanel();
                this.generateCode();
                // @ts-ignore
                this.showToast(`📐 ${el.name}: ${finalWidth}×${finalHeight}`);
            }
        }

        // Limpiar estado
        this.AppState.resizingElement = null;
        this.AppState.resizeHandle = null;
        const preview = this.querySelector('#resizePreview');
        // @ts-ignore
        if (preview) preview.style.display = 'none';
        if (document.body) document.body.style.cursor = 'default';
    }

    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================
    /**
     * @param {number} startX
     * @param {number} startY
     * @param {number} width
     * @param {number} height
     */
    isAreaAvailable = (startX, startY, width, height, excludeId = null) => {
        if (startX + width > this.AppState.gridWidth || startY + height > this.AppState.gridHeight) return false;
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const cell = document.querySelector(`.cell[data-x="${startX + dx}"][data-y="${startY + dy}"]`);
                if (!cell) return false;
                // @ts-ignore
                if (cell.dataset.occupiedBy && cell.dataset.occupiedBy != excludeId) return false;
            }
        }
        return true;
    }

    clearGrid = () => {
        if (confirm('¿Limpiar todos los elementos?')) {
            this.AppState.placedElements = []; this.AppState.selectedElement = null;
            document.querySelectorAll('.cell')?.forEach(cell => { cell.innerHTML = ''; cell.className = 'cell'; });
            this.clearResizeUI();
            this.updatePlacedList();
            this.updatePropertiesPanel();
            this.generateCode();
        }
    }

    clearResizeUI = () => {
        document.querySelectorAll('.resize-container')?.forEach(el => el.remove());
        const preview = this.querySelector('#resizePreview');
        // @ts-ignore
        if (preview) preview.style.display = 'none';
    }

    /**
     * @param {string} spriteId
     * @param {any} type
     * @param {any} x
     * @param {any} y
     */
    placeElement = (spriteId, type, x, y, options = {}) => {
        // @ts-ignore
        const width = options.width || this.AppState.placeWidth;
        // @ts-ignore
        // @ts-ignore
        const height = options.height || this.AppState.placeHeight;
        // @ts-ignore
        const isInvisible = options.isInvisible || false;
        // @ts-ignore
        const hasAction = options.hasAction || false;
        if (!this.isAreaAvailable(x, y, width, height)) {
            this.showToast('⚠️ Área ocupada o fuera de límites'); return;
        }
        const sprite = SpriteCatalog.getById(spriteId); if (!sprite) return;
        // @ts-ignore
        const existingIndex = this.AppState.placedElements.findIndex(el => el.x === x && el.y === y);
        if (existingIndex >= 0) {
            // @ts-ignore
            if (!confirm(`¿Reemplazar ${this.AppState.placedElements[existingIndex].name}?`)) return;
            // @ts-ignore
            this.removeElementAt(this.AppState.placedElements[existingIndex].x, this.AppState.placedElements[existingIndex].y);
        }
        const newElement = { id: this.AppState.nextElementId++, spriteId, type, name: sprite.name, code: sprite.code, x, y, width, height, isInvisible, hasAction, actionConfig: hasAction ? { type: 'dialog', dialogId: 'default' } : null };
        // @ts-ignore
        this.AppState.placedElements.push(newElement);
        console.log(type);

        if (type == "trigger" && this.PortalAction) {
            this.PortalAction(newElement)
        }
        console.log(this.AppState.placedElements);


        this.renderPlacedElement(newElement); this.updatePlacedList(); this.generateCode();
        const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (cell) { cell.classList.add('highlight'); setTimeout(() => cell.classList.remove('highlight'), 400); }
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    removeElementAt = (x, y) => {
        // @ts-ignore
        const index = this.AppState.placedElements.findIndex(el => el.x === x && el.y === y);
        if (index >= 0) {
            // @ts-ignore
            const element = this.AppState.placedElements[index];
            for (let dy = 0; dy < element.height; dy++) for (let dx = 0; dx < element.width; dx++) {
                const cell = document.querySelector(`.cell[data-x="${element.x + dx}"][data-y="${element.y + dy}"]`);
                // @ts-ignore
                if (cell) { cell.innerHTML = ''; cell.className = 'cell'; delete cell.dataset.occupiedBy; }
            }
            this.AppState.placedElements.splice(index, 1);
            // @ts-ignore
            if (this.AppState.selectedElement?.id === element.id) this.deselectElement();
            this.clearResizeUI(); this.updatePlacedList(); this.updatePropertiesPanel(); this.generateCode();
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    toggleInvisibleBlock = (x, y) => {
        // @ts-ignore
        const element = this.AppState.placedElements.find(el => el.x === x && el.y === y);
        // @ts-ignore
        if (element?.isInvisible) this.removeElementAt(x, y);
        // @ts-ignore
        else placeElement('inv_trigger', 'invisible', x, y, { isInvisible: true, width: 1, height: 1 });
    }

    /**
     * @param {{ height: number; width: number; x: number; y: number; id: any; } | null} element
     * @param {Element} cell
     */
    selectElement = (element, cell) => {
        this.deselectElement();
        // @ts-ignore
        this.AppState.selectedElement = element;
        // @ts-ignore
        for (let dy = 0; dy < element.height; dy++) for (let dx = 0; dx < element.width; dx++) {
            // @ts-ignore
            const c = document.querySelector(`.cell[data-x="${element.x + dx}"][data-y="${element.y + dy}"]`);
            if (c) c.classList.add('selected');
        }
        // @ts-ignore
        const spriteEl = cell.querySelector(`.cell-sprite[data-element-id="${element.id}"]`);
        if (spriteEl) spriteEl.classList.add('selected');
        if (this.AppState.currentTool === 'resize' || this.AppState.currentTool === 'select') this.createResizeHandles(element, cell);
        this.updatePropertiesPanel(); this.querySelector('#propertiesPanel')?.classList.add('active');
    }

    deselectElement = () => {
        if (!this.AppState.selectedElement) return;
        document.querySelectorAll('.cell.selected')?.forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.cell-sprite.selected')?.forEach(s => s.classList.remove('selected'));
        this.clearResizeUI(); this.AppState.selectedElement = null;
        this.updatePropertiesPanel();
        if (!this.AppState.selectedElement) this.querySelector('#propertiesPanel')?.classList.remove('active');
    }


    // @ts-ignore
    handleCellClick = (e) => {

        const cell = e.currentTarget;
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        if (this.CellAction) {
            this.CellAction(cell, this)
            this.CellAction = null;
            return;
        }
        if (e.target.classList.contains('action-overlay') || e.target.classList.contains('cell-sprite') || e.target.classList.contains('resize-handle')) return;
        if (this.AppState.currentTool === 'place') {
            const selected = document.querySelector('.sprite-item.selected');
            // @ts-ignore
            if (selected) this.placeElement(selected.dataset.spriteId, selected.dataset.spriteType, x, y);
        } else if (this.AppState.currentTool === 'select' || this.AppState.currentTool === 'resize') this.deselectElement();
        else if (this.AppState.currentTool === 'erase') this.removeElementAt(x, y);
        else if (this.AppState.currentTool === 'invisible') this.toggleInvisibleBlock(x, y);
    }

    /**
     * @param {MouseEvent} e
     * @param {HTMLTableCellElement} cell
     */
    handleCellDoubleClick = (e, cell) => {
        // @ts-ignore
        const x = parseInt(cell.dataset.x); const y = parseInt(cell.dataset.y);
        // @ts-ignore
        const element = this.AppState.placedElements.find(el => el.x === x && el.y === y);
        // @ts-ignore
        if (element?.isInvisible || element?.hasAction || cell.classList.contains('invisible-block')) {
            e.preventDefault();
            // @ts-ignore
            if (element) this.openActionModal(element);
            else this.placeElement('inv_trigger', 'invisible', x, y, { isInvisible: true, hasAction: true });
        }
    }

    /**
     * @param {PointerEvent} e
     * @param {Element} cell
     */
    handleCellRightClick = (e, cell) => {
        // @ts-ignore
        const x = parseInt(cell.dataset.x); const y = parseInt(cell.dataset.y);
        // @ts-ignore
        const element = this.AppState.placedElements.find(el => el.x === x && el.y === y);
        // @ts-ignore
        if (element) { e.preventDefault(); this.selectElement(element, cell); this.openActionModal(element); }
    }


    initDragAndDrop = () => {
        const preview = this.querySelector('#dragPreview');
        document.addEventListener('dragstart', (e) => {
            // @ts-ignore
            if (e.target.classList.contains('sprite-item')) {
                // @ts-ignore
                draggedSprite = { id: e.target.dataset.spriteId, type: e.target.dataset.spriteType, name: e.target.querySelector('.sprite-name')?.textContent, icon: e.target.querySelector('.sprite-preview')?.innerHTML };
                // @ts-ignore
                preview.querySelector('#dragPreviewIcon').innerHTML = draggedSprite.icon;
                // @ts-ignore
                preview.querySelector('#dragPreviewName').textContent = draggedSprite.name;
                // @ts-ignore
                this.updateDragPreviewSize();
                // @ts-ignore
                preview.style.display = 'flex';
                // @ts-ignore
                e.target.classList.add('dragging');
            }
        });
        // @ts-ignore
        document.addEventListener('dragend', (e) => { if (e.target.classList.contains('sprite-item')) { e.target.classList.remove('dragging'); preview.style.display = 'none'; draggedSprite = null; } });
        // @ts-ignore
        document.addEventListener('drag', (e) => { if (draggedSprite) { preview.style.left = e.pageX + 'px'; preview.style.top = e.pageY + 'px'; } });
    }
    updateDragPreviewSize() { const p = this.querySelector('#dragPreviewSize'); if (p) p.textContent = `${this.AppState.placeWidth}×${this.AppState.placeHeight}`; }
    /**
     * @param {DragEvent} e
     */
    // @ts-ignore
    handleDrop = (e) => {
        // @ts-ignore
        e.preventDefault(); e.currentTarget.classList.remove('drag-over');
        if (!draggedSprite) return;
        // @ts-ignore
        const x = parseInt(e.currentTarget.dataset.x);
        // @ts-ignore
        const y = parseInt(e.currentTarget.dataset.y);
        this.placeElement(draggedSprite.id, draggedSprite.type, x, y);
    }

    // Movimiento de elementos
    initElementDrag = () => {
        // @ts-ignore
        this.querySelector('#gridContainer')?.addEventListener('mousemove', this.handleElementDragMove);
        document.addEventListener('mouseup', this.handleElementDragEnd);
    }
    /**
     * @param {MouseEvent} e
     * @param {null} element
     * @param {Element} sourceCell
     */
    startElementDrag = (e, element, sourceCell) => {
        if (this.AppState.currentTool === 'erase' || this.AppState.resizingElement) return;
        if (this.AppState.currentTool === 'resize') return;
        e.preventDefault(); e.stopPropagation();
        // @ts-ignore
        this.AppState.draggedElement = { ...element, sourceCell };
        const rect = sourceCell.getBoundingClientRect();
        this.AppState.dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        // @ts-ignore
        const spriteEl = e.currentTarget; spriteEl.style.opacity = '0.5';
    }
    /**
     * @param {{ clientX: number; clientY: number; }} e
     */
    handleElementDragMove = (e) => {
        if (!this.AppState.draggedElement || this.AppState.resizingElement) return;
        const container = this.querySelector('#gridContainer');
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const relX = (e.clientX - containerRect.left) / this.AppState.zoom;
        const relY = (e.clientY - containerRect.top) / this.AppState.zoom;
        const cellX = Math.floor(relX / this.AppState.cellSize);
        const cellY = Math.floor(relY / this.AppState.cellSize);
        if (cellX < 0 || cellX >= this.AppState.gridWidth || cellY < 0 || cellY >= this.AppState.gridHeight) return;
        const { width, height } = this.AppState.draggedElement;
        // @ts-ignore
        if (!this.isAreaAvailableForMove(cellX, cellY, width, height, this.AppState.draggedElement.id)) return;
    }
    /**
     * @param {number} startX
     * @param {number} startY
     * @param {number} width
     * @param {number} height
     * @param {any} excludeId
     */
    isAreaAvailableForMove = (startX, startY, width, height, excludeId) => {
        if (startX + width > this.AppState.gridWidth || startY + height > this.AppState.gridHeight) return false;
        for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) {
            const cell = document.querySelector(`.cell[data-x="${startX + dx}"][data-y="${startY + dy}"]`);
            if (!cell) return false;
            // @ts-ignore
            if (cell.dataset.occupiedBy && cell.dataset.occupiedBy != excludeId) return false;
        }
        return true;
    }
    /**
     * @param {{ clientX: number; clientY: number; }} e
     */
    handleElementDragEnd = (e) => {
        if (!this.AppState.draggedElement || this.AppState.resizingElement) return;
        const container = this.querySelector('#gridContainer');
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const relX = (e.clientX - containerRect.left) / this.AppState.zoom;
        const relY = (e.clientY - containerRect.top) / this.AppState.zoom;
        const newX = Math.floor(relX / this.AppState.cellSize);
        const newY = Math.floor(relY / this.AppState.cellSize);
        const el = this.AppState.draggedElement;
        // @ts-ignore
        const sourceCell = el.sourceCell;
        // @ts-ignore
        if (sourceCell) { const spriteEl = sourceCell.querySelector(`.cell-sprite[data-element-id="${el.id}"]`); if (spriteEl) { spriteEl.style.opacity = '1'; spriteEl.style.transform = 'translate(-50%, -50%) scale(1)'; } }
        // @ts-ignore
        if ((newX !== el.x || newY !== el.y) && this.isAreaAvailableForMove(newX, newY, el.width, el.height, el.id)) {
            // @ts-ignore
            const index = this.AppState.placedElements.findIndex(e => e.id === el.id);
            if (index >= 0) {
                // @ts-ignore
                for (let dy = 0; dy < el.height; dy++) for (let dx = 0; dx < el.width; dx++) {
                    // @ts-ignore
                    const oldCell = document.querySelector(`.cell[data-x="${el.x + dx}"][data-y="${el.y + dy}"]`);
                    // @ts-ignore
                    if (oldCell && !(dx === 0 && dy === 0)) { oldCell.classList.remove('occupied', 'selected'); delete oldCell.dataset.occupiedBy; }
                }
                // @ts-ignore
                this.AppState.placedElements[index].x = newX; this.AppState.placedElements[index].y = newY;
                this.renderGrid();
                this.updatePlacedList();
                this.updatePropertiesPanel();
                this.generateCode();
                // @ts-ignore
                this.showToast(`📍 ${el.name} → (${newX}, ${newY})`);
            }
        }
        this.AppState.draggedElement = null;
    }

    updatePlacedList = () => {
        const list = this.querySelector('#placedList'); const count = this.querySelector('#placedCount');
        // @ts-ignore
        list.innerHTML = ''; count.textContent = this.AppState.placedElements.length;
        this.AppState.placedElements.slice().reverse().forEach(el => {
            // @ts-ignore
            const sprite = SpriteCatalog.getById(el.spriteId);
            const item = document.createElement('div'); item.className = 'placed-item';
            // @ts-ignore
            item.innerHTML = `<span class="sprite-icon">${sprite?.icon || '❓'}</span><span><strong>${el.name}</strong></span><span class="coords">(${el.x},${el.y})</span>${el.width > 1 || el.height > 1 ? `<span class="size-badge">${el.width}×${el.height}</span>` : ''}${el.hasAction ? '<span class="action-badge">⚡</span>' : ''}<button class="resize-btn" data-id="${el.id}">📐</button><button class="remove-btn" data-id="${el.id}">×</button>`;
            // @ts-ignore
            item.querySelector('.remove-btn')?.addEventListener('click', () => this.removeElementAt(el.x, el.y));
            // @ts-ignore
            item.querySelector('.resize-btn')?.addEventListener('click', () => { const cell = document.querySelector(`.cell[data-x="${el.x}"][data-y="${el.y}"]`); this.selectElement(el, cell); document.querySelector('.tool-btn[data-tool="resize"]')?.click(); });
            list?.appendChild(item);
        });
    }

    initPropertiesPanel = () => {
        // @ts-ignore
        ['propWidth', 'propHeight'].forEach(id => this.querySelector("#" + id)?.addEventListener('change', (e) => e.target.value = Math.max(1, Math.min(50, parseInt(e.target.value) || 1))));
        // @ts-ignore
        this.querySelector('#applyPropSize')?.addEventListener('click', this.applyPropertySize);
        // @ts-ignore
        document.querySelectorAll('.anchor-btn')?.forEach(btn => btn.addEventListener('click', (e) => { document.querySelectorAll('.anchor-btn')?.forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); this.AppState.resizeAnchor = e.currentTarget.dataset.anchor; }));
        // @ts-ignore
        this.querySelector('#deleteSelected')?.addEventListener('click', () => { if (this.AppState.selectedElement) this.removeElementAt(this.AppState.selectedElement.x, this.AppState.selectedElement.y); });
    }

    updatePropertiesPanel = () => {
        const panel = this.querySelector('#propertiesPanel');
        // @ts-ignore
        if (!this.AppState.selectedElement) { panel.classList.remove('active'); return; }
        const el = this.AppState.selectedElement;
        // @ts-ignore
        this.querySelector('#propPosition').textContent = `(${el.x}, ${el.y})`;
        // @ts-ignore
        this.querySelector('#propWidth').value = el.width;
        // @ts-ignore
        this.querySelector('#propHeight').value = el.height;
    }

    applyPropertySize = () => {
        if (!this.AppState.selectedElement) return;
        // @ts-ignore
        const newWidth = Math.max(1, Math.min(50, parseInt(this.querySelector('#propWidth')?.value) || 1));
        // @ts-ignore
        const newHeight = Math.max(1, Math.min(50, parseInt(this.querySelector('#propHeight')?.value) || 1));
        const el = this.AppState.selectedElement;
        // @ts-ignore
        if (this.isAreaAvailable(el.x, el.y, newWidth, newHeight, el.id)) {
            // @ts-ignore
            const index = this.AppState.placedElements.findIndex(e => e.id === el.id);
            if (index >= 0) {
                // @ts-ignore
                for (let dy = 0; dy < el.height; dy++) for (let dx = 0; dx < el.width; dx++) {
                    // @ts-ignore
                    const cell = document.querySelector(`.cell[data-x="${el.x + dx}"][data-y="${el.y + dy}"]`);
                    // @ts-ignore
                    if (cell && !(dx === 0 && dy === 0)) { cell.classList.remove('occupied', 'selected'); delete cell.dataset.occupiedBy; }
                }
                // @ts-ignore
                this.AppState.placedElements[index].width = newWidth; this.AppState.placedElements[index].height = newHeight;
                this.renderGrid(); this.updatePlacedList(); this.updatePropertiesPanel(); this.generateCode();
                this.showToast(`📐 ${newWidth}×${newHeight}`);
            }
        } else this.showToast('⚠️ No hay espacio');
    }

    initPerspectivePreview = () => {
        ['minScale', 'factorPersp', 'gridHeight', 'tileHeight'].forEach(id => this.querySelector("#" + id)?.addEventListener('input', this.updatePerspectivePreview));
    }
    updatePerspectivePreview = () => {
        // @ts-ignore
        const y = Math.floor(this.AppState.gridHeight / 2); this.querySelector('#previewY').textContent = y;
        // @ts-ignore
        this.querySelector('#previewTileHeight').textContent = this.AppState.tileHeight;
        const scale = this.calculateScale(y, this.AppState.gridHeight, this.AppState.minScalePerspectiva, this.AppState.factorPerspectiva);
        // @ts-ignore
        this.querySelector('#previewScale').textContent = scale.toFixed(2);
        // @ts-ignore
        this.querySelector('#previewEffectiveHeight').textContent = (this.AppState.tileHeight * scale).toFixed(2);
    }
    /**
     * @param {number} entityY
     * @param {number} mapHeight
     * @param {number} minScale
     * @param {number} factor
     */
    calculateScale = (entityY, mapHeight, minScale, factor) => {
        return minScale + (Math.max(0, Math.min(1, entityY / mapHeight)) * ((1 + factor) - minScale));
    }
    /**
     * @param {MouseEvent} e
     * @param {number} x
     * @param {string | number | null} y
     */
    showScalePreview = (e, x, y) => {
        const preview = this.querySelector('#scalePreview');
        // @ts-ignore
        const scale = this.calculateScale(y, this.AppState.gridHeight, this.AppState.minScalePerspectiva, this.AppState.factorPerspectiva);
        // @ts-ignore
        this.querySelector('#spY').textContent = y;
        // @ts-ignore
        this.querySelector('#spScale').textContent = scale.toFixed(2);
        // @ts-ignore
        this.querySelector('#spHeight').textContent = (this.AppState.tileHeight * scale).toFixed(2);
        // @ts-ignore
        this.querySelector('#spFormula').textContent = `scale = ${this.AppState.minScalePerspectiva} + (${y}/${this.AppState.gridHeight} * (${1 + this.AppState.factorPerspectiva} - ${this.AppState.minScalePerspectiva})) = ${scale.toFixed(2)}`;
        // @ts-ignore
        preview.style.display = 'block';
        // @ts-ignore
        preview.style.left = (e.pageX + 15) + 'px';
        // @ts-ignore
        preview.style.top = (e.pageY + 15) + 'px';
    }
    // @ts-ignore
    hideScalePreview() { document.querySelector('#scalePreview').style.display = 'none'; }

    initModal = () => {
        const modal = this.querySelector('#actionModal');
        document.querySelector('.modal-close')?.addEventListener('click', this.closeModal);
        this.querySelector('#actionCancelBtn')?.addEventListener('click', this.closeModal);
        this.querySelector('#actionSaveBtn')?.addEventListener('click', this.saveActionConfig);
        this.querySelector('#actionRemoveBtn')?.addEventListener('click', this.removeActionConfig);
        this.querySelector('#actionType')?.addEventListener('change', (e) => {
            // @ts-ignore
            this.querySelector('#actionDialogGroup').style.display = e.target.value === 'dialog' ? 'block' : 'none';
            // @ts-ignore
            this.querySelector('#actionTeleportGroup').style.display = e.target.value === 'teleport' ? 'block' : 'none';
            // @ts-ignore
            this.querySelector('#actionCustomGroup').style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
        modal?.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(); });
    }
    //
    /**
     * @param {{ height: number; width: number; x: number; y: number; id: any; } | null} element
     */
    openActionModal = (element) => {
        currentActionElement = element;
        // @ts-ignore
        this.querySelector('#actionPosition').value = `(${element.x}, ${element.y})`;
        // @ts-ignore
        this.querySelector('#actionSize').value = `${element.width}×${element.height}`;
        // @ts-ignore
        this.querySelector('#actionType').value = element.actionConfig?.type || 'dialog';
        // @ts-ignore
        this.querySelector('#actionDialogId').value = element.actionConfig?.dialogId || '';
        // @ts-ignore
        this.querySelector('#actionTargetMap').value = element.actionConfig?.targetMap || '';
        // @ts-ignore
        this.querySelector('#actionTargetX').value = element.actionConfig?.targetX || 0;
        // @ts-ignore
        this.querySelector('#actionTargetY').value = element.actionConfig?.targetY || 0;
        // @ts-ignore
        this.querySelector('#actionCustomCode').value = element.actionConfig?.customCode || '';
        this.querySelector('#actionType')?.dispatchEvent(new Event('change'));
        this.querySelector('#actionModal')?.classList.add('active');
    }
    closeModal = () => { this.querySelector('#actionModal')?.classList.remove('active'); currentActionElement = null; }
    saveActionConfig = () => {
        // @ts-ignore
        if (!currentActionElement) return;
        // @ts-ignore
        const type = this.querySelector('#actionType')?.value;
        const config = { type };
        // @ts-ignore
        if (type === 'dialog') config.dialogId = this.querySelector('#actionDialogId')?.value || 'default';
        // @ts-ignore
        else if (type === 'teleport') { config.targetMap = this.querySelector('#actionTargetMap')?.value || this.AppState.mapName; config.targetX = parseInt(this.querySelector('#actionTargetX')?.value) || 0; config.targetY = parseInt(this.querySelector('#actionTargetY')?.value) || 0; }
        // @ts-ignore
        else if (type === 'custom') config.customCode = this.querySelector('#actionCustomCode')?.value || '// Código';
        // @ts-ignore
        currentActionElement.hasAction = true; currentActionElement.actionConfig = config;
        const cell = document.querySelector(`.cell[data-x="${currentActionElement.x}"][data-y="${currentActionElement.y}"]`);
        if (cell && !cell.querySelector('.action-overlay')) {
            const actionEl = document.createElement('div'); actionEl.className = 'action-overlay active'; actionEl.innerHTML = '⚡';
            actionEl.dataset.elementId = currentActionElement.id;
            actionEl.addEventListener('click', (e) => {
                e.stopPropagation();
                // @ts-ignore
                this.openActionModal(currentActionElement);
            });
            cell.appendChild(actionEl);
        }
        this.updatePlacedList(); this.updatePropertiesPanel(); this.generateCode(); this.closeModal();
    }
    removeActionConfig = () => {
        // @ts-ignore
        if (!currentActionElement) return;
        // @ts-ignore
        currentActionElement.hasAction = false; currentActionElement.actionConfig = null;
        const cell = document.querySelector(`.cell[data-x="${currentActionElement.x}"][data-y="${currentActionElement.y}"]`);
        if (cell) { const overlay = cell.querySelector('.action-overlay'); if (overlay) overlay.remove(); }
        this.updatePlacedList(); this.updatePropertiesPanel(); this.generateCode(); this.closeModal();
    }

    initZoom = () => {
        const container = this.querySelector('#gridContainer');
        this.querySelector('#zoomIn')?.addEventListener('click', () => this.setZoom(this.AppState.zoom + 0.15));
        this.querySelector('#zoomOut')?.addEventListener('click', () => this.setZoom(this.AppState.zoom - 0.15));
        this.querySelector('#zoomReset')?.addEventListener('click', () => this.setZoom(1.0));
        // @ts-ignore
        container?.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.setZoom(this.AppState.zoom + (e.deltaY > 0 ? -0.1 : 0.1)); } });
    }
    /**
     * @param {number} level
     */
    setZoom = (level) => {
        this.AppState.zoom = Math.max(this.AppState.minZoom, Math.min(this.AppState.maxZoom, level));
        // @ts-ignore
        this.querySelector('#gridContainer').style.transform = `scale(${this.AppState.zoom})`;
        // @ts-ignore
        this.querySelector('#zoomLevel').textContent = `${Math.round(this.AppState.zoom * 100)}%`;
        if (this.AppState.selectedElement) {
            this.clearResizeUI();
            // @ts-ignore
            const cell = document.querySelector(`.cell[data-x="${this.AppState.selectedElement.x}"][data-y="${this.AppState.selectedElement.y}"]`);
            if (cell) this.createResizeHandles(this.AppState.selectedElement, cell);
        }
    }

    // ============================================
    // GENERACIÓN DE CÓDIGO PARA BLOQUES GENÉRICOS
    // ============================================

    // Actualizar generateCode para manejar elementos genéricos
    generateCode = () => {
        const { mapName, gridWidth, gridHeight, backgroundRelativePath, minScalePerspectiva, factorPerspectiva } = this.AppState;
        const output = this.querySelector('#output');

        // Separar elementos por tipo
        /**
         * @type {any[]}
         */
        const npcs = this.AppState.placedElements.filter(el => el.type === 'npc');
        /**
         * @type {any[]}
         */
        const objects = this.AppState.placedElements.filter(el => ['object', 'decor'].includes(el.type) && !el.isGeneric);
        /**
         * @type {any[]}
         */
        const generics = this.AppState.placedElements.filter(el => el.isGeneric && !el.isInvisible);
        /**
         * @type {any[]}
         */
        const triggers = this.AppState.placedElements.filter(el => el.type === 'trigger');

        let code = `//@ts-check
// ============================================
// 🗺️ Mapa: ${mapName}
// Generado con Map Maker Pro 3.0
// ============================================

export const ${mapName} = new GameMap('${mapName}', ${gridWidth}, ${gridHeight}, {
    spawnX: ${Math.floor(gridWidth / 2)},
    spawnY: ${Math.floor(gridHeight / 2)},
    minScalePerspectiva: ${minScalePerspectiva},
    factorPerspectiva: ${factorPerspectiva},
    NPCs: [],
    backgroundImage: "${backgroundRelativePath}"
});

`;
        // ===== NPCs =====
        if (npcs.length > 0) {
            code += `//#region 👤 NPCs\n\n`;
            npcs.forEach((el, i) => {
                const sprite = SpriteCatalog.getById(el.spriteId);
                const scale = this.calculateScale(el.y, gridHeight, minScalePerspectiva, factorPerspectiva);
                const varName = `${el.code.toLowerCase()}${i}`;
                code += `const ${varName} = new ${sprite?.code || 'CharacterModel'}({
    Name: "${el.name}_${i}",
    tileHeight: ${this.AppState.tileHeight},
    MapData: [{
        name: "${mapName}",
        posX: ${el.x},
        posY: ${el.y},
        action: () => {
            ${el.hasAction && el.actionConfig?.type === 'dialog'
                        ? `vnEngine.startScene("${el.actionConfig.dialogId}");`
                        : `console.log('${el.name} interactuado');`}
        }
    }]
});
${mapName}.NPCs.add(${varName});

`;
            });
            code += `//#endregion\n\n`;
        }


        console.log(triggers);
        // ===== Triggers invisibles con acciones =====
        if (triggers.length > 0) {
            code += `//#region ⚡ Acciones/Triggers\n\n`;

            triggers.forEach(el => {
                const sprite = SpriteCatalog.getById(el.spriteId);
                const sizeParam = (el.width === 1 && el.height === 1) ? ',1 , 1 ' : `, ${el.width}, ${el.height}`;
                const actionCode = `oppenWorldEngine.GoToMap("${el.actionConfig?.targetMap ?? "map"}", ${el.actionConfig?.targetX ?? 1}, ${el.actionConfig?.targetY ?? 1});`
                /*? 
                : el.actionConfig?.type === 'custom'
                    ? el.actionConfig.customCode || '// Acción personalizada'
                    : `vnEngine.startScene("${el.actionConfig?.dialogId || 'default'}");`;*/

                code += `${mapName}.addObject(new ${sprite?.code || 'BlockObject'}(${el.x}, ${el.y}${sizeParam}, {
    autoTrigger: false,
    Action: () => {
        ${actionCode}
    }
}));
`;
            });

            code += `\n//#endregion\n`;
        }
        // ===== Objetos del catálogo =====
        if (objects.length > 0) {
            code += `//#region 📦 Objetos/Decoración\n\n`;
            objects.forEach(el => {
                const sprite = SpriteCatalog.getById(el.spriteId);
                const sizeParam = (el.width === 1 && el.height === 1) ? ',1 , 1 ' : `, ${el.width}, ${el.height}`;
                code += `${mapName}.addObject(new ${sprite?.code || 'BlockObject'}(${el.x}, ${el.y}${sizeParam}, { }));
`;
            });
            code += `\n//#endregion\n\n`;
        }

        // ===== Bloques genéricos (colisión visual) =====
        if (generics.length > 0) {
            code += `//#region 🧱 Bloques Base\n\n`;
            generics.forEach(el => {
                const sizeParam = (el.width === 1 && el.height === 1) ? ',1 , 1 ' : `, ${el.width}, ${el.height}`;
                code += `${mapName}.addObject(new BlockObject(${el.x}, ${el.y}${sizeParam}, { 
    // Bloque genérico para colisión/obstáculo
}));
`;
            });
            code += `\n//#endregion\n\n`;
        }



        if (this.AppState.placedElements.length === 0) {
            code += `// 📭 Mapa vacío.
// 💡 Tips de pintura rápida:
// • Clic izquierdo + arrastrar: colocar bloques/sprites
// • Clic derecho + arrastrar: borrar elementos
// • Usa el selector de tamaño para pintar áreas grandes
// • Herramienta "👻 Invisible": crea triggers sin sprite visual`;
        }

        // @ts-ignore
        output.value = code;
    }

    // @ts-ignore
    copyCode = () => { navigator.clipboard.writeText(this.querySelector('#output')?.value).then(() => this.showToast('📋 Copiado')); }

    copyActionsOnly = () => {
        // @ts-ignore
        const code = this.querySelector('#output')?.value;
        const actions = code.match(/\/\/#region ⚡ Acciones[\s\S]*?\/\/#endregion/);
        if (actions) navigator.clipboard.writeText(actions[0]).then(() => this.showToast('⚡ Acciones copiadas'));
        else this.showToast('⚠️ Sin acciones');
    }

    downloadCode = () => {
        // @ts-ignore
        const code = this.querySelector('#output')?.value;
        const blob = new Blob([code], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${this.AppState.mapName}.js`;
        document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
        this.showToast('💾 Descargando');
    }

    /**
     * @param {string | null} msg
     */
    showToast = (msg) => {
        const t = document.createElement('div');
        t.style.cssText = `position:fixed;bottom:15px;right:15px;background:#2c3e50;color:white;padding:10px 16px;border-radius:7px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:3000;font-size:13px;animation:slideIn 0.2s ease`;
        t.textContent = msg; document.body.appendChild(t);
        setTimeout(() => { t.style.animation = 'slideOut 0.2s ease'; setTimeout(() => t.remove(), 200); }, 1800);
    }
    // ============================================
    // 🎨 SISTEMA DRAG-TO-PAINT RECUPERADO
    // ============================================



    // ============================================
    // EVENTOS DE MOUSE PARA DRAG-TO-PAINT
    // ============================================

    initPaintEvents = () => {
        const gridContainer = this.querySelector('#gridContainer');

        // Prevenir menú contextual en grid
        gridContainer?.addEventListener('contextmenu', (e) => {
            // Solo prevenir si estamos en modo place, invisible o usando herramienta de pintura
            if (['place', 'invisible', 'erase'].includes(this.AppState.currentTool)) {
                e.preventDefault();
            }
        });

        // Mousedown: iniciar pintura
        gridContainer?.addEventListener('mousedown', this.handlePaintStart);

        // Mousemove: continuar pintura mientras se arrastra
        gridContainer?.addEventListener('mousemove', this.handlePaintMove);

        // Mouseup / mouseleave: finalizar pintura
        gridContainer?.addEventListener('mouseup', this.handlePaintEnd);
        gridContainer?.addEventListener('mouseleave', this.handlePaintEnd);
    }


    // @ts-ignore
    handlePaintStart = (e) => {
        // Ignorar si es click en elementos UI interactivos
        if (e.target.closest('.action-overlay, .resize-handle, .modal, .btn, input, select, textarea')) {
            return;
        }

        // Solo activar pintura en herramientas específicas
        if (!['place', 'invisible', 'erase'].includes(this.AppState.currentTool)) {
            return;
        }

        // Ignorar si es click en sprite ya colocado (para permitir drag de movimiento)
        if (e.target.closest('.cell-sprite') && this.AppState.currentTool !== 'erase') {
            return;
        }

        // Determinar botón: 0 = izquierdo, 2 = derecho
        if (e.button !== 0 && e.button !== 2) return;

        e.preventDefault();

        const cell = e.target.closest('.cell');
        if (!cell) return;

        // Configurar estado de pintura
        PaintState.isPainting = true;
        PaintState.paintButton = e.button;
        PaintState.lastPaintedCell = cell;
        PaintState.paintSize = {
            w: this.AppState.placeWidth,
            h: this.AppState.placeHeight
        };

        // Ejecutar acción inicial
        this.applyPaintToCell(cell);
    }


    // @ts-ignore
    handlePaintMove = (e) => {
        if (!PaintState.isPainting) return;

        const cell = e.target.closest('.cell');
        if (!cell || cell === PaintState.lastPaintedCell) return;

        // Evitar pintar la misma celda múltiples veces
        PaintState.lastPaintedCell = cell;

        // Aplicar pintura
        this.applyPaintToCell(cell);
    }

    /**
     * @param {any} e
     */
    handlePaintEnd = (e) => {
        if (PaintState.isPainting) {
            PaintState.isPainting = false;
            PaintState.lastPaintedCell = null;
            // Regenerar código al finalizar (optimización: solo una vez)
            this.generateCode();
        }
    }

    // ============================================
    // LÓGICA DE PINTURA ADAPTADA A NUEVA ARQUITECTURA
    // ============================================

    /**
     * @param {{ dataset: { x: string; y: string; }; }} cell
     */
    applyPaintToCell = (cell) => {
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        const { w: paintW, h: paintH } = PaintState.paintSize;

        // === BOTÓN IZQUIERDO: PINTAR ===
        if (PaintState.paintButton === 0) {

            // Modo "invisible": crear trigger invisible
            if (this.AppState.currentTool === 'invisible') {
                this.placeInvisibleBlock(x, y, paintW, paintH);
                return;
            }

            // Modo "place": colocar elemento del catálogo o bloque genérico
            if (this.AppState.currentTool === 'place') {
                const selectedSprite = document.querySelector('.sprite-item.selected');

                if (selectedSprite) {
                    // Colocar sprite seleccionado del catálogo
                    this.placeElement(
                        // @ts-ignore
                        selectedSprite.dataset.spriteId,
                        // @ts-ignore
                        selectedSprite.dataset.spriteType,
                        x, y,
                        { width: paintW, height: paintH }
                    );
                } else {
                    // Sin sprite seleccionado → crear bloque genérico invisible/ocupado
                    this.placeGenericBlock(x, y, paintW, paintH);
                }
                return;
            }

            // Modo "erase": borrar (caer al caso derecho)
        }

        // === BOTÓN DERECHO: BORRAR ===
        if (PaintState.paintButton === 2 || this.AppState.currentTool === 'erase') {
            // Borrar elemento en la posición base (x, y)
            // Nota: para multi-tile, borramos desde la esquina superior-izquierda
            this.removeElementAt(x, y);
        }
    }

    // ============================================
    // FUNCIONES AUXILIARES PARA PINTURA
    // ============================================

    /**
     * Coloca un bloque genérico "ocupado" (sin sprite visual, solo colisión)
     * Útil para paredes, suelo no transitable, etc.
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    placeGenericBlock = (x, y, width, height) => {

        if (this.CellAction) {
            return;
        }

        // Verificar área disponible
        if (!this.isAreaAvailable(x, y, width, height)) {
            // Feedback visual breve
            const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
            if (cell) {
                // @ts-ignore
                cell.style.backgroundColor = 'rgba(231, 76, 60, 0.5)';
                setTimeout(() => {
                    // @ts-ignore
                    if (cell) cell.style.backgroundColor = '';
                }, 200);
            }
            return;
        }

        // Crear elemento genérico
        const newElement = {
            id: this.AppState.nextElementId++,
            spriteId: 'generic_block',
            type: 'object',
            name: 'Bloque',
            code: 'BlockObject',
            x, y, width, height,
            isInvisible: false,  // Visible como bloque base
            hasAction: false,
            actionConfig: null,
            isGeneric: true  // Flag para identificar bloques genéricos
        };

        // @ts-ignore
        this.AppState.placedElements.push(newElement);
        this.renderPlacedElement(newElement);
        this.updatePlacedList();

        // Feedback visual inmediato (sin esperar generateCode)
        this.highlightPaintedArea(x, y, width, height);
    }

    /**
     * Coloca un trigger invisible con acción pre-configurada
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    placeInvisibleBlock = (x, y, width, height) => {
        if (!this.isAreaAvailable(x, y, width, height)) return;

        const newElement = {
            id: this.AppState.nextElementId++,
            spriteId: 'inv_trigger',
            type: 'invisible',
            name: 'Trigger Invisible',
            code: 'InvisibleTrigger',
            x, y, width, height,
            isInvisible: true,
            hasAction: true,  // Por defecto, los invisibles tienen acción
            actionConfig: { type: 'dialog', dialogId: 'trigger_action' },
            isGeneric: true
        };

        // @ts-ignore
        this.AppState.placedElements.push(newElement);
        this.renderPlacedElement(newElement);
        this.updatePlacedList();

        // Feedback: celdas con overlay rojo semitransparente
        this.highlightPaintedArea(x, y, width, height, true);
    }

    /**
     * Resalta visualmente el área pintada (feedback inmediato)
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    highlightPaintedArea = (x, y, width, height, isInvisible = false) => {
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const cell = document.querySelector(`.cell[data-x="${x + dx}"][data-y="${y + dy}"]`);
                if (cell) {
                    cell.classList.add('highlight');
                    if (isInvisible) {
                        cell.classList.add('invisible-block');
                    }
                    // Remover highlight después de animación
                    setTimeout(() => cell.classList.remove('highlight'), 400);
                }
            }
        }
    }
    AppState = {
        mapName: 'city',
        gridWidth: 48,
        gridHeight: 27, cellSize: 40,
        tileHeight: 3,
        zoom: 1.0, minZoom: 0.25,
        maxZoom: 4.0,
        currentTool: 'place',
        placeWidth: 1,
        placeHeight: 1,
        minScalePerspectiva: 0.7,
        factorPerspectiva: 3,
        backgroundImage: null,
        backgroundRelativePath: '/Media/assets/Maps/',
        /**@type {Object.<string, any>[]}  { id: int, spriteId, type, name: string, code: string, x, y, width, height, isInvisible, hasAction, actionConfig: hasAction ? { type: 'dialog', dialogId: 'default' } : null }; */
        placedElements: [],
        nextElementId: 0, selectedElement: null,
        draggedElement: null, dragOffset: { x: 0, y: 0 },
        resizingElement: null, resizeHandle: null, resizeAnchor: 'center',
        resizeStart: { x: 0, y: 0, width: 0, height: 0 }
    };

    CustomStyle = css`
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #1a2a6c, #2c3e50);
            padding: 10px;
            min-height: 100vh;
        }

        .container {
            max-width: 100%;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            padding: 15px;
            display: grid;
            grid-template-columns: 260px 1fr 340px;
            gap: 12px;
            height: 96vh;
        }

        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 10px;
            overflow-y: auto;
            padding: 5px;
        }

        .panel {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .panel h3 {
            color: #2c3e50;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 2px solid #3498db;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .control-group {
            margin-bottom: 10px;
        }

        .control-group label {
            display: block;
            margin-bottom: 4px;
            font-weight: 600;
            color: #2c3e50;
            font-size: 0.85rem;
        }

        .control-group input,
        .control-group select {
            width: 100%;
            padding: 7px 10px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 13px;
        }

        .control-group input:focus {
            outline: none;
            border-color: #3498db;
        }

        .control-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }

        .btn {
            background: linear-gradient(to right, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 8px 12px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            width: 100%;
            margin-bottom: 6px;
        }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
        }

        .btn-success {
            background: linear-gradient(to right, #27ae60, #219653);
        }

        .btn-purple {
            background: linear-gradient(to right, #9b59b6, #8e44ad);
        }

        .btn-danger {
            background: linear-gradient(to right, #e74c3c, #c0392b);
        }

        .btn-warning {
            background: linear-gradient(to right, #f39c12, #d35400);
        }

        .btn-sm {
            padding: 5px 10px;
            font-size: 11px;
            width: auto;
        }

        .main-area {
            display: flex;
            flex-direction: column;
            gap: 8px;
            overflow: hidden;
        }

        .toolbar {
            display: flex;
            gap: 8px;
            padding: 8px;
            background: #ecf0f1;
            border-radius: 8px;
            align-items: center;
            flex-wrap: wrap;
        }

        .tool-btn {
            padding: 7px 14px;
            border: 2px solid #bdc3c7;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .tool-btn.active,
        .tool-btn:hover {
            border-color: #3498db;
            background: #ebf5fb;
            color: #2980b9;
        }

        .tool-btn.danger:hover {
            border-color: #e74c3c;
            background: #fdedec;
            color: #c0392b;
        }

        .zoom-controls {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .zoom-controls button {
            width: 30px;
            height: 30px;
            padding: 0;
            border-radius: 50%;
            font-size: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .zoom-level {
            font-weight: 600;
            min-width: 45px;
            text-align: center;
            font-size: 12px;
        }

        .grid-container-viewer {
            flex: 1;
            overflow: auto;
            position: relative;
            background: #2c3e50;
            border-radius: 8px;
        }

        .grid-container {
            position: relative;
            background-color: #f1f2f6;
            border: 3px solid #7f8c8d;
            border-radius: 4px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            transform-origin: top left;
            transition: transform 0.05s ease-out;
            user-select: none;
        }

        table.grid {
            border-collapse: collapse;
            position: relative;
            z-index: 10;
            table-layout: fixed;
        }

        td.cell {
            width: 40px !important;
            height: 40px !important;
            border: 1px solid rgba(100, 100, 100, 0.2);
            position: relative;
            padding: 0;
            text-align: center;
            background: transparent;
            transition: background 0.1s;
            cursor: pointer;
        }

        td.cell:hover {
            background: rgba(52, 152, 219, 0.12);
        }

        td.cell.drag-over {
            background: rgba(46, 204, 113, 0.25) !important;
            border: 2px dashed #2ecc71;
        }

        td.cell.occupied {
            background: rgba(155, 89, 182, 0.08);
            pointer-events: none;
        }

        td.cell.invisible-block {
            background: rgba(231, 76, 60, 0.25) !important;
            border: 1px dashed #c0392b;
        }

        td.cell.invisible-block:hover {
            background: rgba(231, 76, 60, 0.4) !important;
            cursor: pointer;
        }

        td.cell.selected {
            outline: 2px solid #3498db;
            outline-offset: -2px;
            background: rgba(52, 152, 219, 0.15) !important;
        }

        /* ===== RESIZE HANDLES (CORREGIDO) ===== */
        .resize-container {
            position: absolute;
            z-index: 45;
            pointer-events: none;
        }

        .resize-handle {
            position: absolute;
            width: 14px;
            height: 14px;
            background: #3498db;
            border: 2px solid white;
            border-radius: 3px;
            z-index: 50;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
            transition: background 0.15s, transform 0.1s;
            pointer-events: auto;
        }

        .resize-handle:hover {
            background: #2980b9;
            transform: scale(1.15);
        }

        .resize-handle:active {
            background: #1a69a4;
            transform: scale(1.05);
        }

        .resize-handle.nw {
            cursor: nw-resize;
        }

        .resize-handle.ne {
            cursor: ne-resize;
        }

        .resize-handle.sw {
            cursor: sw-resize;
        }

        .resize-handle.se {
            cursor: se-resize;
        }

        .resize-handle.n {
            cursor: n-resize;
        }

        .resize-handle.s {
            cursor: s-resize;
        }

        .resize-handle.w {
            cursor: w-resize;
        }

        .resize-handle.e {
            cursor: e-resize;
        }

        .selection-border {
            position: absolute;
            border: 2px dashed #3498db;
            border-radius: 3px;
            pointer-events: none;
            z-index: 40;
            background: rgba(52, 152, 219, 0.08);
        }

        .selection-border .size-badge {
            position: absolute;
            bottom: -22px;
            left: 50%;
            transform: translateX(-50%);
            background: #3498db;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
        }

        .resize-preview {
            position: absolute;
            border: 2px solid #2ecc71;
            border-radius: 3px;
            pointer-events: none;
            z-index: 45;
            background: rgba(46, 204, 113, 0.15);
            transition: border-color 0.1s;
        }

        .resize-preview.invalid {
            border-color: #e74c3c;
            background: rgba(231, 76, 60, 0.2);
        }

        .resize-preview .preview-size {
            position: absolute;
            top: -20px;
            right: 0;
            background: #2c3e50;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: 600;
        }

        .cell-sprite {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            pointer-events: auto;
            cursor: grab;
            z-index: 20;
            image-rendering: pixelated;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            border: 1px solid #bdc3c7;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .cell-sprite:active {
            cursor: grabbing;
        }

        .cell-sprite.selected {
            border-color: #3498db;
            box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.4);
        }

        .action-overlay {
            position: absolute;
            top: 2px;
            right: 2px;
            width: 18px;
            height: 18px;
            background: rgba(231, 76, 60, 0.9);
            border: 2px solid #c0392b;
            border-radius: 50%;
            cursor: pointer;
            z-index: 30;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 10px;
            font-weight: bold;
            transition: all 0.2s;
        }

        .action-overlay:hover {
            background: #c0392b;
            transform: scale(1.25);
        }

        .action-overlay.active {
            background: #27ae60;
            border-color: #219653;
        }

        .scale-indicator {
            position: absolute;
            bottom: 2px;
            left: 2px;
            font-size: 9px;
            color: white;
            background: rgba(52, 152, 219, 0.9);
            padding: 1px 5px;
            border-radius: 3px;
            z-index: 25;
            font-weight: 600;
            pointer-events: none;
        }

        .scale-preview {
            position: fixed;
            background: rgba(44, 62, 80, 0.95);
            color: white;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            max-width: 200px;
            line-height: 1.4;
        }

        .scale-preview .formula {
            font-family: monospace;
            font-size: 11px;
            color: #f1c40f;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .sprite-catalog {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .catalog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .catalog-filters {
            display: flex;
            gap: 4px;
            margin-bottom: 10px;
            flex-wrap: wrap;
        }

        .filter-btn {
            padding: 4px 9px;
            border: 1px solid #bdc3c7;
            background: white;
            border-radius: 14px;
            font-size: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .filter-btn.active,
        .filter-btn:hover {
            background: #3498db;
            color: white;
            border-color: #2980b9;
        }

        .sprite-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            max-height: 220px;
            overflow-y: auto;
            padding: 3px;
        }

        .sprite-item {
            aspect-ratio: 1;
            background: white;
            border: 2px solid #ecf0f1;
            border-radius: 7px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: grab;
            transition: all 0.2s;
            padding: 3px;
            position: relative;
        }

        .sprite-item:active {
            cursor: grabbing;
        }

        .sprite-item:hover {
            border-color: #3498db;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .sprite-item.dragging {
            opacity: 0.7;
            transform: scale(1.08);
            z-index: 100;
        }

        .sprite-item.selected {
            border-color: #27ae60;
            box-shadow: 0 0 0 2px #2ecc71;
        }

        .sprite-preview {
            width: 100%;
            height: 55%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }

        .sprite-name {
            font-size: 9px;
            text-align: center;
            color: #2c3e50;
            margin-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
        }

        .sprite-type {
            position: absolute;
            top: 2px;
            right: 2px;
            width: 11px;
            height: 11px;
            border-radius: 50%;
            font-size: 7px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }

        .sprite-type.npc {
            background: #3498db;
        }

        .sprite-type.object {
            background: #9b59b6;
        }

        .sprite-type.decor {
            background: #27ae60;
        }

        .sprite-type.trigger {
            background: #e74c3c;
        }

        .sprite-type.invisible {
            background: #7f8c8d;
            border: 1px solid #34495e;
        }

        .size-selector {
            display: flex;
            gap: 4px;
            margin-top: 8px;
            align-items: center;
            font-size: 11px;
        }

        .size-selector input {
            width: 45px;
            padding: 4px 6px;
            font-size: 12px;
            text-align: center;
        }

        .size-selector label {
            color: #7f8c8d;
        }

        .placed-items {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            max-height: 140px;
            overflow-y: auto;
        }

        .placed-item {
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 5px 8px;
            background: white;
            border-radius: 5px;
            margin-bottom: 4px;
            font-size: 11px;
        }

        .placed-item .sprite-icon {
            font-size: 14px;
        }

        .placed-item .coords {
            color: #7f8c8d;
            font-family: monospace;
        }

        .placed-item .size-badge {
            background: #9b59b6;
            color: white;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 9px;
        }

        .placed-item .action-badge {
            background: #e74c3c;
            color: white;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 9px;
        }

        .placed-item .remove-btn {
            margin-left: auto;
            background: #e74c3c;
            color: white;
            border: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 13px;
            line-height: 1;
        }

        .placed-item .resize-btn {
            background: #3498db;
            color: white;
            border: none;
            width: 18px;
            height: 18px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            line-height: 1;
        }

        .output-container {
            background: #2c3e50;
            border-radius: 10px;
            padding: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 180px;
        }

        .output-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            gap: 6px;
        }

        .output-header h3 {
            color: white;
            font-size: 1rem;
        }

        .output-actions {
            display: flex;
            gap: 4px;
        }

        .output-actions button {
            padding: 5px 9px;
            font-size: 11px;
        }

        textarea#output {
            width: 100%;
            min-height: 140px;
            padding: 10px;
            border-radius: 6px;
            border: 2px solid #34495e;
            background: #1a252f;
            color: #f1c40f;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            resize: none;
            flex: 1;
        }

        .legend {
            display: flex;
            gap: 12px;
            padding: 6px 10px;
            background: #ecf0f1;
            border-radius: 6px;
            font-size: 11px;
            flex-wrap: wrap;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .legend-color {
            width: 13px;
            height: 13px;
            border-radius: 3px;
            border: 1px solid #7f8c8d;
        }

        .legend-color.npc {
            background: rgba(52, 152, 219, 0.4);
            border-color: #3498db;
        }

        .legend-color.object {
            background: rgba(155, 89, 182, 0.4);
            border-color: #9b59b6;
        }

        .legend-color.decor {
            background: rgba(39, 174, 96, 0.4);
            border-color: #27ae60;
        }

        .legend-color.trigger {
            background: rgba(231, 76, 60, 0.6);
            border-color: #e74c3c;
            border-radius: 50%;
        }

        .legend-color.invisible {
            background: rgba(127, 140, 141, 0.3);
            border: 1px dashed #7f8c8d;
        }

        .legend-color.selected {
            background: rgba(52, 152, 219, 0.2);
            border: 2px solid #3498db;
        }

        .drag-preview {
            position: fixed;
            pointer-events: none;
            z-index: 1000;
            background: white;
            border: 2px solid #3498db;
            border-radius: 8px;
            padding: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            opacity: 0.95;
            transform: translate(-50%, -50%);
        }

        .drag-preview .sprite-preview {
            width: 40px;
            height: 40px;
            font-size: 24px;
        }

        .drag-preview .sprite-name {
            font-size: 10px;
            font-weight: 600;
            margin-top: 3px;
        }

        .drag-preview .size-info {
            font-size: 9px;
            color: #7f8c8d;
            margin-top: 2px;
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 2000;
            align-items: center;
            justify-content: center;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background: white;
            border-radius: 12px;
            padding: 18px;
            max-width: 480px;
            width: 92%;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 10px;
            border-bottom: 2px solid #ecf0f1;
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 22px;
            cursor: pointer;
            color: #7f8c8d;
        }

        .modal-body .form-group {
            margin-bottom: 12px;
        }

        .modal-body label {
            display: block;
            margin-bottom: 4px;
            font-weight: 600;
            color: #2c3e50;
        }

        .modal-body input,
        .modal-body select,
        .modal-body textarea {
            width: 100%;
            padding: 8px 10px;
            border: 2px solid #ddd;
            border-radius: 6px;
        }

        .modal-footer {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 15px;
            padding-top: 12px;
            border-top: 1px solid #ecf0f1;
        }

        .perspective-config {
            background: #e8f4fd;
            border: 1px solid #3498db;
            border-radius: 8px;
            padding: 10px;
            margin-top: 8px;
        }

        .perspective-config h4 {
            color: #2980b9;
            margin-bottom: 8px;
        }

        .perspective-preview {
            margin-top: 8px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.7);
            border-radius: 5px;
            font-size: 11px;
        }

        .perspective-preview code {
            display: block;
            background: #1a252f;
            color: #f1c40f;
            padding: 6px;
            border-radius: 4px;
            margin-top: 5px;
            font-size: 10px;
        }

        .properties-panel {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            display: none;
        }

        .properties-panel.active {
            display: block;
        }

        .properties-panel h4 {
            color: #2c3e50;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 2px solid #9b59b6;
            font-size: 0.95rem;
        }

        .prop-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-size: 12px;
        }

        .prop-row label {
            min-width: 50px;
            color: #7f8c8d;
        }

        .prop-row input {
            width: 50px;
            padding: 4px 6px;
            font-size: 12px;
            text-align: center;
            border: 1px solid #bdc3c7;
            border-radius: 4px;
        }

        .prop-row .prop-value {
            font-weight: 600;
            color: #2c3e50;
            min-width: 30px;
        }

        .anchor-selector {
            display: grid;
            grid-template-columns: repeat(3, 24px);
            gap: 3px;
            margin: 8px 0;
        }

        .anchor-btn {
            width: 24px;
            height: 24px;
            border: 1px solid #bdc3c7;
            background: white;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
        }

        .anchor-btn:hover {
            border-color: #3498db;
            background: #ebf5fb;
        }

        .anchor-btn.active {
            border-color: #27ae60;
            background: #2ecc71;
            color: white;
            font-weight: bold;
        }

        @media (max-width: 1300px) {
            .container {
                grid-template-columns: 220px 1fr 300px;
            }
        }

        @media (max-width: 1024px) {
            .container {
                grid-template-columns: 1fr;
                height: auto;
            }

            .sidebar {
                flex-direction: row;
                flex-wrap: wrap;
            }
        }

        @media (max-width: 768px) {
            .sprite-grid {
                grid-template-columns: repeat(3, 1fr);
            }

            td.cell {
                width: 30px !important;
                height: 30px !important;
            }
        }

        @keyframes pulse {

            0%,
            100% {
                opacity: 1
            }

            50% {
                opacity: 0.6
            }
        }

        .cell.highlight {
            animation: pulse 0.8s ease-in-out;
        }

        ::-webkit-scrollbar {
            width: 7px;
            height: 7px;
        }

        ::-webkit-scrollbar-track {
            background: #ecf0f1;
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
            background: #95a5a6;
            border-radius: 3px;
        }         
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0
            }

            to {
                transform: translateX(0);
                opacity: 1
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1
            }

            to {
                transform: translateX(100%);
                opacity: 0
            }
        }
     `
}
customElements.define('w-component', MapMaker);