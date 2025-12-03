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

await game.wait(
    game.assets.load('image', 'background',  'https://raw.githubusercontent.com/pixalo/pixalo/refs/heads/main/examples/assets/cloudscape/background.png'),
    game.assets.load('image', 'moon',        'https://raw.githubusercontent.com/pixalo/pixalo/refs/heads/main/examples/assets/cloudscape/moon.png'),
    game.assets.load('image', 'bottom-clouds','https://raw.githubusercontent.com/pixalo/pixalo/refs/heads/main/examples/assets/cloudscape/bottom-clouds.png'),
    game.assets.load('image', 'top-clouds',  'https://raw.githubusercontent.com/pixalo/pixalo/refs/heads/main/examples/assets/cloudscape/top-clouds.png')
);
game.start();

// 1) Fixed sky (motionless)
game.background.add('background', {
    width   : game.baseWidth,
    height  : game.baseHeight,
    repeat  : 'x',
    parallax: 0        // Completely fixed to the camera
});

// 2) The moon moves a little with the camera.
game.background.add('moon', {
    parallax: 0.2,     // 20% movement relative to the camera
    zIndex  : 10
});

// 3) Medium-speed clouds
game.background.add('top-clouds', {
    repeat  : 'x',
    parallax: 0.4,     // 40% movement
    zIndex  : 20
});

// 4) Clouds near the fastest parallax movement + in front of the camera
game.background.add('bottom-clouds', {
    top     : true,
    repeat  : 'x',
    parallax: 0.7,     // 70% movement (seems to be very close)
    y       : game.baseHeight - 180,
    zIndex  : 30
});

let dir = 1;
game.timer(() => {
    const shift = 600 * dir;
    game.camera.moveBy(shift, 0, false, 2000);
    dir *= -1;
}, 2500);