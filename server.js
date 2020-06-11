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

// handle the event that someone connects
io.sockets.on('connection', newConnection);


// handle new connection being made given socket 
function newConnection(socket){
    console.log('new connection' + socket.id);

    // whenever we recieve a 'mouse' message do mouseMsg
    socket.on('mouse', mouseMsg);

    function mouseMsg(data){
        // emits to everyone else
        socket.broadcast.emit('mouse', data);
        //io.sockets.emit('mouse', data); would also send back to this one
    }
}


