const Box2d = Box2D(); //Javascript makes no sense. Why can't libraries just work?
const BOX2D_WORLD_SCALE = 100;
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

var gameState = 0;

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

    //console.log("Total gamepad count: %d", navigator.getGamepads().length);

    if (navigator.getGamepads().length > 0)
    {
        padIndex = 0; //Fall back to the first gamepad plugged in
        console.log("Using fallback controller 0");
        return;
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
            var ax = gamepad.axes[padMap[padType].axes[id]];
            return abs(ax) > 0.1 ? ax : 0; //Dead zone to stop drifting
        }
        else
        {
            console.error("Invalid axis name: %s", id);
        }
    }

    return 0.0;
}

 //Just slow down if the framerate drops, makes physics easier in the mess that is JS.
 //Ordinarily you could run the physics steps multiple times a frame if the FPS is too low,
 //Or once every few frames if it is too high. But that's overkill for this and the chance
 //of having a low FPS is pretty low for something so simple.
function deltaTime()
{
    return 1 / 60;
}

// IMPLICIT CASTING WOULD BE NICE RIGHT NOW. WHY CAN'T OPERATOR OVERLOADING BE A THING IN JS.
//Converts from p5 vectors to box2d vectors, and translates between p5's pixel units and box2d's decimal scale.
//The scale is deterined by BOX2D_WORLD_SCALE, which should be kept as large (small?) as possible without hitting velocity
//limits within box2d.
function p5Vec2b2Vec(p5Vec)
{
    return new Box2d.b2Vec2(p5Vec.x / BOX2D_WORLD_SCALE, p5Vec.y / BOX2D_WORLD_SCALE);
}

function b2Vec2p5Vec(b2Vec)
{
    return createVector(b2Vec.get_x() * BOX2D_WORLD_SCALE, b2Vec.get_y() * BOX2D_WORLD_SCALE);
}

function setCanvasSize()
{
    var sx = floor(windowWidth / CANVAS_SIZE.x);
    var sy = floor(windowHeight / CANVAS_SIZE.y);
    resolutionScale = min(sx, sy);
}

var physWorld = null;

var gravityDotDef = null;

class GravityBody
{
    constructor(scenedef, rhs)
    {
        this.bodyRadius = scenedef.radius;
        this.bodyFriction = scenedef.friction;
        this.bodyRestitution = scenedef.rest;
        this.density = scenedef.density;
        this.gravityRadius = scenedef.gravityRadius;
        this.position = createVector(!rhs ? 30 : CANVAS_SIZE.x - 30, CANVAS_SIZE.y / 2);
        this.moveSpeed = scenedef.moveSpeed;
        this.acceleration = scenedef.acceleration;
        this.deceleration = scenedef.deceleration;
        this.velocity = createVector(0, 0);
        this.inputVector = createVector(0, 0);
        this.rhs = rhs;

        this.puntTimer = 0;
        this.puntReset = scenedef.puntReset;
        this.canPunt = true;

        this.spinReset = scenedef.spinReset;
        this.spinTimer = this.spinReset + 1; //We can always use it immediately
        this.canSpin = false;

        if (physWorld != null)
        {
            var fixDef = new Box2d.b2FixtureDef();
            fixDef.set_restitution(this.bodyRestitution);
            fixDef.set_density(this.density);
            fixDef.get_filter().set_categoryBits(rhs ? 0x0004 : 0x0001); //WITH ENEMY
            fixDef.get_filter().set_maskBits((rhs ? 0x0002 : 0x0008) | 0x0010); //WITH ENEMY CIRCLES
            var collider = new Box2d.b2CircleShape();
            collider.set_m_radius(this.bodyRadius / BOX2D_WORLD_SCALE);
            fixDef.set_shape(collider);
            var bodyDef = new Box2d.b2BodyDef();
            bodyDef.set_type(Box2d.b2_dynamicBody);
            bodyDef.set_position(p5Vec2b2Vec(this.position));
            var body = physWorld.CreateBody(bodyDef);
            body.CreateFixture(fixDef);
            this.physBody = body;
        }
        else
        {
            console.error("Cannot create a gravity body right now! physWorld is null.");
        }

        this.subs = [];
        for (var i = 0; i < 50; i++)
        {
            this.subs.push(new GravityFollower(this));
        }
    }

    postPhysics()
    {
        this.velocity = b2Vec2p5Vec(this.physBody.GetLinearVelocity());
        this.position = b2Vec2p5Vec(this.physBody.GetPosition());

        for (var i = 0; i < this.subs.length; i++)
        {
            this.subs[i].postPhysics();
        }
    }

    physics()
    {
        var moveVec = p5.Vector.mult(this.inputVector, this.acceleration);
        if (moveVec.mag() > 0)
        {
            var addVelocity = p5.Vector.add(moveVec, this.velocity);
            addVelocity.limit(this.moveSpeed);
            this.physBody.SetLinearVelocity(p5Vec2b2Vec(addVelocity));
        }
        else
        {
            var subVelocity = p5.Vector.mult(this.velocity, 1 - (this.deceleration * deltaTime()));
            if (subVelocity.mag() < 0.05) subVelocity = createVector(0, 0);
            this.physBody.SetLinearVelocity(p5Vec2b2Vec(subVelocity));
        }

        for (var i = 0; i < this.subs.length; i++)
        {
            this.subs[i].physics();
        }
    }

    update()
    {
        if (this.spinTimer >= this.spinReset)
        {
            this.canSpin = getButton(this.rhs ? "bumper_right" : "bumper_left");
            if (this.canSpin)
            {
                this.spinTimer = 0; //Reset it
            }
        }
        else
        {
            this.spinTimer += deltaTime();
            this.canSpin = false;
        }

        if (this.rhs)
        {
            this.inputVector.x = getAxis("stick_right_x");
            this.inputVector.y = getAxis("stick_right_y");
            this.canPunt = getButton("trigger_right");
        }
        else
        {
            this.inputVector.x = getAxis("stick_left_x");
            this.inputVector.y = getAxis("stick_left_y");
            this.canPunt = getButton("trigger_left");
        }
        this.inputVector.normalize(); //In case the controller can do strange things

        for (var i = 0; i < this.subs.length; i++)
        {
            this.subs[i].update();
        }
    }

    draw()
    {
        push();
        ellipseMode(RADIUS);
        if (this.rhs)
        {
            fill(255, 0, 0);
        }
        else
        {
            fill (0, 255, 0);
        }
        ellipse(this.position.x, this.position.y, this.bodyRadius, this.bodyRadius);
        pop();

        for (var i = 0; i < this.subs.length; i++)
        {
            this.subs[i].draw();
        }
    }

    remove()
    {
        if (physWorld != null && this.physBody != null)
        {
            physWorld.DestroyBody(this.physBody);
        }

        for (var i = 0; i < this.subs.length; i++)
        {
            this.subs[i].remove();
            delete this.subs[i];
        }
    }
}

class GravityFollower
{
    constructor(body)
    {
        this.radius = round(random(2, 4));
        this.position = p5.Vector.random2D();
        this.position.mult(random(body.bodyRadius + this.radius, body.gravityRadius));
        this.position.add(body.position);
        var up = p5.Vector.sub(body.position, this.position);
        var FIXED_Z = createVector(0, 0, 1);
        up.normalize(); //Convert it to a direction vector
        var forward = p5.Vector.cross(up, FIXED_Z);
        forward.mult(100); //VELOCITY SCALE
        if (random(0, 1) >= 0.5)
        {
            forward.mult(-1); //Flip it 50% of the time
        }
        this.body = body;

        if (physWorld != null)
        {
            var fixDef = new Box2d.b2FixtureDef();
            fixDef.set_restitution(0);
            fixDef.set_density(0.2);
            fixDef.get_filter().set_categoryBits(body.rhs ? 0x0008 : 0x0002);
            fixDef.get_filter().set_maskBits((body.rhs ? (0x0001 | 0x0002) : (0x0004 | 0x0008)) | 0x0010);
            var collider = new Box2d.b2CircleShape();
            collider.set_m_radius(this.radius / BOX2D_WORLD_SCALE);
            fixDef.set_shape(collider);
            var bodyDef = new Box2d.b2BodyDef();
            bodyDef.set_type(Box2d.b2_dynamicBody);
            bodyDef.set_position(p5Vec2b2Vec(this.position));
            bodyDef.set_linearDamping(0.6);
            var body2 = physWorld.CreateBody(bodyDef);
            body2.CreateFixture(fixDef);
            this.physBody = body2;
            this.physBody.SetLinearVelocity(p5Vec2b2Vec(forward));
        }
        else
        {
            console.error("Cannot create a gravity follower right now! physWorld is null.");
        }
    }

    postPhysics()
    {
        this.position = b2Vec2p5Vec(this.physBody.GetPosition());
    }

    physics()
    {
        var punt = this.body.canPunt;
        var up = p5.Vector.sub(this.position, this.body.position);
        var dist = up.mag();
        up.normalize();
        if (punt)
        {
            if (dist <= this.body.gravityRadius)
            {
                var force = p5.Vector.mult(up, this.physBody.GetMass() * 1000);
                this.physBody.ApplyForce(p5Vec2b2Vec(force), this.physBody.GetPosition());
            }
            else
            {
                var force = p5.Vector.mult(up, (this.physBody.GetMass() * 1000) * -1);
                this.physBody.ApplyForce(p5Vec2b2Vec(force), this.physBody.GetPosition());
            }
        }
        else
        {
            var force = p5.Vector.mult(up, this.physBody.GetMass() * -500);
            this.physBody.ApplyForce(p5Vec2b2Vec(force), this.physBody.GetPosition());
        }

        if (this.body.canSpin)
        {
            var vel = this.body.velocity.copy();
            vel.normalize();
            if (vel.mag() < 0.3)
            {
                var FIXED_Z = createVector(0, 0, 1);
                vel = p5.Vector.cross(up, FIXED_Z);
                if (random(0, 1) >= 0.5)
                {
                    vel.mult(-1); //Flip it 50% of the time
                }
            }

            vel.mult(this.physBody.GetMass() * 20000);
            this.physBody.ApplyForce(p5Vec2b2Vec(vel), this.physBody.GetPosition());
        }
    }

    update()
    {

    }

    draw()
    {
        // push();
        // stroke(3);
        // line(this.position.x, this.position.y, this.body.position.x, this.body.position.y);
        // pop();
        push();
        ellipseMode(RADIUS);
        ellipse(this.position.x, this.position.y, this.radius, this.radius);
        pop();
    }

    remove()
    {
        if (physWorld != null && this.physBody != null)
        {
            physWorld.DestroyBody(this.physBody);
        }
    }
}

var jsLogoImg;
var jsLogoDef;
var jsMessages;
var screams = [];
class EvilJSLogo
{
    constructor(scenedef)
    {
        this.position = createVector(CANVAS_SIZE.x / 2, CANVAS_SIZE.y / 2);
        this.angle = 0;

        this.density = scenedef.density;
        this.bodyRestitution = scenedef.restitution;

        this.screamTime = 0;
        this.screamDelay = scenedef.screamDelay;
        this.canScream = false;

        this.health = scenedef.health;
        this.maxHealth = this.health;

        this.message = round(random(0, jsMessages.messages.length - 1));

        if (physWorld != null)
        {
            var fixDef = new Box2d.b2FixtureDef();
            fixDef.set_restitution(this.bodyRestitution);
            fixDef.set_density(this.density);
            fixDef.get_filter().set_categoryBits(0x0010); //Its own layer
            fixDef.get_filter().set_maskBits(0xffff); //Collide wih everything
            var collider = new Box2d.b2PolygonShape();
            collider.SetAsBox((jsLogoImg.width / BOX2D_WORLD_SCALE) / 2, (jsLogoImg.height / BOX2D_WORLD_SCALE) / 2);
            fixDef.set_shape(collider);
            var bodyDef = new Box2d.b2BodyDef();
            bodyDef.set_type(Box2d.b2_dynamicBody);
            bodyDef.set_position(p5Vec2b2Vec(this.position));
            var body = physWorld.CreateBody(bodyDef);
            body.CreateFixture(fixDef);
            this.physBody = body;
        }
    }

    postPhysics()
    {
        this.position = b2Vec2p5Vec(this.physBody.GetPosition());
        this.angle = this.physBody.GetAngle();
    }

    update()
    {
        if (this.screamTime >= this.screamDelay)
        {
            this.canScream = true;
        }
        else
        {
            this.canScream = false;
            this.screamTime += deltaTime();
        }
    }

    draw()
    {
        push();
        angleMode(RADIANS);
        translate(this.position.x, this.position.y);
        rotate(this.angle);
        image(jsLogoImg, 0, 0);
        pop();

        push();
        rectMode(CORNERS);
        fill(100, 0, 0);
        rect(50, 10, CANVAS_SIZE.x - 50, 30);
        noStroke();
        fill(255, 0, 0);
        rect(52, 13, CANVAS_SIZE.x - 52 - (530 * (1 - (this.health / this.maxHealth))), 28); //(1 - (this.health / this.maxHealth))
        pop();

        push();
        fill(255, 100, 0);
        textSize(14);
        textAlign(CENTER);
        text(jsMessages.messages[this.message], CANVAS_SIZE.x / 2, CANVAS_SIZE.y - 30);
        pop();
    }

    scream()
    {
        if (this.canScream)
        {
            var scID = round(random(0, screams.length - 1));
            console.log(this.screamDelay);
            screams[scID].play();
            this.screamTime = 0;
            this.canScream = false;
            this.message = round(random(0, jsMessages.messages.length - 1));
        }

        this.health -= 1;
        if (this.health < 0) this.health = 0;
        if (this.health == 0)
        {

        }
    }
}

var titlescreen;
var endscreen;
var diescreen;
function preload()
{
    padMap = loadJSON("cfg/controller_map.json");
    gravityDotDef = loadJSON("assets/defs/gravdot.json");
    jsLogoDef = loadJSON("assets/defs/jslogo.json");
    jsLogoImg = loadImage("assets/the_devil_f.png");
    jsMessages = loadJSON("assets/defs/js_sucks_messages.json");
    titlescreen = loadImage("assets/titlescreen.png");
    endscreen = loadImage("assets/endscreen.png");
    diescreen = loadImage("assets/diescreen.png");
    for (var i = 0; i < 12; i++)
    {
        screams.push(loadSound("assets/screams/c_scream_" + (i + 1) + ".ogg"));
        screams[i].setVolume(0.5);
        screams[i].playMode('sustain');
    }
}

var testGrav1;
var testGrav2;
var jsLogo;

function createLevelBoundary(x, y, w, h)
{
    if (physWorld != null)
    {
        var fixDef = new Box2d.b2FixtureDef();
        fixDef.set_restitution(0);
        fixDef.set_density(1);
        fixDef.get_filter().set_categoryBits(0x0020); //Its own layer
        fixDef.get_filter().set_maskBits(0xffff); //Collide wih everything
        var collider = new Box2d.b2PolygonShape();
        collider.SetAsBox((w / BOX2D_WORLD_SCALE) / 2, (h / BOX2D_WORLD_SCALE) / 2);
        fixDef.set_shape(collider);
        var bodyDef = new Box2d.b2BodyDef();
        bodyDef.set_position(p5Vec2b2Vec(createVector(x, y)));
        var body = physWorld.CreateBody(bodyDef);
        body.CreateFixture(fixDef);
        this.physBody = body;
    }
}

function setup()
{
    setCanvasSize();
    frameRate(60);
    imageMode(CENTER);
    var canvas = createCanvas(CANVAS_SIZE.x * resolutionScale, CANVAS_SIZE.y * resolutionScale).elt;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    cameraPosition = createVector(0, 0);
    physWorld = new Box2d.b2World(new Box2d.b2Vec2(0, 0), true);

    createLevelBoundary(CANVAS_SIZE.x / 2, 0, CANVAS_SIZE.x, 3); //Top
    createLevelBoundary(CANVAS_SIZE.x / 2, CANVAS_SIZE.y, CANVAS_SIZE.x, 3); //Bottom
    createLevelBoundary(0, CANVAS_SIZE.y / 2, 3, CANVAS_SIZE.y);
    createLevelBoundary(CANVAS_SIZE.x, CANVAS_SIZE.y / 2, 3, CANVAS_SIZE.y);

    listener = new Box2d.JSContactListener();
    listener.BeginContact = function(contactPtr)
    {
        var contact = Box2d.wrapPointer(contactPtr, Box2d.b2Contact);
        var fixA = contact.GetFixtureA();
        var fixB = contact.GetFixtureB();
        if ((fixA.GetFilterData().get_categoryBits() == 0x0010 || fixB.GetFilterData().get_categoryBits() == 0x0010)
        && (fixA.GetFilterData().get_categoryBits() != 0x0020 && fixB.GetFilterData().get_categoryBits() != 0x0020))
        {
            jsLogo.scream();
        }
    };

    listener.EndContact = function() {};
    listener.PreSolve = function() {};
    listener.PostSolve = function() {};

    physWorld.SetContactListener(listener);

    testGrav1 = new GravityBody(gravityDotDef, false);
    testGrav2 = new GravityBody(gravityDotDef, true);
    jsLogo = new EvilJSLogo(jsLogoDef);
}

function windowResized()
{
    setCanvasSize();
    resizeCanvas(CANVAS_SIZE.x * resolutionScale, CANVAS_SIZE.y * resolutionScale);
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

function draw()
{
    background(200);
    push();
    scale(resolutionScale);

    if (gameState == 0)
    {
        image(titlescreen, CANVAS_SIZE.x / 2, CANVAS_SIZE.y / 2);
        if (getButton("start") && getButton("select"))
        {
            gameState = 1;
        }
    }
    else if (gameState == 1)
    {
        try
        {
            update();
            physics();

            jsLogo.draw();
            testGrav1.draw();
            testGrav2.draw();
        }
        catch (ex)
        {
            gameState = 3;
        }

        if (jsLogo.health <= 0)
        {
            gameState = 2;
        }
    }
    else if (gameState == 2)
    {
        image(endscreen, CANVAS_SIZE.x / 2, CANVAS_SIZE.y / 2);
    }
    else
    {
        image(diescreen, CANVAS_SIZE.x / 2, CANVAS_SIZE.y / 2);
    }

    if (CONTROLLER_DEBUG_MENU)
    {
        controllerDebugMenu();
    }

    pop();
}

function update()
{
    testGrav1.update();
    testGrav2.update();
    jsLogo.update();
}

function physics()
{
    if (physWorld != null)
    {
        physWorld.ClearForces();
        testGrav1.physics();
        testGrav2.physics();
        physWorld.Step(deltaTime(), 3, 3);
        testGrav1.postPhysics();
        testGrav2.postPhysics();
        jsLogo.postPhysics();
    }
}
