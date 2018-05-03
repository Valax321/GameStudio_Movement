const CANVAS_SIZE = {x: 640, y: 480}
var resolutionScale = 1;

const GamePadType = {
    ps4: "ps4"
};

var CONTROLLER_DEBUG_MENU = false;

var cameraPosition;
var physicsTimer;

var padIndex = 0;
var pads = {};
var padMap = {};
var padType = GamePadType.ps4;

window.addEventListener("gamepadconnected", function(e)
{
    pads[e.gamepad.index] = e.gamepad;
    console.log("CONTROLLER %d CONNECTED: %s", e.gamepad.index, e.gamepad.id);
    setPadIndex();
});

window.addEventListener("gamepaddisconnected", function(e)
{
    delete pads[e.gamepad.index];
    console.log("CONTROLLER %d DISCONNECTED: %s", e.gamepad.index, e.gamepad.id);
    setPadIndex();
});

function setPadIndex()
{
    for (var pad in pads)
    {
        if (pads.hasOwnProperty(pad) && pads[pad].mapping == 'standard')
        {
            padIndex = pads[pad].index;
            console.log("SET ACTIVE GAMEPAD TO %s (%d)", pads[pad].id, pads[pad].index);
            return;
        }
    }

    console.log("Did not set a valid gamepad!");
}

function getButton(id)
{
    var gamepad = pads[padIndex.toString()];
    if (gamepad != undefined && padMap[padType] != undefined)
    {
        if (padMap[padType].buttons[id] != undefined)
        {
            return gamepad.buttons[padMap[padType].buttons[id]].pressed;
        }
        else
        {
            console.error("Invalid button name: %s", id);
        }
    }

    return false;
}

function getAxis(id)
{
    var gamepad = pads[padIndex.toString()];
    if (gamepad != undefined && padMap[padType] != undefined)
    {
        if (padMap[padType].axes[id] != undefined)
        {
            return gamepad.axes[padMap[padType].axes[id]];
        }
        else
        {
            console.error("Invalid axis name: %s", id);
        }
    }

    return 0.0;
}

function deltaTime()
{
    return 1 / 60; //Just slow down if the framerate drops, makes physics easier in the mess that is JS.
}

function p5Vec2b2Vec(p5Vec)
{

}

function b2Vec2p5Vec(b2Vec)
{

}

class Vehicle
{

}

function setCanvasSize()
{
    var sx = floor(windowWidth / CANVAS_SIZE.x);
    var sy = floor(windowHeight / CANVAS_SIZE.y);
    resolutionScale = min(sx, sy);
}

var carSpr;
var highwaySpr;
function preload()
{
    padMap = loadJSON("cfg/controller_map.json");
    carSpr = loadImage("assets/cars/player/player_car_01.png");
    highwaySpr = loadImage("assets/env/highway.png");
}

var testObjPos;

function setup()
{
    setCanvasSize();
    frameRate(60);
    imageMode(CENTER);
    var canvas = createCanvas(CANVAS_SIZE.x * resolutionScale, CANVAS_SIZE.y * resolutionScale).elt;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    cameraPosition = createVector(0, 0);
    testObjPos = createVector(0, 0);
}

function windowResized()
{
    setCanvasSize();
    resizeCanvas(CANVAS_SIZE.x * resolutionScale, CANVAS_SIZE.y * resolutionScale);
}

function draw()
{
    update();
    physics();

    background(200);
    push();
    scale(resolutionScale);
    image(highwaySpr, CANVAS_SIZE.x / 2, CANVAS_SIZE.y / 2);
    image(carSpr, testObjPos.x, testObjPos.y);

    if (CONTROLLER_DEBUG_MENU)
    {
        controllerDebugMenu();
    }

    pop();
}

var debugPadIndex = 0;
function controllerDebugMenu()
{
    push();
    var pos = 30;
    background(200);
    textFont('Arial');
    var gamepad = pads[debugPadIndex.toString()];
    if (gamepad != undefined)
    {
        text(gamepad.id, CANVAS_SIZE.x / 2, pos);
        for (var i = 0; i < gamepad.axes.length; i++)
        {
            var axis = gamepad.axes[i];
            text("Axis " + i + ": " + axis.toFixed(4), 500, pos);
            pos += 30;
        }
        for (var j = 0; j < gamepad.buttons.length; j++)
        {
            var button = gamepad.buttons[j];
            var xPos = floor(j / 15) * 100;
            var yPos = max(floor(j % 15) * 30, 1) + 30;
            text("Button " + j + ": " + button.pressed, xPos, yPos);
        }
    }
    pop();
}

function update()
{
    testObjPos.add(getAxis("stick_left_x") * deltaTime() * 100, getAxis("stick_left_y") * deltaTime() * 100);
}

function physics()
{

}
