# MultiPlayerTron
 Attempt at web tron for TIC

 The server keeps track of all game logic. The clients meerly output what the server gives them and tells the server when someone turns. This way everyone's view of the gamestate should be consistant and people cannot spoof where they are in the game, which is generally good. 

 You need Node.js to be able to set up the server. https://nodejs.org/en/download/

 Run "node server.js" to start up the server. Currently clients connect through localhost:3000 until we get to the point of hosting. 

 You will also need Express.js to run the project. Their website is : expressjs.com

 Press any keyboard button to start! requires 2+ players (currently do not handle the case of the 5th person joining, later they will be spectators)

 Check out the issues tab on github to claim things to work on. 


