/**
 * Copyright (c) 2025 Pixalo
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
                return this._loadAudio(id, src, config);
            default:
                return Promise.reject(new Error(`Unsupported asset type: ${type}`));
        }
    }
    async _loadImageAndTiles (type, id, src, config = {}) {
        try {
            const response = await fetch(src);
            if (!response.ok)
                throw new Error(`Failed to fetch image: ${response.statusText}`);

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
                    this.engine.warn('No tileSize specified for tiles');
                    config.tileSize = 32; // Default value
                }

                if (!config.tiles) {
                    this.engine.warn('No tiles configuration specified for tiles');
                    config.tiles = {};
                }

                // Calculating the number of rows and columns
                config.columns = Math.floor(asset.width / config.tileSize);
                config.rows = Math.floor(asset.height / config.tileSize);

                // Convert relative coordinates to absolute for each tile
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

            // Apply asset config
            if (!config.tileSize) {
                for (const key in config) {
                    if (key in asset) {
                        try {
                            asset[key] = config[key];
                        } catch (e) {
                            this.engine.warn(`Failed to set property "${key}" on asset:`, e);
                        }
                    }
                }
            }
            this.resources.set(id, {id, asset, config, type});
            return Promise.resolve({asset, config, type});
        } catch (error) {
            return Promise.reject(new Error(`Failed to load image: ${error.message}`));
        }
    }
    async _loadSpriteSheet (type, id, src, config = {}) {
        try {
            const response = await fetch(src);
            if (!response.ok)
                throw new Error(`Failed to fetch spritesheet: ${response.statusText}`);

            const blob = await response.blob();
            const asset = await createImageBitmap(blob, config.bitmap || {});

            // Validation of essential parameters
            const requiredParams = ['columns', 'rows', 'width', 'height'];
            for (const param of requiredParams) {
                if (!config[param]) {
                    this.engine.error(`Missing required parameter: ${param}`);
                    throw new Error(`Missing required parameter: ${param}`);
                }
            }

            // Setting default values for offset and margin
            config.originOffset = config.originOffset || [0, 0];
            config.margin = config.margin || [0, 0];

            // Validating the structure of offset and margin arrays
            if (!Array.isArray(config.originOffset) || config.originOffset.length !== 2)
                config.originOffset = [0, 0];
            if (!Array.isArray(config.margin) || config.margin.length !== 2)
                config.margin = [0, 0];

            // Calculate the total number of frames
            config.totalFrames = config.columns * config.rows;

            // Create a frames array by calculating the position of each frame
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

            // Save assets to the assets collection
            this.resources.set(id, {id, asset, config, type});

            return Promise.resolve({asset, config, type});
        } catch (error) {
            return Promise.reject(new Error(`Failed to load spritesheet: ${error.message}`));
        }
    }
    async _loadAudio (id, src, config = {}) {
        if (!this.engine.config.worker)
            return this.engine.audio.load(id, src, config);

        return new Promise((resolve, reject) => {
            const rootParent = this.engine.rootParent();
            const onMsg = e => {
                if (e.data.type === 'pixalo_audio_loaded') {
                    rootParent.off('worker_msg', onMsg);
                    resolve();
                }
            };
            rootParent.on('worker_msg', onMsg);
            this.engine.audio.load(id, src, config).catch(reject);
        });
    }
    /** ======== END ======== */

    /** ======== MANAGEMENT ======== */
    get (id) {
        const src = this.resources.get(id) || null;
        if (src !== null) return src;

        // Prevent infinite recursion by checking if we're already at root
        if (!this.engine.parent) return null;

        // Walk up the parent chain manually to avoid recursion
        let current = this.engine.parent;
        while (current) {
            const asset = current.assets.resources.get(id);
            if (asset) return asset;
            current = current.parent;
        }

        return null;
    }
    delete (id) {
        this.resources.delete(id);
        return this;
    }
    clear () {
        this.resources.clear();
        return this;
    }
    /** ======== END ======== */
    
}

export default Assets;