
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


// data we want to hold about a client, used after they have actually logged in
class Client{
    constructor(socket, name, roomNumber){
        this.socket = socket;
        this.name = name;
        this.roomNumber = roomNumber;
    }
}

// the data that a room needs to have
// TODO: HOSTS
class Room{
    constructor(roomNumber/*, host*/){
        this.roomNumber = roomNumber;
        this.playerList = []; // the list of socket ids for players
        this.spectators = []; // the list of socket ids for spectators
       // this.host = host; // the host of this room 
        this.gameInProgress = false;
        // change this
        this.numPlayers = 0;
        this.readyPlayers = 0;
        
    }
    static maxPlayers = 4;

    newGame(){
        this.game = new GameState(playerList);
    }

    handleDisconnect(connectionId){
        //handle the disconnect of the given connection
        
        // if player, do something with game state

        // if spectator, just remove from list

        // if host.... rip?
    }

    update(){
        if(this.gameInProgress){
            this.game.update();
        }
    }
}

// all of the info to run this current round of the game
class GameState{

    static speed = 3;
    static startingLocations = [
        {x:100, y:100, dir:0},
        {x:400, y:100, dir:3},
        {x:100, y:400, dir:1},
        {x:400, y:400, dir:2}];
    
    constructor(players){
        this.numPlayers = players.length;
        this.readyPlayers = 0;
        this.stillAlivePlayers = players.length;
        this.gameOver = false;
       
        this.walls = [];
        this.walls.push(new Wall(0,-10,500,10));
        this.walls.push(new Wall(0, 500,500,10));
        this.walls.push(new Wall(-10,0,10,500));
        this.walls.push(new Wall(500,0,10,500));
        // do the following to init a player. Do for each playersocket given on game start
/*
        thisPlayer = new Player(startingLocations[numPlayers].x,
            startingLocations[numPlayers].y,
            startingLocations[numPlayers].dir,
            new Color( Math.floor(Math.random() * 255),
            Math.floor(Math.random() * 255),
            Math.floor(Math.random() * 255)));
            */
        
        // EMIT TO EACH PLAYER TO RESET THE GAME/START the GAME
    }

    handleDisconnect(connectionId){
        //handle the disconnect of the given connection
        
        // if player, do something with game stae
    }

    // update loop for the game, should expand to include all current games
    update(){
    if(readyPlayers == numPlayers && numPlayers != 0 && !gameOver){
        // the game is being played
        let data = [];
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




//var roomController = require('./roomController.js');
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

// the list of connections made, so you can route to the correct room quickly
var Connections = [];

var openRooms = [];
openRooms.push(new Room(1234));

// handle the event that someone connects
io.sockets.on('connection', newConnection);

//starts the game loop
setInterval(update, 33);

// handle new connection being made given socket 
function newConnection(socket){
    console.log('new connection: ' + socket.id);

    socket.on('loginAttempt', validateLogin);
    

    function validateLogin(data){
        let errors = {
            nameError: '',
            roomError: '',
            nameInput: data.name,
            roomInput: data.roomCode
        };
        
        let passedBasicChecks = true;
        // check that the room code is valid
        let roomCodeInt = parseInt(data.roomCode);
        if(isNaN(roomCodeInt)){
            errors.roomError = 'Room code must be a 4 digit number ';
            passedBasicChecks = false;
        }else if(roomCodeInt > 9999 || roomCodeInt < 1000 ){
            errors.roomError = 'Room code must be a 4 digit number ';
            passedBasicChecks = false;
        }

        // check that the player name is within bounds
        if(data.name.length < 3 || data.name.length > 10){
            errors.nameError = 'Name must be 3-10 characters long';
            passedBasicChecks = false;
        }
        if(passedBasicChecks){
            let foundRoom = false;
            for(let i = 0; i < openRooms.length; i ++){
               if(openRooms[i] == parseInt(data.roomCode)){
                    foundRoom = true;
                    // Check for duplicate names in room?
               }
            }
            if(!foundRoom){
                errors.roomError = 'That room does not exist';
            }
        }

        // check for errors
        // make this better??
        if(errors.nameError != '' || errors.roomError != ''){
            socket.emit('rejectLogin', errors);
        }else{
            // this should add them to the room and send back room data
            // add them to the list of connections
            var node = {
                id: socket.id,
                socket: socket,
                roomNum: roomCodeInt
            };
            Connections[numPlayers] = node;
            
            socket.emit('successfulLogin', errors);
            socket.on('input', handleInput);
        }
        
    }


   
    

    function handleInput(data){
        // Make this better by using a has map with the socket id as the key
        // need to use an id number to know which player sent this and wants to turn
        //Connections[data.id].player.turn(data.dir);

        // check the socketid

        // look up that conneciton in the map

        // find the correct Room where that person is

        // hand off the input you got from the signal to the room,
        // telling it which connection did so
    }

    

    // handle what we do if a client disconnects
    socket.on('disconnect', function() {
        console.log('Client has disconnected. id: ' + socket.id);
        // look up the socket id in the conneciton table

        // go to the room and tell them that the player disconnected

        // remove them from the connections list
    });
}


// ping each room to update 
function update(){
    for(let i = 0; i < openRooms.length; i ++){
        openRooms[i].update();
    }
}







