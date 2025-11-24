/**
 * Copyright (c) 2025 Pixalo
 *
 * @Repository: https://github.com/pixalo
 * @License: MIT
 * @Author:
 *    - Salar Izadi
 *    - https://github.com/salarizadi
 */
import Pixalo from 'https://cdn.jsdelivr.net/gh/pixalo/pixalo@master/dist/pixalo.esm.js';

globalThis.px = new Pixalo('#canvas', {
    width       : innerWidth,
    height      : innerHeight,
    resizeTarget: 'window',
    background  : '#031C1B',
});
px.start();

const $loading = px.append('loading', {
    x    : (px.baseWidth  - 50) / 2,
    y    : (px.baseHeight - 50) / 2,
    text : 'Loading...',
    font : '25px Arial',
    color: '#F4A81B',
});

/** ========= Add a new scene ========= */
globalThis.sceneWorld = px.scene('sceneWorld', {
    x     : (px.baseWidth  - 300) / 2,
    y     : (px.baseHeight - 300) / 2,
    width : 300,
    height: 300,
    bounds: false,
    interactive: 'flow',
});
sceneWorld.start();

await sceneWorld.wait(
    sceneWorld.assets.load('image', 'background',  'https://raw.githubusercontent.com/pixalo/pixalo/refs/heads/main/examples/assets/cloudscape/background.png'),
    sceneWorld.assets.load('image', 'moon',        'https://raw.githubusercontent.com/pixalo/pixalo/refs/heads/main/examples/assets/cloudscape/moon.png'),
    sceneWorld.assets.load('image', 'bottom-clouds','https://raw.githubusercontent.com/pixalo/pixalo/refs/heads/main/examples/assets/cloudscape/bottom-clouds.png'),
    sceneWorld.assets.load('image', 'top-clouds',  'https://raw.githubusercontent.com/pixalo/pixalo/refs/heads/main/examples/assets/cloudscape/top-clouds.png')
);
$loading.kill();

sceneWorld.append('rect', {
    x        : (sceneWorld.bounds.width  - 50) / 2,
    y        : (sceneWorld.bounds.height - 50) / 2,
    width    : 50,
    height   : 50,
    fill     : '#258784',
    draggable: true,
    borderRadius: 6,
}).append('play', {
    shape    : 'triangle',
    x        : 15,
    y        : 15,
    width    : 25,
    height   : 25,
    fill     : '#F4A81B',
    rotation : 90,
    draggable: true,
});

sceneWorld.background.add('background', {
    width : sceneWorld.bounds.width,
    height: sceneWorld.bounds.height
});
sceneWorld.background.add('moon', {
    x    : -100,
    y    : -100,
    scale: 1.5
});
sceneWorld.background.add('top-clouds', {
    repeat: 'x',
    speed : { x: 5, y: 0 },
    zIndex: 20
});
sceneWorld.background.add('bottom-clouds', {
    top   : true,
    y     : sceneWorld.bounds.height - 180,
    repeat: 'x',
    speed : { x: 50, y: 0 }
});