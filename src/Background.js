/**
 * Copyright (c) 2025 Pixalo
 * @Repository: https://github.com/pixalo
 * @License: MIT
 */

class Background {

    constructor (engine) {
        this.engine = engine;
        this.layers = new Map();
        this.layerCounter = 0;
    }

    /** ======== CONTROLS ======== */
    add (source, config = {}) {
        const layerId = config.id || `bg_layer_${++this.layerCounter}`;

        // Check if source is a color or asset
        const sourceType = this._detectSourceType(source);

        const layer = {
            id: layerId,
            source: source,
            sourceType: sourceType,
            asset: sourceType === 'asset' ? this.engine.assets.get(source) : null,

            // Size
            width:  config.width  || null,
            height: config.height || null,

            // Position and transform
            x: config.x || 0,
            y: config.y || 0,
            scale: config.scale || 1,
            rotation: config.rotation || 0,
            opacity: config.opacity !== undefined ? config.opacity : 1,

            // Parallax settings
            parallax : config.parallax !== undefined ? config.parallax : 1,
            parallaxX: config.parallaxX !== undefined ? config.parallaxX : config.parallax || 1,
            parallaxY: config.parallaxY !== undefined ? config.parallaxY : config.parallax || 1,

            // Repeat settings
            repeat: config.repeat || 'none', // 'none', 'x', 'y', 'both'

            // Independent movement
            speed: {
                x: config.speed?.x || 0,
                y: config.speed?.y || 0
            },

            // Offset for independent movement
            offset: {
                x: config.offset?.x || 0,
                y: config.offset?.y || 0
            },

            // Layer properties
            top: config.top || false,
            zIndex: config.zIndex || 0,
            visible: config.visible !== undefined ? config.visible : true,

            // Internal state
            _currentOffset: {x: 0, y: 0}
        };

        // Validate asset if source is asset type
        if (sourceType === 'asset' && !layer.asset) {
            this.engine.warn(`Background asset '${source}' not found`);
            return null;
        }

        this.layers.set(layerId, layer);
        return layerId;
    }
    get (layerId) {
        return this.layers.get(layerId) || null;
    }
    remove (layerId) {
        return this.layers.delete(layerId);
    }
    clear () {
        this.layers.clear();
        this.layerCounter = 0;
        return this;
    }

    setOrder (layerId, zIndex) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.zIndex = zIndex;
            return true;
        }
        return false;
    }
    setVisible (layerId, visible) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.visible = visible;
            return true;
        }
        return false;
    }
    /** ======== END ======== */

    /** ======== UPDATE & RENDER ======== */
    update (layerId, config) {
        const layer = this.layers.get(layerId);
        if (!layer) return false;

        // Update layer properties
        Object.keys(config).forEach(key => {
            if (key === 'speed' || key === 'offset') {
                Object.assign(layer[key], config[key]);
            } else {
                layer[key] = config[key];
            }
        });

        return true;
    }
    _updateLayers (deltaTime) {
        this.layers.forEach(layer => {
            if (!layer.visible) return;

            // Update independent movement offset
            layer._currentOffset.x += layer.speed.x * (deltaTime / 1000);
            layer._currentOffset.y += layer.speed.y * (deltaTime / 1000);
        });
    }
    _renderLayers (ctx, top = false) {
        // Get sorted layers by zIndex
        const sortedLayers = Array.from(this.layers.values())
            .filter(layer => layer.visible && layer.top === top)
            .sort((a, b) => a.zIndex - b.zIndex);

        sortedLayers.forEach(layer => {
            this._renderLayer(ctx, layer);
        });
    }
    _renderLayer (ctx, layer) {
        ctx.save();

        // Apply bounds clipping if exists
        const {x: bx, y: by, width: bw, height: bh} = this.engine?.bounds || {};
        if (this.engine.isScene && this.engine?.bounds) {
            // Create clipping rectangle for bounds
            ctx.beginPath();
            ctx.rect(bx, by, bw, bh);
            ctx.clip();
        }

        // Apply opacity
        if (layer.opacity < 1)
            ctx.globalAlpha = layer.opacity;

        // Get camera properties
        const camera  = this.engine.camera;
        const cameraX = Math.floor(camera.x);
        const cameraY = Math.floor(camera.y);

        // Use bounds dimensions if available, otherwise use base dimensions
        const viewportWidth  = bw !== undefined ? bw / camera.zoom : this.engine.baseWidth / camera.zoom;
        const viewportHeight = bh !== undefined ? bh / camera.zoom : this.engine.baseHeight / camera.zoom;

        // Calculate parallax offset (opposite direction for background effect)
        const parallaxOffsetX = cameraX * (1 - layer.parallaxX);
        const parallaxOffsetY = cameraY * (1 - layer.parallaxY);

        // Calculate final layer position - constrain to bounds if available
        const baseLayerX = layer.x + parallaxOffsetX + layer.offset.x + layer._currentOffset.x;
        const baseLayerY = layer.y + parallaxOffsetY + layer.offset.y + layer._currentOffset.y;

        const layerWorldX = bx !== undefined ? bx + baseLayerX : baseLayerX;
        const layerWorldY = by !== undefined ? by + baseLayerY : baseLayerY;

        // Adjust camera position relative to bounds
        const effectiveCameraX = bx !== undefined ? Math.max(bx, Math.min(cameraX, bx + bw)) : cameraX;
        const effectiveCameraY = by !== undefined ? Math.max(by, Math.min(cameraY, by + bh)) : cameraY;

        if (layer.sourceType === 'color') {
            this._renderColorBackground(ctx, layer, layerWorldX, layerWorldY, effectiveCameraX, effectiveCameraY, viewportWidth, viewportHeight);
        } else if (layer.sourceType === 'asset' && layer.asset) {
            this._renderImageBackground(ctx, layer, layerWorldX, layerWorldY, effectiveCameraX, effectiveCameraY, viewportWidth, viewportHeight);
        }

        ctx.restore();
    }
    _renderColorBackground (ctx, layer, layerWorldX, layerWorldY, cameraX, cameraY, viewportWidth, viewportHeight) {
        ctx.fillStyle = layer.source;

        if (this.engine.isScene && this.engine.bounds) {
            const {x, y, width, height} = this.engine.bounds;
            ctx.fillRect(layer.x + x, layer.y + y, layer.width ?? width, layer.height ?? height);
            return;
        }

        // Fill the entire visible viewport in world coordinates
        ctx.fillRect(layerWorldX, layerWorldY, layer.width ?? viewportWidth, layer.height ?? viewportHeight);
    }
    _renderImageBackground (ctx, layer, layerWorldX, layerWorldY, cameraX, cameraY, viewportWidth, viewportHeight) {
        const asset = layer.asset.asset;

        // Disable smoothing for pixel-perfect rendering
        ctx.imageSmoothingEnabled = false;

        if (layer.repeat === 'none') {
            // Single image rendering
            this._renderSingleImage(ctx, layer, asset, layerWorldX, layerWorldY);
        } else {
            // Repeating background rendering
            this._renderRepeatingBackground(ctx, layer, asset, layerWorldX, layerWorldY, cameraX, cameraY, viewportWidth, viewportHeight);
        }
    }
    _renderSingleImage (ctx, layer, asset, layerWorldX, layerWorldY) {
        const imgWidth  = layer.width  != null ? layer.width  : asset.width  * layer.scale;
        const imgHeight = layer.height != null ? layer.height : asset.height * layer.scale;

        if (layer.rotation !== 0) {
            ctx.save();
            ctx.translate(layerWorldX + imgWidth / 2, layerWorldY + imgHeight / 2);
            ctx.rotate(layer.rotation);
            ctx.drawImage(asset, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
            ctx.restore();
        } else {
            ctx.drawImage(asset, layerWorldX, layerWorldY, imgWidth, imgHeight);
        }
    }
    _renderRepeatingBackground (ctx, layer, asset, layerWorldX, layerWorldY, cameraX, cameraY, viewportWidth, viewportHeight) {
        const imgWidth  = layer.width  != null ? layer.width  : asset.width  * layer.scale;
        const imgHeight = layer.height != null ? layer.height : asset.height * layer.scale;

        // Calculate tile range similar to TileMap rendering
        let startTileX = 0, endTileX = 1, startTileY = 0, endTileY = 1;

        if (layer.repeat === 'x' || layer.repeat === 'both') {
            // Calculate which tiles are visible horizontally
            const relativeStartX = cameraX - layerWorldX;
            startTileX = Math.floor(relativeStartX / imgWidth) - 1;
            endTileX   = Math.ceil((relativeStartX + viewportWidth)  / imgWidth) + 1;
        }
        if (layer.repeat === 'y' || layer.repeat === 'both') {
            // Calculate which tiles are visible vertically
            const relativeStartY = cameraY - layerWorldY;
            startTileY = Math.floor(relativeStartY / imgHeight) - 1;
            endTileY   = Math.ceil((relativeStartY + viewportHeight) / imgHeight) + 1;
        }

        // Render only visible tiles
        for (let tileY = startTileY; tileY < endTileY; tileY++) {
            for (let tileX = startTileX; tileX < endTileX; tileX++) {
                const drawX = layerWorldX + (tileX * imgWidth);
                const drawY = layerWorldY + (tileY * imgHeight);

                // Skip tiles that are completely outside viewport for optimization
                if (drawX + imgWidth  < cameraX || drawX > cameraX + viewportWidth ||
                    drawY + imgHeight < cameraY || drawY > cameraY + viewportHeight) continue;

                if (layer.rotation !== 0) {
                    ctx.save();
                    ctx.translate(drawX + imgWidth / 2, drawY + imgHeight / 2);
                    ctx.rotate(layer.rotation);
                    ctx.drawImage(asset, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
                    ctx.restore();
                } else {
                    ctx.drawImage(asset, drawX, drawY, imgWidth, imgHeight);
                }
            }
        }
    }
    /** ======== END ======== */

    _detectSourceType (source) {
        if (this.engine.assets.get(source))
            return 'asset';

        // Check if it's a color (hex, rgb, rgba, hsl, hsla, named colors)
        const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-zA-Z]+)$/;

        if (typeof source === 'string' && colorRegex.test(source.trim()))
            // Additional check for named colors or CSS color functions
            return 'color';
    }

}

export default Background;