## Asset Management

### `load(type, id, src, config = {})` (async): Promise<Object>

Loads an asset (image, spritesheet, tiles, or audio) asynchronously.

| Name   | Type   | Default |
|--------|--------|---------|
| type   | String | -       |
| id     | String | -       |
| src    | String | -       |
| config | Object | {}      |

**Usage Examples:**

```javascript
// Load image
await game.assets.load('image', 'player', 'path/player.png');

// Load spritesheet
await game.assets.load('spritesheet', 'character', 'path/char.png', {
    columns: 4, rows: 2, width: 32, height: 32,
    originOffset: [0, 0],
    margin: [2, 2]
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

// Load audio
await game.assets.load('audio', 'bgm', 'music.mp3', {
    loop: true, volume: 0.8
});
```

### `assets.get(id)`: Object | null

Retrieves a loaded asset by its ID.

| Name | Type   | Default |
|------|--------|---------|
| id   | String | -       |

**Usage Examples:**

```javascript
const playerAsset = game.assets.get('player');
if (playerAsset) {
    console.log('Asset loaded:', playerAsset.asset);
}
```

### `delete(id)`: Pixalo

Removes an asset from memory.

| Name | Type   | Default |
|------|--------|---------|
| id   | String | -       |

**Usage Examples:**

```javascript
game.assets.delete('old-texture');
```

### `clear()`: Pixalo

Removes all loaded assets from memory.

**Usage Examples:**

```javascript
// Clear all assets (useful for level transitions)
game.assets.clear();
```