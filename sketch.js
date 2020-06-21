var socket;


var id = -1; //id of -1 denotes spectator
var countdown = 4;
let backgroundColor;
var started = false; 
var hasLost = false;
var hasWon = false;
var readied = false;

function setup(){
    backgroundColor =  color(51);
    createCanvas(500,500);
    background(backgroundColor);

    // actually connect from client side, need to update when not running locally
    socket = io.connect('http://127.0.0.1:3000');
    socket.on('reset', reset);
    socket.on('playerLocUpdate', drawPlayers);
    socket.on('countdown3', countdown3);
    socket.on('countdown2', countdown2);
    socket.on('countdown1', countdown1);
    socket.on('start', start);
    socket.on('youLost', lost);
    socket.on('youWin', win);
}

function reset(data){
    console.log("was given id: " + id);
    id = data.id;
    var started = false; 
    var hasLost = false;
    var hasWon = false;
    var readied = false;
    background(51);
}


// draws the new location of a player to the screen
// expects: color, x, y,
function drawPlayers(data){
    noStroke();
    var size= 0;
    for(var i = 0; i < data.length; i ++){
        fill(data[i].color.r,data[i].color.g,data[i].color.b);
        square(data[i].x,data[i].y,data[i].size);
        console.log("drawing");
    }
}


function draw(){
    console.log("draw()")
    if(started){
        if(id < 0){
            // indicates spectator mode
            fill(255,255,255,50);
            textSize(30);
            text("Spectator",10,40);
        }
        else if(hasLost){
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
    } else if (countdown < 4){
        
            background(backgroundColor);
            fill(255);
            textSize(50);
            text(countdown,100,100); 
            console.log(countdown); 
           
    } else{
        if(id < 0){
            // spectator mode
           
            fill(255);
            textSize(50);
            text("You are a spectator",50,100);
        }
        else if(readied){
            // game will start soon banner
           
            fill(255);
            textSize(50);
            text("Get Ready!",100,100);
           
        }else{
            // please press any button so say you are ready
            fill(255);
            textSize(50);
            text("Please Ready Up",50,100);
        }
    }
 
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
    }else if(!readied && id >= 0){ //doesn't let spectators get ready
        readied = true;
        background(backgroundColor);

        socket.emit('ready');
        console.log("sending ready");
    }
    
}


function win(){
    hasWon = true;
}

function lost(){
    hasLost = true;
}

function countdown3(){
    // count 3
    countdown = countdown - 1;
    console.log("countdown3 is running: "+ countdown);
}

function countdown2(){
    // count 2
    countdown = 2;
}

function countdown1(){
    // count 1
   countdown = 1;
}

function start(){
    background(backgroundColor);
    // make a banner that says start?
    console.log("START");
    started = true;
}

