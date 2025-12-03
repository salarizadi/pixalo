# CHANGELOG

## [1.3.0] - 2025-12-04

### 🚀 Performance & Stability
Pixalo has been significantly optimized with improved frame rate stability and enhanced reliability across all features.

### ✨ New Features

#### Multi-Scene Architecture
- Create and manage multiple independent scenes with isolated entities, physics, and rendering pipelines
- Each scene can have its own lifecycle, event handling, and visual layers
- Support for nested scenes and scene transitions

#### Assets Management System
- New `Assets` class for centralized resource management
- Better loading, caching, and cleanup of images, audio, and other resources
- Improved asset lifecycle control

### 🔄 Breaking Changes

#### `Pixalo` Class - Method Migration

Several methods have been moved to their respective classes for better organization:

**Assets** (use `game.assets.*`)
- ~~`loadAsset`~~ → `game.assets.load()`
- ~~`getAsset`~~ → `game.assets.get()`
- ~~`deleteAsset`~~ → `game.assets.delete()`
- ~~`clearAssets`~~ → `game.assets.clear()`

**Background** (use `game.background.*`)
- ~~`addBackground`~~ → `game.background.add()`
- ~~`removeBackground`~~ → `game.background.remove()`
- ~~`updateBackground`~~ → `game.background.update()`
- ~~`clearBackgrounds`~~ → `game.background.clear()`
- ~~`getBackground`~~ → `game.background.get()`
- ~~`setBackgroundOrder`~~ → `game.background.setOrder()`
- ~~`setBackgroundVisible`~~ → `game.background.setVisible()`

**Grid** (use `game.grid.*`)
- ~~`enableGrid`~~ → `game.grid.enable()`
- ~~`disableGrid`~~ → `game.grid.disable()`
- ~~`toggleGrid`~~ → `game.grid.toggle()`
- ~~`setGridSize`~~ → `game.grid.setSize()`
- ~~`setGridColors`~~ → `game.grid.setColors()`
- ~~`setGridLineWidth`~~ → `game.grid.setLineWidth()`
- ~~`setMajorGrid`~~ → `game.grid.setMajor()`
- ~~`setGridBounds`~~ → `game.grid.setBounds()`
- ~~`setGridOrigin`~~ → `game.grid.setOrigin()`
- ~~`setGridVisibilityRange`~~ → `game.grid.setVisibilityRange()`
- ~~`snapToGrid`~~ → `game.grid.snapToGrid()`
- ~~`getGridCell`~~ → `game.grid.getGridCell()`
- ~~`cellToWorld`~~ → `game.grid.cellToWorld()`

**Emitters** (use `game.emitters.*`)
- ~~`createEmitter`~~ → `game.emitters.create()`

### 🆕 New Methods

#### `Pixalo` Class
**Lifecycle & Control**
- `fps()` - Get/set target frame rate
- `freeze()` - Pause updates while keeping rendering
- `unfreeze()` - Resume updates after freeze

**Scene Management**
- `scene()` - Create or get a scene
- `sortedScenes()` - Get scenes sorted by z-index
- `rootParent()` - Traverse to root engine
- `isPointInScene()` - Check if point is inside scene bounds

**Entity Management**
- `mergeEntities()` - Merge entities from scenes
- `isEntities()` - Validate entities Map

**Utilities**
- `animate()` - Create frame-based animations
- `worldSize()` - Get world dimensions
- `int()` - Safe number conversion
- `clearEvents()` - Remove all removeable event listeners

#### `Debugger` Class
- Added **Scenes** statistics panel showing active scenes and their states

#### `Entity` Class
Optimized and faster `Entity` rendering.

**State Checks**
- `isChild()` - Check if entity has a parent
- `isInteractive()` - Check if entity receives events

**Hierarchy & Events**
- `rootParent()` - Get root parent entity
- `sortByZIndex()` - Get sorted children
- `clearEvents()` - Clear entity event listeners

**Animations & Styling**
- `stopTransition()` - Cancel active transition
- `getClass()` - Get class names as string

### 📝 Migration Guide

```javascript
// Before v1.3.0
await game.loadAsset('image', 'player', 'path/player.png');
game.addBackground('sky');
game.enableGrid();
game.createEmitter('explosion', {});

// After v1.3.0
await game.assets.load('image', 'player', 'path/player.png');
game.background.add('sky');
game.grid.enable();
game.emitters.create('explosion', {});
```

### 🐛 Bug Fixes
- Fixed frame rate inconsistencies in high-load scenarios
- Fixed memory leaks
- Improved entity sorting performance for better rendering order
- Fixed an issue where `BackgroundImage` would not render in different `Entity` shapes.

### 📚 Documentation
- Complete rewrite of Scene management documentation
- Added migration guide for breaking changes
- Expanded examples for all new features
- Updated API reference with detailed usage examples

### 🔑 Key Changes
- **Rendering optimization**
- **Mouse & Touch Events**: Complete overhaul of mouse and touch event handling system
    - Proper event ordering respecting entity z-index and scene hierarchy
    - Added `stopPropagation()` support to prevent event bubbling
    - Scene-based event isolation with `interactive` modes (`'off'`, `'catch'`, `'flow'`)
    - Fixed event handling for nested entities and scenes
    - Improved multi-touch support with proper touch tracking
    - Enhanced drag & drop functionality across scenes

---

## [1.2.0] - 2025-10-31

### 🔧 Issues Resolved
- Browser Zoom Interference: From now on, there will be no design issues and browser zoom will not change or disrupt the position of entities in your game logic.
- Optimized ViewPort and Canvas Size settings for better control and to avoid scaling interference
- fix: Stabilize frame timing by optimizing deltaTime calculations and implementing consistent FPS management
- Collision System: Enhanced collision detection accuracy, particularly for rectangle-to-rectangle collision side detection

### ✨ New Features
- The `context` key has been added to the `config` of the `Pixalo` class to fully configure `ContextAttributes`.
- Added `autoResize` key to automatically resize the Canvas tag. If you do not want automatic resizing, set it to `false`. However, the `resize` event will be called if this key is `false` and you can manually set your desired size on the Canvas.
- The `appendTo` key has been added so you can specify where the `canvas` tag should be added.

### 🪄 `Pixalo` class
- Function name `getAllEntities` changed to `getEntities`
- Two new functions have been added to the class: `findDeep` and `findDeepByClass`
- From now on, you can specify whether children detect physical collisions or not by setting the `children` value on the `collision` object.

### 🎭 `Entity` class
- Added new functions: `findDeep`, `findDeepByClass`, `next`, `prev`, `siblings`, `swap`, `parent`, `empty`
- Fixed the problem and optimized the `kill` and `_destroy` functions to prevent memory leaks.

### 💥 `Collision` class
- Added `detect` function: This function calls the same `detectCollisionDetailed` function and was added only for quick and easy access to the `detectCollisionDetailed` function.

### ⚙️ `Debugger` class
- Added `items` value to Debugger settings to specify whether debug shapes should be rendered or not.

---

## [1.1.0] - 2025-10-21

### Keyboards
- Added multi-language keyboard support with physical/logical key distinction
- New `isLogicalKeyPressed()` method for language-specific key detection

### 🎥 Camera System
- **Added `viewPadding` configuration** - Default padding for visibility checks in `inView()` method
- **Enhanced visibility detection** - `inView()` now uses configurable default padding instead of hardcoded values

### 💥 Physics
- **Optimization**: `mouse`/`touch` events
- **Added functions for managing** `Joints`

### ✨ New Features
- **Added `isInteractive()` method** to Entity class for advanced event handling
- **Enhanced event system** with comprehensive mouse/touch event support
- **Fixed "Lost Event" issue** - entities now receive complete event cycles

### 🔧 Event System Improvements
- **Mouse Events**: `mousedown`, `mousemove`, `mouseup`, `wheel` now properly tracked
- **Touch Events**: Multi-touch support with proper `touchstart → touchmove → touchend` cycles
- **Click Events**: Enhanced `click` and `rightclick` detection

### 🐛 Bug Fixes
- Fixed lost `mouseup`/`touchend` events when dragging outside entity
- Resolved event duplication between engine and physics systems

---

**Key Changes**:
- Interactive entities now receive ALL mouse/touch events consistently, solving the "lost event" problem where `mouseup`/`touchend` wouldn't trigger if the pointer moved outside the entity
- Camera visibility checks now use consistent default padding (100px) that can be configured via `camera.viewPadding`