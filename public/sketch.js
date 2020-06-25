var socket;


var id = 0;
let backgroundColor;
var started = false; 
var hasLost = false;
var hasWon = false;
var readied = false;

var currentPage;

var nameInput;
var roomCodeInput;
var submitButton;


function setup(){
    backgroundColor =  color(51);
    createCanvas(500,500);
    background(backgroundColor);

    // actually connect from client side, need to update when not running locally
    socket = io.connect('http://127.0.0.1:3000');
    currentPage = 'MainPage';

    // move these so they are only active when needed
    /*
    socket.on('reset', reset);
    socket.on('playerLocUpdate', drawGameData);
    socket.on('start', start);
    socket.on('youLost', lost);
    socket.on('youWin', win);
*/
    socket.on('rejectLogin', failedLogin);
    socket.on('successfulLogin', successfulLogin);
    var data = {
        nameError:'',
        roomError:'',
        nameInput: '',
        roomInput: ''
    };
    renderMainPage(data);
}

// draw method for the hub screen 
function renderMainPage(errors){
    // draw background
    background(backgroundColor);
    // draw title
   
   
    fill(255,165,0);
    textSize(60);
    text("TIC TRON", 80, 100);

    fill(255,255,255);
    textSize(30);

    // input boxes
    text("Enter your name:", 70, 250);
    nameInput = createInput();
    nameInput.position(100,300);
    nameInput.value(errors.nameInput);

    fill(255,70,0);
    textSize(14);
    text(errors.nameError,70,310);

    fill(255,255,255);
    textSize(30);
    text("Enter roomcode:", 70, 350);
    roomCodeInput = createInput();
    roomCodeInput.position(100,400);
    roomCodeInput.value(errors.roomInput);

    fill(255,70,0);
    textSize(14);
    text(errors.roomError, 70,410);

    submitButton = createButton("login");
    submitButton.position(150, 450);
    submitButton.mousePressed(attemptLogin);
}

// sends over the data that was collected from the user
function attemptLogin(){
    // package up the strings
    var data = {
        name: nameInput.value(),
        roomCode: roomCodeInput.value()
    };
    // send to the server
    socket.emit('loginAttempt', data);
}

// should give data about why the login was rejected (invalud room code, too short a name/long)
function failedLogin(data){
    // you did not give good login info
    renderMainPage(data);
    // render error reason
    console.log('failed login');
}

function successfulLogin(data){
    console.log('good login');
    // you have logged in, should recieve room code as confirmation

    // clean up the main page stuff like deleting inputfields
    nameInput.remove();
    roomCodeInput.remove();
    submitButton.remove();
    // set up listeners for the room info/readying


}




// draws the screen for when you are in a room but the game has not started
function drawRoom(data){
    // draw background

    // draw banner, ready/readied

    // show other players and whether or not they have readied up?
}


function reset(data){
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
function drawGameData(data){
    noStroke();
    var size= 0;
    for(var i = 0; i < data.length; i ++){
        fill(data[i].color.r,data[i].color.g,data[i].color.b);
        square(data[i].x,data[i].y,data[i].size);
        console.log("drawing");
    }
}


// REWORK THIS, NEEDS TO BE SPLIT UP
function draw(){
    if(currentPage === 'MainPage'){

    }else if (currentPage === 'InRoom'){

    }else if(currentPage === 'InGame'){

    }else{
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
    if(started && !hasLost && !hasWon){
        console.log("sending input");
        if (keyCode === LEFT_ARROW) {
            var direction = 2;
            
        } else if (keyCode === RIGHT_ARROW) {
            var direction = 0;
           
        } else if (keyCode === UP_ARROW) {
            var direction = 1;
            
        }else if (keyCode === DOWN_ARROW) {
            var direction = 3;
            
        }
        var data = {
            dir:direction,
            id:id
        }
        socket.emit('input', data);
    }else if(!readied){
        readied = true;
        //background(backgroundColor);

        socket.emit('ready');
        console.log("sending ready");
    }
    
}

function gameOver(){
    // turn off game liseners

    // return to the room screen

}


function win(){
    hasWon = true;
}

function lost(){
    hasLost = true;
}

function start(){
    background(backgroundColor);
    // make a banner that says start?
    console.log("START");
    started = true;
}

