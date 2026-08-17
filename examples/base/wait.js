/**
 * Copyright (c) 2025-2026 Pixalo
 *
 * @Repository: https://github.com/pixalo
 * @License: MIT
 * @Author:
 *    - Salar Izadi
 *    - https://github.com/salarizadi
 */
import Pixalo from '../../src/index.js';

const game = new Pixalo('#canvas', {
    width : window.innerWidth,
    height: window.innerHeight
});
game.start();

const baseURL = 'https://raw.githubusercontent.com/pixalo/pixalo/refs/heads/main/examples/assets';

// Wait for multiple asset loads
const results = await game.wait(
    game.delay(1000),
    game.assets.load('image', 'player', `${baseURL}/character.png`),
    game.assets.load('audio', 'bgm', `${baseURL}/audio/An-Epic-Story.mp3`),
);

const promise1 = game.assets.load('image', 'banner', `${baseURL}/banner.png`);
const promise2 = new Promise((resolve) => {
    game.timeout(() => {
        console.log('Animation setup complete');
        resolve('animation-ready');
    }, 500);
});
const promise3 = game.assets.load('audio', 'click', `${baseURL}/sfx/click.m4a`);
const promise4 = fetch('https://jsonplaceholder.typicode.com/users')
    .then(response => response.json())
    .then(data => {
        console.log('Player stats loaded:', data);
        return data;
    });

// Wait for nested arrays of promises
const results2 = await game.wait([
    promise1,
    [promise2, promise3],
    promise4
]);

console.log('All promises resolved:', results2);