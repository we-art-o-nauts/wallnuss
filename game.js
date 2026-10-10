'use strict';
const walnutColor = hsl(.08, .7, .45);
const bernRed = hsl(.02, .85, .45);
const bernYellow = rgb(255/255, 229/255, 0);
const bernGreen = hsl(.35, .7, .35);
const bernWhite = rgb(1, 1, 1);
const bernBlue = hsl(.15, .7, .5);

const rColor = bernWhite; //hsl(0, 1, 0.5);
const lColor = bernYellow; //hsl(0, 0.9, 0.5);

const backgroundColor = hsl(.13, .9, .15);

let walnut, city, score, damage, objects, timer;
let bounce = vec2();
let pointer;

const pointerMaxRadius = 120;
const pointerTapDistance = 20;
const pointerTapTime = .35;

const startTime = 12;
const startSize = 60;
const startObjects = 30;
const gameOverFreeze = 2;

const jumpDuration = .5;
const jumpSpeed = 300;

let walnutTile;
let gameOverTime = 0;
let screenZoom = 1;

async function gameInit()
{
    setShowSplashScreen(true);
    setCanvasClearColor(backgroundColor);
    screenZoom = 2; //isTouchDevice ? 2 : 1;
    if (screenZoom !== 1)
    {
        const zoomedSize = mainCanvasSize.scale(1 / screenZoom);
        setCanvasFixedSize(zoomedSize);
        mainCanvasSize = zoomedSize.copy();
    }
    walnutTile = loadSprite('walnut.png');
    await spritesReady();
    resetGame();
}

function resetGame()
{
    score = 0;
    damage = 3;
    timer = new Timer(startTime);
    gameOverTime = 0;
    bounce = vec2();
    cameraScale = 1;
    cameraPos = vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2);

    const w = mainCanvasSize.x, h = mainCanvasSize.y;
    walnut = {
        pos: vec2(w / 2, h / 2),
        size: startSize,
        speed: vec2(),
        angle: 0,
        jumpTimer: 0,
        jumpDir: vec2()
    };
    city = vec2(0, 0);
    pointer = { down: false, origin: vec2(), moved: 0, startTime: 0 };
    objects = [];
    for (let i = 0; i < startObjects; i++) spawnObject(i < 25 ? 1 : i < 29 ? 2 : 3);
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
    // Freeze the game for a moment so the result can be read before restarting
    if (!gameOverTime) gameOverTime = time;
    if (time - gameOverTime >= gameOverFreeze &&
        (keyWasPressed('Enter') || mouseWasPressed(0))) {
      resetGame();
    }
      return;
    }
    const w = mainCanvasSize.x, h = mainCanvasSize.y;

    // Drag anywhere to steer, tap to jump (works with mouse, touch and pen)
    if (mouseWasPressed(0)) {
        pointer.down = true;
        pointer.origin = mousePosScreen.copy();
        pointer.moved = 0;
        pointer.startTime = time;
    } else if (mouseIsDown(0) && pointer.down) {
        pointer.moved = max(pointer.moved, pointer.origin.distance(mousePosScreen));
    }
    let tap = false;
    if (mouseWasReleased(0) && pointer.down) {
        tap = pointer.moved < pointerTapDistance && time - pointer.startTime < pointerTapTime;
        pointer.down = false;
    }

    // Virtual joystick from the drag, blended with keyboard input
    const move = keyDirection();
    let input = vec2(move.x, move.y);
    if (mouseIsDown(0) && pointer.down) {
        const drag = mousePosScreen.subtract(pointer.origin);
        const len = drag.length();
        if (len > 0) {
            const dragInput = drag.scale(min(len, pointerMaxRadius) / pointerMaxRadius / len);
            input = input.add(vec2(dragInput.x, -dragInput.y));
        }
    }
    if (input.length() > 1) input = input.normalize();
    let moveVec = input.scale(4 + (damage * 0.5));
    walnut.speed = walnut.speed.add(moveVec).scale(.92);
    if ((keyWasPressed('Space') || tap) && damage > 0) {
        damage -= 1;
        // Jump in the input direction, or the current roll direction if idle
        walnut.jumpDir = input.length() > .05 ? input.normalize() : walnut.speed.normalize();
        walnut.jumpTimer = jumpDuration;
        walnut.speed = walnut.speed.add(walnut.jumpDir.scale(25));
    }
    // Smoothly ease the jump out over its duration instead of a single-frame lurch
    if (walnut.jumpTimer > 0) {
        walnut.jumpTimer = max(0, walnut.jumpTimer - timeDelta);
        const ease = (walnut.jumpTimer / jumpDuration) ** 2;
        moveVec = moveVec.add(walnut.jumpDir.scale(jumpSpeed * ease * timeDelta));
    } else {
      // Bounce the walnut from walls when not jumping
      moveVec = moveVec.add(bounce.scale(-0.5));
    }
    walnut.angle += walnut.speed.length() * (walnut.speed.x > 0 ? .003 : -.003);

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

          if (damage > 3) {
            damage = 3;
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
        const color = obj.type == 1 ? bernRed : obj.type == 2 ? bernBlue : bernGreen;
        const r = 20 + obj.type * 15;
        drawCircle(obj.pos, r, color);
        if (obj.type > 1)
        {
            drawLine(obj.pos.add(vec2(-8, 0)), obj.pos.add(vec2(8, 0)), 3, WHITE);
            drawLine(obj.pos.add(vec2(0, -8)), obj.pos.add(vec2(0, 8)), 3, WHITE);
        }
    }

    // Squash and stretch the walnut through the jump for a fluid feel
    const jumpProgress = walnut.jumpTimer > 0 ? 1 - walnut.jumpTimer / jumpDuration : 0;
    const jumpScale = 1 + Math.sin(jumpProgress * PI) * 0.18;
    drawTile(walnut.pos, vec2(walnut.size, walnut.size).scale(jumpScale), walnutTile, WHITE, walnut.angle);

    drawTextScreen("Was de Walnuss?!", vec2(mainCanvasSize.x / 2, 40), 40 - timer.get()*4, WHITE, 6);
    drawTextScreen("" + score
      //+ "  •  SIZE " + (walnut.size - 59)
      + "  •  ⏱ " + round(-1 * timer.get())
      + "  •  PWR " + '★'.repeat(damage)
      , vec2(mainCanvasSize.x / 2, mainCanvasSize.y - 40), 30, WHITE, 3);

    if (timer.elapsed() || !timer.active() || timer.get() > -1)
    {
        //drawRect(vec2(0, 0), mainCanvasSize, hsl(0, 0, 0, .6));
        message = score < 50 ? "Tiny seed, keep rolling" : (score < 100 ? "You grew stronger" : "Well done, Walnuss");
        drawTextScreen(message, vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 - 70), 40, bernYellow, 8);
        drawTextScreen("" + score + " points", vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2), 58, WHITE, 4);

        const frozen = time - gameOverTime < gameOverFreeze;
        if (frozen)
        {
            const countdown = Math.ceil(gameOverFreeze - (time - gameOverTime));
            drawTextScreen("Get ready... " + countdown, vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 + 120), 16, WHITE, 3);
        }
        else
        {
            drawTextScreen("ENTER or TAP to try again", vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 + 120), 16, WHITE, 3);
        }
        drawTextScreen("Drag or keys to roll • Tap or SPACE to jump", vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 + 160), 16, WHITE);
        drawTextScreen("Collect RED seeds for score and boost", vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 + 180), 16, bernGreen);
        drawTextScreen("Collect YELLOW and BLUE seeds for time", vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 + 200), 16, bernGreen);

        timer.unset();
    }
}

engineInit(gameInit, gameUpdate, undefined, undefined, gameRender);
