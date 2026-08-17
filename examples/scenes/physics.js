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
    physics     : {
        gravity: { x: 0, y: 50 },
    }
});
px.start();
px.append('square', {
    width    : 100,
    height   : 100,
    x        : 100,
    fill     : '#258784',
    draggable: true,
    physics  : true,
});

/** ========= Add a new scene ========= */
globalThis.scenePhysics = px.scene('physics');
scenePhysics.start();
scenePhysics.append('circle', {
    shape    : 'circle',
    width    : 50,
    height   : 50,
    x        : 300,
    fill     : '#F4A81B',
    physics  : true,
    draggable: true,
});

// Transferring the square to the physics scene
scenePhysics.timeout(() => scenePhysics.find('circle').swap(px), 3000);


/** ========= Add a new scene ========= */
globalThis.scenePhysics2 = px.scene('physics2', {
    physics: {
        gravity: {x: 0, y: 0}
    }
});
scenePhysics2.start();
globalThis.triangle = scenePhysics2.append('triangle', {
    shape    : 'triangle',
    width    : 50,
    height   : 50,
    x        : 400,
    fill     : '#00ffcf',
    physics  : true,
    draggable: true,
});