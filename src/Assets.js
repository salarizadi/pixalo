/**
 * Copyright (c) 2025-2026 Pixalo
 * @Repository: https://github.com/pixalo
 * @License: MIT
 */

class Assets {

    constructor (engine) {
        this.engine    = engine;
        this.resources = new Map();
    }

    /** ======== LOAD RESOURCE ======== */
    async load (type, id, src, config = {}) {
        if (!this.engine.isReady)
            throw new Error('Initialization is not done. Please use the "ready" event to check and then call the "assets.load" function.');

        if (!type || !id || !src)
            return Promise.reject(new Error("Invalid parameters for Assets.load"));

        if (this.resources.has(id))
            return Promise.resolve(this.resources.get(id));

        switch (type.toLowerCase()) {
            case 'image':
            case 'tiles':
                return this._loadImageAndTiles(type, id, src, config);
            case 'spritesheet':
                return this._loadSpriteSheet(type, id, src, config);
            case 'audio':
                return this.engine.audio.load(id, src, config);
            case 'font':
                return this._loadFont(id, src, config);
            default:
                return Promise.reject(new Error(`Unsupported asset type: ${type}`));
        }
    }
    async _loadImageAndTiles (type, id, src, config = {}) {
        try {
            const fetchOptions = this._buildFetchOptions(config);
            const response = await fetch(src, fetchOptions);

            if (!response.ok)
                throw new Error(`Failed to fetch "${id}": ${response.statusText}`);

            const blob = await response.blob();
            const bitmapOptions = {
                colorSpaceConversion: 'default',
                imageOrientation: 'from-image',
                premultiplyAlpha: 'default',
                ...config.bitmap || {}
            };
            const asset = await createImageBitmap(blob, bitmapOptions);

            if (type.toLowerCase() === 'tiles') {
                if (!config.tileSize) {
                    this.engine.warn(`"${id}": No tileSize specified, using default 32`);
                    config.tileSize = 32;
                }

                if (!config.tiles) {
                    this.engine.warn(`"${id}": No tiles configuration specified`);
                    config.tiles = {};
                }

                config.columns = Math.floor(asset.width / config.tileSize);
                config.rows = Math.floor(asset.height / config.tileSize);

                for (const [name, coords] of Object.entries(config.tiles)) {
                    if (Array.isArray(coords)) {
                        const [x, y] = coords;
                        config.tiles[name] = {
                            x: x * config.tileSize,
                            y: y * config.tileSize,
                            width: config.tileSize,
                            height: config.tileSize
                        };
                    }
                }
            }

            if (!config.tileSize) {
                for (const key in config) {
                    if (key in asset) {
                        try {
                            asset[key] = config[key];
                        } catch (e) {
                            this.engine.warn(`"${id}": Failed to set property "${key}"`);
                        }
                    }
                }
            }

            this.resources.set(id, {id, asset, config, type});
            return Promise.resolve({asset, config, type});
        } catch (error) {
            if (error.name === 'AbortError') {
                return Promise.reject(new Error(`"${id}": Request timed out (${config.timeout}ms)`));
            }
            return Promise.reject(new Error(`"${id}": ${error.message}`));
        }
    }
    async _loadSpriteSheet (type, id, src, config = {}) {
        try {
            const fetchOptions = this._buildFetchOptions(config);
            const response = await fetch(src, fetchOptions);

            if (!response.ok)
                throw new Error(`Failed to fetch "${id}": ${response.statusText}`);

            const blob  = await response.blob();
            const asset = await createImageBitmap(blob, config.bitmap || {});

            const requiredParams = ['columns', 'rows', 'width', 'height'];
            for (const param of requiredParams) {
                if (!config[param]) {
                    this.engine.error(`"${id}": Missing required parameter "${param}"`);
                    throw new Error(`Missing required parameter: ${param}`);
                }
            }

            config.originOffset = config.originOffset || [0, 0];
            config.margin = config.margin || [0, 0];

            if (!Array.isArray(config.originOffset) || config.originOffset.length !== 2)
                config.originOffset = [0, 0];
            if (!Array.isArray(config.margin) || config.margin.length !== 2)
                config.margin = [0, 0];

            config.totalFrames = config.columns * config.rows;

            config.frames = [];
            for (let row = 0; row < config.rows; row++) {
                for (let col = 0; col < config.columns; col++) {
                    config.frames.push({
                        x: config.originOffset[0] + col * (config.width + config.margin[0]),
                        y: config.originOffset[1] + row * (config.height + config.margin[1]),
                        width: config.width,
                        height: config.height
                    });
                }
            }

            this.resources.set(id, {id, asset, config, type});
            return Promise.resolve({asset, config, type});
        } catch (error) {
            if (error.name === 'AbortError') {
                return Promise.reject(new Error(`"${id}": Request timed out (${config.timeout}ms)`));
            }
            return Promise.reject(new Error(`"${id}": ${error.message}`));
        }
    }
    async _loadFont (id, src, config = {}) {
        try {
            const family      = id;
            const descriptors = {
                style  : config.style   || 'normal',
                weight : config.weight  || '400',
                stretch: config.stretch || 'normal',
                display: config.display || 'swap',
                ...config.descriptors   || {}
            };

            const fontFace = new FontFace(family, `url(${src})`, descriptors);

            let asset;
            if (config.timeout && config.timeout > 0) {
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Timed out after ${config.timeout}ms`)), config.timeout);
                });
                asset = await Promise.race([fontFace.load(), timeoutPromise]);
            } else {
                asset = await fontFace.load();
            }

            if (this.engine.config?.worker) {
                self.fonts.add(asset);
            } else {
                document.fonts.add(asset);
            }

            this.resources.set(id, {id, asset, config: { ...config, family, descriptors }, type: 'font'});
            this.engine.info?.(`"${id}": Font loaded`);
            return Promise.resolve({asset, config, type: 'font'});
        } catch (error) {
            return Promise.reject(new Error(`"${id}": ${error.message}`));
        }
    }
    /** ======== END ======== */

    /** ======== MANAGEMENT ======== */
    get (id) {
        const src = this.resources.get(id) || null;
        if (src !== null) return src;

        if (!this.engine.parent) return null;

        let current = this.engine.parent;
        while (current) {
            const asset = current.assets.resources.get(id);
            if (asset) return asset;
            current = current.parent;
        }

        return null;
    }
    delete (id) {
        const resource = this.resources.get(id);
        if (resource && resource.type === 'font' && resource.asset) {
            (typeof document !== 'undefined' ? document : self).fonts.delete(resource.asset);
        }
        this.resources.delete(id);
        return this;
    }
    clear () {
        const fonts = typeof document !== 'undefined' ? document.fonts : self.fonts;
        for (const [id, resource] of this.resources) {
            if (resource.type === 'font' && resource.asset) {
                fonts.delete(resource.asset);
            }
        }
        this.resources.clear();
        return this;
    }
    /** ======== END ======== */

    /** ======== PRIVATE HELPER METHODS ======== */
    _createAbortController (timeout) {
        const controller = new AbortController();

        if (timeout && timeout > 0) {
            const timer = setTimeout(() => {
                controller.abort(new Error(`Timed out after ${timeout}ms`));
            }, timeout);

            const originalAbort = controller.abort.bind(controller);
            controller.abort = (reason) => {
                clearTimeout(timer);
                originalAbort(reason);
            };
        }

        return controller;
    }
    _buildFetchOptions (config = {}) {
        const options = { ...config.fetch };

        if (config.timeout && config.timeout > 0) {
            const controller = this._createAbortController(config.timeout);
            options.signal = controller.signal;
        }

        if (config.fetch?.signal) {
            const userSignal = config.fetch.signal;

            if (config.timeout && config.timeout > 0) {
                const controller = this._createAbortController(config.timeout);
                userSignal.addEventListener('abort', () => controller.abort(userSignal.reason));
                options.signal = controller.signal;
            } else {
                options.signal = userSignal;
            }
        }

        return options;
    }
    /** ======== END ======== */

}

export default Assets;