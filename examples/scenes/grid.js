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
    background  : '#031C1B'
});
px.start();

/** ========= Add a new scene ========= */
globalThis.sceneGrid = px.scene('sceneGrid', {
    x     : (px.baseWidth  - 300) / 2,
    y     : (px.baseHeight - 300) / 2,
    width : 300,
    height: 300,
    fill  : '#258784',
    grid : {
        width: 20,
        height: 20,
        color: 'rgba(0,0,0, 0.5)',
        lineWidth: 1,
        majorGridEvery: 6,
        majorColor: 'rgba(0,0,0)',
        majorLineWidth: 1,
        minZoomToShow: 0.2,
        maxZoomToShow: 1
    }
});
sceneGrid.start();
sceneGrid.grid.enable();

sceneGrid.append('triangle', {
    shape    : 'triangle',
    width    : 50,
    height   : 50,
    x        : (sceneGrid.bounds.width  - 50) / 2,
    y        : (sceneGrid.bounds.height - 50) / 2,
    fill     : '#F4A81B',
    rotation : 90,
    draggable: true,
});