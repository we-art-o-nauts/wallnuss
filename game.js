'use strict';
const walnutColor = hsl(.08, .7, .45);
const bernRed = hsl(.02, .85, .45);
const bernYellow = hsl(.15, .9, .55);
const bernGreen = hsl(.35, .7, .35);
const rColor = hsl(0, 1, 0.5);
const lColor = hsl(0, 0.9, 0.5);

let walnut, city, score, damage, objects, timer;
let bounce = vec2();

const startTime = 10;
const startSize = 60;
const startObjects = 30;

let walnutTile;

async function gameInit()
{
    walnutTile = loadSprite('walnut.png');
    await spritesReady();
    score = 0;
    damage = 1;
    timer = new Timer(startTime);
    cameraScale = 1;
    cameraPos = vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2);

    const w = mainCanvasSize.x, h = mainCanvasSize.y;
    walnut = {
        pos: vec2(w / 2, h / 2),
        size: startSize,
        speed: vec2(),
        angle: 0
    };
    city = vec2(0, 0);
    objects = [];
    for (let i = 0; i < startObjects; i++) spawnObject(i < 25 ? 1 : i < 29 ? 2 : 3);
    console.log('after spawn:', objects.length, 'first obj:', objects[0] ? objects[0].pos : 'none');
}

function spawnObject(t = null)
{
    if (t === null) {
      const i = rand(0, 30);
      t = i < 25 ? 1 : i < 28 ? 2 : 3;
    }
    const w = mainCanvasSize.x, h = mainCanvasSize.y;
    const x = rand(w * -0.5, w * 1.5);
    const y = rand(h * -0.5, h * 1.5);
    objects.push({
        pos: vec2(x, y),
        type: t,
        collected: false,
        wobble: rand(0, PI*2)
    });
}

function gameUpdate()
{
  if (!timer.active()) {
    if (keyIsDown('Enter')) {
      // TODO: proper reset of game
      location.reload();
    }
      return;
    }
    const w = mainCanvasSize.x, h = mainCanvasSize.y;
    const move = keyDirection();
    let moveVec = vec2(move.x, move.y).scale(4 + (damage * 0.5));
    walnut.speed = walnut.speed.add(moveVec).scale(.92);
    if (keyWasPressed('Space') && damage > 0) {
        damage -= 1;
        walnut.speed = walnut.speed.add(walnut.speed.normalize().scale(25));
        moveVec = moveVec.add(walnut.speed.normalize().scale(50));
    }
    walnut.angle += walnut.speed.length() * (walnut.speed.x > 0 ? .003 : -.003);
    moveVec = moveVec.add(bounce.scale(-0.5));

    // Move all objects opposite to input so ball stays centered
    city = city.subtract(moveVec);
    for (const obj of objects)
    {
        if (obj.collected) continue;
        obj.pos = obj.pos.subtract(moveVec);
    }

    // Keep ball centered
    walnut.pos = vec2(w / 2, h / 2);

    // Collect objects
    let countObjects = 0;
    for (const obj of objects)
    {
        if (obj.collected) continue;
        countObjects += 1;
        const dist = walnut.pos.distance(obj.pos);
        const needed = 10 + obj.type * 8;
        if (dist < needed + walnut.size / 2)
        {
          obj.collected = true;
          // collect a spiky green pellet
          if (obj.type == 1) {
            score += 5;

          // collect a yellow pellet
          } else if (obj.type == 2) {
            timer.set(5 + -1 * timer.get());
            score += 10;
            damage += 1;

          // collect a blue pellet
          } else {
            timer.set(10 + -1 * timer.get());
            score += 5;
            damage += 1;
          }

          if (walnut.size < 200) {
            walnut.size += obj.type * 3;
          }
        }
    }

    if (rand() < .01 && countObjects < startObjects) spawnObject();
}

function drawNoiseStreets(offsetX = 0, offsetY = 0)
{
    const scale = 0.0027;
    const thickness = 0.01;
    const w = mainCanvasSize.x, h = mainCanvasSize.y;
    const center = screenToWorld(vec2(w / 2, h / 2));
    const walnutBox = vec2(walnut.size * 0.8, walnut.size * 0.8);
    let correction = vec2();
    for (let x = 0 - offsetX; x < w - offsetX; x += 4) {
        for (let y = 0 - offsetY; y < h - offsetY; y += 4) {
            const n1 = noise2D(x * scale, y * scale);
            const n2 = noise2D((x + 1000) * scale, (y + 1000) * scale);
            const isStreetX = Math.abs(n1 - 0.5) < thickness;
            const isStreetY = Math.abs(n2 - 0.5) < thickness;
            if (isStreetX || isStreetY) {
                // Alternate colors
                let streetColor = Math.random() < 0.5 ? rColor : lColor;
                const noisePos = vec2(x + offsetX, y + offsetY);
                // Collision based on four edges of the overlapping box
                if (isOverlapping(noisePos, walnutBox, walnut.pos)) {
                  // streetColor = bernYellow; // for debugging
                  const halfW = walnutBox.x / 2 + 2;
                  const halfH = walnutBox.y / 2 + 2;
                  const dx = noisePos.x - walnut.pos.x;
                  const dy = noisePos.y - walnut.pos.y;
                  const overlapX = Math.max(0, halfW - Math.abs(dx));
                  const overlapY = Math.max(0, halfH - Math.abs(dy));
                  correction = correction.add(vec2(Math.sign(dx) * overlapX, Math.sign(dy) * overlapY));
                }
                drawRect(noisePos, vec2(4, 4), streetColor);
            }
        }
    }
    if (abs(correction.x) > 1000) { correction.x = 0; }
    if (abs(correction.y) > 1000) { correction.y = 0; }
    if (abs(correction.x) > 100) { correction.x *= 0.1; }
    if (abs(correction.y) > 100) { correction.y *= 0.1; }
    return correction;
}

function gameRender()
{
    bounce = drawNoiseStreets(city.x, city.y);

    for (const obj of objects)
    {
        if (obj.collected) continue;
        const color = obj.type == 1 ? rColor : obj.type == 2 ? hsl(.15, .7, .5) : hsl(.55, .6, .5);
        const r = 20 + obj.type * 15;
        drawCircle(obj.pos, r, color);
        if (obj.type > 1)
        {
            drawLine(obj.pos.add(vec2(-8, 0)), obj.pos.add(vec2(8, 0)), 3, WHITE);
            drawLine(obj.pos.add(vec2(0, -8)), obj.pos.add(vec2(0, 8)), 3, WHITE);
        }
    }

    drawTile(walnut.pos, vec2(walnut.size, walnut.size), walnutTile, WHITE, walnut.angle);

    drawTextScreen("Was de Walnuss?!", vec2(mainCanvasSize.x / 2, 40), 40 - timer.get()*4, WHITE, 6);
    drawTextScreen("" + score
      //+ "  •  SIZE " + (walnut.size - 59)
      + "  •  ⏱ " + round(-1 * timer.get())
      + "  •  PWR " + '★'.repeat(damage)
      , vec2(mainCanvasSize.x / 2, mainCanvasSize.y - 40), 20, WHITE, 3);

    if (timer.elapsed() || !timer.active())
    {
        //drawRect(vec2(0, 0), mainCanvasSize, hsl(0, 0, 0, .6));
        drawTextScreen("Game is over, Walnuss", vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 - 70), 40, bernYellow, 8);
        drawTextScreen("" + score + " points", vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2), 58, WHITE, 4);
        drawTextScreen((score < 50 ? "You are a tiny seed, keep rolling" : (score < 100 ? "You grew stronger" : "Well done, master")), vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 + 60), 22, bernYellow, 3);

        drawTextScreen("ENTER to try again", vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 + 120), 16, WHITE, 3);
        drawTextScreen("Arrow keys to roll • SPACE to boost", vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 + 140), 16, WHITE);
        drawTextScreen("Collect RED seeds for score and boost", vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 + 160), 16, bernGreen);
        drawTextScreen("Collect YELLOW and BLUE seeds for time", vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 + 180), 16, bernGreen);

        timer.unset();
    }
}

engineInit(gameInit, gameUpdate, undefined, undefined, gameRender);
