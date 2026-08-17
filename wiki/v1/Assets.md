## Asset Management

### `load(type, id, src, config = {})` (async): Promise<Object>

Loads an asset (image, tiles, spritesheet, audio, or font) asynchronously.

| Name   | Type   | Default |
|--------|--------|---------|
| type   | String | -       |
| id     | String | -       |
| src    | String | -       |
| config | Object | {}      |

**Supported Types:**

| Type          | Description                                                                                           |
|---------------|-------------------------------------------------------------------------------------------------------|
| `image`       | Single image asset                                                                                    |
| `tiles`       | Tileset with named tile coordinates                                                                   |
| `spritesheet` | Animated sprite sheet with frames                                                                     |
| `audio`       | Audio file                                                                                            |
| `font`        | TTF/OTF/WOFF/WOFF2 font via [FontFace](https://developer.mozilla.org/en-US/docs/Web/API/FontFace) API |

**Common Config Options:**

| Option    | Type   | Default | Description                                      |
|-----------|--------|---------|--------------------------------------------------|
| `timeout` | Number | -       | Request timeout in milliseconds                  |
| `fetch`   | Object | {}      | Custom fetch options (signal, headers, etc.)     |

---

**Usage Examples:**

```javascript
// Load image
await game.assets.load('image', 'player', 'path/player.png');

// Load image with timeout and custom fetch options
await game.assets.load('image', 'bg', 'path/bg.png', {
    timeout: 5000,
    fetch: { credentials: 'include' }
});

// Load image with bitmap options
await game.assets.load('image', 'sprite', 'path/sprite.png', {
    bitmap: {
        colorSpaceConversion: 'default',
        imageOrientation: 'from-image',
        premultiplyAlpha: 'default'
    }
});

// Load spritesheet
await game.assets.load('spritesheet', 'character', 'path/char.png', {
    columns: 4, rows: 2, width: 32, height: 32,
    originOffset: [0, 0],
    margin: [2, 2]
});

// Load spritesheet with timeout
await game.assets.load('spritesheet', 'enemy', 'path/enemy.png', {
    columns: 8, rows: 1, width: 64, height: 64,
    timeout: 10000
});

// Load tileset
await game.assets.load('tiles', 'terrain', 'path/tiles.png', {
    tileSize: 32,
    tiles: {
        grass: [0, 0],
        stone: [1, 0],
        water: [2, 0]
    }
});

// Load tileset with fallback
await game.assets.load('tiles', 'map', 'path/map.png', {
    tileSize: 16,
    tiles: { floor: [0, 0], wall: [1, 0] },
    timeout: 5000
});

// Load audio
await game.assets.load('audio', 'bgm', 'music.mp3', {
    loop: true, volume: 0.8
});

// Load font (TTF/OTF/WOFF/WOFF2)
await game.assets.load('font', 'PixelFont', 'path/font.ttf', {
    weight : '700',    // 100-900, bold, etc.
    style  : 'normal', // normal, italic, oblique
    display: 'swap'    // auto | block | swap | fallback | optional
                       // 'swap' recommended for games (instant text visibility)
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

---

### `get(id)`: Object | null

Retrieves a loaded asset by its ID. Searches parent engines recursively if not found locally.

| Name | Type   | Default |
|------|--------|---------|
| id   | String | -       |

**Returns:** `{id, asset, config, type}` or `null`

**Usage Examples:**

```javascript
const playerAsset = game.assets.get('player');
if (playerAsset) {
    console.log('Asset loaded:', playerAsset.asset);
    console.log('Asset type:', playerAsset.type);   // 'image' | 'tiles' | 'spritesheet' | 'audio' | 'font'
    console.log('Asset config:', playerAsset.config);
}

// Font asset specific
const fontAsset = game.assets.get('PixelFont');
if (fontAsset) {
    console.log('Font family:', fontAsset.config.family);  // 'PixelFont'
}

// Access bitmap options used during loading
const imageAsset = game.assets.get('sprite');
if (imageAsset) {
    console.log('Bitmap options:', imageAsset.config.bitmap);
}
```

---

### `delete(id)`: Assets

Removes an asset from memory. Fonts are also removed from the global font collection (document.fonts or self.fonts for workers).

| Name | Type   | Default |
|------|--------|---------|
| id   | String | -       |

**Usage Examples:**

```javascript
game.assets.delete('old-texture');
game.assets.delete('PixelFont');  // Also removes from global fonts
```

---

### `clear()`: Assets

Removes all loaded assets from memory.
Cleans up fonts from global font collection (document.fonts or self.fonts for workers).

**Usage Examples:**

```javascript
// Clear all assets (useful for level transitions)
game.assets.clear();

// Clear and verify
game.assets.clear();
console.log(game.assets.resources.size);  // 0
```