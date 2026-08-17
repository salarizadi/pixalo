# CHANGELOG

## [1.4.0] - 2026-08-17

### ✨ New Features

### Pixalo Class
- Added [`config.mute`](https://github.com/pixalo/pixalo/blob/main/wiki/v1/Pixalo.md#getting-start) to globally mute/unmute all audio on engine start.

#### Font Loading Support
- Added `font` type to `Assets.load()` for loading `TTF/OTF/WOFF/WOFF2` fonts via FontFace API
- Added `config.timeout` support for font loading with graceful timeout handling
- Full Web Worker support using `self.fonts` (no DOM dependency)
- Font cleanup on `delete()` and `clear()` from both `document.fonts` and `self.fonts`
- Configurable font descriptors: `weight`, `style`, `stretch`, `display`
- Added `config.descriptors` for custom FontFace descriptors (e.g., `unicodeRange`)

```javascript
// Load font in main thread or worker
await game.assets.load('font', 'PixelFont', 'path/font.ttf', {
  weight : '700',
  style  : 'normal',
  display: 'swap'  // auto | block | swap | fallback | optional
});

// Load font with timeout and custom descriptors
await game.assets.load('font', 'CustomFont', 'path/font.woff2', {
  weight: '400',
  style: 'italic',
  stretch: 'condensed',
  display: 'swap',
  descriptors: { unicodeRange: 'U+0000-00FF' },
  timeout: 8000
});
```

#### Asset Loading - Timeout & AbortController Support
- Added `_createAbortController()` and `_buildFetchOptions()` for robust request management
- `config.timeout` support for image, tiles, spritesheet, and font loading
- `config.fetch` support for custom fetch options (signal, headers, credentials, etc.)
- Graceful AbortError handling with descriptive timeout messages
- User-provided AbortSignal combined with timeout when both present

```javascript
// Load with timeout
await game.assets.load('image', 'bg', 'path/bg.png', { timeout: 5000 });

// Load with custom fetch options
await game.assets.load('image', 'sprite', 'path/sprite.png', {
    fetch: { credentials: 'include', headers: { 'X-Custom': 'value' } }
});

// Load with user AbortSignal
const controller = new AbortController();
await game.assets.load('image', 'map', 'path/map.png', {
    fetch: { signal: controller.signal }
});
```

#### Asset Loading - Bitmap Options
- Added `config.bitmap` support for `createImageBitmap()` in image and spritesheet loading
- Configurable: `colorSpaceConversion`, `imageOrientation`, `premultiplyAlpha`

```javascript
await game.assets.load('image', 'sprite', 'path/sprite.png', {
    bitmap: {
        colorSpaceConversion: 'default',
        imageOrientation: 'from-image',
        premultiplyAlpha: 'default'
    }
});
```

#### Asset Loading - Image Property Assignment
- When loading `image` type (no `tileSize`), properties from config are automatically assigned to the asset object
- Allows attaching custom metadata directly to the ImageBitmap

```javascript
await game.assets.load('image', 'bg', 'path/bg.png', {
    customTag: 'background',
    layer: 0
});
const asset = game.assets.get('bg');
console.log(asset.config.customTag); // 'background'
```

#### Asset Loading - Tiles Fallback
- If `config.tiles` is not provided for `tiles` type, a warning is logged and empty object `{}` is used as fallback
- Prevents crashes from missing tile configuration

#### Async Progress Tracking
- Added progress callback support to `game.wait()`
- Real-time progress reporting for parallel promise resolution
- States: `start`, `loading`, `error`, `complete`, `failed`

```javascript
const results = await game.wait(
    game.assets.load('image', 'bg', 'bg.png'),
    game.assets.load('audio', 'sfx', 'sfx.mp3'),

    // Progress callback (last argument)
    ({ state, loaded, total, percent, index, error }) => {
      loadingBar.style('width', percent * 300);
      console.log(`${Math.round(percent * 100)}%`);
    }
);
```

#### AudioManager - Complete Rewrite with Worker Support
- **Full Web Worker support**: AudioManager now runs seamlessly in both Main Thread and Worker contexts
- **Event forwarding**: All events (`play`, `pause`, `ended`, `looped`, etc.) triggered in Main Thread automatically propagate to Worker listeners
- **Request/Response protocol**: All methods return `Promise` in both modes via `_sendWorkerRequest()`
- **Serializable return values**: Eliminated `postMessage` clone errors by returning only serializable data (no `AudioBuffer`, `AudioNode`, or `AudioManager` instances)

#### AudioManager - `allowMultiple` Instance Control
- Added `config.allowMultiple` flag (default: `true`) to control simultaneous playback
- When `false`, duplicate `play()` calls are ignored with a warning log
- Prevents accidental audio stacking and infinite loop recursion

```javascript
await game.audio.load('bgm', '/bgm.mp3', {allowMultiple: false});
await game.audio.play('bgm');  // plays
await game.audio.play('bgm');  // ignored! warn logged
```

#### AudioManager - Multi-Instance Control
- `pause()`, `stop()`, `seek()`, `setVolume()`, `setSpatialPosition()`, `setSpatialOrientation()` now accept both `instanceId` and `assetId`
- When `assetId` is passed, changes apply to **all instances** of that asset
- `resume()` accepts `assetId` and resumes the **first paused instance**

```javascript
await game.audio.play('sfx');   // instance_1
await game.audio.play('sfx');   // instance_2
await game.audio.pause('sfx');  // pauses BOTH
await game.audio.stop('sfx');   // stops BOTH
```

#### AudioManager - Manual Loop Management
- **Fixed loop memory leak**: Replaced native `source.loop` with manual loop management via `onended` callback
  - `source.loop` is now always `false` — AudioManager has full control over playback lifecycle
  - When `config.loop` is enabled, `onended` fires normally, cleans up the old instance, and spawns a fresh one
  - Prevents memory leaks caused by `AudioBufferSourceNode` staying alive indefinitely when native loop is active
  - `pause()`, `stop()`, `muteAll()`, `setVolume()` now work correctly on looping sounds

#### AudioManager - `seek()` Method
- Added `seek()` method for jumping to any position in active audio playback
- Clamps seek time between `0` and audio duration automatically
- Preserves instance ID and state while recreating the audio source at the new position
- Fully compatible with loop, spatial audio, mute, and volume controls

```javascript
// Seek to 20 seconds
await px.audio.seek('music', 20);

// Seek to 50% of duration
const duration = await px.audio.getDuration('music');
await px.audio.seek('music', duration * 0.5);
```

#### AudioManager - Extended Event System

- Added new events.
- All events are serializable and forwarded to Worker correctly.
- Event payloads include `instanceId`, `assetId`, and relevant metadata.

| Event          | Triggered By   | Payload                                  |
|----------------|----------------|------------------------------------------|
| `load`         | `load()`       | `{assetId, config}`                      |
| `play`         | `play()`       | `{instanceId, assetId}`                  |
| `pause`        | `pause()`      | `{instanceId, assetId, currentTime}`     |
| `resume`       | `resume()`     | `{instanceId, assetId, currentTime}`     |
| `stop`         | `stop()`       | `{instanceId, assetId}`                  |
| `seek`         | `seek()`       | `{instanceId, assetId, seekTime}`        |
| `ended`        | `onended`      | `{instanceId, assetId}`                  |
| `looped`       | `onended`      | `{instanceId, assetId}`                  |
| `volumechange` | `setVolume()`  | `{instanceId?, assetId?, volume, type?}` |
| `loopchange`   | `loop()`       | `{instanceId?, assetId, loop}`           |
| `mute`         | `muteAll()`    | `{type: 'global'}`                       |
| `unmute`       | `unmuteAll()`  | `{type: 'global'}`                       |

#### AudioManager - Worker Timeout & Error Handling
- `load()` uses 60-second timeout for large audio files
- All Worker requests have configurable timeout (default: 1s)
- Graceful error handling with descriptive messages

---

### 🔧 Changed

#### AudioManager - API Changes (Breaking)
- **All methods now return `Promise`** — even in Main Thread mode
- **Return values changed** to serializable objects only:
  - `play()` now returns `{instanceId, assetId, duration}` instead of `{instanceId, assetId, source, gainNode, spatialNodes}`
  - `load()` now returns `{assetId, duration, numberOfChannels, sampleRate, config}` instead of `{asset, config}`
- `loop()` getter now returns `Promise<boolean>` via `_sendWorkerRequest()`
- `isMuted()` without arguments returns global mute state
- Removed `pixalo_audio_loaded` internal message (replaced by standard request/response)

---

### 🐛 Fixed

- **AudioManager loop memory leak**: Native `source.loop` caused `AudioBufferSourceNode` to stay alive indefinitely. Now manually managed via `onended`.
- **postMessage clone errors**: `AudioBuffer`, `AudioNode`, and `AudioManager` instances were being sent across Worker boundary, causing `Failed to execute 'postMessage': object could not be cloned`. Now all return values are strictly serializable.
- **`seek()` with assetId**: Previously threw error when multiple instances existed. Now applies to all instances.
- **`setVolume()` with assetId**: Previously only updated the first instance. Now updates all instances.
- **`setSpatialPosition()` / `setSpatialOrientation()` with assetId**: Previously only updated the first instance. Now updates all instances.
- **`allowMultiple` default propagation**: Options now correctly fall back to asset config, then to default `true`.

---

### 📚 Documentation

- Complete rewrite of [`AudioManager.md`](https://github.com/pixalo/pixalo/blob/main/wiki/v1/AudioManager.md)
- Complete rewrite of [`Assets.md`](https://github.com/pixalo/pixalo/blob/main/wiki/v1/Assets.md)

---

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
- Fixed `opacity` inheritance where `child entities` were not affected by parent `opacity` values

### 📚 Documentation
- Complete writing of `Scene` management documentation
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