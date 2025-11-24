import Pixalo from '../../src/index.js';

globalThis.px = new Pixalo('#canvas', {
    width: innerWidth,
    height: innerHeight,
    background: 'skyblue',
    resizeTarget: 'window',
});
px.start();

px.append('rect-black', {
    width: 100,
    height: 100,
    x: 200,
    fill: 'black',
    draggable: true,
    clickable: true,
    hoverable: true,
}).append('child-rect-black', {
    width: 50,
    height: 50,
    fill: 'pink',
    draggable: true,
    clickable: true,
})
px.find('rect-black').append('child-rect-black-2', {
    width: 50,
    height: 50,
    y: 50,
    x: 50,
    fill: 'yellow',
    draggable: true,
    clickable: true,
}).append('child-rect-black3', {
    width: 25,
    height: 25,
    fill: '#4b4b4b',
    draggable: true,
    clickable: true,
})

px.findDeep('child-rect-black-2').append('child-rect-black4', {
    width: 25,
    height: 25,
    x: 25,
    y: 25,
    fill: '#0051ff',
    draggable: true,
    clickable: true,
})

px.find('rect-black').on('click', () => console.log('rect-black click')).on('hover', () => console.log('rect-black hovered'));

px.append('rect-purple', {
    width: 100,
    height: 100,
    x: 400,
    fill: 'purple',
    draggable: true,
    clickable: true,
});

window.scene1 = px.scene('scene1', {
    mergeable: true
});
scene1.start();
scene1.append('rect-red', {
    width: 50,
    height: 50,
    x: 100,
    y: 200,
    fill: 'red',
    draggable: true,
    clickable: true,
});
scene1.find('rect-red').move({
    x: 350,
    duration: 3000
});
// scene1.timeout(() => {
//     console.log('halt')
//     scene1.stop();
// }, 2000);
scene1.find('rect-red').on('click', e => console.log('Click on rect-red'));

window.scene2 = px.scene('scene2', {
    collision: true
});
scene2.start();
scene2.append('rect-lightgreen', {
    width: 50,
    height: 50,
    x: 200,
    y: 200,
    fill: 'lightgreen',
    draggable: true,
    clickable: true,
    collision: true
});
scene2.find('rect-lightgreen').move({
    y: 200,
    duration: 3000
});
scene2.find('rect-lightgreen').on('click', e => console.log('Click on rect-lightgreen'));

scene2.append('rect-pink', {
    width: 50,
    height: 50,
    x: 200,
    y: 200,
    fill: 'pink',
    draggable: true,
    collision: true
});

scene2.find('rect-pink').on('collide', data => {
    console.log(data);
});

scene1.timer(() => {
    console.log('Hello Scene1')
}, 1000)

// px.on('click', e => {
//     scene2.emitters.fire(e.x, e.y)
// })

px.enableDebugger()