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

// Load custom font via FontFace API
// Docs: https://developer.mozilla.org/en-US/docs/Web/API/FontFace
const font_url = 'https://fonts.gstatic.com/s/pixelifysans/v3/CHylV-3HFUT7aC4iv1TxGDR9Jn0Eiw.woff2';
await px.assets.load('font', 'PixelFont', font_url, {
    weight : '700',    // FontWeight values: 100-900, bold, etc.
    style  : 'normal', // FontStyle:  normal | italic | oblique
    display: 'swap'    // FontDisplay: auto | block | swap | fallback | optional
                       // 'swap' recommended for games (instant text visibility)
});

const myText = px.append('myText', {
    width : 150,
    height: 50,
    x: (px.baseWidth  - 150) / 2,
    y: (px.baseHeight - 50) / 2,
    scale: 2,

    color: '#F4A81A',
    text : 'Pixalo \n Easy & Powerful',

    // Use the loaded custom font family
    font : '30px PixelFont',
});

// Font asset specific
const fontAsset = px.assets.get('PixelFont');
if (fontAsset) {
    console.log('Font family:', fontAsset);
}