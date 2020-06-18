# MultiPlayerTron
 Attempt at web tron for TIC

 The server keeps track of all game logic. The clients merely output what the server gives them and tells the server when someone turns. This way everyone's view of the gamestate should be consistent and people cannot spoof where they are in the game, which is generally good. 

 You need Node.js to be able to set up the server. https://nodejs.org/en/download/

 Run "node server.js" to start up the server. Currently clients connect through localhost:3000 until we get to the point of hosting. 

 Press any keyboard button to start! requires 2+ players (maxPlayers is currently set to 4-- any extra players who join are spectators.)

 Check out the issues tab on github to claim things to work on. 


