/**
 * Copyright (c) 2025-2026 Pixalo
 * @Repository: https://github.com/pixalo
 * @License: MIT
 */
import Utils        from './Utils.js';
import Debugger     from './Debugger.js';
import Assets       from './Assets.js';
import Bezier       from './Bezier.js';
import Ease         from './Ease.js';
import Camera       from './Camera.js';
import Background   from './Background.js';
import Grid         from './Grid.js';
import Entity       from './Entity.js';
import Collision    from './Collision.js';
import Physics      from './Physics.js';
import TileMap      from './TileMap.js';
import Emitters     from './Emitters.js';
import AudioManager from './AudioManager.js';

class Pixalo extends Utils {

    constructor (selector, config = {}) {
        super();

        selector = selector || {};

        if (typeof selector === 'object') {
            config = {...selector, ...config};
        } else if (typeof selector === 'string' || (typeof HTMLCanvasElement !== 'undefined' && selector instanceof HTMLCanvasElement)) {
            this.canvas = Pixalo._handleCanvasSelector(selector, config?.appendTo || null);
        } else {
            throw new Error('Invalid selector');
        }

        config.worker        = typeof DedicatedWorkerGlobalScope !== 'undefined';

        this.id              = 'main';
        this.isPixalo        = true;
        this.isReady         = false;
        this.isScene         = config.isScene || false;
        this.freezed         = false;
        this.timers          = new Map();
        this.dataset         = new Map();
        this.scenes          = new Map();
        this.eventListeners  = new Map();

        this.#init(config, false);
    }

    async #init (config, run = false) {
        if (config?.worker && !run)
            return Promise.resolve().then(() => this.#setupWorker(config));

        this._createWindow(config?.window);

        const context = {
            id                : '2d',
            alpha             : true,
            colorSpace        : 'srgb',
            desynchronized    : true,
            willReadFrequently: false,
            ...(config?.context || {})
        };

        if (!config.isScene)
            this.ctx    = this.canvas.getContext(context.id, context);
        else {
            this.ctx    = config.ctx;
            this.canvas = config.canvas;
        }

        this.config = {
            context,
            worker       : config.worker        || false,
            width        : config.width         || (this.canvas.width || 0),
            height       : config.height        || (this.canvas.height || 0),
            fps          : config.fps           || 60,
            grid         : config.grid          || false,
            quality      : config.quality       || this.window.devicePixelRatio,
            camera       : config.camera        || {},
            physics      : config.physics       || {},
            collision    : config.collision     || {children: false},
            background   : config.background    || '#ffffff',
            resizeTarget : config.resizeTarget  || false,
            autoResize   : config.autoResize    ?? true,
            autoStartStop: config.autoStartStop ?? true
        };
        this.baseWidth  = this.config.width;
        this.baseHeight = this.config.height;

        this.running    = false;
        this.lastTime   = 0;

        if (!config.isScene) {
            this.debugger   = new Debugger(this, {
                active: Boolean(config.debugger),
                ...config.debugger || {},
                fps: {
                    target: this.config.fps,
                    actual: this.config.fps,
                    ratio : 100
                }
            });
        }

        this.entities           = new Map();
        this.sortedEntities     = {
            scene   : null,
            entities: []
        };

        this.assets             = new Assets(this);
        this.background         = new Background(this);

        if (!config.isScene)
            this.camera         = new Camera(this, config.camera);

        this.grid               = new Grid(this, config.grid || {});

        this.physicsEnabled     = Boolean(config.physics);
        this.physics            = new Physics(this, config.physics);

        this.collisionEnabled   = Boolean(config.collision);
        this.collision          = new Collision();

        if (!config.isScene)
            this.tileMap        = new TileMap(this);

        this.emitters           = new Emitters(this);
        this.audio              = new AudioManager(this.config.worker);
        if (config.mute === true) {
            this.audio.muteAll();
        }

        this.animations         = {};
        this.deltaTime          = 0;
        this.maxDeltaTime       = Math.max(1000 / this.config.fps, 16.67);

        this._applyCanvasConfig();

        this.draggedEntity      = null;
        this.draggedEntities    = new Map();
        this.hoveredEntity      = null;
        this.mouseDownEntity    = null;
        this.touchStartEntities = new Map();
        this._setupEventListeners();

        this.isReady = true;
        this.trigger('ready');
    }

    _createWindow ($window = null) {
        let {innerWidth, outerWidth, innerHeight, outerHeight, devicePixelRatio} = $window || {
            innerWidth : window.innerWidth,
            innerHeight: window.innerHeight,
            outerWidth : window.outerWidth,
            outerHeight: window.outerHeight,
            devicePixelRatio: window.devicePixelRatio
        };
        const zoom = Math.round((outerWidth / innerWidth) * 100);
        const bar  = outerHeight - innerHeight;

        this.window = {
            zoom,
            width : Math.round(outerWidth * 100 / zoom),
            height: outerHeight - bar,
            outerWidth, outerHeight,
            innerWidth, innerHeight,
            devicePixelRatio
        };
    }
    _applyCanvasConfig () {
        if (this.isScene) return;

        const config = this.config;
        const canvas = this.canvas;

        const canvasConfig = {
            // Canvas attributes
            attributes: {
                tabIndex: 0,
                width: config.width * config.quality,
                height: config.height * config.quality
            },

            // Canvas style properties
            style: {
                width: config.width + 'px',
                height: config.height + 'px',
                outline: 'none',
                backgroundColor: config.background,
                imageRendering: config.imageRendering || canvas.style?.imageRendering,
                colorProfile: config.context.colorSpace || 'srgb',
                colorScheme: 'normal'
            }
        };

        if (!canvas.style)
            canvas.style = {};

        // Apply canvas attributes
        Object.assign(this.canvas, canvasConfig.attributes);
        Object.assign(this.canvas.style, canvasConfig.style);

        this.workerSend({
            action: 'update_canvas',
            props: canvasConfig
        });

        // Setup auto resize if target specified
        if (config.resizeTarget) {
            this.workerSend({
                action: 'set_resize_target',
                target: config.resizeTarget
            });
        }
    }

    /** ======== WORKER ======== */
    #setupWorker (config) {
        if (typeof DedicatedWorkerGlobalScope === 'undefined')
            throw new Error('Please run Pixalo in the Worker environment.');

        if (this.isScene) {
            const rootParent = this.rootParent();
            config.worker = rootParent.config.worker;
            config.window = rootParent.window;
            this.#init(config, true);
            return;
        }

        onmessage = event => this.trigger('worker_msg', event);
        onerror   = event => this.trigger('worker_err', event);

        this.one('worker_msg', msg => {
            const data = msg.data;

            config.worker = data.wid;
            config.window = {
                ...config.window,
                ...data.window
            };
            this.canvas = data.canvas;

            this.#init(config, true);
            this.workerSend({
                wid: config.worker,
                action: 'ready'
            });

            this.on('worker_msg', this.audio._handleWorker, {removeable: false});
        });
    }
    async workerSend (data = {}, wait_for = null, callback = null) {
        if (!this.config.worker) return this;
        const rootParent = this.rootParent();

        postMessage({
            wid: rootParent.config.worker,
            ...data
        });

        if (wait_for && typeof callback === 'function') {
            const _callback = event => {
                if (event.data.action === wait_for) {
                    callback(event);
                    rootParent.off('worker_msg', _callback);
                }
            };
            rootParent.on('worker_msg', _callback);
        }

        return this;
    }
    /** ======== END ======== */

    /** ======== SETUP EVENT LISTENERS ======== */
    _setupEventListeners () {
        if (this.isScene) return;

        if (typeof window === 'undefined' || typeof document === 'undefined') {
            if (this.config.worker) {
                this.on('worker_msg', this._workerEventListeners, {removeable: false});
                return;
            }
            this.warn('Browser environment is required. This feature is only available in browser context.');
            return;
        }

        this._windowResizeListener();

        // Setup auto resize if target specified
        let target = this.config.resizeTarget;
        if (target && target !== 'window' && target !== 'document') {
            if (typeof target === 'string')
                target = document.querySelector(target);
            this._setupResizeObserver(target);
        } else {
            // Start observing canvas size changes
            this._setupResizeObserver(this.canvas);
        }

        document.addEventListener('visibilitychange', () => {
            const isVisible = !document.hidden;
            if (this.config.autoStartStop)
                isVisible ? this.start() : this.stop();
            this.trigger('visibility', isVisible);
        });

        this.canvas.addEventListener('click', this._handleClick.bind(this));
        this.canvas.addEventListener('contextmenu', this._handleRightClick.bind(this));

        this.canvas.addEventListener('mousemove', this._handleMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this._handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this._handleMouseUp.bind(this));
        this.canvas.addEventListener('touchstart', this._handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this._handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this._handleTouchEnd.bind(this));
        this.canvas.addEventListener('touchcancel', this._handleTouchCancel.bind(this));
        this.canvas.addEventListener('wheel', this._handleWheel.bind(this), { passive: false });

        this.canvas.addEventListener('keydown', this._handleKeyDown.bind(this));
        this.canvas.addEventListener('keyup', this._handleKeyUp.bind(this));
    }
    _workerEventListeners (event) {
        if (this.isScene) return;

        const data = event.data;

        // Handle canvas events
        if (data?.action === 'canvas_event') {
            switch (data.event.type) {
                case 'click':
                    this._handleClick(data.event);
                    break;
                case 'contextmenu':
                    this._handleRightClick(data.event);
                    break;
                case 'keydown':
                    this._handleKeyDown(data.event);
                    break;
                case 'keyup':
                    this._handleKeyUp(data.event);
                    break;
                case 'mousemove':
                    this._handleMouseMove(data.event);
                    break;
                case 'mousedown':
                    this._handleMouseDown(data.event);
                    break;
                case 'mouseup':
                    this._handleMouseUp(data.event);
                    break;
                case 'touchstart':
                    this._handleTouchStart(data.event);
                    break;
                case 'touchmove':
                    this._handleTouchMove(data.event);
                    break;
                case 'touchend':
                    this._handleTouchEnd(data.event);
                    break;
                case 'touchcancel':
                    this._handleTouchCancel(data.event);
                    break;
                case 'wheel':
                    this._handleWheel(data.event);
                    break;
            }
            return;
        }

        // Handle visibility change
        if (data?.action === 'visibilitychange') {
            const isVisible = !data.hidden;
            if (this.config.autoStartStop)
                isVisible ? this.start() : this.stop();
            this.trigger('visibility', !data.hidden);
            return;
        }

        // Handle Canvas BoundingClientRect
        if (data?.action === 'boundingClientRect')
            this.canvas.getBoundingClientRect = () => data.rect;

        // Setup auto resize if target specified
        if (data?.action === 'resizedTarget') {
            if (typeof data.window === 'object') {
                this._createWindow(data.window);
                data.width  = this.window.width;
                data.height = this.window.height;
            }

            if (this.config.autoResize)
                this.resize(data.width, data.height, true, this.config.resizeTarget);
            else
                this.trigger('resize', {
                    width : data.width, height: data.height,
                    target: this.config.resizeTarget
                });
        }
    }
    /** ======== END ======== */

    /** ======== QUALITY ======== */
    quality (value) {
        if (value === undefined)
            return this.config.quality;

        value = Number(value.toFixed(2));

        this.config.quality = value;
        this._applyQuality(value);

        return this;
    }
    _applyQuality (quality) {
        this.canvas.width = this.baseWidth * quality;
        this.canvas.height = this.baseHeight * quality;

        this.canvas.style.width = this.baseWidth + 'px';
        this.canvas.style.height = this.baseHeight + 'px';

        this.ctx.scale(quality, quality);
    }
    /** ======== END ======== */

    /** ======== EVENTS ======== */
    on (eventName, callback, config = {}) {
        config = {removeable: true, ...config};

        if (Array.isArray(eventName)) {
            eventName.forEach(e => this.on(e, callback, config));
            return this;
        }
        if (typeof eventName === 'object') {
            for (const k in eventName) this.on(k, eventName[k], config);
            return this;
        }

        if (!this.eventListeners.has(eventName))
            this.eventListeners.set(eventName, new Set());

        this.eventListeners.get(eventName).add({cb: callback, cfg: config});
        return this;
    }
    one (eventName, callback, config = {}) {
        config = {removeable: true, ...config};

        if (Array.isArray(eventName)) {
            eventName.forEach(e => this.one(e, callback, config));
            return this;
        }
        if (typeof eventName === 'object') {
            for (const k in eventName) this.one(k, eventName[k], config);
            return this;
        }

        const onceWrapper = (...args) => {
            callback.apply(this, args);
            this.off(eventName, onceWrapper);
        };

        this.on(eventName, onceWrapper, config);
        return this;
    }
    trigger (eventName, ...args) {
        args.push(eventName);

        if (Array.isArray(eventName)) {
            eventName.forEach(e => this.trigger(e, ...args));
            return this;
        }

        const set = this.eventListeners.get(eventName);
        if (!set) return this;

        // We use Array.from to avoid errors if the listener is deleted during execution.
        Array.from(set).forEach(({cb}) => cb.apply(this, args));
        return this;
    }
    off (eventName, callback) {
        if (Array.isArray(eventName)) {
            eventName.forEach(e => this.off(e, callback));
            return this;
        }

        const set = this.eventListeners.get(eventName);
        if (!set) return this;

        if (callback) {
            for (const item of set) {
                if (item.cb === callback) {
                    set.delete(item);
                    break;
                }
            }
        } else {
            set.clear();
        }
        return this;
    }
    clearEvents () {
        for (const [eventName, set] of this.eventListeners.entries()) {
            for (const item of [...set])
                if (item.cfg?.removeable !== false) set.delete(item);
            if (set.size === 0) this.eventListeners.delete(eventName);
        }
    }
    /** ======== END ======== */

    /** ======== TIMERS ======== */
    timer (callback, delay, repeat = true) {
        const timerId = Symbol();

        const timerConfig = {
            callback,
            delay,
            repeat,
            lastTime: performance.now(),
            accumulated: 0,
            isRunning: true
        };

        this.timers.set(timerId, timerConfig);
        return timerId;
    }
    timeout (callback, delay) {
        return this.timer(callback, delay, false);
    }
    clearTimer (timerId) {
        return this.timers.delete(timerId);
    }
    updateTimers (timestamp) {
        this.timers.forEach((timer, id) => {
            if (!timer.isRunning) return;

            const deltaTime = timestamp - timer.lastTime;
            timer.accumulated += deltaTime;

            while (timer.accumulated >= timer.delay) {
                timer.callback();

                if (timer.repeat) {
                    timer.accumulated -= timer.delay; // We only reduce the delay by the amount.
                } else {
                    this.clearTimer(id);
                    break;
                }
            }

            timer.lastTime = timestamp;
        });
    }
    async delay (ms) {
        return new Promise(resolve => this.timeout(resolve, ms));
    }
    /** ======== END ======== */

    /** ======== DATA ======== */
    data (key, value) {
        if (value === undefined)
            return this.dataset.get(key);
        this.dataset.set(key, value);
        return this;
    }
    unset (key) {
        this.dataset.delete(key);
        return this;
    }
    /** ======== END ======== */

    /** ======== CONTROLS ======== */
    fps (value) {
        if (value === undefined)
            return this.config.fps;

        value = Math.max(1, ~~value);
        this.config.fps   = value;
        this.debugger.fps = {
            target: value,
            actual: value,
            ratio : 100
        };
        this.maxDeltaTime = Math.max(1000 / value, 16.67);
        return this;
    }
    start () {
        if (!this.isReady)
            throw new Error('Initialization is not done. Please use the "ready" event to check and then call the "start" function.');

        if (this.running)
            return this;

        this.running = true;
        this.timers.forEach(timer => {
            timer.isRunning = true;
            timer.lastTime  = performance.now();
        });
        this.audio.resumeAll();
        requestAnimationFrame(this.loop.bind(this));
        this.trigger('start');
        return this;
    }
    freeze () {
        if (!this.isReady) return this;
        this.freezed = true;
        this.trigger('freeze');
        this.clearSortedEntities();
        return this;
    }
    unfreeze () {
        if (!this.isReady) return this;
        this.freezed = false;
        this.trigger('unfreeze');
        this.clearSortedEntities();
        return this;
    }
    stop () {
        if (!this.isReady)
            throw new Error('Initialization is not done. Please use the "ready" event to check and then call the "stop" function.');

        this.running = false;
        this.pressedKeys.clear();
        this.timers.forEach(timer => {
            timer.isRunning = false;
        });
        this.audio.pauseAll();
        this.trigger('stop');
        return this;
    }
    clear () {
        if (this.ctx?.reset)
            return this.ctx.reset();

        // Full reset of transforms
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Clearing the entire canvas while maintaining quality
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Drawing the background in global coordinates
        this.ctx.fillStyle = this.config.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    loop (timestamp) {
        if (!this.running || this.isScene) return;

        const frameInterval = 1000 / this.config.fps; // Time interval between each frame
        let deltaTime = timestamp - this.lastTime;
        deltaTime = Math.min(deltaTime, this.maxDeltaTime);

        this.debugger._updateFPS(timestamp);

        // Execute frame only if enough time has passed
        if (deltaTime >= frameInterval) {
            this.deltaTime = deltaTime;
            if (!this.freezed) {
                this.updateTimers(timestamp);
                this.update(deltaTime);
            }
            this.render();

            const frameTime = timestamp - (deltaTime % frameInterval); // Fine-tune the last frame time
            this.lastTime = frameTime;

            for (const [, scene] of this.scenes) {
                if (!scene.running) continue;

                scene.deltaTime = deltaTime;
                if (!scene.freezed) {
                    scene.updateTimers(timestamp);
                    scene.update(deltaTime);
                }
                scene.render();
                scene.lastTime = frameTime;
            }

            this.debugger.renderPanel();
        }

        requestAnimationFrame(this.loop.bind(this));
    }
    update (deltaTime) {
        if (!this.isScene)
            this.camera.update();

        this.background._updateLayers(deltaTime);

        if (this.tileMap && this.tileMap.running)
            this.tileMap.update();

        for (const [_, entity] of this.entities) {
            if (typeof entity.update === 'function')
                entity.update(deltaTime);
        }

        if (this.physicsEnabled)
            this.physics.update(deltaTime);

        if (this.collisionEnabled && !this.physicsEnabled)
            this.collision.updateCollisions([
                ...this.getEntities(!this.config.collision.children).values()
            ]);

        this.emitters.update(deltaTime);

        this.trigger('update', deltaTime);
    }
    render () {
        const ctx = this.ctx;
        if (!this.isScene)
            this.clear();

        ctx.save();

        if (!this.isScene)
            ctx.scale(this.config.quality, this.config.quality);

        // If it was a scene: Prevent ctx.save() from running to prevent memory leaks
        this.camera.apply(!this.isScene);

        this.trigger('beforeRender', ctx);

        if (this.isScene && this.bounds)
            this._renderSceneBounds(ctx);

        this.background._renderLayers(ctx, false);

        if (this.tileMap && this.tileMap.running)
            this.tileMap._renderMap();

        this.grid.render(ctx);

        if (!this.isScene)
            this.getSortedEntitiesByZIndex(true, true).forEach(entity => entity?.render?.(ctx));
        else if (!this.mergeable)
            this.getSortedEntitiesByZIndex(true, false).forEach(entity => entity?.render?.(ctx));

        this.trigger('render', ctx);

        this.emitters.render(ctx);
        this.background._renderLayers(ctx, true);

        if (!this.isScene)
            this.debugger.render(ctx);

        this.trigger('afterRender', ctx);
        ctx.restore();
    }
    reset (options = {}) {
        options = {
            assets    : true,
            audio     : true,
            animations: true,
            scenes    : true,
            ...options
        };
        this.trigger('reset');

        // Stop the engine first
        this.stop();

        // Clear runtime data
        this.freezed = false;
        this.timers.clear();
        this.pressedKeys.clear();
        this.clearEvents();
        this.entities.clear();
        (this.parent || this).clearSortedEntities();

        // Reset subsystems
        this.debugger.clearItems();

        if (options.assets)
            this.assets.clear();

        if (options.scenes)
            this.scenes.clear();

        this.collision.reset();

        if (options.audio)
            this.audio.cleanup();

        this.background.clear();
        this.emitters.clear();
        this.physics.reset();

        if (this.tileMap)
            this.tileMap.reset();

        // Reset state variables
        this.draggedEntity = null;
        this.draggedEntities.clear();
        this.hoveredEntity = null;
        if (options.animations)
            this.animations = {};
        this.lastTime = 0;

        // Reinitialize subsystems with original config
        this.background = new Background(this);
        this.camera     = new Camera(this, this.config.camera);
        this.grid       = new Grid(this, this.config.grid || {});
        this.physics    = new Physics(this, this.config.physics);
        this.collision  = new Collision();
        this.emitters   = new Emitters(this);
        if (!this.isScene && this.tileMap)
            this.tileMap = new TileMap(this);

        if (!this.isScene) {
            // Reset canvas and context
            this.clear();
            this._applyQuality(this.config.quality);

            // Reset canvas to original config
            this._applyCanvasConfig();
        }

        return this;
    }
    /** ======== END ======== */

    /** ======== SCENES ======== */
    scene (name, config = {}) {
        if (this.scenes.has(name)) return this.scenes.get(name);

        const scene = new Pixalo({
            ...config,
            isScene: true,
            canvas : this.canvas,
            ctx    : this.ctx
        });

        // References
        scene.parent      = this;
        scene.window      = this.window;
        scene.config      = this.config;

        // Overrides
        scene.debugger    = this.debugger;
        scene.camera      = this.camera;

        // Save scene
        scene.id          = name;
        scene.zIndex      = config.zIndex    || this.scenes.size + 1;
        scene.mergeable   = config.mergeable || false;
        scene.constrain   = config.constrain || true;
        scene.interactive = ['off', 'catch', 'flow'].includes(config.interactive) ? config.interactive : 'flow';
        scene.bounds      = {
            width : this.int(config.width, this.baseWidth),
            height: this.int(config.height, this.baseHeight),
            x     : this.int(config.x, 0),
            y     : this.int(config.y, 0),
            fill  : config.fill   || 'transparent',
            stroke: config.stroke || 'transparent'
        };

        this.scenes.set(scene.id, scene);
        return scene;
    }
    sortedScenes () {
        return [...this.scenes.values()].filter(s => s.running).sort(
            (a, b) => b.zIndex - a.zIndex
        );
    }
    rootParent (callback) {
        let current = this;
        while (current.parent) {
            callback?.(current);
            current = current.parent;
        }
        return current;
    }
    _renderSceneBounds (ctx) {
        const {fill, stroke, x, y, width, height} = this.bounds;
        ctx.fillStyle   = fill;
        ctx.strokeStyle = stroke;
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.fill();
        ctx.stroke();
    }
    /** ======== END ======== */

    /** ======== DEBUGGER ======== */
    enableDebugger () {
        return this.debugger.enableDebugger();
    }
    disableDebugger () {
        return this.debugger.disableDebugger();
    }

    log (...args) {
        if (this.debugger && this.debugger.active)
            console.log('%c[Pixalo LOG]', 'color: #2196f3;', ...args);
        return this;
    }
    info (...args) {
        if (this.debugger && this.debugger.active)
            console.info('%c[Pixalo INFO]', 'color: #4491F8;', ...args);
        return this;
    }
    warn (...args) {
        if (this.debugger && this.debugger.active)
            console.warn('%c[Pixalo WARN]', 'color: #ff9800;', ...args);
        return this;
    }
    error (...args) {
        if (this.debugger && this.debugger.active)
            console.error('%c[Pixalo ERROR]', 'color: #f44336;', ...args);
        return this;
    }
    /** ======== END ======== */

    /** ======== ENTITIES ======== */
    append (id, config = {}) {
        // Convert input to Entity instance if needed
        const entity = id instanceof Entity ? id : (
            config instanceof Entity ? config : new Entity(id, {...config, engine: this})
        );
        const rootParent = this.rootParent();
    
        // Handle duplicate IDs
        if (rootParent.mergeEntities(false, true).has(entity.id)) {
            this.error(`Entity (${entity.id}) exists with this ID`);
            return entity;
        }
    
        // Setup entity
        entity.engine = this;
        this.entities.set(entity.id, entity);
        
        // Update position if method exists
        entity.updatePosition?.();
    
        // Handle physics if enabled
        if (entity.physics || config.physics) {
            if (this.physicsEnabled)
                this.physics.addEntity(entity, entity.physics || config.physics);
            else if (this.mergeable && rootParent.physicsEnabled) {
                rootParent.physics.addEntity(entity, entity.physics || config.physics);
            }
        }

        this.debugger.addItem(entity.id, entity);

        (this.parent || this).clearSortedEntities();
    
        return entity;
    }
    getEntities (onlyParents = true) {
        if (onlyParents)
            return this.entities;

        const map = new Map();
        const walk = e => {
            map.set(e.id, e);
            e.children.forEach(walk);
        };
        this.entities.forEach(walk);
        return map;
    }
    mergeEntities (onlyParents = true, forceMerge = false) {
        const entities = this.getEntities(onlyParents);
        const scenes   = [...this.scenes.values()].filter(scene => scene.running && (scene.mergeable || forceMerge)).flatMap(
            scene => [...scene.getEntities(onlyParents)]
        );
        return new Map([...entities, ...scenes]);
    }
    getSortedEntitiesByZIndex (onlyParents = true, merge = false, forceMerge = false) {
        const entities = (merge ? this.mergeEntities(onlyParents, forceMerge) : this.getEntities(onlyParents)).values();
        return [...entities].sort((a, b) => a.zIndex - b.zIndex);
    }
    find (entityId) {
        return this.entities.get(entityId);
    }
    findDeep (id) {
        if (this.entities.has(id)) return this.entities.get(id);

        for (const entity of this.entities.values()) {
            const found = this._findDeepChildren(entity, id);
            if (found) return found;
        }
        return null;
    }
    findByClass (className) {
        className = className.trim();
        if (!className) {
            this.warn('ClassName is required');
            return [];
        }

        return Array.from(this.entities)
            .filter(([, ent]) => ent.class.has(className))
            .map(([, ent]) => ent);
    }
    findDeepByClass (className) {
        className = className.trim();
        if (!className) {
            this.warn('ClassName is required');
            return [];
        }

        const result = [];
        for (const entity of this.entities.values())
            this._findDeepClassChildren(entity, className, result);

        return result;
    }
    _findDeepChildren (entity, id) {
        if (entity.id === id) return entity;
        for (const child of entity.children.values()) {
            const found = this._findDeepChildren(child, id);
            if (found) return found;
        }
        return null;
    }
    _findDeepClassChildren (entity, className, out) {
        if (entity.class.has(className)) out.push(entity);
        for (const child of entity.children.values()) {
            this._findDeepClassChildren(child, className, out);
        }
    }
    isEntity (target) {
        return target instanceof Entity;
    }
    isEntities (target) {
        if (!(target instanceof Map)) return false;
        for (const [key, value] of target)
            if (typeof key !== 'string' || !(value instanceof Entity))
                return false;
        return true;
    }
    kill (entity) {
        entity = this.isEntity(entity) ? entity : this.findDeep(entity);
        entity?.kill?.();
        return this;
    }
    /** ======== END ======== */

    /** ======== COLLISIONS ======== */
    enableCollisions () {
        this.collisionEnabled = true;
        return this;
    }
    disableCollisions () {
        this.collisionEnabled = false;
        return this;
    }
    checkCollision (entityA, entityB) {
        return this.collision.detectCollisionDetailed(entityA, entityB);
    }
    checkGroupCollision (group1, group2) {
        for (const entityA of group1) {
            for (const entityB of group2) {
                if (this.detectCollisionDetailed(entityA, entityB)) {
                    return {entityA, entityB};
                }
            }
        }
        return false;
    }
    /** ======== END ======== */

}

Pixalo.prototype.Bezier = Bezier;
Pixalo.prototype.Ease   = Ease;

export default Pixalo;