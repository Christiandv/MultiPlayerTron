
// The class for the paths the players leave behind
// up here because javascript declarations are inorder
class Wall{
    constructor(x, y, width, height){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

var express = require('express'); // the express library
var socket = require('socket.io'); // everything for the socket library

var app = express();
 // starts the server listening on port 3k
var server = app.listen(3000);

// serve up the public folder
app.use(express.static('public'));
// test 
console.log("My socket server is running");

var io = socket(server);

// lots of set up, will probably end up in a "game" object
// so that we can separate out into rooms 
var Connections = [];
var numPlayers = 0;
var readyPlayers = 0;
var stillAlivePlayers = 0;
let speed = 3;
var gameOver = false;
var startingLocations = [
    {x:100, y:100, dir:0},
    {x:400, y:100, dir:3},
    {x:100, y:400, dir:1},
    {x:400, y:400, dir:2}];
var maxPlayers = 4;
var walls = [];


// handle the event that someone connects
io.sockets.on('connection', newConnection);

//starts the game loop
setInterval(update, 33);

// handle new connection being made given socket 
function newConnection(socket){
    console.log('new connection: ' + socket.id);

    /*
     some of the following is only needed if you are actually playing
     there should be a check to see if we have reached the max num of 
     players and after that you dont get to control anything. 
     */
    
    // create a new player and save connection info
    thisPlayer = new Player(startingLocations[numPlayers].x,
        startingLocations[numPlayers].y,
        startingLocations[numPlayers].dir,
        new Color( Math.floor(Math.random() * 255),
        Math.floor(Math.random() * 255),
        Math.floor(Math.random() * 255)));
       
    var node = {
        id: socket.id,
        socket: socket,
        player: thisPlayer
    };
    
    Connections[numPlayers] = node;
  
    var data = {
        id: numPlayers
    }

    // tell the client to reset + give it its player number/id within the game
    socket.emit('reset', data)

    numPlayers++;

    socket.on('input', handleInput);

    function handleInput(data){
        // Make this better by using a has map with the socket id as the key
        // need to use an id number to know which player sent this and wants to turn
        Connections[data.id].player.turn(data.dir);
    }

    socket.on('ready', playerReadied);
    function playerReadied(){
        console.log("player readied");
        readyPlayers ++;

        if(readyPlayers== numPlayers && numPlayers > 1){// this should run once, when the game starts
            stillAlivePlayers = numPlayers;
            gameOver = false;
            walls = [];
            // the boundaries 
            walls.push(new Wall(0,-10,500,10));
            walls.push(new Wall(0, 500,500,10));
            walls.push(new Wall(-10,0,10,500));
            walls.push(new Wall(500,0,10,500));
            io.sockets.emit('start');
        }
    }

    // handle what we do if a client disconnects
    socket.on('disconnect', function() {
        console.log('Client has disconnected');
    });
}


// because I cannot reference processing types in the server code
class Color{
    constructor(r,g,b){
        this.r = r;
        this.g = g;
        this.b = b;
    }
    
    // for sending data to the client 
    packageUp(){
        return {r:this.r,
            g:this.g,
            b:this.b};
    }
}

// theserver keeps track of all player info
class Player{
    
    // location, direction, color. Direction corresponds to unit circle
    constructor(x, y, direction, color) {
        this.hasLost = false; // to know if this player should stop moving
        this.color = color;
        this.x = x;
        this.y = y;
        
        switch(direction){
            case 0:
                this.xspeed = speed;
                this.yspeed = 0;
                break;
            case 1:
                this.xspeed = 0;
                this.yspeed = -1 * speed;
                break;
            case 2:
                this.xspeed = -1 * speed;
                this.yspeed = 0;
                break;
            case 3:
                this.xspeed = 0;
                this.yspeed = speed;
                break;
        }
        this.size = 3; // radius of player 
        // we are drawing players like normal rectangles, from top left

    }

    // check if this player has hit a given wall
    collide(wall){
        if (this.x  < wall.x + wall.width &&
            this.x + this.size > wall.x &&
            this.y < wall.y + wall.height &&
            this.y + this.size > wall.y) {
             // collision detected!
             return true;
         }
         return false;
    }
    
    // wonder what this does
    move() {
        this.x += this.xspeed;
        this.y += this.yspeed;
    }

    // safe turning, 0 is right, 1 is up, 2 is left, 3 is down. Unit circle
    turn(direction){
        switch(direction){
            case 0:
                if(this.xspeed == 0){
                    this.xspeed = speed;
                    this.yspeed = 0;
                }
                break;
            case 1:
                if(this.yspeed == 0){
                    this.xspeed = 0;
                    this.yspeed = -1 * speed;
                }
                break;
            case 2:
                if(this.xspeed == 0){
                    this.xspeed = -1 * speed;
                    this.yspeed = 0;
                }
                break;
            case 3:
                if(this.yspeed == 0){
                    this.xspeed = 0;
                    this.yspeed = speed;
                }
                break;
        }
    }

}

// update loop for the game, should expand to include all current games
function update(){
    if(readyPlayers == numPlayers && numPlayers != 0 && !gameOver){
        // the game is being played
        var data = [];
        for(let i = 0; i < numPlayers; i++){
            // only move and stuff if you are still in play
            if(!Connections[i].player.hasLost){
                Connections[i].player.move();
                // check collisions
                for(var j = 0; j < walls.length; j++){
                    if(Connections[i].player.collide(walls[j])){
                        Connections[i].player.hasLost = true;
                        io.to(Connections[i].id).emit('youLost');
                        stillAlivePlayers --;
                    }
                }
                // make the wall behind you
                walls.push(new Wall(Connections[i].player.x,
                    Connections[i].player.y,
                    Connections[i].player.size,
                    Connections[i].player.size));

                // add data about character location/color to data packet
                var p = {
                    x:Connections[i].player.x,
                    y:Connections[i].player.y,
                    size: Connections[i].player.size,
                    color: Connections[i].player.color.packageUp()
                };
                data.push(p);
            }
        }
        // send the data about player locations to all players
        io.sockets.emit('playerLocUpdate',data);

        // if we have 1 or 0 players left the game is over
        if(stillAlivePlayers < 2){
            gameOver = true;
            // we have a single winner
            if(stillAlivePlayers == 1){
                for(let i = 0; i < numPlayers; i++){
                    if(!Connections[i].player.hasLost){
                        // this is the winner
                        io.to(Connections[i].id).emit('youWin');
                    }else{
                        // tell the others who won? host? specators?
                    }
                }
            }else if (stillAlivePlayers == 0){
                // we have a tie
            }
        }
    }
}

