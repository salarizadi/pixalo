/**
 * Copyright (c) 2025 Pixalo
 * @Repository: https://github.com/pixalo
 * @License: MIT
 */
import Collision from './Collision.js';

class Utils {

    static _handleCanvasSelector (selector, appendTo = null) {
        let canvas;

        if (typeof selector === 'string') {
            canvas = document.querySelector(selector);
            if (!canvas) {
                canvas = document.createElement('canvas');

                if (selector.startsWith('#'))
                    canvas.id = selector.replace('#', '');
                else {
                    selector  = selector.replace('.', '');
                    canvas.classList.add(selector);
                }

                if (!appendTo || typeof appendTo === 'string')
                    appendTo = document.querySelector(appendTo || 'body');

                appendTo.appendChild(canvas);
            }
        } else if (selector instanceof HTMLCanvasElement)
            return selector
        else
            throw new Error('Invalid HTMLCanvasElement')

        return canvas;
    }

    /** ======== RESIZE ======== */
    resize (width, height, trigger = true, target = null) {
        if (this.isScene) {
            this.bounds.width  = this.parseInt(width, this.bounds.width);
            this.bounds.height = this.parseInt(height, this.bounds.height);
            return this;
        }
        this._updateCanvasSize(width, height, trigger, target);
        return this;
    }
    _windowResizeListener () {
        window.addEventListener('resize', () => {
            const target = this.config.resizeTarget;
            let width, height, resize = false;

            this._createWindow();

            if (target === 'window') {
                width  = this.window.width;
                height = this.window.height;
                resize = true;
            } else if (target === 'document') {
                width  = document.documentElement.clientWidth;
                height = document.documentElement.clientHeight;
                resize = true;
            }

            if (resize && !this.config.autoResize) {
                this.trigger('resize', {width, height, target: 'window'});
                return;
            }

            if (resize)
                this.resize(width, height, true, 'window');
        });
    }
    _setupResizeObserver (element) {
        if (!element instanceof HTMLElement || typeof document === 'undefined' || typeof ResizeObserver === 'undefined') return;
        new ResizeObserver(() => {
            const width  = element.offsetWidth;
            const height = element.offsetHeight;
            if (this.config.autoResize) {
                this.resize(width, height, true, element);
                return;
            }
            this.trigger('resize', {width, height, target: element});
        }).observe(element);
    }
    _updateCanvasSize (width, height, trigger, target) {
        // Update the base dimensions
        this.baseWidth  = width;
        this.baseHeight = height;

        // Update config dimensions
        this.config.width  = width;
        this.config.height = height;

        // Update canvas physical size (considering quality)
        this.canvas.width  = width * this.config.quality;
        this.canvas.height = height * this.config.quality;

        // Update canvas display size
        this.canvas.style.width  = width + 'px';
        this.canvas.style.height = height + 'px';

        // Reset context scale
        this.ctx.scale(this.config.quality, this.config.quality);

        this.workerSend({
            action: 'update_canvas',
            props: {
                attributes: {
                    width: this.canvas.width,
                    height: this.canvas.height,
                },
                style: this.canvas.style
            }
        });

        // Trigger resize event
        if (trigger)
            this.trigger('resize', {width, height, target});
    }
    /** ======== END ======== */

    /** ======== ENTITIES ======== */
    getSortedEntitiesForInteraction (scene = null) {
        // Return sorted entities if already calculated
        if (this.sortedEntities.entities.length && this.sortedEntities.scene?.id === scene?.id)
            return this.sortedEntities.entities;

        const entities  = []; // Initialize an array to hold entities for sorting
        let globalOrder = 0;  // Counter to maintain the order of addition

        // Recursive function to add entities to the list
        const add = (entity, level, parent, sceneZ) => {
            // Skip the entity if it's not visible or physics is enabled
            if (!entity.styles.visible || entity.engine.physicsEnabled) return;

            const entityZ   = entity.zIndex || 0;   // Get the zIndex of the entity (default to 0)
            const newParent = [...parent, entityZ]; // Create a new parent array with current entity's zIndex

            // Push the entity information into the entities array
            entities.push({
                entity, level, sceneZ,
                parent: newParent, addOrder: globalOrder++ // Increment globalOrder for unique sorting
            });

            // Recursively add children entities
            for (const child of entity.children.values())
                add(child, level + 1, newParent, sceneZ);
        };

        // Merge scenes
        let merged = (scene || this).mergeEntities(true, true);

        // Iterate through merged entities to process each one
        for (const e of merged.values()) {
            if (e.engine.freezed) continue;

            // Determine the sceneZ based on whether the entity is a scene
            const sceneZ = e.engine?.isScene ? (e.engine.zIndex || 0) : 0;
            add(e, 0, [], sceneZ); // Start adding the entity with level 0 and empty parent
        }

        // Sort entities based on parent hierarchy, zIndex, and addition order
        this.sortedEntities.scene    = scene;
        this.sortedEntities.entities = entities.sort((a, b) => {
            const aParent = a.parent; // Parent array for entity a
            const bParent = b.parent; // Parent array for entity b
            const minLen = Math.min(aParent.length, bParent.length); // Determine the minimum length of parents

            for (let i = 0; i < minLen; i++) {
                // Calculate difference for the current level in the parent hierarchy
                const diff = bParent[i] - aParent[i];
                if (diff !== 0) return diff; // Return the difference if not equal
            }

            // If parent lengths differ, prioritize longer parent chains
            if (aParent.length !== bParent.length)
                return bParent.length - aParent.length;

            // Finally, sort by the order of addition if all else is equal
            return b.addOrder - a.addOrder;
        }).map(item => item.entity); // Extract only the entities from the sorted items

        return this.sortedEntities.entities;
    }
    sortEntitiesAfterInteraction (target, recursive = false) {
        const entities = this.mergeEntities(true, true);
        let rootParent = target.rootParent(); // Get the root parent of the targeted entity

        // Check if the target is a child entity
        if (target.isChild()) {
            const children = target.siblings(); // Get all siblings of the target entity

            // Adjust zIndex of siblings that have a higher zIndex than the target
            children.forEach(child => {
                if (child.zIndex > target.zIndex)
                    child.zIndex--; // Decrement the zIndex to make space for the target
            });

            // Find the maximum zIndex among siblings
            let maxChildZIndex = 0;
            children.forEach(child => maxChildZIndex = Math.max(maxChildZIndex, child.zIndex || 0));
            // Set the target's zIndex to one higher than the maximum sibling zIndex
            target.zIndex = maxChildZIndex + 1;

            // If not in recursive mode, sort the root parent after updating the target
            if (!recursive)
                target.rootParent(parent => this.sortEntitiesAfterInteraction(parent, true));
        }

        // Adjust zIndex for all entities that have a higher zIndex than the root parent
        entities.forEach(entity => entity.zIndex > rootParent.zIndex ? entity.zIndex-- : 0);

        // Determine the maximum zIndex among entities excluding the root parent
        let maxZIndex = 0;
        entities.forEach(entity => entity !== rootParent ? maxZIndex = Math.max(maxZIndex, entity.zIndex || 0) : 0);
        // Update the root parent's zIndex to be one higher than the maximum found
        rootParent.zIndex = maxZIndex + 1;

        // Clear the sorted entities cache for fresh sorting in future interactions
        this.clearSortedEntities();
    }
    clearSortedEntities () {this.sortedEntities = {scene: null, entities: []}}
    isPointInEntity (x, y, entity) {
        if (!entity.styles.visible) return false;

        const centerX = entity.absoluteX + entity.width / 2;
        const centerY = entity.absoluteY + entity.height / 2;
        const rotation = -entity.styles.rotation * Math.PI / 180;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const localX = cos * (x - centerX) - sin * (y - centerY);
        const localY = sin * (x - centerX) + cos * (y - centerY);

        if (entity.collision?.points?.length > 0)
            return Collision.isPointInCollisionPoints(localX, localY, entity.collision.points);

        const scaledWidth  = entity.width * entity.styles.scale * entity.styles.scaleX;
        const scaledHeight = entity.height * entity.styles.scale * entity.styles.scaleY;

        switch (entity.styles.shape) {
            case 'circle':
                const radius = Math.min(scaledWidth, scaledHeight) / 2;
                return (localX * localX + localY * localY) <= radius * radius;
            case 'triangle':
                return Collision.isPointInTriangle(localX, localY, scaledWidth, scaledHeight);
            default: // rectangle
                return Math.abs(localX) <= scaledWidth / 2 && Math.abs(localY) <= scaledHeight / 2;
        }
    }
    handleDragEntity (target, event) {
        let {entity, dragStartX, dragStartY} = target;
        if (this.isEntity(target)) {
            entity     = target;
            dragStartX = target.dragStartX;
            dragStartY = target.dragStartY;
        }
        if (!entity.isDraggable()) return;

        let newX = event.worldX - dragStartX;
        let newY = event.worldY - dragStartY;

        if (entity.parent) {
            newX -= entity.parent.absoluteX;
            newY -= entity.parent.absoluteY;
        } else if (entity.engine.isScene && entity.engine.bounds) {
            const {x: bx, y: by} = entity.engine.bounds;
            newX -= bx;
            newY -= by;
        }

        entity.style({x: newX, y: newY}).trigger('dragMove', event);
    }
    /** ======== END ======== */

    /** ======== SCENES ======== */
    isPointInScene (x, y, interactive = []) {
        if (!this.scenes.size) return false;

        const sortedScenes = this.sortedScenes();
        const scenes = [];

        for (const scene of sortedScenes) {
            const bounds = scene.bounds;
            if (interactive.length && !interactive.includes(scene.interactive)) continue;

            const inside = x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
            if (!inside) continue;

            scenes.push(scene);
        }

        return scenes.length ? scenes : false;
    }
    /** ======== END ======== */

    /** ======== TOUCHES ======== */
    _handleTouchStart (e) {
        if (!this.running) return;

        for (const touch of e.changedTouches) {
            const identifier  = touch.identifier;
            const worldCoords = this.camera.screenToWorld(touch.clientX, touch.clientY);
            const scenes  = this.isPointInScene(worldCoords.x, worldCoords.y, ['catch', 'flow']);
            let eventData = {
                scenes,
                x: worldCoords.x,
                y: worldCoords.y,
                worldX: worldCoords.x,
                worldY: worldCoords.y,
                screenX: touch.clientX,
                screenY: touch.clientY,
                timestamp: Date.now(),
                touches: this._handleTouches(e),
                identifier,
                originalEvent: e,
                stopPropagation () {this._stopPropagation = true}
            };

            if (scenes)
                for (const [index, scene] of scenes.entries()) {
                    const event = this._handleTouchStartTriggers(identifier, eventData, scene);

                    if (index === scenes.length - 1)
                        eventData = event;

                    if (event._stopPropagation || scene.interactive === 'catch') {
                        eventData._stopPropagation = true;
                        break;
                    }
                }

            // Handle main scene
            if (!eventData._stopPropagation)
                this._handleTouchStartTriggers(identifier, eventData, null);
        }
    }
    _handleTouchStartTriggers (identifier, eventData, scene = null) {
        const event = {...eventData};

        if (this.physicsEnabled) {
            if (scene) {
                scene.trigger('touchstart', event);
            } else if (!event._stopPropagation)
                this.trigger('touchstart', event);
            return event;
        }

        const sortedEntities = this.getSortedEntitiesForInteraction(scene && scene.interactive === 'catch' ? scene : null);
        const targetEntity   = sortedEntities.find(entity =>
            (entity.isDraggable() || entity.isClickable() || entity.isInteractive()) &&
            this.isPointInEntity(event.x, event.y, entity)
        );
        if (!targetEntity) {
            if (!event._stopPropagation)
                this.trigger('touchstart', event);
            return event;
        }

        this.sortEntitiesAfterInteraction(targetEntity);

        if (targetEntity.isInteractive()) {
            targetEntity.trigger('touchstart', event);
            this.touchStartEntities.set(identifier, targetEntity);
        }

        if (targetEntity.isDraggable()) {
            this.draggedEntities.set(identifier, {
                entity: targetEntity,
                touchStartX: event.x,
                touchStartY: event.y,
                dragStartX: event.x - targetEntity.absoluteX,
                dragStartY: event.y - targetEntity.absoluteY
            });
            targetEntity.trigger('drag', event);
        }

        if (event._stopPropagation)
            return event;

        if (scene) {
            scene.trigger('touchstart', event);
        } else if (!event._stopPropagation)
            this.trigger('touchstart', event);

        return event;
    }
    _handleTouchMove (e) {
        e?.preventDefault?.();
        if (!this.running) return;

        for (const touch of e.changedTouches) {
            const identifier  = touch.identifier;
            const draggedData = this.draggedEntities.get(identifier);
            const worldCoords = this.camera.screenToWorld(touch.clientX, touch.clientY);
            const scenes  = this.isPointInScene(worldCoords.x, worldCoords.y, ['catch', 'flow']);
            let eventData = {
                scenes,
                x: worldCoords.x,
                y: worldCoords.y,
                worldX: worldCoords.x,
                worldY: worldCoords.y,
                screenX: touch.clientX,
                screenY: touch.clientY,
                timestamp: Date.now(),
                touches: this._handleTouches(e),
                identifier,
                originalEvent: e,
                stopPropagation () {this._stopPropagation = true}
            };

            if (scenes)
                for (const [index, scene] of scenes.entries()) {
                    const event = this._handleTouchMoveTriggers(identifier, eventData, draggedData, scene);

                    if (index === scenes.length - 1)
                        eventData = event;

                    if (event._stopPropagation || scene.interactive === 'catch') {
                        eventData._stopPropagation = true;
                        break;
                    }
                }

            // Handle main scene
            if (!eventData._stopPropagation)
                this._handleTouchMoveTriggers(identifier, eventData, draggedData, null);
        }
    }
    _handleTouchMoveTriggers (identifier, eventData, draggedData, scene) {
        const event = {...eventData};

        if (this.physicsEnabled) {
            if (scene) {
                scene.trigger('touchmove', event);
            } else if (!event._stopPropagation)
                this.trigger('touchmove', event);
            return event;
        }

        const touchStartEntity = this.touchStartEntities.get(identifier);
        if (touchStartEntity && touchStartEntity.isInteractive()) {
            touchStartEntity.trigger('touchmove', event);
        } else {
            const sortedEntities = this.getSortedEntitiesForInteraction(scene && scene.interactive === 'catch' ? scene : null);
            const targetEntity   = sortedEntities.find(entity =>
                entity.isInteractive() && this.isPointInEntity(event.x, event.y, entity)
            );
            if (targetEntity)
                targetEntity.trigger('touchmove', event);
        }

        // Handle drag
        if (draggedData)
            this.handleDragEntity(draggedData, event);

        if (event._stopPropagation) return event;

        if (scene)
            scene.trigger('touchmove', event);
        else if (!event._stopPropagation)
            this.trigger('touchmove', event);

        return event;
    }
    _handleTouchEnd (e) {
        if (!this.running) return;

        for (const touch of e.changedTouches) {
            const identifier  = touch.identifier;
            const draggedData = this.draggedEntities.get(identifier);
            const worldCoords = this.camera.screenToWorld(touch.clientX, touch.clientY);
            const scenes  = this.isPointInScene(worldCoords.x, worldCoords.y, ['catch', 'flow']);
            let eventData = {
                scenes,
                x: worldCoords.x,
                y: worldCoords.y,
                worldX: worldCoords.x,
                worldY: worldCoords.y,
                screenX: touch.clientX,
                screenY: touch.clientY,
                timestamp: Date.now(),
                touches: this._handleTouches(e),
                identifier,
                originalEvent: e,
                stopPropagation () {this._stopPropagation = true}
            };

            if (scenes)
                for (const [index, scene] of scenes.entries()) {
                    const event = this._handleTouchEndTriggers(identifier, eventData, draggedData, scene);

                    if (index === scenes.length - 1)
                        eventData = event;

                    if (event._stopPropagation || scene.interactive === 'catch') {
                        eventData._stopPropagation = true;
                        break;
                    }
                }

            // Handle main scene
            if (!eventData._stopPropagation)
                this._handleTouchEndTriggers(identifier, eventData, draggedData, null);
        }
    }
    _handleTouchEndTriggers (identifier, eventData, draggedData, scene) {
        const event = {...eventData};

        if (this.physicsEnabled) {
            if (scene) {
                scene.trigger('touchend', event);
            } else if (!event._stopPropagation)
                this.trigger('touchend', event);
            return event;
        }

        const touchStartEntity = this.touchStartEntities.get(identifier);
        if (touchStartEntity && touchStartEntity.isInteractive()) {
            touchStartEntity.trigger('touchend', event);
            this.touchStartEntities.delete(identifier);
        }

        // Handle drag end logic
        if (draggedData) {
            const entity = draggedData.entity;
            if (entity.isDraggable())
                entity.trigger('drop', event);
            this.draggedEntities.delete(identifier);
        }

        if (event._stopPropagation) return event;

        if (scene)
            scene.trigger('touchend', event);
        else if (!event._stopPropagation)
            this.trigger('touchend', event);

        return event;
    }
    _handleTouchCancel (e) {
        if (!this.running) return;

        for (const touch of e.changedTouches) {
            const identifier = touch.identifier;

            const touchStartEntity = this.touchStartEntities.get(identifier);
            if (touchStartEntity)
                this.touchStartEntities.delete(identifier);

            if (this.draggedEntities.has(identifier))
                this.draggedEntities.delete(identifier);
        }
    }
    _handleTouches (e) {
        const touches = [];
        for (const touch of e.touches) {
            const world = this.camera.screenToWorld(touch.clientX, touch.clientY);
            touches.push({
                identifier: touch.identifier,
                screenX: touch.clientX,
                screenY: touch.clientY,
                worldX: world.x,
                worldY: world.y
            });
        }
        return touches;
    }
    /** ======== END ======== */

    /** ======== MOUSE ======== */
    _handleMouseDown (e) {
        if (!this.running) return;

        const worldCoords = this.camera.screenToWorld(e.clientX, e.clientY);
        const scenes      = this.isPointInScene(worldCoords.x, worldCoords.y, ['catch', 'flow']);
        let eventData     = {
            scenes,
            button: e.buttons,
            x: worldCoords.x,
            y: worldCoords.y,
            worldX: worldCoords.x,
            worldY: worldCoords.y,
            screenX: e.clientX,
            screenY: e.clientY,
            which: e.which,
            timestamp: Date.now(),
            originalEvent: e,
            stopPropagation () {this._stopPropagation = true}
        };

        if (scenes)
            for (const [index, scene] of scenes.entries()) {
                const event = this._handleMouseDownTriggers(eventData, scene);

                if (index === scenes.length - 1)
                    eventData = event;

                if (event._stopPropagation || scene.interactive === 'catch') {
                    eventData._stopPropagation = true;
                    break;
                }
            }

        // Handle main scene
        if (!eventData._stopPropagation)
            this._handleMouseDownTriggers(eventData, null);
    }
    _handleMouseDownTriggers (eventData, scene = null) {
        const event = {...eventData};

        if (this.physicsEnabled) {
            if (scene) {
                scene.trigger('mousedown', event);
            } else if (!event._stopPropagation)
                this.trigger('mousedown', event);
            return event;
        }

        const sortedEntities = this.getSortedEntitiesForInteraction(scene && scene.interactive === 'catch' ? scene : null);
        const targetEntity   = sortedEntities.find(entity => {
            // if (scene && (entity.engine?.id !== scene.id && scene.interactive === 'catch')) return false;
            return (entity.isDraggable() || entity.isInteractive()) && this.isPointInEntity(event.x, event.y, entity)
        });

        if (targetEntity) {
            this.sortEntitiesAfterInteraction(targetEntity);

            if (targetEntity.isInteractive()) {
                targetEntity.trigger('mousedown', event);
                this.mouseDownEntity = targetEntity;
            }

            if (targetEntity.isDraggable()) {
                this.draggedEntity = targetEntity;
                this.draggedEntity.dragStartX = event.x - targetEntity.absoluteX;
                this.draggedEntity.dragStartY = event.y - targetEntity.absoluteY;

                targetEntity.trigger('drag', event);
            }
        }

        if (event._stopPropagation)
            return event;

        if (scene) {
            scene.trigger('mousedown', event);
        } else if (!event._stopPropagation)
            this.trigger('mousedown', event);

        return event;
    }
    _handleMouseUp (e) {
        if (!this.running) return;

        const worldCoords = this.camera.screenToWorld(e.clientX, e.clientY);
        const scenes      = this.isPointInScene(worldCoords.x, worldCoords.y, ['catch', 'flow']);
        let eventData     = {
            scenes,
            button: e.buttons,
            x: worldCoords.x,
            y: worldCoords.y,
            worldX: worldCoords.x,
            worldY: worldCoords.y,
            screenX: e.clientX,
            screenY: e.clientY,
            which: e.which,
            timestamp: Date.now(),
            originalEvent: e,
            stopPropagation () {this._stopPropagation = true}
        };

        if (scenes)
            for (const [index, scene] of scenes.entries()) {
                const event = this._handleMouseUpTriggers(eventData, scene);

                if (index === scenes.length - 1)
                    eventData = event;

                if (event._stopPropagation || scene.interactive === 'catch') {
                    eventData._stopPropagation = true;
                    break;
                }
            }

        // Handle main scene
        if (!eventData._stopPropagation)
            this._handleMouseUpTriggers(eventData, null);
    }
    _handleMouseUpTriggers (eventData, scene) {
        const event = {...eventData};

        if (this.physicsEnabled) {
            if (scene)
                scene.trigger('mouseup', event);
            else if (!event._stopPropagation)
                this.trigger('mouseup', event);
            return event;
        }

        if (this.isEntity(this.mouseDownEntity) && this.mouseDownEntity.isInteractive()) {
            this.mouseDownEntity.trigger('mouseup', event);
            this.mouseDownEntity = null;
        }

        // Handle drag end
        if (this.isEntity(this.draggedEntity)) {
            this.draggedEntity.trigger('drop', event);
            this.draggedEntity = null;
        }

        if (event._stopPropagation)
            return event;

        if (scene)
            scene.trigger('mouseup', event);
        else if (!event._stopPropagation)
            this.trigger('mouseup', event);

        return event;
    }
    _handleMouseMove (e) {
        if (!this.running) return;

        const worldCoords = this.camera.screenToWorld(e.clientX, e.clientY);
        const scenes      = this.isPointInScene(worldCoords.x, worldCoords.y, ['catch', 'flow']);
        let eventData     = {
            scenes,
            button: e.buttons,
            x: worldCoords.x,
            y: worldCoords.y,
            worldX: worldCoords.x,
            worldY: worldCoords.y,
            screenX: e.clientX,
            screenY: e.clientY,
            which: e.which,
            timestamp: Date.now(),
            originalEvent: e,
            stopPropagation () {this._stopPropagation = true}
        };

        if (scenes)
            for (const [index, scene] of scenes.entries()) {
                const event = this._handleMouseMoveTriggers(eventData, scene);

                if (index === scenes.length - 1)
                    eventData = event;

                if (event._stopPropagation || scene.interactive === 'catch') {
                    eventData._stopPropagation = true;
                    break;
                }
            }

        // Handle main scene
        if (!eventData._stopPropagation)
            this._handleMouseMoveTriggers(eventData, null);
    }
    _handleMouseMoveTriggers (eventData, scene) {
        const event = {...eventData};

        if (this.physicsEnabled) {
            if (scene)
                scene.trigger('mousemove', event);
            else if (!event._stopPropagation)
                this.trigger('mousemove', event);
            return event;
        }

        // Handle drag
        if (this.draggedEntity) {
            this.handleDragEntity(this.draggedEntity, event);
            return event;
        }

        const sortedEntities = this.getSortedEntitiesForInteraction(scene && scene.interactive === 'catch' ? scene : null);
        const targetEntity   = sortedEntities.find(entity =>
            this.isPointInEntity(event.x, event.y, entity)
        );

        if (this.isEntity(this.hoveredEntity) && this.hoveredEntity !== targetEntity) {
            this.hoveredEntity.trigger('hoverOut', event);
            this.hoveredEntity = null;
        }

        if (this.isEntity(this.mouseDownEntity) && this.mouseDownEntity.isInteractive())
            this.mouseDownEntity.trigger('mousemove', event);
        else if (targetEntity && targetEntity.isInteractive())
            targetEntity.trigger('mousemove', event);

        if (targetEntity && targetEntity.isHoverable() && this.hoveredEntity?.id !== targetEntity.id) {
            this.hoveredEntity = targetEntity;
            targetEntity.trigger('hover', event);
        }

        if (event._stopPropagation)
            return event;

        if (scene)
            scene.trigger('mousemove', event);
        else if (!event._stopPropagation)
            this.trigger('mousemove', event);

        return event;
    }
    _handleWheel (e) {
        if (!this.running) return;
        e?.preventDefault?.();

        const worldCoords = this.camera.screenToWorld(e.clientX, e.clientY);
        const scenes      = this.isPointInScene(worldCoords.x, worldCoords.y, ['catch', 'flow']);
        let eventData     = {
            scenes,
            x: worldCoords.x,
            y: worldCoords.y,
            worldX: worldCoords.x,
            worldY: worldCoords.y,
            screenX: e.clientX,
            screenY: e.clientY,
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            deltaZ: e.deltaZ,
            deltaMode: e.deltaMode,
            timestamp: Date.now(),
            originalEvent: e,
            stopPropagation () {this._stopPropagation = true}
        };

        if (scenes)
            for (const [index, scene] of scenes.entries()) {
                const event = this._handleWheelTriggers(eventData, scene);

                if (index === scenes.length - 1)
                    eventData = event;

                if (event._stopPropagation || scene.interactive === 'catch') {
                    eventData._stopPropagation = true;
                    break;
                }
            }

        // Handle main scene
        if (!eventData._stopPropagation)
            this._handleWheelTriggers(eventData, null);
    }
    _handleWheelTriggers (eventData, scene) {
        const event = {...eventData};

        if (this.physicsEnabled) {
            if (scene) {
                scene.trigger('wheel', event);
            } else if (!event._stopPropagation)
                this.trigger('wheel', event);
            return event;
        }

        const sortedEntities = this.getSortedEntitiesForInteraction(scene && scene.interactive === 'catch' ? scene : null);
        const targetEntity   = sortedEntities.find(entity =>
            entity.isInteractive() && this.isPointInEntity(event.x, event.y, entity)
        );

        if (targetEntity)
            targetEntity.trigger('wheel', event);

        if (event._stopPropagation)
            return event;

        if (scene)
            scene.trigger('wheel', event);
        else if (!event._stopPropagation)
            this.trigger('wheel', event);

        return event;
    }
    /** ======== END ======== */

    /** ======== CLICK ======== */
    _handleClick (e) {
        if (e.button === 2) return;
        this._handleClicks(e, 'click');
    }
    _handleRightClick (e) {
        this._handleClicks(e, 'rightclick');
    }
    _handleClicks (e, trigger) {
        e?.preventDefault?.();
        Promise.resolve().then(() => this.canvas?.focus?.());

        if (!this.running) return;

        const worldCoords = this.camera.screenToWorld(e.clientX, e.clientY);
        const scenes      = this.isPointInScene(worldCoords.x, worldCoords.y, ['catch', 'flow']);
        let eventData     = {
            scenes,
            x: worldCoords.x,
            y: worldCoords.y,
            worldX: worldCoords.x,
            worldY: worldCoords.y,
            screenX: e.clientX,
            screenY: e.clientY,
            timestamp: Date.now(),
            originalEvent: e,
            stopPropagation () {this._stopPropagation = true}
        };

        if (scenes)
            for (const [index, scene] of scenes.entries()) {
                const event = this._handleClickTriggers(trigger, eventData, scene);

                if (index === scenes.length - 1)
                    eventData = event;

                if (event._stopPropagation || scene.interactive === 'catch') {
                    eventData._stopPropagation = true;
                    break;
                }
            }

        // Handle main scene
        if (!eventData._stopPropagation)
            this._handleClickTriggers(trigger, eventData, null);
    }
    _handleClickTriggers (trigger, eventData, scene = null) {
        const event = {...eventData};

        if (this.physicsEnabled && (scene ? scene.physicsEnabled : true)) {
            if (scene)
                scene.trigger(trigger, event);
            else if (!event._stopPropagation)
                this.trigger(trigger, event);
            return event;
        }

        const sortedEntities = this.getSortedEntitiesForInteraction(scene && scene.interactive === 'catch' ? scene : null);
        const targetEntity   = sortedEntities.find(entity =>
            (entity.isClickable() || entity.isInteractive()) && this.isPointInEntity(event.x, event.y, entity)
        );

        if (targetEntity)
            targetEntity.trigger(trigger, event);

        if (event._stopPropagation)
            return event;

        if (scene) {
            scene.trigger(trigger, event);
        } else if (!event._stopPropagation)
            this.trigger(trigger, event);

        return event;
    }
    /** ======== END ======== */

    /** ======== KEYS ======== */
    pressedKeys = new Map(); // Map<physicalKey, {physical: '', logical: ''}>
    keyMap = {
        'control': 'ctrl',
        ' ': 'space',
        'arrowup': 'up',
        'arrowdown': 'down',
        'arrowleft': 'left',
        'arrowright': 'right',
        'escape': 'esc',
        'enter': 'enter',
        'shift': 'shift',
        'alt': 'alt',
        'meta': 'meta', // for Command key on Mac
        'delete': 'del',
        'backspace': 'backspace',
        'tab': 'tab',
        'capslock': 'caps',
        'pageup': 'pageup',
        'pagedown': 'pagedown',
        'insert': 'ins',
        'home': 'home',
        'end': 'end'
    };

    isKeyPressed (...keys) {
        return keys.some(k => this.pressedKeys.has(k));
    }
    isLogicalKeyPressed (...keys) {
        return keys.some(k =>
            Array.from(this.pressedKeys.values()).some(keyObj => keyObj.logical === k)
        );
    }
    #normalizeKeyPhysical (e) {
        // Handle letter keys (KeyA, KeyB, KeyC, ...)
        if (e.code && e.code.startsWith('Key'))
            return e.code.replace('Key', '').toLowerCase();

        // Handle digit keys (Digit0, Digit1, ...)
        if (e.code && e.code.startsWith('Digit'))
            return e.code.replace('Digit', '');

        // Handle special keys using keyMap
        const keyFromEvent = e.key.toLowerCase();
        return this.keyMap[keyFromEvent] || keyFromEvent;
    }
    #normalizeKeyLogical (e) {
        const key = e.key.toLowerCase();
        return this.keyMap[key] || key;
    }
    #orderKeys (keys) {
        const priority = ['ctrl', 'shift', 'alt', 'meta'];
        return [...keys].sort((a, b) => {
            const ai = priority.indexOf(a);
            const bi = priority.indexOf(b);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
        });
    }
    _handleKeyDown (e) {
        e?.preventDefault?.();

        // Get normalized keys
        const physicalKey = this.#normalizeKeyPhysical(e);
        const logicalKey = this.#normalizeKeyLogical(e);

        // Store both physical and logical keys
        this.pressedKeys.set(physicalKey, {
            physical: physicalKey,
            logical: logicalKey
        });

        // Generate combo from physical keys
        const combo = this.#orderKeys(this.pressedKeys.keys()).join('+');

        // Create key event object with all information
        const keyEvent = {
            key: logicalKey,        // The letter typed by the user
            combo: combo,           // Physical composition (ctrl+a)
            physical: physicalKey,  // Physical key
            original: e.key,        // Raw key from browser
        };

        // Trigger events
        this.trigger('keydown', keyEvent, e);
        this.trigger(combo, keyEvent, e);
    }
    _handleKeyUp (e) {
        e?.preventDefault?.();

        // Get normalized keys
        const physicalKey = this.#normalizeKeyPhysical(e);
        const logicalKey = this.#normalizeKeyLogical(e);

        // Get combo before removing the key
        const combo = this.#orderKeys(this.pressedKeys.keys()).join('+');

        // Remove key from pressed map
        this.pressedKeys.delete(physicalKey);

        // Create key event object
        const keyEvent = {
            key: logicalKey,        // The letter typed by the user
            combo: combo,           // Physical composition (ctrl+a)
            physical: physicalKey,  // Physical key
            original: e.key         // Raw key from browser
        };

        // Trigger event
        this.trigger('keyup', keyEvent, e);
    }
    /** ======== END ======== */

    /** ======== COLORS ======== */
    hexToRgb (hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    rgbToHex (r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    hslToRgb (h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    randHex (includeAlpha = false) {
        // Random number generation for RGB
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);

        // Convert to hexadecimal format and add zeros if needed.
        const toHex = (n) => n.toString(16).padStart(2, '0');

        if (includeAlpha) {
            const a = Math.floor(Math.random() * 256);
            return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
        }

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    randRgb (includeAlpha = false) {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);

        if (includeAlpha) {
            // Generate a random number between 0 and 1 for alpha.
            const a = Math.random().toFixed(2);
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }

        return `rgb(${r}, ${g}, ${b})`;
    }
    randHsl (options = {}, includeAlpha = false) {
        const {
            hueRange = [0, 360],
            saturationRange = [0, 100],
            lightnessRange = [0, 100]
        } = options;

        // Generate random values within specified ranges
        const h = Math.floor(
            Math.random() * (hueRange[1] - hueRange[0]) + hueRange[0]
        );
        const s = Math.floor(
            Math.random() * (saturationRange[1] - saturationRange[0]) + saturationRange[0]
        );
        const l = Math.floor(
            Math.random() * (lightnessRange[1] - lightnessRange[0]) + lightnessRange[0]
        );

        if (includeAlpha) {
            const a = Math.random().toFixed(2);
            return `hsla(${h}, ${s}%, ${l}%, ${a})`;
        }

        return `hsl(${h}, ${s}%, ${l}%)`;
    }
    adjustAlpha (colorString, multiplier) {
        if (colorString.includes('rgba')) {
            return colorString.replace(/rgba\((.+),\s*([0-9.]+)\)/, (match, rgb, alpha) => {
                const newAlpha = Math.min(parseFloat(alpha) * multiplier, 1);
                return `rgba(${rgb}, ${newAlpha})`;
            });
        } else if (colorString.includes('rgb')) {
            const rgb = colorString.match(/rgb\((.+)\)/)[1];
            const newAlpha = Math.min(0.5 * multiplier, 1);
            return `rgba(${rgb}, ${newAlpha})`;
        } else {
            // Handle hex colors by converting to rgba
            const hex = colorString.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const newAlpha = Math.min(0.5 * multiplier, 1);
            return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
        }
    }
    /** ======== END ======== */

    /** ======== ANIMATIONS ======== */
    animate (callback, options = {}) {
        const config = {
            onPause: null,      // callback when paused
            onResume: null,     // callback when resumed
            onCancel: null,     // callback when cancelled
            ...options
        };

        let animationId = null;
        let pausedAt = 0;
        let totalPause = 0;
        let startTime = performance.now();
        let cancelled = false;

        const animate = (now) => {
            // Check if cancelled
            if (cancelled) {
                config.onCancel?.();
                return;
            }

            /* ---- engine paused -> record pause start ---- */
            if (!this.running || this.freezed) {
                if (pausedAt === 0) {
                    pausedAt = now;
                    config.onPause?.(now);
                }
                animationId = requestAnimationFrame(animate);
                return;
            }

            /* ---- just resumed -> update total paused time ---- */
            if (pausedAt !== 0) {
                totalPause += now - pausedAt;
                config.onResume?.(now, totalPause);
                pausedAt = 0;
            }

            const adjustedNow = now - totalPause;
            const elapsed = adjustedNow - startTime;

            // Call user callback with timing info
            const shouldContinue = callback({
                now: adjustedNow,
                elapsed,
                rawNow: now,
                totalPause,
                isPaused: false
            });

            // Continue animation if callback returns true
            if (shouldContinue !== false) {
                animationId = requestAnimationFrame(animate);
            }
        };

        animationId = requestAnimationFrame(animate);

        // Return control object
        return {
            cancel: () => {
                cancelled = true;
                if (animationId) {
                    cancelAnimationFrame(animationId);
                }
            },
            getElapsed: () => performance.now() - totalPause - startTime,
            getTotalPause: () => totalPause,
            isPaused: () => pausedAt !== 0
        };
    }
    defineAnimation (name, keyframes, options = {}) {
        this.animations[name] = {
            keyframes,
            options: {
                duration: options.duration || 1000,
                repeat: options.repeat || 0,
                easing: options.easing || 'linear'
            }
        };
        return this;
    }
    /** ======== END ======== */

    /** ======== WORLD SIZE ======== */
    worldSize (type = 'bounds') {
        switch (type) {
            case 'bounds':
                if (this.camera && this.camera.bounds) {
                    return {
                        width : this.camera.bounds.width,
                        height: this.camera.bounds.height
                    };
                }
                return {
                    width : this.baseWidth,
                    height: this.baseHeight
                };
            case 'viewport':
                const zoom = this.camera ? this.camera.zoom : 1;
                return {
                    width : this.baseWidth / zoom,
                    height: this.baseHeight / zoom
                };
            case 'base':
                return {
                    width : this.baseWidth,
                    height: this.baseHeight
                };
            case 'canvas':
                return {
                    width : this.canvas.width,
                    height: this.canvas.height
                };
            default:
                return this.worldSize('bounds');
        }
    }
    /** ======== END ======== */

    /** ======== SCREENSHOT ======== */
    shot (options = {}) {
        const {
            format = 'png',
            quality = 1.0,
            backgroundColor = this.config.background,
            download = false,
            filename = `pixalo-screenshot-${Date.now()}`
        } = options;

        // Validate parameters
        if (!['png', 'jpeg', 'webp'].includes(format.toLowerCase()))
            return this.error('Invalid format. Supported formats are: png, jpeg, webp');

        if (quality < 0 || quality > 1)
            return this.error('Quality must be between 0 and 1');

        if (this.config.worker) {
            return new Promise(resolve => {
                this.workerSend({
                    action: 'take_screenshot',
                    ...options
                }, 'screenshot_taken', event => resolve({
                    ...event.data.details,
                    revoke: () => URL.revokeObjectURL(blobURL)
                }));
            });
        }

        // Create a temporary canvas to handle the screenshot
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // Set the dimensions to match the original canvas
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;

        // Fill background if specified
        if (backgroundColor) {
            tempCtx.fillStyle = backgroundColor;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }

        // Draw the current canvas content
        tempCtx.drawImage(this.canvas, 0, 0);

        // Convert to data URL
        const mimeType = `image/${format.toLowerCase()}`;
        const dataURL = tempCanvas.toDataURL(mimeType, quality);

        // Convert to Blob
        const blob = Pixalo.dataURLToBlob(dataURL);

        // Create Blob URL
        const blobURL = URL.createObjectURL(blob);

        // Handle download if requested
        if (download) {
            const link = document.createElement('a');
            link.download = `${filename}.${format.toLowerCase()}`;
            link.href = dataURL;
            link.click();
        }

        // Cleanup
        tempCanvas.remove();

        return {
            dataURL,
            blob,
            blobURL,
            width: tempCanvas.width,
            height: tempCanvas.height,
            revoke: () => URL.revokeObjectURL(blobURL)
        };
    }
    /** ======== END ======== */

    /** ======== MATHS ======== */
    getDistance (x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    randBetween (min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    clamp (value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    lerp (start, end, amount) {
        return start + (end - start) * amount;
    }
    degToRad (degrees) {
        return degrees * (Math.PI / 180);
    }
    radToDeg (radians) {
        return radians * (180 / Math.PI);
    }
    getAngle (x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }
    rotatePoint (centerX, centerY, pointX, pointY, angle) {
        const radians = this.degToRad(angle);
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const dx  = pointX - centerX;
        const dy  = pointY - centerY;

        return {
            x: centerX + (dx * cos - dy * sin),
            y: centerY + (dx * sin + dy * cos)
        };
    }
    int (value, defValue) {
        if (value == null) return defValue;
        const parsed = Number(value);
        return isNaN(parsed) ? defValue : parsed;
    }
    /** ======== END ======== */

    async wait (...args) {
        if (args.length === 0)
            return [];

        const promises = this._flattenPromises(args);

        if (promises.length === 0)
            return [];

        try {
            return await Promise.all(promises);
        } catch (error) {
            throw new Error(`Wait operation failed: ${error.message}`);
        }
    }
    _flattenPromises (args) {
        const promises = [];

        for (const arg of args) {
            if (Array.isArray(arg)) {
                promises.push(...this._flattenPromises(arg));
            } else if (arg && typeof arg.then === 'function') {
                promises.push(arg);
            } else if (arg !== null && arg !== undefined) {
                promises.push(Promise.resolve(arg));
            }
        }

        return promises;
    }

    static dataURLToBlob (dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new Blob([u8arr], {type: mime});
    }

    static scriptToUrl (script) {
        try {
            new URL(script);
            return script;
        } catch { /* not a full url */ }

        const isFn = v => typeof v === 'function';

        /** Function */
        if (isFn(script))
            script = `${script.toString()}()`;

        /** Path */
        else if (/^(?:\.\/|\.\.\/|\/|[^/]*\.[a-zA-Z0-9]{1,5}$)/.test(script) && !/\s/.test(script))
            return script;

        /** Function Name */
        else if (/^[a-zA-Z_$][\w$]*$/.test(String(script).trim())) {
            const fnName = String(script).trim();
            const fn = globalThis[fnName];
            if (isFn(fn))
                script = `(${fn.toString()})();`; // IIFE
        }

        /** Script */
        else if (/[(){}\[\];=>]/.test(script) || /\b(function|=>|var|let|const|if|for|while|return)\b/.test(script)) {/** Nothing */}

        else throw new Error(`${script} is not valid`);

        const blob = new Blob([script], {type: 'application/javascript'});
        return URL.createObjectURL(blob);
    }

}

export default Utils;