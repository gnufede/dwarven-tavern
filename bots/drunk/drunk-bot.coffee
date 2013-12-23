# DUMMY BOT FOR DWARVEN TAVERN
net = require "net"

# Global variables
simulationId = if process.argv[2]? then process.argv[2] else null 
server = null
disconnected = false
targetY = 0
deffendingY = 0
myTeam = ""
opponentTeam = ""


# Auxiliary functions
getWantedBarrelPos = (barrelPos, wantedY)->
    x: barrelPos.x;
    y: if barrelPos.y > wantedY then barrelPos.y+1 else barrelPos.y-1
    
manhattanDistanceOne = (pos1, pos2) ->
    distanceX = Math.abs(pos1.x - pos2.x)
    distanceY = Math.abs(pos1.y - pos2.y)
    return (distanceX+distanceY == 1)
    
isEqualPos = (pos1, pos2) ->
    if pos1 and pos2
        return pos1.x == pos2.x && pos1.y == pos2.y
    return false
    
createActionMoveTo = (bot, toPosition, toEvit) ->
    direction = "EAST"  if bot.coords.x < toPosition.x and !isEqualPos(toEvit, x: bot.coords.x+1, y: bot.coords.y)
    direction = "WEST"  if bot.coords.x > toPosition.x and !isEqualPos(toEvit, x: bot.coords.x-1, y: bot.coords.y)
    direction = "SOUTH" if bot.coords.y < toPosition.y and !isEqualPos(toEvit, x: bot.coords.x, y: bot.coords.y+1)
    direction = "NORTH" if bot.coords.y > toPosition.y and !isEqualPos(toEvit, x: bot.coords.x, y: bot.coords.y-1) 

    if direction?
        botId: bot.id, type: "MOVE", direction: direction
    else
        botId: bot.id, type: "PASS"


runTurn = (state) ->
    # Variables to hold the current state of the simulation
    myTeamBarrel = state["barrels"][myTeam]["coords"]
    opponentBarrel = state["barrels"][opponentTeam]["coords"]
    opponents = state[opponentTeam]
    
    # Bot configuration
    attackers = []
    defenders = []
    
    # Array of actions to send to the server
    actions = []

    # Can I push an opponent?
    pushOpponentsLogic = (bot, opponents) ->
        push = false
        if opponents
            for opponent in opponents
                if not push
                    push = push or manhattanDistanceOne bot.coords, opponent.coords
                    if push
                        actions.push createActionMoveTo(bot, opponent.coords)
         return push


    # Can I protect the barrel?
    canProtectBarrelLogic = (bot, barrel, opponents) ->
        push = false
        if (manhattanDistanceOne bot.coords, barrel) and opponents
            for opponent in opponents
                push = push or (manhattanDistanceOne opponent.coords, barrel)
        return push

    protectBarrelLogic = (bot, opponents) ->
        if canProtectBarrelLogic bot, myTeamBarrel, opponents
           actions.push createActionMoveTo(bot, myTeamBarrel)
           return true
        else if canProtectBarrelLogic bot, opponentBarrel, opponents
           actions.push createActionMoveTo(bot, opponentBarrel)
           return true
        return false

    # Attacker Logic
    attackerBotLogic = (bot) ->
        wantedPos = getWantedBarrelPos opponentBarrel, targetY
        if isEqualPos bot.coords, wantedPos
            actions.push createActionMoveTo(bot, { x: bot.coords.x, y: targetY }, { x: -1, y: -1 })
        else
            actions.push createActionMoveTo(bot, wantedPos, opponentBarrel)
    
    # Defender Logic
    defenderBotLogic = (bot) ->
        wantedPos = getWantedBarrelPos myTeamBarrel, deffendingY
        if not protectBarrelLogic bot, opponents
            if not pushOpponentsLogic bot, opponents
                if isEqualPos bot.coords, wantedPos
                    actions.push createActionMoveTo(bot, {x: bot.coords.x, y: deffendingY}, {x:-1,y:-1})
                else
                    actions.push createActionMoveTo(bot, wantedPos,myTeamBarrel)
        
    # We define 3 bots to "attack"..
    attackers = [ state[myTeam][0], state[myTeam][2], state[myTeam][4]]
    
    # ... 2 defenders
    defenders = [ state[myTeam][1], state[myTeam][3]]
    
    # We create the actions related to the bots
    attackerBotLogic bot for bot in attackers
    defenderBotLogic bot for bot in defenders
        
    turnMessage =
        type :   "player-turn",
        actions: actions

    #for action in actions
        #console.log("actions: "+action)
    server.write JSON.stringify(turnMessage) unless disconnected

    
joinSimulation = -> 
    server.write JSON.stringify(
        simulationId : simulationId,
        type : "join-simulation",
        nick : "Drunk",
        names : [
            "Johnny Walker",
            "Toalabarra",
            "JägerMëister",
            "Delirium Tremens",
            "Pawël Kwak"
        ])
        
server = net.connect port: 9000, joinSimulation

server.on "data", (data) ->
    message = JSON.parse data
    
    switch message["type"]
        when "game-info"
            myTeam = message["team"]
            if myTeam == "team1"
                targetY = message["height"]
                deffendingY = message["height"]
                opponentTeam = "team2"
            else
                targetY = 0
                deffendingY = 0
                opponentTeam = "team1"
        when "ready"
            simulationId = message["simulationId"]
            joinSimulation()
            
        when "turn" then runTurn message["state"]
        when "score" then console.log "SCORE"
        when "error"
            console.log if message["message"] == "Player disconnected"
            server.write JSON.stringify(type: "create-simulation") if message["message"] == "Wrong simulation ID"
        
        else server.end() 

server.on "end", ->
    disconnected = true
    console.log "END"

