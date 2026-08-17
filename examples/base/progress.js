/**
 * Copyright (c) 2026 Pixalo
 *
 * @Repository: https://github.com/pixalo
 * @License: MIT
 * @Author:
 *    - Salar Izadi
 *    - https://github.com/salarizadi
 */
import Pixalo from 'https://cdn.jsdelivr.net/gh/pixalo/pixalo@master/dist/pixalo.esm.js';

const px = new Pixalo('#canvas', {
    width     : window.innerWidth,
    height    : window.innerHeight,
    background: '#031C1B',
});
px.start();

// ======== LOADING SCREEN ========
const loadingBar = px.append('rect', {
    x: 50, y: px.baseHeight / 2 - 10,
    width: 0, height: 20,
    fill: '#F4A81A',
    borderRadius: 12,
});

const loadingText = px.append('text', {
    width: 100,
    x: (px.baseWidth - 100) / 2,
    y: px.baseHeight / 2 + (loadingBar.height * 2),
    text : 'Loading... 0%',
    color: '#ffffff',
    font : '20px Arial',
    align: 'center'
});

// ======== ASSET LOADS WITH PROGRESS ========
const baseURL = 'https://raw.githubusercontent.com/pixalo/pixalo/refs/heads/main/examples/assets';
const results = await px.wait(
    px.delay(500),  // simulate init delay

    px.assets.load('image', 'player', `${baseURL}/character.png`),
    px.assets.load('image', 'banner', `${baseURL}/banner.png`),
    px.assets.load('audio', 'bgm', `${baseURL}/audio/An-Epic-Story.mp3`),
    px.assets.load('audio', 'click', `${baseURL}/sfx/click.m4a`),

    // Fetch external data
    fetch('https://jsonplaceholder.typicode.com/users')
        .then(r => r.json()),

    // ======== PROGRESS CALLBACK (last argument) ========
    ({ state, loaded, total, percent, index, error }) => {
        // Update loading bar
        loadingBar.style('width', percent * (px.baseWidth - 100));

        // Update text
        loadingText.text(`Loading... ${Math.round(percent * 100)}%`);

        // Log states
        switch (state) {
            case 'start':
                console.log('🚀 Loading started...');
                break;
            case 'loading':
                console.log(`✅ Item ${index + 1}/${total} loaded (${Math.round(percent * 100)}%)`);
                break;
            case 'error':
                console.error(`❌ Item ${index + 1} failed:`, error);
                break;
            case 'complete':
                loadingText.text('🎉 All assets loaded!');
                console.log('🎉 All assets loaded!');
                break;
            case 'failed':
                loadingText.text('💥 Some assets failed to load');
                console.error('💥 Some assets failed to load');
                break;
        }
    }
);