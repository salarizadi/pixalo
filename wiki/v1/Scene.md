Pixalo supports multi-scene architecture, allowing you to create and manage multiple independent scenes with their own entities, physics, and rendering pipelines.

---

## Methods

### `scene(name, config)`: Scene

Creates or retrieves a scene with the specified name and configuration.

| Name   | Type   | Default |
|--------|--------|---------|
| name   | String | -       |
| config | Object | {}      |

**Config Options:**

| Property    | Type    | Default       | Description                              |
|-------------|---------|---------------|------------------------------------------|
| zIndex      | Number  | scenes.size+1 | Rendering order (higher = front)         |
| mergeable   | Boolean | false         | Merge entities with parent for rendering |
| constrain   | Boolean | true          | Constrain scene to bounds                |
| interactive | String  | 'flow'        | Event handling: 'off', 'catch', 'flow'   |
| x           | Number  | 0             | Scene X position                         |
| y           | Number  | 0             | Scene Y position                         |
| width       | Number  | canvas.width  | Scene width                              |
| height      | Number  | canvas.height | Scene height                             |
| fill        | String  | 'transparent' | Background fill color                    |
| stroke      | String  | 'transparent' | Border stroke color                      |

**Usage Examples:**

```javascript
// Create a UI scene that stays on top
const uiScene = game.scene('ui', {
    zIndex: 100,
    mergeable: false,
    interactive: 'catch', // Catches all events
    fill: 'rgba(0,0,0,0.5)'
});

// Create a game scene with physics
const gameScene = game.scene('game', {
    zIndex: 1,
    mergeable: true, // Merge entities with main render
    physics: true,
    width: 800,
    height: 600,
    x: 100,
    y: 50
});

// Create a background scene
const bgScene = game.scene('background', {
    zIndex: -1,
    interactive: 'off', // No interaction
    fill: '#001122'
});

// Add entities to scene
gameScene.append('player', {
    x: 100, y: 100,
    width: 50, height: 50
});

// Start scene
gameScene.start();
```

---

### `sortedScenes()`: Array

Returns all running scenes sorted by zIndex (descending).

**Usage Examples:**

```javascript
// Get all active scenes in render order
const scenes = game.sortedScenes();

scenes.forEach(scene => {
    console.log(`${scene.id}: zIndex ${scene.zIndex}`);
});

// Find top scene
const topScene = scenes[0];
```

---

### `rootParent(callback)`: Pixalo

Traverses up the scene hierarchy to find the root parent engine.

| Name     | Type     | Default |
|----------|----------|---------|
| callback | Function | null    |

**Usage Examples:**

```javascript
// Get root engine from nested scene
const scene = game.scene('level1');
const subScene = scene.scene('area1');

const root = subScene.rootParent();
console.log(root === game); // true

// Execute callback for each parent
subScene.rootParent((parent) => {
    console.log('Parent:', parent.id);
});

// Access root resources from deep scene
const rootAssets = subScene.rootParent().assets;
```

---

## Scene Properties

### `id`: String
Unique scene identifier.

### `isScene`: Boolean
Always `true` for scene instances.

### `parent`: Pixalo
Reference to parent engine or scene.

### `zIndex`: Number
Rendering layer (higher renders on top).

### `mergeable`: Boolean
If `true`, entities are rendered with parent's render pipeline.

### `constrain`: Boolean
If `true`, scene is constrained to its bounds.

### `interactive`: String
Event handling mode:
- `'off'`: No event handling
- `'catch'`: Catches events (prevents propagation)
- `'flow'`: Allows events to flow through

### `bounds`: Object
Scene boundaries and styling.

```javascript
scene.bounds = {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    fill: 'transparent',
    stroke: '#333'
};
```

---

## Scene Lifecycle

### Starting and Stopping

```javascript
const scene = game.scene('gameplay');

// Start scene (enables update/render)
scene.start();

// Stop scene
scene.stop();

// Check if running
if (scene.running) {
    console.log('Scene is active');
}
```

### Freezing

```javascript
// Freeze scene (stops updates but keeps rendering)
scene.freeze();

// Unfreeze
scene.unfreeze();

// Check freeze state
if (scene.freezed) {
    console.log('Scene is frozen');
}
```

---

## Advanced Usage

### Multi-Layer Scene System

```javascript
// Background layer
const bgScene = game.scene('background', {
    zIndex: -10,
    interactive: 'off',
    mergeable: true
});

// Game layer
const gameScene = game.scene('game', {
    zIndex: 0,
    physics: true,
    collision: true
});

// UI overlay
const uiScene = game.scene('ui', {
    zIndex: 10,
    interactive: 'catch'
});

// Popup modal
const modalScene = game.scene('modal', {
    zIndex: 100,
    interactive: 'catch',
    fill: 'rgba(0,0,0,0.7)'
});

// Start all
[bgScene, gameScene, uiScene].forEach(s => s.start());

// Show modal when needed
function showModal() {
    modalScene.start();
    gameScene.freeze(); // Pause game
}

function hideModal() {
    modalScene.stop();
    gameScene.unfreeze();
}
```

### Scene Transitions

```javascript
let currentScene = null;

function switchScene(sceneName) {
    // Fade out current
    if (currentScene) {
        currentScene.stop();
        currentScene.clear();
    }
    
    // Load new scene
    currentScene = game.scene(sceneName);
    currentScene.start();
}

// Usage
switchScene('level1');
switchScene('level2');
```

### Scene-Specific Physics

```javascript
// Each scene can have independent physics
const spaceScene = game.scene('space', {
    physics: {
        gravity: { x: 0, y: 0 } // No gravity in space
    }
});

const earthScene = game.scene('earth', {
    physics: {
        gravity: { x: 0, y: 980 } // Earth gravity
    }
});
```

### Interactive Scene Boundaries

```javascript
const minimap = game.scene('minimap', {
    x: game.baseWidth - 210,
    y: 10,
    width: 200,
    height: 200,
    fill: 'rgba(0,0,0,0.5)',
    stroke: '#fff',
    interactive: 'catch',
    zIndex: 50
});

minimap.on('click', (event) => {
    console.log('Minimap clicked');
});
```

### `isPointInScene(x, y, interactive)`: Array|Boolean

Checks if a point (x, y) is inside any scene boundaries and returns matching scenes, optionally filtered by interactive mode.

| Name        | Type   | Default | Description                                                      |
|-------------|--------|---------|------------------------------------------------------------------|
| x           | Number | -       | X coordinate to check                                            |
| y           | Number | -       | Y coordinate to check                                            |
| interactive | Array  | []      | Array of interactive modes to filter: `['off', 'catch', 'flow']` |

**Usage Examples:**

```javascript
// Check if point is in any scene
const scenes = game.isPointInScene(150, 200);
if (scenes) {
    console.log(`Point is in ${scenes.length} scene(s)`);
    scenes.forEach(scene => console.log(scene.id));
} else {
    console.log('Point is not in any scene');
}

// Find only clickable scenes
function handleClick (x, y) {
    const scenes = game.isPointInScene(x, y, ['catch', 'flow']);
    if (!scenes) return;
    
    // Process from top to bottom (highest zIndex first)
    for (const scene of scenes) {
        console.log(`Processing click in: ${scene.id}`);
        
        if (scene.interactive === 'catch') {
            // Stop propagation
            break;
        }
    }
}

// Example with scene setup
const modalScene = game.scene('modal', {
    x: 100, y: 100,
    width: 400, height: 300,
    interactive: 'catch'
});

const bgScene = game.scene('background', {
    x: 0, y: 0,
    width: 800, height: 600,
    interactive: 'off'
});

// Check which scenes contain point (250, 250)
const scenes = game.isPointInScene(250, 250);
// Returns: [modalScene] (bgScene is included but modalScene is on top)

// Check only interactive scenes
const interactive = game.isPointInScene(250, 250, ['catch', 'flow']);
// Returns: [modalScene] (bgScene excluded due to interactive: 'off')
```

**Notes:**
- Returns array of scenes sorted by zIndex (highest first) if point is inside any scene
- Returns `false` if point is not inside any scene
- When `interactive` array is provided, only scenes with matching interactive modes are included
- Scenes must be running to be checked
- Useful for event handling, click detection, and UI interaction
- Multiple scenes can contain the same point (overlapping scenes)

---

### Scene Data Sharing

```javascript
// Set data in scene
const scene = game.scene('level1');
scene.data('score', 100);
scene.data('lives', 3);

// Access from another scene
const uiScene = game.scene('ui');
const score = game.scene('level1').data('score');
console.log('Score:', score);

// Or access from root
const lives = game.rootParent().scene('level1').data('lives');
```

### Nested Scenes

```javascript
// Create main game scene
const gameScene = game.scene('game');

// Create sub-scenes within game scene
const hudScene = gameScene.scene('hud', {
    zIndex: 10,
    y: 0,
    height: 50,
    fill: '#222'
});

const inventoryScene = gameScene.scene('inventory', {
    zIndex: 5,
    x: 0,
    y: game.baseHeight - 100,
    width: 200,
    height: 100
});

// Access root from nested scene
const root = inventoryScene.rootParent();
```

---

## Scene Events

Scenes inherit all event methods from the main engine:

```javascript
const scene = game.scene('gameplay');

// Scene-specific events
scene.on('update', (deltaTime) => {
    // Custom scene logic
});

scene.on('render', (ctx) => {
    // Custom rendering
});

scene.on('start', () => {
    console.log('Scene started');
});

scene.on('stop', () => {
    console.log('Scene stopped');
});

scene.on('freeze', () => {
    console.log('Scene frozen');
});

scene.on('unfreeze', () => {
    console.log('Scene unfrozen');
});
```

---

## Best Practices

1. **Use `mergeable: true`** for background/decorative scenes to improve performance
2. **Use `interactive: 'catch'`** for modal/popup scenes to block interaction with lower layers
3. **Set appropriate `zIndex`** values to control render order
4. **Use `freeze()`** instead of `stop()` when you want to pause but keep rendering
5. **Access root resources** via `rootParent()` for shared assets/settings
6. **Clean up scenes** when switching levels to prevent memory leaks

```javascript
// Good cleanup practice
function loadLevel (levelName) {
    // Stop and clear old scenes
    game.scenes.forEach(scene => {
        if (scene.id.startsWith('level_')) {
            scene.stop();
            scene.reset();
        }
    });
    
    // Load new level
    const newLevel = game.scene(`level_${levelName}`);
    newLevel.start();
}
```