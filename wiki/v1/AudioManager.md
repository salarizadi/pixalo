AudioManager is a comprehensive audio management class designed for web applications that provides advanced audio playback capabilities including spatial audio, instance management, and worker thread support. It utilizes the Web Audio API to deliver high-quality audio experiences with features like 3D positioning, volume control, and batch operations.

---

## Architecture Flow

### Main Thread Mode (Direct)

```
┌─────────────────────────────────────────┐
│         YOUR PIXALO APPLICATION         │
│                                         │
│   audio.play('music')                   │
│          │                              │
│          ▼                              │
│   ┌─────────────┐    ┌──────────────┐   │
│   │ AudioManager│───▶│ AudioContext │   │
│   │  (direct)   │    │  (Web Audio) │   │
│   └──────┬──────┘    └──────────────┘   │
│          │                              │
│          ▼                              │
│   trigger('play') ──▶ YOUR LISTENERS    │
└─────────────────────────────────────────┘
```

### Worker Mode (Proxy)

```
      WORKER THREAD                              MAIN THREAD
┌─────────────────────────┐              ┌─────────────────────────┐
│                         │              │                         │
│   audio.play('music')   │              │     ┌─────────────┐     │
│            │            │              │     │_handleWorker│     │
│            ▼            │              │     └──────┬──────┘     │
│     ┌─────────────┐     │ postMessage  │            │            │
│     │ AudioManager│     │─────────────▶│            ▼            │
│     │   (proxy)   │     │              │    ┌───────────────┐    │
│     └──────┬──────┘     │              │    │  AudioContext │    │
│            │            │              │    │  source.play  │    │
│            │            │              │    └───────┬───────┘    │
│            │            │              │            │            │
│            │            │              │            ▼            │
│            │            │              │      trigger('play')    │
│            │            │              │            │            │
│            │            │              │            ▼            │
│            │            │              │postMessage({            │
│            │            │              │  action: 'audio_trigger'│
│            │            │              │})                       │
│            │            │              │            │            │
│            │            │              │            ▼            │
│            ▼            │              │     ┌─────────────┐     │
│     ┌─────────────┐     │              │     │   Worker    │     │
│     │YOUR CALLBACK│     │ postMessage  │     │   trigger   │     │
│     │  on('play') │     │◀─────────────│     └─────────────┘     │
│     └─────────────┘     │              │                         │
└─────────────────────────┘              └─────────────────────────┘
```

### Key Differences

| Aspect          | Main Thread       | Worker                |
|-----------------|-------------------|-----------------------|
| Execution       | Direct            | Proxy via postMessage |
| AudioContext    | Local             | Remote (Main Thread)  |
| Event latency   | Zero              | ~1-2ms (postMessage)  |
| Event listeners | Same thread       | Worker thread         |
| Return value    | Immediate Promise | Round-trip Promise    |

---

## Return Values

All methods return a **Promise** in both modes:

| Mode        | Return Type                              |
|-------------|------------------------------------------|
| Main Thread | `Promise<T>` (resolves immediately)      |
| Worker      | `Promise<T>` (resolves after round-trip) |

---

## Public Methods

### async load(id, src, config): Promise<{assetId: string, duration: number, numberOfChannels: number, sampleRate: number, config: Object}>

*Async method that returns a Promise*

Loads an audio asset from a URL and stores it with the specified ID for later playback.

| name   | type   | default |
|--------|--------|---------|
| id     | string | -       |
| src    | string | -       |
| config | Object | {}      |

**Config Options:**

| name          | type    | default | description                           |
|---------------|---------|---------|---------------------------------------|
| volume        | number  | 1       | Initial volume (0-1)                  |
| loop          | boolean | false   | Loop playback                         |
| autoplay      | boolean | false   | Auto-play after load                  |
| muted         | boolean | false   | Start muted                           |
| allowMultiple | boolean | true    | Allow multiple simultaneous instances |
| fetch         | Object  | {}      | Additional fetch options              |
| timeout       | number  | 60000   | Request timeout in milliseconds       |
| spatial       | Object  | null    | Spatial audio configuration           |

**Usage Example:**
```javascript
await game.audio.load('bgMusic', '/audio/background.mp3', {
    volume: 0.8,
    loop: true,
    allowMultiple: false,
    timeout: 10000,
    fetch: {
        credentials: 'include'
    }
});
```

---

### async play(id, options): Promise\<{instanceId: string, assetId: string, duration: number} | {assetId: string, ignored: true, reason: string}\>

*Async method that returns a Promise*

Plays a loaded audio asset with optional configuration overrides.

| name    | type   | default |
|---------|--------|---------|
| id      | string | -       |
| options | Object | {}      |

**Options:**

| name          | type    | default | description                     |
|---------------|---------|---------|---------------------------------|
| volume        | number  | asset   | Override volume                 |
| loop          | boolean | asset   | Override loop                   |
| muted         | boolean | asset   | Override muted                  |
| allowMultiple | boolean | asset   | Override allowMultiple          |
| spatial       | Object  | null    | Spatial audio for this instance |

**Returns:**
- Success: `{instanceId: string, assetId: string, duration: number}`
- Ignored (allowMultiple=false): `{assetId: string, ignored: true, reason: 'already_playing'}`

**Usage Example:**
```javascript
const playback = await game.audio.play('bgMusic', {
    volume: 0.5,
    loop: false
});
console.log('Playing instance:', playback.instanceId);
```

---

### async pause(id): Promise\<true\>

*Async method that returns a Promise*

Pauses an audio instance by `instanceId`, or **all active instances** of an asset by `assetId`.

| name | type   | default |
|------|--------|---------|
| id   | string | -       |

**Usage Example:**
```javascript
await game.audio.pause('bgMusic');        // pause all instances of 'bgMusic'
await game.audio.pause('instance_123'); // pause specific instance
```

---

### async resume(id): Promise\<true\>

*Async method that returns a Promise*

Resumes a paused audio instance by `instanceId`, or the **first paused instance** of an asset by `assetId`.

| name | type   | default |
|------|--------|---------|
| id   | string | -       |

**Usage Example:**
```javascript
await game.audio.resume('bgMusic');
```

---

### async stop(id): Promise\<true\>

*Async method that returns a Promise*

Stops an audio instance by `instanceId`, or **all instances** of an asset by `assetId`.

| name | type   | default |
|------|--------|---------|
| id   | string | -       |

**Usage Example:**
```javascript
await game.audio.stop('bgMusic');        // stop all instances
await game.audio.stop('instance_123');  // stop specific instance
```

---

### async stopAsset(assetId): Promise\<true\>

*Async method that returns a Promise*

Stops all instances of a specific audio asset.

| name    | type   | default |
|---------|--------|---------|
| assetId | string | -       |

**Usage Example:**
```javascript
await game.audio.stopAsset('bgMusic');
```

---

### async loop(id, loop): Promise\<boolean | true\>

*Async method that returns a Promise*

Gets or sets the loop state.

| name | type    | default   |
|------|---------|-----------|
| id   | string  | -         |
| loop | boolean | undefined |

**Returns:**
- Getter (loop=undefined): `Promise<boolean>` — current loop state
- Setter: `Promise<true>` — success

**Usage Example:**
```javascript
const isLooping = await game.audio.loop('bgMusic');     // getter
await game.audio.loop('bgMusic', true);                 // setter
```

---

### async seek(id, time): Promise\<true\>

*Async method that returns a Promise*

Seeks to a specific time. Works with `instanceId` or `assetId` (applies to **all instances**).

| name | type   | default |
|------|--------|---------|
| id   | string | -       |
| time | number | -       |

**Usage Example:**
```javascript
await game.audio.seek('bgMusic', 15.5);  // seek all instances to 15.5s
```

---

### async setVolume(id, volume): Promise\<true\>

*Async method that returns a Promise*

Sets volume for an `instanceId` or **all instances** of an `assetId`.

| name   | type   | default |
|--------|--------|---------|
| id     | string | -       |
| volume | number | -       |

**Usage Example:**
```javascript
await game.audio.setVolume('bgMusic', 0.3);
```

---

### async setAssetVolume(assetId, volume): Promise\<true\>

*Async method that returns a Promise*

Sets volume for all instances of a specific asset.

| name    | type   | default |
|---------|--------|---------|
| assetId | string | -       |
| volume  | number | -       |

**Usage Example:**
```javascript
await game.audio.setAssetVolume('bgMusic', 0.7);
```

---

### async setMasterVolume(volume): Promise\<true\>

*Async method that returns a Promise*

Sets the master volume affecting all audio instances.

| name   | type   | default |
|--------|--------|---------|
| volume | number | -       |

**Usage Example:**
```javascript
await game.audio.setMasterVolume(0.5);
```

---

### async setListenerPosition(x, y, z): Promise\<true\>

*Async method that returns a Promise*

Sets the 3D audio listener position.

| name | type   | default |
|------|--------|---------|
| x    | number | -       |
| y    | number | -       |
| z    | number | 0       |

**Usage Example:**
```javascript
await game.audio.setListenerPosition(10, 5, 0);
```

---

### async setListenerOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ): Promise\<true\>

*Async method that returns a Promise*

Sets the 3D audio listener orientation.

| name     | type   | default |
|----------|--------|---------|
| forwardX | number | -       |
| forwardY | number | -       |
| forwardZ | number | 0       |
| upX      | number | 0       |
| upY      | number | 1       |
| upZ      | number | 0       |

**Usage Example:**
```javascript
await game.audio.setListenerOrientation(0, 0, -1, 0, 1, 0);
```

---

### async setSpatialPosition(id, x, y, z): Promise\<true\>

*Async method that returns a Promise*

Sets 3D position for a spatial audio source. Works with `instanceId` or `assetId` (applies to **all instances**).

| name | type   | default |
|------|--------|---------|
| id   | string | -       |
| x    | number | -       |
| y    | number | -       |
| z    | number | 0       |

**Usage Example:**
```javascript
await game.audio.setSpatialPosition('spatialSound', 5, 0, -3);
```

---

### async setSpatialOrientation(id, x, y, z): Promise\<true\>

*Async method that returns a Promise*

Sets 3D orientation for a spatial audio source. Works with `instanceId` or `assetId` (applies to **all instances**).

| name | type   | default |
|------|--------|---------|
| id   | string | -       |
| x    | number | -       |
| y    | number | -       |
| z    | number | 0       |

**Usage Example:**
```javascript
await game.audio.setSpatialOrientation('spatialSound', 1, 0, 0);
```

---

### async playSpatial(assetId, x, y, z, options): Promise\<{instanceId: string, assetId: string, duration: number}\>

*Async method that returns a Promise*

Plays an audio asset with 3D spatial positioning.

| name    | type   | default |
|---------|--------|---------|
| assetId | string | -       |
| x       | number | -       |
| y       | number | -       |
| z       | number | 0       |
| options | Object | {}      |

**Usage Example:**
```javascript
const spatial = await game.audio.playSpatial('footsteps', 10, 0, -5, {
    volume: 0.8,
    loop: true
});
```

---

### async updateSpatial(id, config): Promise\<true\>

*Async method that returns a Promise*

Updates spatial audio properties.

| name   | type   | default |
|--------|--------|---------|
| id     | string | -       |
| config | Object | -       |

**Config:**
| name        | type   | description |
|-------------|--------|-------------|
| position    | Object | `{x, y, z}` |
| orientation | Object | `{x, y, z}` |
| volume      | number | Volume override |

**Usage Example:**
```javascript
await game.audio.updateSpatial('spatialSound', {
    position: {x: 2, y: 1, z: -1},
    orientation: {x: 0, y: 1, z: 0},
    volume: 0.6
});
```

---

### async exists(id): Promise\<boolean\>

*Async method that returns a Promise*

Checks if an instance or asset exists.

| name | type   | default |
|------|--------|---------|
| id   | string | -       |

**Usage Example:**
```javascript
if (await game.audio.exists('bgMusic')) {
    console.log('Asset exists');
}
```

---

### async isPlaying(id): Promise\<boolean\>

*Async method that returns a Promise*

Checks if an instance or any instance of an asset is playing.

| name | type   | default |
|------|--------|---------|
| id   | string | -       |

**Usage Example:**
```javascript
if (await game.audio.isPlaying('bgMusic')) {
    console.log('Background music is playing');
}
```

---

### async isPaused(id): Promise\<boolean\>

*Async method that returns a Promise*

Checks if an instance or any instance of an asset is paused.

| name | type   | default |
|------|--------|---------|
| id   | string | -       |

---

### async isMuted(id): Promise\<boolean\>

*Async method that returns a Promise*

Checks if an instance, asset, or globally muted.

| name | type   | default   |
|------|--------|-----------|
| id   | string | undefined |

**Usage Example:**
```javascript
const globalMute = await game.audio.isMuted();        // global state
const assetMute  = await game.audio.isMuted('music'); // asset/instance state
```

---

### async getAssetInstances(assetId): Promise\<Array\<Object\>\>

*Async method that returns a Promise*

Returns information about all instances of an asset.

| name    | type   | default |
|---------|--------|---------|
| assetId | string | -       |

**Returns:** Array of `{instanceId, isPlaying, isPaused, currentTime}`

**Usage Example:**
```javascript
const instances = await game.audio.getAssetInstances('bgMusic');
instances.forEach(inst => {
    console.log(`Instance ${inst.instanceId}: ${inst.isPlaying ? 'playing' : 'stopped'}`);
});
```

---

### async getDuration(assetId): Promise\<number\>

*Async method that returns a Promise*

Returns the duration of an audio asset in seconds.

| name    | type   | default |
|---------|--------|---------|
| assetId | string | -       |

---

### async getCurrentTime(id): Promise\<number\>

*Async method that returns a Promise*

Returns the current playback time.

| name | type   | default |
|------|--------|---------|
| id   | string | -       |

---

### async getDistance(id): Promise\<number|null\>

*Async method that returns a Promise*

Returns the distance between a spatial audio source and the listener.

| name | type   | default |
|------|--------|---------|
| id   | string | -       |

---

### async muteAll(): Promise\<true\>

*Async method that returns a Promise*

Mutes all currently playing audio instances.

**Usage Example:**
```javascript
await game.audio.muteAll();
```

---

### async unmuteAll(): Promise\<true\>

*Async method that returns a Promise*

Unmutes all audio instances.

**Usage Example:**
```javascript
await game.audio.unmuteAll();
```

---

### async pauseAll(): Promise\<true\>

*Async method that returns a Promise*

Pauses all currently playing audio instances.

**Usage Example:**
```javascript
await game.audio.pauseAll();
```

---

### async resumeAll(): Promise\<true\>

*Async method that returns a Promise*

Resumes all paused audio instances.

**Usage Example:**
```javascript
await game.audio.resumeAll();
```

---

### async stopAll(): Promise\<true\>

*Async method that returns a Promise*

Stops all audio instances.

**Usage Example:**
```javascript
await game.audio.stopAll();
```

---

### async delete(id): Promise\<true\>

*Async method that returns a Promise*

Deletes an instance by `instanceId` or all instances + asset by `assetId`.

| name | type   | default |
|------|--------|---------|
| id   | string | -       |

---

### async cleanup(): Promise\<true\>

*Async method that returns a Promise*

Performs complete cleanup.

**Usage Example:**
```javascript
await game.audio.cleanup();
```

---

## Event System

All events are triggered in **Main Thread** and forwarded to **Worker** where listeners execute.

### Events

| Event          | Triggered By      | Payload                                  |
|----------------|-------------------|------------------------------------------|
| `load`         | `load()`          | `{assetId, config}`                      |
| `play`         | `play()`          | `{instanceId, assetId}`                  |
| `pause`        | `pause()`         | `{instanceId, assetId, currentTime}`     |
| `resume`       | `resume()`        | `{instanceId, assetId, currentTime}`     |
| `stop`         | `stop()`          | `{instanceId, assetId}`                  |
| `seek`         | `seek()`          | `{instanceId, assetId, seekTime}`        |
| `ended`        | `onended`         | `{instanceId, assetId}`                  |
| `looped`       | `onended` (loop)  | `{instanceId, assetId}`                  |
| `volumechange` | `setVolume()` etc | `{instanceId?, assetId?, volume, type?}` |
| `loopchange`   | `loop()`          | `{instanceId?, assetId, loop}`           |
| `mute`         | `muteAll()`       | `{type: 'global'}`                       |
| `unmute`       | `unmuteAll()`     | `{type: 'global'}`                       |

### Event API

```javascript
// Register listener
audio.on('play', ({assetId, instanceId}) => {
    console.log('Playing:', assetId);
});

// One-time listener
audio.one('ended', ({assetId}) => {
    console.log('Finished:', assetId);
});

// Remove listener
audio.off('play', callback);

// Clear all removable listeners
audio.clearEvents();
```

---

## Multiple Instances

By default, `allowMultiple: true` allows multiple simultaneous instances of the same asset:

```javascript
await audio.load('sfx', '/sfx.mp3');
await audio.play('sfx');  // instance_1
await audio.play('sfx');  // instance_2 (both play!)
await audio.stop('sfx');  // stops BOTH instances
```

To prevent multiple instances:

```javascript
await audio.load('bgm', '/bgm.mp3', {allowMultiple: false});
await audio.play('bgm');  // plays
await audio.play('bgm');  // ignored! warn logged
```