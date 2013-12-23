/**
 * DUMMY BOT FOR DWARVEN TAVERN
 */
var net = require("net"),
    _ = require("underscore");

/*
 * Global Methods
 */
var simulationId = process.argv[2] ? process.argv[2] : null;
var server = null;
var disconnected = false;
var targetY = 0;
var deffendingY = 0;
var myTeam = "";
var opponentTeam = "";


/**************************
 *    AUXILIARY METHODS
 ***************************/
/*
 * Returns a position for the dwarf to push the barrel in a good direction
 */
var getWantedBarrelPos = function(barrelPos, wantedY) {
    var x = barrelPos.x;
    var y = (barrelPos.y > wantedY)?barrelPos.y+1:barrelPos.y-1;
    return {x:x, y:y};
};

/*
 * Check if to positions are equal
 */
  isEqualPos = function(pos1, pos2) {
    if (pos1 && pos2) {
      return pos1.x === pos2.x && pos1.y === pos2.y;
    }
    return false;
  };

  manhattanDistanceOne = function(pos1, pos2) {
    var distanceX, distanceY;
    distanceX = Math.abs(pos1.x - pos2.x);
    distanceY = Math.abs(pos1.y - pos2.y);
    return distanceX + distanceY === 1;
  };

/*
 * Creates an action to move towards a position in the grid
 */
var createActionMoveTo = function(bot, toPosition, toEvit) {
    var direction = null;

    if(bot.coords.y < toPosition.y && !isEqualPos(toEvit, {x: bot.coords.x, y: bot.coords.y+1})) {
        direction = "SOUTH";
    } else if(bot.coords.y > toPosition.y && !isEqualPos(toEvit, {x: bot.coords.x, y: bot.coords.y-1})) {
        direction = "NORTH";
    } else if(bot.coords.x < toPosition.x && !isEqualPos(toEvit, {x: bot.coords.x+1, y: bot.coords.y})) {
        direction = "EAST";
    } else if(bot.coords.x > toPosition.x && !isEqualPos(toEvit, {x: bot.coords.x-1, y: bot.coords.y})) {
        direction = "WEST";
    }

    if(direction) {
        return { "botId": bot.id, "type": "MOVE", "direction": direction };
    } else {
        return { "botId": bot.id, "type": "PASS" };
    }
};

/*
 * MAIN LOGIC OF THE BOT
 */
var runTurn = function(state) {
    // Variables to hold the current state of the simulation
    var myTeamBarrel = state["barrels"][myTeam]["coords"];
    var opponentBarrel = state["barrels"][opponentTeam]["coords"];
    opponents = state[opponentTeam];

    // Bot configuration
    var attackers = [];
    var defenders = [];
    
    // Actions to be sent to the server
    var actions = [];


    pushOpponentsLogic = function(bot, opponents) {
      var opponent, push, _i, _len;
      push = false;
      if (opponents) {
        for (_i = 0, _len = opponents.length; _i < _len; _i++) {
          opponent = opponents[_i];
          if (!push) {
            push = push || manhattanDistanceOne(bot.coords, opponent.coords);
            if (push) {
              actions.push(createActionMoveTo(bot, opponent.coords));
            }
          }
        }
      }
      return push;
    };
    canProtectBarrelLogic = function(bot, barrel, opponents) {
      var opponent, push, _i, _len;
      push = false;
      if ((manhattanDistanceOne(bot.coords, barrel)) && opponents) {
        for (_i = 0, _len = opponents.length; _i < _len; _i++) {
          opponent = opponents[_i];
          push = push || (manhattanDistanceOne(opponent.coords, barrel));
        }
      }
      return push;
    };
    protectBarrelLogic = function(bot, opponents) {
      if (canProtectBarrelLogic(bot, myTeamBarrel, opponents)) {
        actions.push(createActionMoveTo(bot, myTeamBarrel));
        return true;
      } else if (canProtectBarrelLogic(bot, opponentBarrel, opponents)) {
        actions.push(createActionMoveTo(bot, opponentBarrel));
        return true;
      }
      return false;
    };

    
    // Main logic for attacker bots
    var executeBotAttacker = function(bot) {
        var wantedPos = getWantedBarrelPos(opponentBarrel, targetY);
//		if (!protectBarrelLogic(bot, opponents)) {
        	if (!pushOpponentsLogic(bot, opponentBarrel, opponents)) {
                if(isEqualPos(bot.coords, wantedPos)) {
                    actions.push(createActionMoveTo(bot, {x: bot.coords.x, y: targetY},{x:-1,y:-1}));
                } else {
                    actions.push(createActionMoveTo(bot, wantedPos,opponentBarrel));
                }
            }
//        }
    };
    
    // Main logic for defender bots
    var executeBotDefender = function(bot) {
        var wantedPos = getWantedBarrelPos(myTeamBarrel, deffendingY);
       	if (!pushOpponentsLogic(bot, opponents)) {
		    if (!protectBarrelLogic(bot, opponents)) {
                if(isEqualPos(bot.coords, wantedPos)) {
                    actions.push(createActionMoveTo(bot, {x: bot.coords.x, y: deffendingY},{x:-1,y:-1}));
                } else {
                    actions.push(createActionMoveTo(bot, wantedPos,myTeamBarrel));
                }
            }
        }
    };
    
    // We define 3 bots to "attack"..
    attackers = [ state[myTeam][4], state[myTeam][3], state[myTeam][2]];
    
    // ... 2 defenders
    defenders = [ state[myTeam][1], state[myTeam][0]];
    
    // We create the actions related to the bots
    _.each(attackers, executeBotAttacker);
    _.each(defenders, executeBotDefender);

    var turnMessage = {
        "type" : "player-turn",
        "actions": actions
    };

    if(!disconnected) {
        server.write(JSON.stringify(turnMessage));
    }
};

/*
 * CONNECTION METHODS
 */
var joinSimulation = function() {
    var joinMessage = {
        "type" : "join-simulation",
        "nick" : "Drunk",
        "simulationId" : simulationId,
        "names" : [
            "Carawebo",
            "Pantuflo",
            "Chistaburras",
            "Pontato",
            "Jhonny Tablas"
        ]
    };
    server.write(JSON.stringify(joinMessage));
};

// Bot connects to the server
server = net.connect({port: 9000}, joinSimulation);

/*
 * MAIN LOOP 
 */
server.on("data", function(data) {
    // console.log(">> " + data);
    var message = JSON.parse(data);

    if(message["type"] == "turn") {
        runTurn(message["state"]);
    } else if(message["type"] == "game-info") {
        myTeam = message["team"];
        if(message["team"] == "team1") {
            targetY = message["height"];
            deffendingY = message["height"];
            opponentTeam = "team2";
        } else {
            targetY = 0;
            deffendingY = 0;
            opponentTeam = "team1";
        }
        // console.log("TARGET: " + targetY);
    } else if(message["type"] == "ready") {
        simulationId = message["simulationId"];
        joinSimulation();
    } else if(message["type"] == "score") {
        console.log("SCORE "+message.team);
    } else if(message["type"] == "error" && message["message"] == "Player disconnected") {
        console.log("DISCONNECTED");
    } else if(message["type"] == "error" && message["message"] == "Wrong simulation ID") {
        server.write(JSON.stringify({"type" : "create-simulation"}));
    } else {
        // console.log("ENDING: %s", data);
        server.end();
    }
});

server.on("end", function() {
    disconnected = true;
    console.log("END");
});


