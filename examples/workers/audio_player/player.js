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

globalThis.px = new Pixalo({
    background: '#1a1a1a'
});

await new Promise((resolve) => {
    px.on('ready', () => {
        px.resize(px.window.width, px.window.height);
        px.start();
        resolve();
    });
});

// ===== CONFIG =====
const ALBUM_SIZE = 300;
const BAR_HEIGHT = 50;
const BTN_WIDTH  = 50;

// ===== HELPERS =====
const formatTime = (s) => {
    const m   = Math.floor(s / 60);
    const sec = String(Math.floor(s % 60)).padStart(2, '0');
    return `${String(m).padStart(2, '0')}:${sec}`;
};

// ===== LOAD ASSETS =====
const audioSrc = 'https://raw.githubusercontent.com/pixalo/pixalo/refs/heads/main/examples/assets/audio/An-Epic-Story.mp3';
await px.assets.load('audio', 'music', audioSrc, {
    volume: 1,
    loop  : false
});

const {baseWidth, baseHeight} = px;
const duration = Math.round(await px.audio.getDuration('music'));

// ===== ALBUM COVER =====
const album = px.append('album', {
    width : ALBUM_SIZE,
    height: ALBUM_SIZE,
    x     : (baseWidth  - ALBUM_SIZE) / 2,
    y     : (baseHeight - ALBUM_SIZE) / 2,
    fill  : '#268984',
    text  : 'Music Placeholder',
    color : 'white',
    font  : '25px Arial',
    borderRadius: 40,
});

// ===== CONTROLS BAR =====
const controls = album.append('controls', {
    width : 250,
    height: BAR_HEIGHT,
    x     : (album.width - 250) / 2,
    y     : album.height - 30,
    fill  : '#F4A71A',
    clickable: true,
    borderRadius: 20,
    constrainToParent: false
});

// Button factory
const makeBtn = (id, x, text, color = 'black') =>
    controls.append(id, {
        width : BTN_WIDTH,
        height: BAR_HEIGHT,
        x,
        text,
        color,
        font : '16px Arial',
        clickable: true,
    });

const playBtn  = makeBtn('btn-play',  10,  'PLAY');
const stopBtn  = makeBtn('btn-stop',  70,  'STOP');
const muteBtn  = makeBtn('btn-mute',  130, await px.audio.isMuted() ? 'UNMUTE' : 'MUTE');
const loopBtn  = makeBtn('btn-loop',  190, 'LOOP');

// ===== PROGRESS BAR =====
const progressTrack = album.append('progress-track', {
    width : album.width - 80,
    height: 6,
    x     : 40,
    y     : album.height - 50,
    fill  : '#1a6b66',
    clickable: true,
    borderRadius: 3,
});

const progressFill = progressTrack.append('progress-fill', {
    width : 0,
    height: 6,
    fill  : '#F4A71A',
    borderRadius: 3
});

// ===== TIME DISPLAY =====
const timeDisplay = album.append('audio-time', {
    width : 70,
    height: 20,
    x     : progressTrack.width - 30,
    y     : album.height - 80,
    text  : `00:00 / 00:${String(duration).padStart(2, '0')}`,
    color : 'white',
    font  : '12px Arial',
    textAlign: 'left'
});

// ===== STATUS LABEL =====
const statusLabel = album.append('status-label', {
    width : 100,
    height: 20,
    x     : 40,
    y     : album.height - 80,
    text  : 'Ready',
    color : '#fff',
    font  : '16px Arial',
    textAlign: 'left'
});

// ===== UI UPDATERS =====
const updatePlayBtn  = (playing) => playBtn.text(playing ? 'PAUSE' : 'PLAY');
const updateMuteBtn  = async () =>
    muteBtn.text(await px.audio.isMuted() ? 'UNMUTE' : 'MUTE');
const updateLoopBtn  = async () =>
    loopBtn.style('color', (await px.audio.loop('music')) ? '#fff' : '#000');
updateLoopBtn();
const updateStatus   = (text) => statusLabel.text(text);
const resetProgress  = () => {
    progressFill.style('width', 0);
    timeDisplay.text(`00:00 / ${formatTime(duration)}`);
};

// ===== AUDIO EVENTS =====
px.audio.on({
    play:    ({assetId}) => {
        if (assetId === 'music') {
            updatePlayBtn(true);
            updateStatus('Playing');
        }
    },
    pause:   ({assetId}) => {
        if (assetId === 'music') {
            updatePlayBtn(false);
            updateStatus('Paused');
        }
    },
    resume:  ({assetId}) => {
        if (assetId === 'music') {
            updatePlayBtn(true);
            updateStatus('Playing');
        }
    },
    stop:    ({assetId}) => {
        if (assetId === 'music') {
            updatePlayBtn(false);
            updateStatus('Stopped');
            resetProgress();
        }
    },
    ended:   ({assetId}) => {
        if (assetId === 'music') {
            updatePlayBtn(false);
            updateStatus('Finished');
            resetProgress();
        }
    },
    mute:    () => {
        updateMuteBtn();
        updateStatus('Muted');
    },
    unmute:  () => {
        updateMuteBtn();
        updateStatus('Unmuted');
    },
    loopchange:    ({assetId}) => {
        if (assetId === 'music') updateLoopBtn();
    },
    looped: ({assetId}) => {
        if (assetId === 'music') {
            console.log('%c🎵 Music looped — playing next iteration', 'color: #4CAF50; font-weight: bold;');
        }
    }
});

// ===== CLICK HANDLERS =====

// Play / Pause / Resume
playBtn.on('click', async () => {
    if (await px.audio.isPlaying('music')) {
        px.audio.pause('music');
    } else if (await px.audio.isPaused('music')) {
        px.audio.resume('music');
    } else {
        px.audio.play('music');
    }
});

// Stop
stopBtn.on('click', () => {
    px.audio.stop('music');
});

// Mute / Unmute
muteBtn.on('click', async () => {
    (await px.audio.isMuted()) ? px.audio.unmuteAll() : px.audio.muteAll();
});

// Loop Toggle
loopBtn.on('click', async () => {
    px.audio.loop('music', !(await px.audio.loop('music')));
});

// ===== UPDATE LOOP (Progress only) =====
px.on('update', async () => {
    if (!(await px.audio.isPlaying('music'))) return;

    const current  = await px.audio.getCurrentTime('music');
    const progress = current / duration;

    timeDisplay.text(`${formatTime(current)} / ${formatTime(duration)}`);
    progressFill.style('width', progressTrack.width * progress);
});