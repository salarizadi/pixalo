The `Pixalo` class serves as the core engine and primary entry point for all game development operations.

## Overview

The Pixalo class is a comprehensive 2D game engine that provides a complete suite of tools for creating interactive games and applications. It manages the entire game lifecycle from initialization to rendering, offering seamless integration with modern web technologies including Web Workers, Canvas 2D API, and advanced input handling systems.

### Key Features

- **🎯 Unified API**: Single class provides access to all engine subsystems
- **⚡ High Performance**: Optimized rendering pipeline with configurable quality settings
- **🔧 Modular Architecture**: Optional physics, collision detection, particle systems, and audio management
- **📱 Cross-Platform**: Full support for desktop and mobile with touch/mouse input normalization
- **🧵 Worker Ready**: Built-in Web Worker support for main thread offloading
- **🎨 Rich Graphics**: Advanced background system, grid overlay, and camera controls
- **🔍 Development Tools**: Integrated debugger with performance monitoring and entity inspection

### Design Philosophy

Pixalo follows a component-based architecture where each system operates independently while maintaining seamless integration. The engine prioritizes developer experience through intuitive APIs, comprehensive error handling, and flexible configuration options that scale from simple prototypes to complex productions.

---

# Getting Start

```typescript
const game = new Pixalo('#canvas', {
    width: 800,
    height: 600,
    fps: 60,
    context: {
      // If you have a different, customized `context` that exactly emulates the commands and functions of `CanvasRenderingContext2D`,
      // enter its ID here.
      id: '2d',
      
      // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getContextAttributes
      alpha: true,
      colorSpace: 'srgb',
      desynchronized: true,
      willReadFrequently: false,
    },
    appendTo: String|HTMLElement,                 // Default(`body`) - Specify where to add the `canvas` tag
    quality: window.devicePixelRatio || 1,
    background: 'transparent' | '#fff' | 'hsl(178 80.6% 6.1%)',
    imageRendering: String,                       // Canvas image rendering style
    resizeTarget: 'window' | 'document' | `#${string}` | `.${string}` | HTMLElement,
    autoResize: Boolean,                          // Default(`true`) - Set to `true` for automatic resizing.
    autoStartStop: Boolean,                       // Default(`true`) pause rendering when tab is hidden, resume when visible
    debugger: DebuggerConfig<object> | Boolean,   // See Debugger class documentation
    grid: GridConfig<object> | Boolean,           // See Grid class documentation
    collision: CollisionConfig<object> | Boolean, // See Collision class documentation
    physics: PhysicsConfig<object> | Boolean,     // See Physics class documentation
    camera: CameraConfig<object> | Undefined,     // See Camera class documentation
});
```

### Key Points

- `Flexibility`: Most parameters are optional and come with default values.
- `Configuration Merging`: If selector is an object, it will be merged with the config.
- `Worker Environment`: The worker parameter is automatically detected.
- `Advanced Settings`: Each of the [`Debugger`](https://github.com/pixalo/pixalo/tree/main/wiki/v1/Debugger.md), [`Grid`](https://github.com/pixalo/pixalo/tree/main/wiki/v1/Grid.md), [
  `Physics`](https://github.com/pixalo/pixalo/tree/main/wiki/v1/Physics.md), [
  `Collision`](https://github.com/pixalo/pixalo/tree/main/wiki/v1/Collision.md), and [
  `Camera`](https://github.com/pixalo/pixalo/tree/main/wiki/v1/Camera.md) systems can be defined as complex objects with detailed
  configurations.

> An initialization is performed here. Note that the `game` variable is used throughout the documentation examples and
> is associated with this class.

# Quick Access

- [Public Methods](#public-methods)
- [Constants](#constants)

# Public Methods

## Worker Communication

### `workerSend(data = {}, wait_for = null, callback = null)` (async): Pixalo

Sends data to worker thread (only available in worker mode).

| Name     | Type     | Default |
|----------|----------|---------|
| data     | Object   | {}      |
| wait_for | String   | null    |
| callback | Function | null    |

**Usage Examples:**

```javascript
// Simple message to worker
game.workerSend({
    action: 'custom_action',
    payload: {score: 100}
});

// Send and wait for response
game.workerSend({
    action: 'calculate_physics'
}, 'physics_calculated', (response) => {
    console.log('Physics calculated:', response.data);
});
```

---

## Quality Control

### `quality(value)`: Number | Pixalo

Gets or sets the rendering quality multiplier for the canvas.

| Name  | Type   | Default   |
|-------|--------|-----------|
| value | Number | undefined |

**Usage Examples:**

```javascript
// Get current quality
const currentQuality = game.quality();

// Set quality to 2x for high DPI displays
game.quality(2);
```

---

## Event System

### `on(eventName, callback)`: Pixalo

Registers an event listener for specified event(s).

| Name      | Type                  | Default |
|-----------|-----------------------|---------|
| eventName | String\|Array\|Object | -       |
| callback  | Function              | -       |

**Usage Examples:**

```javascript
// Single event
game.on('ready', () => console.log('Engine ready!'));

// Multiple events
game.on(['start', 'stop'], (data) => console.log('Game state changed'));

// Object notation
game.on({
    'ready': () => console.log('Ready'),
    'update': (deltaTime) => console.log('Update:', deltaTime)
});
```

### `one(eventName, callback)`: Pixalo

Registers a one-time event listener that automatically removes itself after first execution.

| Name      | Type                  | Default |
|-----------|-----------------------|---------|
| eventName | String\|Array\|Object | -       |
| callback  | Function              | -       |

**Usage Examples:**

```javascript
// Single one-time event
game.one('ready', () => console.log('This runs only once'));

// Multiple one-time events
game.one(['start', 'render'], () => console.log('First occurrence'));
```

### `trigger(eventName, ...args)`: Pixalo

Triggers all listeners registered for the specified event(s).

| Name      | Type          | Default |
|-----------|---------------|---------|
| eventName | String\|Array | -       |
| ...args   | Any           | -       |

**Usage Examples:**

```javascript
// Trigger single event
game.trigger('custom-event', {score: 100});

// Trigger multiple events
game.trigger(['game-over', 'save-score'], playerData);
```

### `off(eventName, callback)`: Pixalo

Removes an event listener from specified event(s).

| Name      | Type          | Default |
|-----------|---------------|---------|
| eventName | String\|Array | -       |
| callback  | Function      | -       |

**Usage Examples:**

```javascript
const handler = () => console.log('Handler');
game.on('update', handler);

// Remove specific handler
game.off('update', handler);

// Remove from multiple events
game.off(['start', 'stop'], handler);
```

---

## Timer System

### `timer(callback, delay, repeat = true)`: Symbol

Creates a repeating timer that executes a callback at specified intervals.

| Name     | Type     | Default |
|----------|----------|---------|
| callback | Function | -       |
| delay    | Number   | -       |
| repeat   | Boolean  | true    |

**Usage Examples:**

```javascript
// Repeating timer (every 1000ms)
const timerId = game.timer(() => {
    console.log('Timer tick');
}, 1000);

// One-time timer
const oneTimeId = game.timer(() => {
    console.log('Execute once');
}, 2000, false);
```

### `timeout(callback, delay)`: Symbol

Creates a one-time timer that executes a callback after specified delay.

| Name     | Type     | Default |
|----------|----------|---------|
| callback | Function | -       |
| delay    | Number   | -       |

**Usage Examples:**

```javascript
// Execute after 3 seconds
game.timeout(() => {
    console.log('3 seconds passed');
}, 3000);
```

### `clearTimer(timerId)`: Boolean

Removes a timer by its ID.

| Name    | Type   | Default |
|---------|--------|---------|
| timerId | Symbol | -       |

**Usage Examples:**

```javascript
const timerId = game.timer(() => console.log('tick'), 1000);
// Later...
game.clearTimer(timerId);
```

### `updateTimers(timestamp)`: void

Advances every running timer by one frame and fires callbacks whose period has elapsed.

> :warning: Note: *(This is already invoked automatically by the Pixalo game-loop; only call it yourself if you disable
the built-in loop or run timers outside it.)*

| Name      | Type   | Description                                                        |
|-----------|--------|--------------------------------------------------------------------|
| timestamp | Number | Current monotonic time in milliseconds (e.g. `performance.now()`). |

**Usage Examples:**

```javascript
// Custom loop – you manage the clock
function myLoop (now) {
    game.updateTimers(now);
    requestAnimationFrame(myLoop);
}

requestAnimationFrame(myLoop);
```

### `delay(ms)` (async): Promise<void>

Returns a Promise that resolves after specified milliseconds.

| Name | Type   | Default |
|------|--------|---------|
| ms   | Number | -       |

**Usage Examples:**

```javascript
// Using with async/await
async function gameSequence () {
    console.log('Starting...');
    await game.delay(2000);
    console.log('2 seconds later');
}

// Using with .then()
game.delay(1000).then(() => {
    console.log('1 second passed');
});
```

---

## Global Data

### `data(key, value)`: Pixalo | any

Sets or gets global custom data.

| Name  | Type   | Default   |
|-------|--------|-----------|
| key   | String | —         |
| value | Any    | undefined |

**Usage Examples:**

```javascript
// set
game.data('highScore', 9500);

// get
const high = game.data('highScore'); // 9500
```

### `unset(key)`: Pixalo

Delete a global data from the game.

| Name | Type   | Default |
|------|--------|---------|
| key  | String | -       |

**Usage Examples:**

```javascript
game.unset('highScore'); // remove the key
game.data('highScore');  // → undefined
```

---

## Canvas Management

### `resize(width, height)`: Pixalo

Manually resizes the canvas to specified dimensions.

| Name   | Type   | Default |
|--------|--------|---------|
| width  | Number | -       |
| height | Number | -       |

**Usage Examples:**

```javascript
// Resize canvas to 1024x768
game.resize(1024, 768);
```

---

## Game Loop Control

### `startLoop()`: void

Starts the internal game loop with requestAnimationFrame.

**Usage Examples:**

```javascript
// Manually start the loop
game.startLoop();
```

### `loop(timestamp)`: void

Main game loop function that handles frame timing and updates.

| Name      | Type   | Default |
|-----------|--------|---------|
| timestamp | Number | -       |

**Usage Examples:**

```javascript
// Usually called automatically, but can be used for custom loops
game.loop(performance.now());
```

### `update(deltaTime)`: void

Updates all game systems including entities, physics, and collisions.

| Name      | Type   | Default |
|-----------|--------|---------|
| deltaTime | Number | -       |

**Usage Examples:**

```javascript
// Called automatically in game loop
game.update(16.67); // ~60fps delta
```

### `render()`: void

Renders all game elements to the canvas.

**Usage Examples:**

```javascript
// Called automatically in game loop
game.render();
```

### `start()`: Pixalo

Starts the game loop and resumes all timers and audio.

**Usage Examples:**

```javascript
game.start();
```

### `stop()`: Pixalo

Stops the game loop and pauses all timers and audio.

**Usage Examples:**

```javascript
game.stop();
```

### `clear()`: void

Clears the canvas and fills it with background color.

**Usage Examples:**

```javascript
game.clear();
```

### `reset()`: Pixalo

Resets the engine state, clearing all entities, events, and timers.

**Usage Examples:**

```javascript
// Complete engine reset
game.reset();
```

---

## Input System

### `getSortedEntitiesForInteraction()`: Array

Returns entities sorted by interaction priority (zIndex, depth, creation order).

**Usage Examples:**

```javascript
const sortedEntities = game.getSortedEntitiesForInteraction();
// Entities ordered for mouse/touch interaction
```

### `isPointInEntity(x, y, entity)`: Boolean

Checks if a point (x, y) is inside the specified entity's bounds.

| Name   | Type   | Default |
|--------|--------|---------|
| x      | Number | -       |
| y      | Number | -       |
| entity | Entity | -       |

**Usage Examples:**

```javascript
const player = game.find('player');
const isInside = game.isPointInEntity(100, 150, player);
if (isInside) {
    console.log('Point is inside player entity');
}
```

### `isKeyPressed(...keys)`: Boolean

Returns `true` if **any** of the given keys are currently pressed; otherwise `false`.

| Name | Type      | Default |
|------|-----------|---------|
| keys | ...String | —       |

**Usage Examples:**

```javascript
// single key
if (game.isKeyPressed('space')) shooting();

// multiple keys (OR logic)
const movingLeft = game.isKeyPressed('left', 'a');
player.style('flipX', movingLeft);
```

### `isLogicalKeyPressed(...keys)`: Boolean

Returns `true` if **any** of the given logical keys are currently pressed; otherwise `false`. Logical keys are based on the actual characters typed according to the current keyboard language.

| Name | Type      | Default |
|------|-----------|---------|
| keys | ...String | —       |

**Usage Examples:**

```javascript
// single logical key
if (game.isLogicalKeyPressed('ق')) console.log('Persian Q pressed');

// multiple logical keys (OR logic)
const typingHello = game.isLogicalKeyPressed('h', 'ه');
if (typingHello) startTyping();

// mixed language support
const confirmAction = game.isLogicalKeyPressed('y', 'ی', 'yes');
if (confirmAction) executeAction();
```

**Note:** Use `isKeyPressed()` for game controls (always consistent), and `isLogicalKeyPressed()` for text input or language-specific features.

---

## Debug System

### `enableDebugger()`: Pixalo

Enables the debug overlay and entity debug visualization.

**Usage Examples:**

```javascript
game.enableDebugger();
```

### `disableDebugger()`: Pixalo

Disables the debug overlay and entity debug visualization.

**Usage Examples:**

```javascript
game.disableDebugger();
```

### `log(...args)`: Pixalo

Logs debug information to console (only when debugger is active).

| Name    | Type | Default |
|---------|------|---------|
| ...args | Any  | -       |

**Usage Examples:**

```javascript
game.log('Player position:', player.x, player.y);
```

### `info(...args)`: Pixalo

Logs info message to console (only when debugger is active).

| Name    | Type | Default |
|---------|------|---------|
| ...args | Any  | -       |

**Usage Examples:**

```javascript
game.info('Game started successfully');
```

### `warn(...args)`: Pixalo

Logs warning message to console (only when debugger is active).

| Name    | Type | Default |
|---------|------|---------|
| ...args | Any  | -       |

**Usage Examples:**

```javascript
game.warn('Low performance detected');
```

### `error(...args)`: Pixalo

Logs error message to console (only when debugger is active).

| Name    | Type | Default |
|---------|------|---------|
| ...args | Any  | -       |

**Usage Examples:**

```javascript
game.error('Failed to load asset:', assetId);
```

---

## [Entity](https://github.com/pixalo/pixalo/tree/main/wiki/v1/Entity.md) Management

### `defineAnimation(name, keyframes, options = {})`: Pixalo

Defines a reusable animation that can be applied to entities.

| Name      | Type   | Default |
|-----------|--------|---------|
| name      | String | -       |
| keyframes | Array  | -       |
| options   | Object | {}      |

**Options Object Properties:**

- `duration`: Number - Animation duration in milliseconds
- `repeat`: Number - Repeat count (0 = no repeat, -1 = infinite)
- `easing`: String|Function - Easing function

**Usage Examples:**

```javascript
game.defineAnimation('blinking', [
    {
        color: '#268984',
        opacity: 0.1,
        // You can add more entity properties...
    },
    {
        color: '#F3A81B',
        opacity: 1,
        // You can add more entity properties...
    },
    // You can add more keyframes...
], {
    duration: 1000,
    easing: game.Ease.easeInBounce,
    repeat: -1
});
```

### `append(id, config = {})`: [Entity](https://github.com/pixalo/pixalo/tree/main/wiki/v1/Entity.md)

Creates and adds an entity to the game world.

| Name   | Type           | Default |
|--------|----------------|---------|
| id     | String\|Entity | -       |
| config | Object\|Entity | {}      |

**Usage Examples:**

```javascript
// Create with string ID
const player = game.append('player', {
    x: 100, y: 100,
    width: 32, height: 32
});

// Create with Entity instance
const entity = new Entity('enemy');
game.append(entity);

// Auto-generate unique ID for duplicates
const duplicate = game.append('player', {}); // ID conflict handled
```

### `getEntities(onlyParents)`: Map

Returns a Map of all entities in the game world.

| Name        | Type    | Default |
|-------------|---------|---------|
| onlyParents | Boolean | true    |

**Usage Examples:**

```javascript
const entities = game.getEntities();
console.log(`Total entities: ${entities.size}`);
```

```javascript
const entities = game.getEntities(false); // Get all entities + all children of entities
console.log(`Total entities and children: ${entities.size}`);
```

### `getSortedEntitiesByZIndex()`: Array

Returns an array of entities sorted by their z-index (back to front).

**Usage Examples:**

```javascript
const sortedEntities = game.getSortedEntitiesByZIndex();
// Entities ordered by rendering depth
```

### `find(entityId)`: [Entity](https://github.com/pixalo/pixalo/tree/main/wiki/v1/Entity.md) | undefined

Finds and returns an entity by its ID.

| Name     | Type   | Default |
|----------|--------|---------|
| entityId | String | -       |

**Usage Examples:**

```javascript
const player = game.find('player');
if (player) {
    player.move(10, 0);
}
```

### `findDeep(id)`: Entity | null

Recursively searches the entire entity tree for an entity with the given `id`.  
Starts from every root-level entity and walks down through all children.

| Name | Type   | Default |
|------|--------|---------|
| id   | String | —       |

**Returns:**  
The requested `Entity` instance if found; otherwise `null`.

**Usage Examples:**

```javascript
const player = game.findDeep('player-42');
if (player) player.data('health', 100);
```

### `findByClass(className)`: Array

Finds all entities that have the specified CSS class.

| Name      | Type   | Default |
|-----------|--------|---------|
| className | String | -       |

**Usage Examples:**

```javascript
const enemies = game.findByClass('enemy');
enemies.forEach(enemy => enemy.kill());
```

### `findDeepByClass(className)`: Array<Entity>

Recursively collects every entity (root or nested) whose `class` property equals the supplied `className`.  
The search is case-sensitive and trims surrounding whitespace.

| Name      | Type   | Default |
|-----------|--------|---------|
| className | String | —       |

**Returns:**  
An array containing all matching entities; empty array if none found or `className` is blank.

**Usage Examples:**

```javascript
const enemies = game.findDeepByClass('Enemy');
enemies.forEach(e => e.data('damage', 10));
```

### `isEntity(target)`: Boolean

Checks if the given object is an Entity instance.

| Name   | Type | Default |
|--------|------|---------|
| target | Any  | -       |

**Usage Examples:**

```javascript
if (game.isEntity(someObject)) {
    someObject.show();
}
```

### `kill(entityId)`: Boolean

Removes an entity from the game world.

| Name     | Type   | Default |
|----------|--------|---------|
| entityId | String | -       |

**Usage Examples:**

```javascript
// Remove enemy entity
const success = game.kill('enemy-1');
if (success) {
    console.log('Enemy destroyed');
}
```

---

## Collision System

### `enableCollisions()`: Pixalo

Enables the collision detection system.

**Usage Examples:**

```javascript
game.enableCollisions();
```

### `disableCollisions()`: Pixalo

Disables the collision detection system.

**Usage Examples:**

```javascript
game.disableCollisions();
```

### `checkCollision(entityA, entityB)`: Object | Boolean

Checks collision between two specific entities.

| Name    | Type   | Default |
|---------|--------|---------|
| entityA | Entity | -       |
| entityB | Entity | -       |

**Usage Examples:**

```javascript
const player = game.find('player');
const enemy = game.find('enemy');
const collision = game.checkCollision(player, enemy);

if (collision) {
    console.log('Collision detected!', collision);
}
```

### `checkGroupCollision(group1, group2)`: Object | Boolean

Checks collisions between two groups of entities.

| Name   | Type  | Default |
|--------|-------|---------|
| group1 | Array | -       |
| group2 | Array | -       |

**Usage Examples:**

```javascript
const bullets = game.findByClass('bullet');
const enemies = game.findByClass('enemy');
const collision = game.checkGroupCollision(bullets, enemies);

if (collision) {
    game.kill(collision.entityA.id);
    game.kill(collision.entityB.id);
}
```

---

## [Particle](https://github.com/pixalo/pixalo/tree/main/wiki/v1/Particle.md) System

### `createEmitter(id, config)`: Object

Creates a particle emitter with specified configuration.

| Name   | Type   | Default |
|--------|--------|---------|
| id     | String | -       |
| config | Object | -       |

**Usage Examples:**

```javascript
const explosion = game.createEmitter('explosion', {
    x: 200, y: 150,
    particleCount: 50,
    speed: {min: 100, max: 300},
    life: 2000,
    color: '#ff6600'
});

// Start emitting
explosion.start();
```

---

## Screenshot System

### `shot(options = {})`: Object | Promise<Object>

Takes a screenshot of the current canvas state.

| Name    | Type   | Default |
|---------|--------|---------|
| options | Object | {}      |

**Options Object Properties:**

- `format`: String ('png', 'jpeg', 'webp') - Default: 'png'
- `quality`: Number (0-1) - Default: 1.0
- `backgroundColor`: String - Default: engine background
- `download`: Boolean - Default: false
- `filename`: String - Default: auto-generated

**Usage Examples:**

```javascript
// Simple screenshot
const screenshot = game.shot();
console.log(screenshot.dataURL);

// High quality JPEG with download
game.shot({
    format: 'jpeg',
    quality: 0.9,
    download: true,
    filename: 'game-screenshot'
});

// Custom background
const shot = game.shot({
    backgroundColor: '#000000',
    format: 'png'
});

// Clean up blob URL when done
shot.revoke();

// In worker mode (returns Promise)
const workerShot = await game.shot({
    format: 'png',
    download: true
});
```

---

## Color Utilities

### `hexToRgb(hex)`: Object | null

Converts a hexadecimal color to RGB object.

| Name | Type   | Default |
|------|--------|---------|
| hex  | String | -       |

**Usage Examples:**

```javascript
const rgb = game.hexToRgb('#ff6600');
// Returns: {r: 255, g: 102, b: 0}

const rgbWithAlpha = game.hexToRgb('#ff6600ff');
// Returns: {r: 255, g: 102, b: 0}
```

### `rgbToHex(r, g, b)`: String

Converts RGB values to hexadecimal color string.

| Name | Type   | Default |
|------|--------|---------|
| r    | Number | -       |
| g    | Number | -       |
| b    | Number | -       |

**Usage Examples:**

```javascript
const hex = game.rgbToHex(255, 102, 0);
// Returns: '#ff6600'
```

### `hslToRgb(h, s, l)`: Object

Converts HSL values to RGB object.

| Name | Type   | Default |
|------|--------|---------|
| h    | Number | -       |
| s    | Number | -       |
| l    | Number | -       |

**Usage Examples:**

```javascript
const rgb = game.hslToRgb(0.6, 0.8, 0.5);
// Returns: {r: 51, g: 153, b: 204}
```

### `randHex(includeAlpha = false)`: String

Generates a random hexadecimal color.

| Name         | Type    | Default |
|--------------|---------|---------|
| includeAlpha | Boolean | false   |

**Usage Examples:**

```javascript
// Random hex color
const color = game.randHex();
// Returns: '#a3b2c1'

// Random hex with alpha
const colorWithAlpha = game.randHex(true);
// Returns: '#a3b2c1ff'
```

### `randRgb(includeAlpha = false)`: String

Generates a random RGB color string.

| Name         | Type    | Default |
|--------------|---------|---------|
| includeAlpha | Boolean | false   |

**Usage Examples:**

```javascript
// Random RGB color
const color = game.randRgb();
// Returns: 'rgb(163, 178, 193)'

// Random RGBA color
const colorWithAlpha = game.randRgb(true);
// Returns: 'rgba(163, 178, 193, 0.75)'
```

### `randHsl(options = {}, includeAlpha = false)`: String

Generates a random HSL color with customizable ranges.

| Name         | Type    | Default |
|--------------|---------|---------|
| options      | Object  | {}      |
| includeAlpha | Boolean | false   |

**Options Object Properties:**

- `hueRange`: Array [min, max] - Default: [0, 360]
- `saturationRange`: Array [min, max] - Default: [0, 100]
- `lightnessRange`: Array [min, max] - Default: [0, 100]

**Usage Examples:**

```javascript
// Random HSL color
const color = game.randHsl();
// Returns: 'hsl(240, 65%, 45%)'

// Custom ranges
const warmColor = game.randHsl({
    hueRange: [0, 60], // Red to yellow
    saturationRange: [70, 100],
    lightnessRange: [40, 70]
});

// With alpha
const colorWithAlpha = game.randHsl({}, true);
// Returns: 'hsla(240, 65%, 45%, 0.8)'
```

### `adjustAlpha(colorString, multiplier)`: String

Adjusts the alpha (opacity) of a color string.

| Name        | Type   | Default |
|-------------|--------|---------|
| colorString | String | -       |
| multiplier  | Number | -       |

**Usage Examples:**

```javascript
// Make color more transparent
const faded = game.adjustAlpha('rgba(255, 100, 50, 1.0)', 0.5);
// Returns: 'rgba(255, 100, 50, 0.5)'

// Works with hex colors too
const fadedHex = game.adjustAlpha('#ff6432', 0.3);
// Returns: 'rgba(255, 100, 50, 0.15)'
```

---

## Animation Utilities

### `animate(callback, options)`: Object

Creates a pause-aware animation loop that automatically handles engine pause/resume states. Returns a control object for managing the animation.

| Name     | Type     | Default | Description                                    |
|----------|----------|---------|------------------------------------------------|
| callback | Function | -       | Animation function called each frame           |
| options  | Object   | {}      | Optional configuration object                  |

**Callback Parameters:**

The callback receives an object with timing information:

| Property   | Type    | Description                                    |
|------------|---------|------------------------------------------------|
| now        | Number  | Adjusted timestamp (excluding pause time)      |
| elapsed    | Number  | Time elapsed since animation start (ms)        |
| rawNow     | Number  | Raw timestamp from performance.now()           |
| totalPause | Number  | Total accumulated pause duration (ms)          |
| isPaused   | Boolean | Current pause state (always false in callback) |

**Options:**

| Property   | Type     | Default | Description                           |
|------------|----------|---------|---------------------------------------|
| onPause    | Function | null    | Called when engine pauses             |
| onResume   | Function | null    | Called when engine resumes            |
| onCancel   | Function | null    | Called when animation is cancelled    |

**Return Value:**

Returns a control object with the following methods:

| Method          | Returns | Description                              |
|-----------------|---------|------------------------------------------|
| cancel()        | void    | Stops and cancels the animation          |
| getElapsed()    | Number  | Gets elapsed time in milliseconds        |
| getTotalPause() | Number  | Gets total pause duration                |
| isPaused()      | Boolean | Checks if animation is currently paused  |

**Usage Examples:**

```javascript
// Basic animation loop
const anim = game.animate(({elapsed}) => {
    console.log('Elapsed:', elapsed);
    
    if (elapsed > 5000) {
        return false; // Stop after 5 seconds
    }
    return true; // Continue
});

// With pause/resume callbacks
const anim = game.animate(({elapsed}) => {
    entity.x += 2;
    return entity.x < 500;
}, {
    onPause: () => console.log('Animation paused'),
    onResume: (now, totalPause) => console.log('Resumed after', totalPause, 'ms'),
    onCancel: () => console.log('Animation cancelled')
});

// Manual control
anim.cancel(); // Stop the animation
console.log(anim.getElapsed()); // Get elapsed time
console.log(anim.isPaused()); // Check pause state

// Animated movement
const anim = game.animate(({elapsed}) => {
    const progress = elapsed / 2000; // 2 second duration
    
    if (progress >= 1) {
        entity.x = 500;
        return false; // Complete
    }
    
    entity.x = 100 + (400 * progress);
    return true; // Continue
});
```

**Notes:**
- The callback should return `true` to continue or `false` to stop
- Animation automatically pauses when `engine.running` is `false`
- Pause time is excluded from elapsed time calculations
- Use this instead of `requestAnimationFrame` for pause-aware animations

---

## World Game Utilities

### `worldSize(type)`: Object

Returns width and height dimensions based on the specified type.

| Name | Type   | Default  | Description                                       |
|------|--------|----------|---------------------------------------------------|
| type | String | 'bounds' | Size type: 'bounds', 'viewport', 'base', 'canvas' |

**Return Value:**

Returns an object with `width` and `height` properties.

**Size Types:**

| Type     | Description                                           |
|----------|-------------------------------------------------------|
| bounds   | Camera bounds size (falls back to base if no bounds)  |
| viewport | Visible area size adjusted for camera zoom            |
| base     | Base canvas dimensions (logical size)                 |
| canvas   | Actual canvas element dimensions (physical size)      |

**Usage Examples:**

```javascript
// Get camera bounds size
const bounds = engine.worldSize('bounds');
// Returns: {width: 2000, height: 1500}

// Get visible viewport size (affected by zoom)
const viewport = engine.worldSize('viewport');
// Returns: {width: 800, height: 600} (at zoom 1.0)

// Get base canvas size
const base = engine.worldSize('base');
// Returns: {width: 800, height: 600}

// Get actual canvas element size
const canvas = engine.worldSize('canvas');
// Returns: {width: 1600, height: 1200} (if scaled)

// Default is 'bounds'
const size = engine.worldSize();
```

---

## Mathematical Utilities

### `getDistance(x1, y1, x2, y2)`: Number

Calculates the Euclidean distance between two points.

| Name | Type   | Default |
|------|--------|---------|
| x1   | Number | -       |
| y1   | Number | -       |
| x2   | Number | -       |
| y2   | Number | -       |

**Usage Examples:**

```javascript
const distance = game.getDistance(0, 0, 100, 100);
// Returns: 141.42135623730952
```

### `randBetween(min, max)`: Number

Generates a random integer between min and max (inclusive).

| Name | Type   | Default |
|------|--------|---------|
| min  | Number | -       |
| max  | Number | -       |

**Usage Examples:**

```javascript
const randomNum = game.randBetween(1, 10);
// Returns: random integer between 1 and 10
```

### `clamp(value, min, max)`: Number

Constrains a value between minimum and maximum bounds.

| Name  | Type   | Default |
|-------|--------|---------|
| value | Number | -       |
| min   | Number | -       |
| max   | Number | -       |

**Usage Examples:**

```javascript
const clamped = game.clamp(150, 0, 100);
// Returns: 100

const clamped2 = game.clamp(-50, 0, 100);
// Returns: 0
```

### `lerp(start, end, amount)`: Number

Performs linear interpolation between two values.

| Name   | Type   | Default |
|--------|--------|---------|
| start  | Number | -       |
| end    | Number | -       |
| amount | Number | -       |

**Usage Examples:**

```javascript
// 50% between 0 and 100
const interpolated = game.lerp(0, 100, 0.5);
// Returns: 50

// Animation interpolation
const position = game.lerp(startX, endX, animationProgress);
```

### `degToRad(degrees)`: Number

Converts degrees to radians.

| Name    | Type   | Default |
|---------|--------|---------|
| degrees | Number | -       |

**Usage Examples:**

```javascript
const radians = game.degToRad(90);
// Returns: 1.5707963267948966 (π/2)
```

### `radToDeg(radians)`: Number

Converts radians to degrees.

| Name    | Type   | Default |
|---------|--------|---------|
| radians | Number | -       |

**Usage Examples:**

```javascript
const degrees = game.radToDeg(Math.PI);
// Returns: 180
```

### `getAngle(x1, y1, x2, y2)`: Number

Calculates the angle (in radians) from point 1 to point 2.

| Name | Type   | Default |
|------|--------|---------|
| x1   | Number | -       |
| y1   | Number | -       |
| x2   | Number | -       |
| y2   | Number | -       |

**Usage Examples:**

```javascript
const angle = game.getAngle(0, 0, 100, 100);
// Returns: 0.7853981633974483 (45 degrees in radians)
```

### `rotatePoint(centerX, centerY, pointX, pointY, angle)`: Object

Rotates a point around a center point by specified angle (in degrees).

| Name    | Type   | Default |
|---------|--------|---------|
| centerX | Number | -       |
| centerY | Number | -       |
| pointX  | Number | -       |
| pointY  | Number | -       |
| angle   | Number | -       |

**Usage Examples:**

```javascript
// Rotate point (100, 0) around origin by 90 degrees
const rotated = game.rotatePoint(0, 0, 100, 0, 90);
// Returns: {x: 0, y: 100}
```

---

## Async Utilities

### `wait(...args)` (async): Promise<Array>

Waits for multiple promises to complete and returns their results.

| Name    | Type                | Default |
|---------|---------------------|---------|
| ...args | Promise\|Array\|Any | -       |

**Usage Examples:**

```javascript
// Wait for multiple asset loads
const results = await game.wait(
    game.assets.load('image', 'player', 'player.png'),
    game.assets.load('audio', 'bgm', 'music.mp3'),
    game.delay(1000)
);

// Wait for nested arrays of promises
const results2 = await game.wait([
    promise1,
    [promise2, promise3],
    promise4
]);

// Returns empty array if no arguments
const empty = await game.wait(); // Returns []
```

---

## Static Utilities

### `static dataURLToBlob(dataURL)`: Blob

Converts a Data-URI string into a real `Blob`.

| Name    | Type   | Description                                        |
|---------|--------|----------------------------------------------------|
| dataURL | String | A complete `data:[<mime>][;base64],<data>` string. |

**Returns:**  
`Blob` – Binary blob whose MIME type matches the one encoded in the URI.

**Usage Examples:**

```javascript
const blob = Pixalo.dataURLToBlob('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA…');
const url = URL.createObjectURL(blob);
```

### `static scriptToUrl(script)`: String

Turns almost anything executable (function, path, function-name, or raw code) into a ready-to-load URL (blob or
original).

| Name   | Type             | Description                                                                                 |
|--------|------------------|---------------------------------------------------------------------------------------------|
| script | String\|Function | A fully-qualified URL, relative path, function reference, function name, or raw JS snippet. |

**Returns:**  
`String` – A URL that can be passed to `importScripts`, `<script src>`, `Worker`, etc.

**Throws:**  
`Error` – If the input cannot be interpreted as any of the supported forms.

**Usage Examples:**

```javascript
// 1. Already a URL → returned as-is
const u1 = Pixalo.scriptToUrl('https://cdn.example.com/lib.js');

// 2. Relative path → returned as-is
const u2 = Pixalo.scriptToUrl('./worker-utils.js');

// 3. Function → auto-converted to IIFE blob
const u3 = Pixalo.scriptToUrl(function myWorkerLogic () {
    console.log('Worker running');
});

// 4. Global function name → looked up and converted
window.myWorkerLogic = function () { /* ... */
};
const u4 = Pixalo.scriptToUrl('myWorkerLogic');

// 5. Raw code string → blobified
const u5 = Pixalo.scriptToUrl(`
  self.onmessage = e => postMessage(e.data.map(x => x * 2));
`);
```

---

## Event Listeners (Internal)

### Touch Events

The engine automatically handles touch events and provides normalized event data:

- `touchstart` - Touch begins
- `touchmove` - Touch moves
- `touchend` - Touch ends
- `touchcancel` - Touch cancelled

**Event Data Properties:**

- `x`, `y` - World coordinates
- `worldX`, `worldY` - World coordinates (alias)
- `screenX`, `screenY` - Screen coordinates
- `timestamp` - Event timestamp
- `touches` - Array of all current touches
- `identifier` - Touch identifier

### Mouse Events

- `mousedown` - Mouse button pressed
- `mouseup` - Mouse button released
- `mousemove` - Mouse moved
- `wheel` - Mouse wheel scrolled

### Click Events

- `click` - Left mouse button clicked
- `rightclick` - Right mouse button clicked (context menu)

### Keyboard Events

- `keydown` - Key pressed (with combination support)
- `keyup` - Key released

**Key Combinations:**

```javascript
// Listen for specific key combinations
game.on('ctrl+s', () => console.log('Save shortcut'));
game.on('shift+ctrl+z', () => console.log('Redo'));
```

**Normalized Key Names:**

- `space`, `enter`, `esc`, `tab`
- `up`, `down`, `left`, `right` (arrow keys)
- `ctrl`, `shift`, `alt`, `meta` (modifiers)
- `backspace`, `del`, `home`, `end`
- `pageup`, `pagedown`, `ins`, `caps`

### System Events

- `ready` - Engine initialized
- `start` - Game loop started
- `stop` - Game loop stopped
- `stop` - Game loop stopped
- `reset` - Engine reset
- `resize` - Canvas resized
- `visibility` - Tab visibility changed
- `update` - Game update tick
- `render` - Render frame
- `beforeRender` - Before rendering starts
- `afterRender` - Triggered after all rendering is complete
- `freeze` - Game update & timers stopped
- `unfreeze` - Game update & timers started

### Worker Events (Worker Mode Only)

- `worker_msg` - Message received from main thread
- `worker_err` - Worker error occurred

**Usage Examples:**

```javascript
// System events
game.on('ready', () => console.log('Engine ready'));
game.on('resize', (data) => console.log('New size:', data.width, data.height));
game.on('visibility', (isVisible) => {
    if (isVisible) {
        console.log('Tab visible - resume game');
    } else {
        console.log('Tab hidden - pause game');
    }
});

// Input events
game.on('click', (data) => {
    console.log('Clicked at:', data.worldX, data.worldY);
});

game.on('keydown', (combo) => {
    console.log('Key pressed:', combo);
});

// Custom key combinations
game.on('ctrl+shift+d', () => {
    game.toggleGrid();
});
```

---

# Constants

### Constants accessible through the Pixalo class for mathematical calculations, animations, and utility functions

#### `Pixalo.prototype.Bezier`

Bezier curve utility class for creating smooth animations and paths.

**Usage Examples:**

```javascript
// Create bezier curve
const curve = new game.Bezier(0.25, 0.1, 0.25, 1.0);
const value = curve.get(0.5); // Get value at 50% progress
```

#### `Pixalo.prototype.Ease`

Collection of easing functions for smooth animations.

**Usage Examples:**

```javascript
// Use easing in animations
game.defineAnimation('smoothMove', [
    {x: 0},
    {x: 100}
], {
    duration: 1000,
    easing: game.Ease.easeOutBounce
});

// Use in custom animations
const progress = game.Ease.easeInOutQuad(0.5); // Smooth curve at 50%
```

---

## Properties (Internal)

### Canvas and Context

- `canvas` - HTML5 Canvas element
- `ctx`    - 2D rendering context
- `config` - Engine configuration object
- `window` - Window dimensions and device info

### State Management

- `running`  - Boolean indicating if game loop is active
- `entities` - Map of all game entities
- `assets`   - Map of loaded assets
- `timers`   - Map of active timers
- `dataset`  - Map for custom global data

### Input State

- `pressedKeys`     - Set of currently pressed keys
- `draggedEntity`   - Currently dragged entity (mouse)
- `draggedEntities` - Map of dragged entities (touch)
- `hoveredEntity`   - Currently hovered entity

### Subsystems

- `debugger`   - Debug system instance
- `camera`     - Camera system instance
- `background` - Background system instance
- `grid`       - Grid system instance
- `physics`    - Physics system instance
- `collision`  - Collision system instance
- `tileMap`    - TileMap system instance
- `emitters`   - Particle emitter system instance
- `audio`      - Audio manager instance

### Configuration Flags

- `gridEnabled`      - Grid rendering enabled
- `physicsEnabled`   - Physics system enabled
- `collisionEnabled` - Collision detection enabled