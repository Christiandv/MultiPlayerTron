var socket;


var id = 0;
var roomCode = -1;
var isPlayer = false;
var name = '';
var playing;
let backgroundColor;
var started = false;
var hasLost = false;
var hasWon = false;


var currentPage;

var nameInput;
var roomCodeInput;
var submitButton;


function setup() {
    backgroundColor = color(51);
    createCanvas(500, 500);
    background(backgroundColor);

    // actually connect from client side, need to update when not running locally
    socket = io.connect('http://127.0.0.1:5000');

    currentPage = 'MainPage';

    // move these so they are only active when needed
    /*
    socket.on('reset', reset);
    
*/
    socket.on('rejectLogin', failedLogin);
    socket.on('successfulLogin', successfulLogin);
    var data = {
        nameError: '',
        roomError: '',
        nameInput: '',
        roomInput: ''
    };
    renderMainPage(data);
}

// draw method for the hub screen 
function renderMainPage(errors) {
    // draw background
    background(backgroundColor);
    // draw title


    fill(255, 165, 0);
    textSize(60);
    text("TIC TRON", 80, 100);

    fill(255, 255, 255);
    textSize(30);

    // input boxes
    text("Enter your name:", 70, 250);
    nameInput = createInput();
    nameInput.position(100, 300);
    nameInput.value(errors.nameInput);

    fill(255, 70, 0);
    textSize(14);
    text(errors.nameError, 70, 310);

    fill(255, 255, 255);
    textSize(30);
    text("Enter roomcode:", 70, 350);
    roomCodeInput = createInput();
    roomCodeInput.position(100, 400);
    roomCodeInput.value(errors.roomInput);

    fill(255, 70, 0);
    textSize(14);
    text(errors.roomError, 70, 410);

    submitButton = createButton("login");
    submitButton.position(150, 450);
    submitButton.mousePressed(attemptLogin);
}

// sends over the data that was collected from the user
function attemptLogin() {
    // package up the strings
    var data = {
        name: nameInput.value(),
        roomCode: roomCodeInput.value()
    };
    nameInput.remove();
    roomCodeInput.remove();
    submitButton.remove();
    // send to the server
    socket.emit('loginAttempt', data);
}

// should give data about why the login was rejected (invalud room code, too short a name/long)
function failedLogin(data) {
    // you did not give good login info
    renderMainPage(data);
    // render error reason
    console.log('failed login');
}

function successfulLogin(data) {
    console.log('good login');
    // you have logged in, should recieve room code as confirmation
    roomCode = data.room;
    name = data.name;
    id = data.id;
    // clean up the main page stuff like deleting inputfields
    nameInput.remove();
    roomCodeInput.remove();
    submitButton.remove();
    socket.off('rejectLogin', failedLogin);
    socket.off('successfulLogin', successfulLogin);
    // set up listeners for the room info/readying
    socket.on('roomDataUpdate', drawRoom);
    socket.on('start', start);
    socket.on('IsPlayer', setIsPlayer);
    socket.on('countdown', countdown);

}

function setIsPlayer(data) {
    isPlayer = data;
}

// draws the screen for when you are in a room but the game has not started
function drawRoom(data) {
    // draw background
    background(backgroundColor);
    // draw banner, ready/readied
    fill(255, 165, 0);
    textSize(60);
    text("In the room!", 80, 100);
    // show other players and whether or not they have readied up
    fill(255, 255, 255);
    textSize(20);
    let y = isPlayer ? 250 : 200;
    for (const player of data.players) {
        if (player.id == id && isPlayer) {
            // this is client
            text('' + player.name + (player.ready ? " Ready!" : ""), 80, 200);
        } else {
            text('' + player.name + (player.ready ? " Ready!" : ""), 80, y);
            y += 50;
        }
    }
    fill(255, 165, 0);
    textSize(40);
    text("Num Spectators: " + data.spectators.length, 80, 400);
}

function countdown(data){
    // TODO Fix this, should be integrated with room data
    noStroke();
    fill(backgroundColor);
    rect(250,100,300, 50);

    fill(255, 165, 0);
    textSize(40);
    text("" + (data === 0 ? "START!" : data), 250, 150);
}


function reset(data) {
    console.log("was given id: " + id);
    id = data.id;
    var started = false;
    var hasLost = false;
    var hasWon = false;
    var readied = false;
    //background(backgroundColor);
}


// draws the new location of a player to the screen
// called when the server sends new data and only then
// expects: color, x, y,
function drawGameData(data) {
    console.log("Update Game");
    noStroke();
    var size = 0;
    for (var i = 0; i < data.length; i++) {
        fill(data[i].color.r, data[i].color.g, data[i].color.b);
        square(data[i].x, data[i].y, data[i].size);
    }

    if(hasLost){
        fill(255, 165, 0);
        textSize(40);
        text("You Lose", 250, 50);
    }
}


// REWORK THIS, NEEDS TO BE SPLIT UP
function draw() {
    if (currentPage === 'MainPage') {

    } else if (currentPage === 'InRoom') {

    } else if (currentPage === 'InGame') {

    } else {
        console.log('Incorrect page variable');
    }
    /*
    if(started){
        if(hasLost){
            // draw a you lose banner
            fill(255);
            textSize(50);
            text("You Lose!",100,100);
        }else if(hasWon){
            //draw a you win banner
            fill(255);
            textSize(50);
            text("You Win!",100,100);
        }
    }else{
        if(readied){
            // game will start soon banner
           
            fill(255);
            textSize(50);
            text("Get Ready!",100,100);
        }else{
            // please press any button so say you are ready
            fill(255);
            textSize(50);
            text("Please Ready Up",100,100);
        }
    } 
    */
}

function keyPressed() {

    console.log("sending input");
    if (keyCode === LEFT_ARROW) {
        var direction = 2;

    } else if (keyCode === RIGHT_ARROW) {
        var direction = 0;

    } else if (keyCode === UP_ARROW) {
        var direction = 1;

    } else if (keyCode === DOWN_ARROW) {
        var direction = 3;

    }
    var data = {
        dir: direction
    }
    socket.emit('input', data);


}

function gameOver() {
    console.log("going back to room");
    hasLost = false;
    // turn off game liseners
    socket.off('playerLocUpdate', drawGameData);
    socket.off('youLost', lost);
    socket.off('winner', announceWinner);
    socket.off('gameOver',gameOver);

    // turn on room listeners
    socket.on('roomDataUpdate', drawRoom);
    socket.on('start', start);
    socket.on('IsPlayer', setIsPlayer);
    socket.on('countdown', countdown);
    // return to the room screen
    background(backgroundColor);
}


function announceWinner(winner) {
    fill(winner.color.r, winner.color.g, winner.color.b);
    textSize(60);
    text(winner.name + " Wins!", 20, 250);
    if( winner.id === id){
        textSize(40);
        text("That's you!", 150, 300);
    }
}

function lost() {
    hasLost = true;
}

function start() {
    background(backgroundColor);
    // make a banner that says start?
    console.log("START");
    started = true;

    // remove listeners
    socket.off('roomDataUpdate', drawRoom);
    socket.off('start', start);
    socket.off('IsPlayer', setIsPlayer);
    socket.off('countdown', countdown);

    // add listeners
    socket.on('playerLocUpdate', drawGameData);
    socket.on('youLost', lost);
    socket.on('winner', announceWinner);
    socket.on('gameOver',gameOver);
}

