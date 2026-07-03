//@ts-check

/**
 * Cargador de recursos (imágenes, videos, audio)
 * Maneja múltiples extensiones y fallbacks
 */
export class AssetLoader {
    constructor() {
        /** @type {Map<string, HTMLImageElement>} */
        this.imageCache = new Map();

        /** @type {string[]} */
        this.imageExtensions = ['webp', 'png', 'jpg', 'jpeg'];

        /** @type {string[]} */
        this.videoExtensions = ['mp4', 'webm'];

        /** @type {number} */
        this.timeoutMs = 1500;
    }

    /**
     * Carga una imagen probando múltiples extensiones
     * @param {string} basePath - Ruta sin extensión
     * @returns {Promise<string | null>}
     */
    async loadImage(basePath) {
        // Si ya tiene extensión, intentar directamente
        if (this._hasExtension(basePath)) {
            const valid = await this._checkResource(basePath);
            if (valid) return basePath;
        }

        // Probar extensiones
        for (const ext of this.imageExtensions) {
            const url = `${basePath}.${ext}`;
            const valid = await this._checkResource(url);
            if (valid) {
                return url;
            }
        }

        console.warn(`[AssetLoader] Imagen no encontrada: ${basePath}`);
        return null;
    }

    /**
     * Carga múltiples sprites para animación
     * @param {string[]} spritePaths 
     * @param {number} [maxConcurrent=5]
     * @returns {Promise<(string | null)[]>}
     */
    async loadAnimatedSprites(spritePaths, maxConcurrent = 5) {
        /**
         * @type {(string | null)[]}
         */
        const loadedSprites = [];

        for (let i = 0; i < spritePaths.length; i += maxConcurrent) {
            const batch = spritePaths.slice(i, i + maxConcurrent);
            const results = await Promise.allSettled(
                batch.map(path => this.loadImage(path))
            );

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    loadedSprites.push(result.value);
                } else {
                    console.warn(`[AssetLoader] Sprite fallido: ${batch[index]}`);
                    loadedSprites.push(null);
                }
            });
        }

        return loadedSprites.filter(s => s !== null);
    }

    /**
     * Carga un video probando múltiples extensiones
     * @param {string} basePath 
     * @returns {Promise<string | null>}
     */
    async loadVideo(basePath) {// @ts-ignore
        let match = basePath.match(/\.([^.\/\\]+)$/);
        let ext = match ? match[1] : null;

        // @ts-ignore
        if (this._hasExtension(basePath) && this.videoExtensions.includes(ext)) {

            const valid = await this._checkResource(basePath);
            if (valid) return basePath;
        }

        for (const ext of this.videoExtensions) {
            const url = `${basePath}.${ext}`;
            const valid = await this._checkResource(url);
            if (valid) {
                return url;
            }
        }

        return null;
    }

    /**
     * Verifica si un recurso existe mediante HEAD request
     * @private
     * @param {string} url 
     * @returns {Promise<boolean>}
     */
    async _checkResource(url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(timeout);
            return response.ok;
        } catch (error) {
            clearTimeout(timeout);
            return false;
        }
    }

    /**
     * Verifica si una ruta ya tiene extensión
     * @private
     * @param {string} path 
     * @returns {boolean}
     */
    _hasExtension(path) {
        return /\.\w+$/.test(path);
    }

    /**
     * Precarga una imagen y la guarda en cache
     * @param {string} url 
     * @returns {Promise<HTMLImageElement | null>}
     */
    async preloadImage(url) {
        if (this.imageCache.has(url)) {
            // @ts-ignore
            return this.imageCache.get(url);
        }

        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(url, img);
                resolve(img);
            };
            img.onerror = () => {
                resolve(null);
            };
            img.src = url;
        });
    }

    /**
     * Limpia el cache de imágenes
     */
    clearCache() {
        this.imageCache.clear();
    }

    /**
     * Obtiene estadísticas del cache
     * @returns {Object}
     */
    getCacheStatus() {
        return {
            cachedImages: this.imageCache.size
        };
    }
}