
// The class for the paths the players leave behind
// up here because javascript declarations are inorder
class Wall {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

// because I cannot reference processing types in the server code
class Color {
    constructor(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    // for sending data to the client 
    packageUp() {
        return {
            r: this.r,
            g: this.g,
            b: this.b
        };
    }
}


// data we want to hold about a client, used after they have actually logged in
class Client {
    constructor(socket, name, roomNumber) {
        this.socket = socket;
        this.name = name;
        this.roomNumber = roomNumber;
    }
}

// the data that a room needs to have
// TODO: HOSTS
class Room {
    constructor(roomNumber/*, host*/) {
        this.roomNumber = roomNumber;
        this.playerList = new Map(); // id -> {clientData, readyCheck}
        this.spectators = new Map(); // id -> ClientData
        // this.host = host; // the host of this room 
        this.gameInProgress = false;
    }
    static MAX_PLAYERS = 4;


    handleInput(connectionId, data){
        if(this.playerList.has(connectionId)){
            if(this.gameInProgress){
                // send the data to the game object
           }else{
               // the game is not in progress, the player is declaring they are ready
               this.playerList.set(connectionId, { 
                clientData: this.playerList.get(connectionId).clientData,
                readyCheck: true});
                this.emitData();
           }
        }        
        
    }


    newConnection(clientData){
        console.log('Room ' + this.roomNumber + ' recieved client: ' + clientData.socket.id );
        if(this.playerList.size < Room.MAX_PLAYERS){
            // we have space, make them a player
        
            this.playerList.set(clientData.socket.id, {
                clientData: clientData,
                readyCheck:false
            });
        }else{
            // we do not have space, make them a spectator
            this.spectators.set(clientData.socket.id, clientData);
        }
        clientData.socket.join("room-"+this.roomNumber);
        this.emitData();
    }

    newGame() {
        this.game = new GameState(playerList);
    }

    handleDisconnect(connectionId) {
        //handle the disconnect of the given connection
        // Do we need to unsubscribe them from the room?
        connections.get(connectionId).socket.leave("room-"+this.roomNumber);
        // if player, do something with game state
        if(this.playerList.has(connectionId)){
            console.log('Room ' + this.roomNumber + " removing player " + connectionId)
            if(!this.gameInProgress){
                // easy to remove if we arent actually playing
                this.playerList.delete(connectionId);
            }else{
                // TODO need to figure out what happens here
                
            }
        }
        // if spectator, just remove from list
        else if(this.spectators.has(connectionId)){
            console.log('Room ' + this.roomNumber + " removing spectator " + connectionId)
            spectators.delete(connectionId);
        }
        // if host.... rip? TODO
        this.emitData();
    }

    update() {
        if (this.gameInProgress) {
            this.game.update();
        }
    }

    emitData(){
        let currentPlayers = []
        for (const playerData of this.playerList.values()) {
            currentPlayers.push({
                name:playerData.clientData.name,
                ready:playerData.ready
            });
        }

        let currentSpectators = []
        for (const spectatorData of this.spectators.values()) {
            currentSpectators.push({
                name:spectatorData.name
            });
        }
        let data = {
            players:currentPlayers,
            spectators:currentSpectators
        };
        io.sockets.in("room-"+this.roomNumber).emit('roomDataUpdate', data);
    }
}

// all of the info to run this current round of the game
class GameState {

    static speed = 3;
    static startingLocations = [
        { x: 100, y: 100, dir: 0 },
        { x: 400, y: 100, dir: 3 },
        { x: 100, y: 400, dir: 1 },
        { x: 400, y: 400, dir: 2 }];

    constructor(players) {
        // want map of socketId -> player data
        this.numPlayers = players.length;
        this.readyPlayers = 0;
        this.stillAlivePlayers = players.length;
        this.gameOver = false;

        this.walls = [];
        this.walls.push(new Wall(0, -10, 500, 10));
        this.walls.push(new Wall(0, 500, 500, 10));
        this.walls.push(new Wall(-10, 0, 10, 500));
        this.walls.push(new Wall(500, 0, 10, 500));
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
    
    handleInput(connectionId, data){
        // find the player in the map and turn them
    }

    handleDisconnect(connectionId) {
        //handle the disconnect of the given connection

        // if player, do something with game stae
    }

    // update loop for the game, should expand to include all current games
    update() {
        if (readyPlayers == numPlayers && numPlayers != 0 && !gameOver) {
            // the game is being played
            let data = [];
            for (let i = 0; i < numPlayers; i++) {
                // only move and stuff if you are still in play
                if (!connections[i].player.hasLost) {
                    connections[i].player.move();
                    // check collisions
                    for (var j = 0; j < walls.length; j++) {
                        if (connections[i].player.collide(walls[j])) {
                            connections[i].player.hasLost = true;
                            io.to(connections[i].id).emit('youLost');
                            stillAlivePlayers--;
                        }
                    }
                    // make the wall behind you
                    walls.push(new Wall(connections[i].player.x,
                        connections[i].player.y,
                        connections[i].player.size,
                        connections[i].player.size));

                    // add data about character location/color to data packet
                    var p = {
                        x: connections[i].player.x,
                        y: connections[i].player.y,
                        size: connections[i].player.size,
                        color: connections[i].player.color.packageUp()
                    };
                    data.push(p);
                }
            }
            // send the data about player locations to all players
            io.sockets.emit('playerLocUpdate', data);

            // if we have 1 or 0 players left the game is over
            if (stillAlivePlayers < 2) {
                gameOver = true;
                // we have a single winner
                if (stillAlivePlayers == 1) {
                    for (let i = 0; i < numPlayers; i++) {
                        if (!connections[i].player.hasLost) {
                            // this is the winner
                            io.to(connections[i].id).emit('youWin');
                        } else {
                            // tell the others who won? host? specators?
                        }
                    }
                } else if (stillAlivePlayers == 0) {
                    // we have a tie
                }
            }
        }
    }



}

// theserver keeps track of all player info
class Player {

    // location, direction, color. Direction corresponds to unit circle
    constructor(x, y, direction, color) {
        this.hasLost = false; // to know if this player should stop moving
        this.color = color;
        this.x = x;
        this.y = y;

        switch (direction) {
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
    collide(wall) {
        if (this.x < wall.x + wall.width &&
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
    turn(direction) {
        switch (direction) {
            case 0:
                if (this.xspeed == 0) {
                    this.xspeed = speed;
                    this.yspeed = 0;
                }
                break;
            case 1:
                if (this.yspeed == 0) {
                    this.xspeed = 0;
                    this.yspeed = -1 * speed;
                }
                break;
            case 2:
                if (this.xspeed == 0) {
                    this.xspeed = -1 * speed;
                    this.yspeed = 0;
                }
                break;
            case 3:
                if (this.yspeed == 0) {
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
var connections = new Map();

var openRooms = new Map();
openRooms.set(1234, new Room(1234));


// handle the event that someone connects
io.sockets.on('connection', newConnection);

//starts the game loop
setInterval(update, 33);

// handle new connection being made given socket 
function newConnection(socket) {
    console.log('new connection: ' + socket.id);

    socket.on('loginAttempt', validateLogin);


    function validateLogin(data) {
        let errors = {
            nameError: '',
            roomError: '',
            nameInput: data.name,
            roomInput: data.roomCode
        };

        let passedBasicChecks = true;
        // check that the room code is valid
        let roomCodeInt = parseInt(data.roomCode);
        if (isNaN(roomCodeInt)) {
            errors.roomError = 'Room code must be a 4 digit number ';
            passedBasicChecks = false;
        } else if (roomCodeInt > 9999 || roomCodeInt < 1000) {
            errors.roomError = 'Room code must be a 4 digit number ';
            passedBasicChecks = false;
        }

        // check that the player name is within bounds
        if (data.name.length < 3 || data.name.length > 10) {
            errors.nameError = 'Name must be 3-10 characters long';
            passedBasicChecks = false;
        }
        if (passedBasicChecks) {
            if (!openRooms.has(roomCodeInt)) {
                errors.roomError = 'That room does not exist';
            }
        }

        // check for errors
        // make this better??
        if (errors.nameError != '' || errors.roomError != '') {
            socket.emit('rejectLogin', errors);
        } else {
            // this should add them to the room and send back room data
            // add them to the list of connections
            let newConnection = new Client(socket, data.name, roomCodeInt);
            connections.set(socket.id, newConnection); 
            errors.roomInput = roomCodeInt;
            socket.emit('successfulLogin', errors);
            openRooms.get(roomCodeInt).newConnection(newConnection);
            socket.on('input', handleInput);
        }

    }





    function handleInput(data) {
        // Make this better by using a has map with the socket id as the key
        // need to use an id number to know which player sent this and wants to turn
        //connections[data.id].player.turn(data.dir);

        // check the socketid

        // look up that connection in the map

        // find the correct Room where that person is

        // hand off the input you got from the signal to the room,
        // telling it which connection did so
    }



    // handle what we do if a client disconnects
    socket.on('disconnect', function () {
        console.log('Client has disconnected. id: ' + socket.id);
        // look up the socket id in the conneciton table
        if(connections.has(socket.id)){
            // go to the room and tell them that the player disconnected
            let roomid = connections.get(socket.id).roomNumber;
            openRooms.get(roomid).handleDisconnect(socket.id);
            // remove them from the connections list
            connections.delete(socket.id);
        }
       
    });
}


// ping each room to update 
function update() {
    for (let i = 0; i < openRooms.length; i++) {
        openRooms[i].update();
    }
}







