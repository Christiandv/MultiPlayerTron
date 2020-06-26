
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
    constructor(socket, name, roomCode) {
        this.socket = socket;
        this.name = name;
        this.roomCode = roomCode;
    }
}

// the data that a room needs to have
// TODO: HOSTS
class Room {
    constructor(roomCode/*, host*/) {
        this.roomCode = roomCode;
        this.playerList = new Map(); // id -> {clientData, readyCheck}
        this.spectators = new Map(); // id -> ClientData
        // this.host = host; // the host of this room 
        this.gameInProgress = false;
        this.countingDown = false;
    }
    static MAX_PLAYERS = 4;


    handleInput(connectionId, data){
        if(this.playerList.has(connectionId)){
            if(this.gameInProgress){
                // send the data to the game object
                console.log("handing off input to game");
                this.game.handleInput(connectionId, data);
           }else{
               // the game is not in progress, the player is declaring they are ready
               if(!this.playerList.get(connectionId).readyCheck){
                this.playerList.set(connectionId, { 
                    clientData: this.playerList.get(connectionId).clientData,
                    readyCheck: true});
                    this.emitData();
                    if(!this.countingDown){
                        this.countingDown = true;
                        this.countdown(3);
                    }
               }
               
           }
        }          
    }

    countdown(num){
        let gtg = true;
        if(this.playerList.size < 2){
            gtg = false;
        } 
        for(const player of this.playerList.values()){
            if(!player.readyCheck){
                gtg = false;
                
            }
        }
        if(gtg){
            
            console.log(num);
            io.sockets.in("room-"+this.roomCode).emit('countdown', num);
            
            if(num > 0){
                setTimeout((n) => {this.countdown(n)}, 1000, num - 1);
            }else if( num == 0){
                // the game starts
                this.gameInProgress = true;
                // tell everyone that the game has started
                io.sockets.in("room-"+this.roomCode).emit('start');
                // setup the game data
                this.game = new GameState(this.playerList.values(), this.roomCode);
            }
        }else{
            this.countingDown = false;
        }
    }


    newConnection(clientData){
        console.log('Room ' + this.roomCode + ' recieved client: ' + clientData.socket.id );
        if(this.playerList.size < Room.MAX_PLAYERS){
            // we have space, make them a player
        
            this.playerList.set(clientData.socket.id, {
                clientData: clientData,
                readyCheck:false
            });

            for (let player of this.playerList.values()) {
                player.readyCheck = false;
            }
            clientData.socket.emit("IsPlayer", true);
        }else{
            // we do not have space, make them a spectator
            this.spectators.set(clientData.socket.id, clientData);
            clientData.socket.emit("IsPlayer", false);
        }
        clientData.socket.join("room-"+this.roomCode);
        // TODO tell people which group they are in?
        this.emitData();
    }

    handleDisconnect(connectionId) {
        //handle the disconnect of the given connection
        // Do we need to unsubscribe them from the room?
        connections.get(connectionId).socket.leave("room-"+this.roomCode);
        // if player, do something with game state
        if(this.playerList.has(connectionId)){
            console.log('Room ' + this.roomCode + " removing player " + connectionId)
            if(!this.gameInProgress){
                // easy to remove if we arent actually playing
                this.playerList.delete(connectionId);
                for (let player of this.playerList.values()) {
                    player.readyCheck = false;
                }
            }else{
                // TODO need to figure out what happens here
                
            }
        }
        // if spectator, just remove from list
        else if(this.spectators.has(connectionId)){
            console.log('Room ' + this.roomCode + " removing spectator " + connectionId)
            this.spectators.delete(connectionId);
        }
        // if host.... rip? TODO
        this.emitData();
    }

    update() {
        if (this.gameInProgress) {
            //console.log("tell game to update");
            this.game.update();
        }
    }

    emitData(){
        let currentPlayers = []
        for (const playerData of this.playerList.values()) {
            currentPlayers.push({
                name:playerData.clientData.name,
                id:playerData.clientData.socket.id,
                ready:playerData.readyCheck
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
        io.sockets.in("room-"+this.roomCode).emit('roomDataUpdate', data);
    }

    resetAfterGame(){
        io.sockets.in("room-"+this.roomCode).emit('gameOver');
        this.gameInProgress = false;
        for (let player of this.playerList.values()) {
            player.readyCheck = false;
        }
        this.countingDown = false;
        this.emitData();
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

    constructor(playersFromRoom, roomCode) {
        
        this.roomCode = roomCode;
        this.players = new Map();
        
        let i = 0;
        for(const p of playersFromRoom){
            this.players.set(p.clientData.socket.id,
                {
                    clientData: p.clientData,
                    gameData: new Player(GameState.startingLocations[i].x,
                        GameState.startingLocations[i].y,
                        GameState.startingLocations[i].dir,
                        new Color( Math.floor(Math.random() * 255),
                        Math.floor(Math.random() * 255),
                        Math.floor(Math.random() * 255)))
                });
                i ++;
        }
        this.gameOver = false;

        this.walls = [];
        this.walls.push(new Wall(0, -10, 500, 10));
        this.walls.push(new Wall(0, 500, 500, 10));
        this.walls.push(new Wall(-10, 0, 10, 500));
        this.walls.push(new Wall(500, 0, 10, 500));
        console.log("game setup")
    }
    
    handleInput(connectionId, data){
        // find the player in the map and turn them
        this.players.get(connectionId).gameData.turn(data.dir);
        console.log("Game got input");
    }

    handleDisconnect(connectionId) {
        // TODO
        //handle the disconnect of the given connection

        // if player, do something with game state
    }

    // update loop for the game, should expand to include all current games
    update() {
        if (!this.gameOver) {
            //console.log("game actually being played");
            // the game is being played
            let data = [];
            for (let p of this.players.values()) {
                let curr = p.gameData;
                // only move and stuff if you are still in play
                if (curr.isAlive) {
                    curr.move();
                    // check collisions
                    for (var j = 0; j < this.walls.length; j++) {
                        if (curr.collide(this.walls[j])) {
                            curr.isAlive = false;
                            p.clientData.socket.emit('youLost');
                        }
                    }
                    // make the wall behind you
                    this.walls.push(new Wall(curr.x,
                        curr.y,
                        curr.size,
                        curr.size));

                    // add data about character location/color to data packet
                    let pData = {
                        x: curr.x,
                        y: curr.y,
                        size: curr.size,
                        color: curr.color.packageUp()
                    };
                    data.push(pData);
                }
            }
            //console.log("sending out game update")
            // send the data about player locations to all players
            io.sockets.in("room-"+this.roomCode).emit( 'playerLocUpdate', data);

            // if we have 1 or 0 players left the game is over
            let stillAlivePlayers = 0;
            for(let p of this.players.values()){
                if(p.gameData.isAlive){
                    stillAlivePlayers++;
                }
            }
            if (stillAlivePlayers < 2) {
                this.gameOver = true;
                // we have a single winner
                if (stillAlivePlayers == 1) {
                   // someone won
                   for(let p of this.players.values()){
                       if(p.gameData.isAlive){
                            let winner = {
                                id:p.clientData.socket.id,
                                name:p.clientData.name,
                                color:p.gameData.color.packageUp()
                            }
                            io.sockets.in("room-"+this.roomCode).emit( 'winner', winner);
                       }
                   }
                    
                } else if (stillAlivePlayers == 0) {
                    // we have a tie
                    
                }
                // reset the game
                setTimeout(() => {openRooms.get(this.roomCode).resetAfterGame()}, 5000);
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
        this.speed = 3;

        switch (direction) {
            case 0:
                this.xspeed = this.speed;
                this.yspeed = 0;
                break;
            case 1:
                this.xspeed = 0;
                this.yspeed = -1 * this.speed;
                break;
            case 2:
                this.xspeed = -1 * this.speed;
                this.yspeed = 0;
                break;
            case 3:
                this.xspeed = 0;
                this.yspeed = this.speed;
                break;
        }
        this.size = 3; // radius of player 
        this.isAlive = true;
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
                    this.xspeed = this.speed;
                    this.yspeed = 0;
                }
                break;
            case 1:
                if (this.yspeed == 0) {
                    this.xspeed = 0;
                    this.yspeed = -1 * this.speed;
                }
                break;
            case 2:
                if (this.xspeed == 0) {
                    this.xspeed = -1 * this.speed;
                    this.yspeed = 0;
                }
                break;
            case 3:
                if (this.yspeed == 0) {
                    this.xspeed = 0;
                    this.yspeed = this.speed;
                }
                break;
        }
    }

}





//var roomController = require('./roomController.js');
var express = require('express'); // the express library
var socket = require('socket.io'); // everything for the socket library
var app = express();
const path = require('path')


const PORT = process.env.PORT || 5000


// starts the server listening on port 
var server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

// serve up the public folder
app.use(express.static(path.join(__dirname, 'public')));
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
            socket.emit('successfulLogin', {
                room: roomCodeInt,
                name: data.name,
                id: socket.id
            });
            openRooms.get(roomCodeInt).newConnection(newConnection);
            socket.on('input', handleInput);
        }

    }





    function handleInput(data) {
        // check the socketid
        let conId = socket.id;
        // look up that connection in the map
        let client = connections.get(conId);
        // find the correct Room where that person is
        let roomCode = client.roomCode;
        // hand off the input you got from the signal to the room,
        // telling it which connection did so
        openRooms.get(roomCode).handleInput(conId, data);
    }



    // handle what we do if a client disconnects
    socket.on('disconnect', function () {
        console.log('Client has disconnected. id: ' + socket.id);
        // look up the socket id in the conneciton table
        if(connections.has(socket.id)){
            // go to the room and tell them that the player disconnected
            let roomid = connections.get(socket.id).roomCode;
            openRooms.get(roomid).handleDisconnect(socket.id);
            // remove them from the connections list
            connections.delete(socket.id);
        }
       
    });
}


// ping each room to update 
function update() {
    for (let room of openRooms.values()) {
       room.update();
    }
}







