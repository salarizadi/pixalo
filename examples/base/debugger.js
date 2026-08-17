/**
 * Copyright (c) 2025-2026 Pixalo
 *
 * @Repository: https://github.com/pixalo
 * @License: MIT
 * @Author:
 *    - Salar Izadi
 *    - https://github.com/salarizadi
 */
import Pixalo from 'https://cdn.jsdelivr.net/gh/pixalo/pixalo@master/dist/pixalo.esm.js';

const game = new Pixalo('#canvas', {
    width: window.innerWidth,
    height: window.innerHeight,
    fps: 60,

    // debugger: true,
    debugger: {
        active: true,                           // Enable/disable debugger
        panel : true,                           // Show/hide debug panel
        hotKey: true,                           // Enable Ctrl+D hotkey toggle
        items : true,                           // Enable item rendering
        fillColor: 'rgba(255, 0, 0, 0.3)',      // Entity fill color
        strokeColor: 'rgba(255, 0, 0, 0.8)',    // Entity stroke color
        lineWidth: 1,                           // Stroke line width
        pointColor: 'rgba(255, 255, 255, 0.8)', // Collision point color
        pointRadius: 2,                         // Collision point radius
        styles: {}                              // Additional style overrides
    }
});
game.start();

// Disable debugger
game.disableDebugger();

// Enable debugger
game.enableDebugger();

// Only when the debugger is active
game.log('Log');
game.info('Info');
game.warn('Warn');
game.error('Error');