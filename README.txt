JS Saviour

--------------------------------------------

I joked with a friend when I found out I had to use Javascript that I would snap before the end of the semester.

I finally snapped.

---------------------------------------------

This game is pretty picky about where it will run. It won't work on Chrome due to how it handles controllers,
but it will work on Firefox with an XInput-compatible controller. There's a chance
that the buttons might not be mapped correctly since controllers are annoying.

CONTROLS:
You need a controller plugged into your computer to play this. It is designed for 2 players,
but can work with 1 if you are very coordinated.

Analog sticks: move the players around
Triggers/L2/R2: Pull in spikes
Shoulder buttons/R1/L1: shoot spikes in direction of movement

------------------------------------------------

Development:

I had a lot of problems with this project due to me trying a bunch of new ideas that shouldn't even half-work.

I decided to use a controller to play the game to see if it was possible, which required writing some wrappers
around standard browser features to make handling input easy. However, there are some differences between how browsers
handle controllers, so I only got this working on Firefox, which I normally use. It does work well however, when
considering how tricky controllers can be to program for on PC.

The less successful feature I implemented was the Box2D physics library. This is a high-performance 2D physics
library that behaves in a far more dynamic and realistic way than any physics I could write myself. However,
the original library is written in C, so this was quite hard to get working.

I used the version of Box2D available at https://github.com/kripken/box2d.js
This version has been modified to compile to Javascript using Emscripten and asm.js, because this is apparently
a thing that can happen now. It initially seemed to work well, after some difficulty setting it up, however there was
a game-breaking problem I encountered late in development: due to being a C library, Box2D expects the manual management
of memory, which includes deciding when to free unused objects. This extends to the javascript version even though
JS has a garbage collector. This would be fine, except that Javascript has no way of MANUALLY managing memory.
This caused problems since I had to convert between p5 and Box2D vectors repeatedly, leading to many objects that I had
no way of releasing memory from. This led to a severe memory leak, which causes an error after about 30 seconds when
a memory limit is hit.

I was never able to resolve this issue (and it is not likely that there is a good solution to this issue), but I worked
around it by making the Javascript environment running out of memory a fail state in the game under the guise of a time
limit. I was able to catch the exception that occurs and show a game over screen when the memory limit is hit. This works
surprisingly well, but I made reference to it within the game as a joke.
