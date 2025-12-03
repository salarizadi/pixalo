/**
 * Copyright (c) 2025 Pixalo
 * @Repository: https://github.com/pixalo
 * @License: MIT
 */

class Grid {

    constructor (engine, config = {}) {
        this.engine  = engine;
        this.enabled = Boolean(engine.config.grid);

        // Grid dimensions
        this.width = config.width || 32;
        this.height = config.height || 32;

        // Basic grid styling
        this.color = config.color || 'rgba(0,0,0,0.3)';
        this.lineWidth = config.lineWidth || 1;

        // Major grid lines (every N cells)
        this.majorGridEvery = config.majorGridEvery || 5;
        this.majorColor = config.majorColor || 'rgba(0,0,0,0.6)';
        this.majorLineWidth = config.majorLineWidth || 2;

        // Grid bounds (optional - if not set, infinite grid)
        this.bounds = config.bounds || null;

        // Visibility thresholds
        this.minZoomToShow = config.minZoomToShow || 0.1;
        this.maxZoomToShow = config.maxZoomToShow || 10;

        // Performance optimization
        this.maxLines = config.maxLines || 1000;

        // Grid origin
        this.originX = config.originX || 0;
        this.originY = config.originY || 0;
    }

    /** ======== RENDER ======== */
    render (ctx) {
        if (!this.enabled) return;

        const camera = this.engine.camera;
        const zoom   = camera.zoom;

        // Check if grid should be visible at current zoom level
        if (zoom < this.minZoomToShow || zoom > this.maxZoomToShow) {
            return;
        }

        ctx.save();

        let startX, startY, endX, endY;

        // Handle scene bounds
        if (this.engine.isScene && this.engine.bounds) {
            const sceneBounds = this.engine.bounds;

            // Use scene bounds directly
            startX = sceneBounds.x;
            startY = sceneBounds.y;
            endX = startX + sceneBounds.width;
            endY = startY + sceneBounds.height;
        } else {
            // Original camera-based calculation
            const viewportWidth = this.engine.baseWidth / zoom;
            const viewportHeight = this.engine.baseHeight / zoom;

            startX = camera.x;
            startY = camera.y;
            endX = startX + viewportWidth;
            endY = startY + viewportHeight;
        }

        // Apply additional bounds if set (this.bounds is different from scene bounds)
        let boundsStartX = this.bounds ? Math.max(startX, this.bounds.x) : startX;
        let boundsStartY = this.bounds ? Math.max(startY, this.bounds.y) : startY;
        let boundsEndX = this.bounds ? Math.min(endX, this.bounds.x + this.bounds.width) : endX;
        let boundsEndY = this.bounds ? Math.min(endY, this.bounds.y + this.bounds.height) : endY;

        // Calculate grid line positions relative to origin
        const firstVerticalLine = Math.floor((boundsStartX - this.originX) / this.width) * this.width + this.originX;
        const firstHorizontalLine = Math.floor((boundsStartY - this.originY) / this.height) * this.height + this.originY;

        // Count lines for performance check
        const verticalLineCount = Math.ceil((boundsEndX - firstVerticalLine) / this.width);
        const horizontalLineCount = Math.ceil((boundsEndY - firstHorizontalLine) / this.height);

        if (verticalLineCount + horizontalLineCount > this.maxLines) {
            // Grid is too dense, skip rendering
            ctx.restore();
            return;
        }

        // Set line styles with zoom-based alpha adjustment
        const alphaMultiplier = this.engine.isScene ? 1 : Math.min(zoom / 2, 1);
        const lineWidthDivider = this.engine.isScene ? 1 : zoom;

        // Draw vertical lines
        ctx.beginPath();
        ctx.strokeStyle = this.engine.adjustAlpha(this.color, alphaMultiplier);
        ctx.lineWidth = this.lineWidth / lineWidthDivider;

        for (let x = firstVerticalLine; x <= boundsEndX; x += this.width) {
            if (x < boundsStartX) continue;

            const gridIndex = Math.round((x - this.originX) / this.width);
            const isMajorLine = this.majorGridEvery > 0 && gridIndex % this.majorGridEvery === 0;

            if (!isMajorLine) {
                ctx.moveTo(x, boundsStartY);
                ctx.lineTo(x, boundsEndY);
            }
        }
        ctx.stroke();

        // Draw horizontal lines
        ctx.beginPath();
        for (let y = firstHorizontalLine; y <= boundsEndY; y += this.height) {
            if (y < boundsStartY) continue;

            const gridIndex = Math.round((y - this.originY) / this.height);
            const isMajorLine = this.majorGridEvery > 0 && gridIndex % this.majorGridEvery === 0;

            if (!isMajorLine) {
                ctx.moveTo(boundsStartX, y);
                ctx.lineTo(boundsEndX, y);
            }
        }
        ctx.stroke();

        // Draw major grid lines if enabled
        if (this.majorGridEvery > 0) {
            ctx.beginPath();
            ctx.strokeStyle = this.engine.adjustAlpha(this.majorColor, alphaMultiplier);
            ctx.lineWidth = this.majorLineWidth / lineWidthDivider;

            // Major vertical lines
            for (let x = firstVerticalLine; x <= boundsEndX; x += this.width) {
                if (x < boundsStartX) continue;

                const gridIndex = Math.round((x - this.originX) / this.width);
                if (gridIndex % this.majorGridEvery === 0) {
                    ctx.moveTo(x, boundsStartY);
                    ctx.lineTo(x, boundsEndY);
                }
            }

            // Major horizontal lines
            for (let y = firstHorizontalLine; y <= boundsEndY; y += this.height) {
                if (y < boundsStartY) continue;

                const gridIndex = Math.round((y - this.originY) / this.height);
                if (gridIndex % this.majorGridEvery === 0) {
                    ctx.moveTo(boundsStartX, y);
                    ctx.lineTo(boundsEndX, y);
                }
            }
            ctx.stroke();
        }

        ctx.restore();
    }
    /** ======== END ======== */

    /** ======== SNAPS, GRID, CELLS ======== */
    snapToGrid (x, y) {
        const snappedX = Math.round((x - this.originX) / this.width) * this.width + this.originX;
        const snappedY = Math.round((y - this.originY) / this.height) * this.height + this.originY;
        return {x: snappedX, y: snappedY};
    }
    getGridCell (x, y) {
        const cellX = Math.floor((x - this.originX) / this.width);
        const cellY = Math.floor((y - this.originY) / this.height);
        return {x: cellX, y: cellY};
    }
    cellToWorld (cellX, cellY) {
        return {
            x: cellX * this.width + this.originX,
            y: cellY * this.height + this.originY
        };
    }
    /** ======== END ======== */

    /** ======== CONFIGURATIONS ======== */
    enable () {this.enabled = true}
    disable () {this.enabled = false}
    toggle () {this.enabled = !this.enabled}
    setSize (width, height = width) {
        this.width = width;
        this.height = height;
        return this;
    }
    setColors (color, majorColor) {
        if (color) this.color = color;
        if (majorColor) this.majorColor = majorColor;
        return this;
    }
    setLineWidth (lineWidth, majorLineWidth) {
        if (lineWidth !== undefined) this.lineWidth = lineWidth;
        if (majorLineWidth !== undefined) this.majorLineWidth = majorLineWidth;
        return this;
    }
    setMajorGrid (every, color, lineWidth) {
        if (every !== undefined) this.majorGridEvery = every;
        if (color) this.majorColor = color;
        if (lineWidth !== undefined) this.majorLineWidth = lineWidth;
        return this;
    }
    setBounds (bounds) {
        this.bounds = bounds;
        return this;
    }
    setOrigin (x, y) {
        this.originX = x;
        this.originY = y;
        return this;
    }
    setVisibilityRange (minZoom, maxZoom) {
        if (minZoom !== undefined) this.minZoomToShow = minZoom;
        if (maxZoom !== undefined) this.maxZoomToShow = maxZoom;
        return this;
    }
    /** ======== END ======== */

}

export default Grid;