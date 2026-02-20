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
}
