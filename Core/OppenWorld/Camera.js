//@ts-check
import { GameMap } from "./OpenWordModules/Models.js";
import { TILE_SIZE, clamp, lerp } from "./OpenWorldEngineView.js";

//CORE

export class Camera {

    /**
     * @param {number} viewW
     * @param {number} viewH
     */
    constructor(viewW, viewH) {
        this.x = 0;
        this.y = 0;
        this.screenW = viewW;
        this.screenH = viewH;
        this.smooth = 0.12;
        this.zoom = 5;
    }
    /**
     * @param {{ x: any; y: any; }} target
     * @param {{ w: number; h: number; }} map
     */
    follow(target, map) {
        const halfW = (this.screenW / TILE_SIZE) / (2 * this.zoom);
        const halfH = (this.screenH / TILE_SIZE) / (2 * this.zoom);
        let tx = target.x, ty = target.y - 1;
        tx = clamp(tx, halfW, map.w - halfW);
        ty = clamp(ty, halfH, map.h - halfH);
        this.x = lerp(this.x, tx, this.smooth);
        this.y = lerp(this.y, ty, this.smooth);
    }
    /**
     * @param {GameMap | null} currentMap
     * @returns {number}
    */
    GetMinZoom(currentMap) {
        if (!currentMap) return 1;

        // Zoom mínimo para que el mapa llene el viewport (no ver fuera del mapa)
        const zoomToFitW = (this.screenW / TILE_SIZE) / currentMap.w;
        const zoomToFitH = (this.screenH / TILE_SIZE) / currentMap.h;
        const zoomToFit = Math.max(zoomToFitW, zoomToFitH); // El mayor para cubrir ambos ejes

        // Si hay perspectiva, necesitamos más zoom mínimo para que el personaje
        // en y=0 no se vea demasiado pequeño
        const perspectiveFactor = currentMap.factorPerspectiva ?? 0;
        const minScale = currentMap.minScalePerspectiva ?? 0.4;

        // Compensar: si el personaje se achica por perspectiva, subir zoom mínimo
        const perspectiveCompensation = perspectiveFactor > 0 ? (1 / perspectiveFactor) * 0.5 : 1;

        return Math.max(zoomToFit, zoomToFit * perspectiveCompensation);
    }

    /**
     * @param {GameMap | null} currentMap
     * @returns {number}
    */
    GetMaxZoom(currentMap) {
        if (!currentMap) return 5;

        // Zoom máximo: que al menos 3x3 tiles sean visibles (no hacer zoom infinito)
        const minVisibleTiles = 3;
        const zoomMaxW = (this.screenW / TILE_SIZE) / minVisibleTiles;
        const zoomMaxH = (this.screenH / TILE_SIZE) / minVisibleTiles;
        const zoomMax = Math.min(zoomMaxW, zoomMaxH); // El menor para respetar ambos ejes

        // Hard cap razonable
        return Math.min(zoomMax, 10);
    }
}
