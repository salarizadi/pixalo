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

const game = new Pixalo('#canvas', {
    width : window.innerWidth,
    height: window.innerHeight
});
game.start();

game.background.add('#268884', {
    id    : 'green',
    width : game.baseWidth,
    height: game.baseHeight
});

game.background.add('#F4A81B', {
    id    : 'orange',
    width : game.baseWidth,
    height: game.baseHeight
});

let visible = false;
game.timer(() => {
    game.background.setVisible('orange', visible = !visible);
}, 1000);