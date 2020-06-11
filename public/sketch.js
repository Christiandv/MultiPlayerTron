var socket;

function setup(){
    createCanvas(500,500);
    background(51);

    // actually connect from client side, need to update when not running locally
    socket = io.connect('http://127.0.0.1:3000');
    socket.on('mouse', newDrawing);
}

function newDrawing(data){
    noStroke();
    fill(200);
    ellipse(data.x, data.y, 50,50);
}

function draw(){
  
}

function mouseDragged(){
    console.log(mouseX + ", " + mouseY);

    // the data we want to send to the server
    var data ={
        x:mouseX,
        y:mouseY
    }
    // send message with mouse label and needed data
    socket.emit('mouse',data);
    noStroke();
    fill(200);
    ellipse(mouseX, mouseY, 50,50);
}

