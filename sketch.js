const Box2d = Box2D(); //Javascript makes no sense. Why can't libraries just work?

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

// IMPLICIT CASTING WOULD BE NICE RIGHT NOW. WHY CAN'T OPERATOR OVERLOADING BE A THING IN JS.

function p5Vec2b2Vec(p5Vec)
{
    return new Box2d.b2Vec2(p5Vec.x, p5Vec.y);
}

function b2Vec2p5Vec(b2Vec)
{
    return createVector(b2Vec.get_x(), b2Vec.get_y());
}

function setCanvasSize()
{
    var sx = floor(windowWidth / CANVAS_SIZE.x);
    var sy = floor(windowHeight / CANVAS_SIZE.y);
    resolutionScale = min(sx, sy);
}

var physWorld = null;

class GravityBody
{
    constructor(scenedef)
    {
        this.bodyRadius = scenedef.radius;
        this.bodyFriction = scenedef.friction;
        this.bodyRestitution = scenedef.rest;
        this.density = scenedef.density;
        this.gravityRadius = scenedef.gravityRadius;
        this.position = createVector(scenedef.position.x, scenedef.position.y);

        if (physWorld != null)
        {
            var fixDef = new Box2d.b2FixtureDef();
            fixDef.set_restitution(this.bodyRestitution);
            fixDef.set_density(this.density);
            var collider = new Box2d.b2CircleShape(this.bodyRadius);
            fixDef.set_shape(collider);
            var bodyDef = new Box2d.b2BodyDef();
            bodyDef.set_position(p5Vec2b2Vec(this.position));
            var body = physWorld.CreateBody(bodyDef);
            body.CreateFixture(fixDef);
            this.physBody = body;
        }
        else
        {
            console.error("Cannot create a gravity body right now! physWorld is null.");
        }
    }

    remove()
    {
        if (physWorld != null && this.physBody != null)
        {
            physWorld.DestroyBody(this.physBody);
        }
    }
}

function preload()
{

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
    physWorld = new Box2d.b2World(new Box2d.b2Vec2(0, 0), true);
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
