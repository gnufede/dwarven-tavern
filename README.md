![Dwarven Tavern](https://raw.github.com/PIWEEK/dwarven-tavern/master/client/imgs/tavern-logo.png)

# A long long time ago...

> In the Kal-eij-dhor tavern, two dwarven clans are about to face a heated argument.

> No one knows exactly what the problem is... but everyone know that there is only one way to solve it.

> The ancient ritual of the Khan-birr-ha begins. The two clans will risk their honor and their ancestors', defending their clan's beer while they try to take the rival's barrel.

# Table of contents

* [What's this?](#whats-this)
* [Rules](#rules)
  * [Basic mechanics](#basic-mechanics)
  * [Movement](#movement)
  * [Pushing](#pushing)
  * [Forbidden zones](#forbidden-zones)
* [Configure the server](#configure-the-server)
  * [Configuration file](#configuration-file)
  * [Installing the server](#installing-the-server)
  * [Starting the server](#starting-the-server)
* [How to make a bot](#how-to-make-a-bot)
  * [Connect to the server](#connect-to-the-server)
  * [Create and join simulations](#create-and-join-simulations)
    * [Create simulation](#create-simulation)
    * [Join simulation](#join-simulation)
  * [Playing our turns](#playing-our-turns)
    * [State of the simulation](#state-of-the-simulation)
      * [Barrels example](#barrels-example)
      * [Team example](#team-example)
      * [Complete state example](#complete-state-example)
    * [Sending a turn](#sending-a-turn)
    * [End of the game](#end-of-the-game)
  * [Bot example](#bot-example)
* [Web visor](#web-visor)
* [Acknowledgements](#acknowledgements)

# What's this?

Dwarven Tavern is a node-based game played with bots. It consists of a set of rules and a server that provides with a socket interface, a simple protocol and a web visor.

To play, you only need to code a bot that follows the protocol.

# Rules

In Dwarven Tavern, the dwarves have to drink all the beer they can. The first team that takes the other team's barrel to their zone scores a point, so the dwarves will need to divide and protect their barrel while they try to get the other team's.

## Basic mechanics

At the begining of each turn, the server sends the position of the dwarves and the barrels to the next active player. The player should send the movements of its dwarves in return and then, the server will calculate the result and send it to the other player. Each dwarf moves one square per turn.

## Movement

Each dwarf can move in four directions, **NORTH**, **EAST**, **SOUTH** and **WEST**. If the destiny square is occupied, the dwarf will push in the direction of the movement.

## Pushing

A dwarf can push a barrel or another dwarf. No matter what it pushes, if the destiny square it's free at the end of the movement, the dwarf will move into it.

If a dwarf pushes a barrel, the barrel will move one square in the direction of the push.

![Dwarf Push Barrel](https://raw.github.com/PIWEEK/dwarven-tavern/master/client/imgs/rule1.png)

If one dwarf pushes another, the pushed dwarf will be thrown back with a random pattern. When a dwarf is thrown back, it will move two squares back, one back and one left or one back and one right.

![Dwarf Hit Dwarf](https://raw.github.com/PIWEEK/dwarven-tavern/master/client/imgs/rule3.png)

If there is another dwarf blocking the way, the barrel will thrown him back following the same rules described above. If there is another dwarf behind the thrown one, it will be thrown too, and so on.

![Dwarf Hit Barrel](https://raw.github.com/PIWEEK/dwarven-tavern/master/client/imgs/rule2.png)

A dwarf can't push a barrel into another barrel, so if it tries to, the movement will be considered wasted.

## Forbidden zones

To avoid blocking situations, a barrel cannot be moved to the limits of the tavern. This way, a dwarf will always be able to push a barrel freely.

# Configure the server

## Configuration file

The server has a configuration file available in [`server/config.json`](https://github.com/PIWEEK/dwarven-tavern/blob/master/server/config.json). The most interesting properties are:
* `port`: the port where we want to listen for bot connections.
* `httpPort`: the port where we will be serving the web visor.
* `width` and `height`: the tavern size.
* `botsPerPlayer`: the number of bots each player has.
* `pointsToWin`: the number of points a team needs to score to win the match.

## Installing the server

To install the server dependencies, you will need to have [node.js](http://nodejs.org/) and [npm](https://npmjs.org/) installed in your system.

Clone the repository, move inside the `server` folder and execute:
```bash
npm install
```

## Starting the server

Inside the `server` folder, run:
```bash
node app.js
```

To close the server, use `CTRL+C`.

# How to make a bot

To make a bot, we need to implement three stages: connect to the server, create and join simulations and play our turns.

## Connect to the server

Despite the comunication with the server is done through TCP sockets, all the messages are sent formatted as JSON to ease the parsing.

The first thing our bot needs to do is to connect to the server. The following examples are written in **javascript** and obtained from the [`dummy bot`](https://github.com/PIWEEK/dwarven-tavern/blob/master/bots/dummy/dummy-bot.js).
```javascript
server = net.connect({port: 9000});
```

## Create and join simulations

After the connection, we can create a new simulation or connect to an existing one.

### Create simulation

To create a new simulation, we have to send the following message:
```javascript
// Client message
{
    "type": "create-simulation"
}

// Server response
{
    "type": "ready",
    "simulationId": "64lfbem"
}
```

### Join simulation

We can join a simulation knowing it's ID or join a random simulation that accepts newcommers. If we don't know the ID, we just remove it from the message:
```javascript
// Join request
{
    "type": "join-simulation",
    "nick": "John Doe",
    "simulationId": "64lfbem",
    "names": [
        "Rhun Diamondfighter",
        "Balgairen Marble-Flame",
        "Tavio Bluefeldspar",
        "Caith Scarletjasper",
        "Riagan Rubygold"
    ]
}

// Server response
{
    "type": "game-info",
    "simulationId": "64lfbem",
    "team": "team2",
    "width": 21,
    "height": 21
}
```

We use the `names` list to send the names of our dwarves, and the `nick` to identify our bot during the game.

## Playing our turns

When it's our turn, the server will send our bot the complete state of the simulation as reference, and it will wait for a response.

### State of the simulation

The server's message has the following attributes:
* `type`: it can be **turn**, **loss-game** and **win-game**, depending on the state of the game and if we lost or won (this logic is explained in the [End of the game](https://github.com/PIWEEK/dwarven-tavern#end-of-the-game) section).
* `state`: an object containing the state of the game, resulting from the other player's last movement.
* `state.barrels`: both barrels and their positions inside the tavern.
* `state.team1` and `state.team2`: the dwarven's positions of both teams.

#### Barrels example

```javascript
"barrels": {
    "team1": {
        "coords": {
            "x": 8,
            "y": 9
        }
    },
    "team2": {
        "coords": {
            "x": 11,
            "y": 9
        }
    }
}
```

#### Team example

```javascript
"team1": [
    {
        "id": 1,
        "name": "Rhun Diamondfighter",
        "coords": {
            "x": 8,
            "y": 7
        }
    },
    {
        "id": 2,
        "name": "Balgairen Marble-Flame",
        "coords": {
            "x": 6,
            "y": 9
        }
    },
    {
        "id": 3,
        "name": "Tavio Bluefeldspar",
        "coords": {
            "x": 7,
            "y": 8
        }
    },
    {
        "id": 4,
        "name": "Caith Scarletjasper",
        "coords": {
            "x": 10,
            "y": 8
        }
    },
    {
        "id": 5,
        "name": "Riagan Rubygold",
        "coords": {
            "x": 15,
            "y": 8
        }
    }
]
```

#### Complete state example

A complete message looks like this:

```javascript
{
    "type": "turn",
    "state": {
        "barrels": {
            "team1": {
                "coords": {
                    "x": 8,
                    "y": 9
                }
            },
            "team2": {
                "coords": {
                    "x": 11,
                    "y": 9
                }
            }
        },
        "team1": [
            {
                "id": 1,
                "name": "Rhun Diamondfighter",
                "coords": {
                    "x": 8,
                    "y": 7
                },
            }
            {
                "id": 2,
                "name": "Balgairen Marble-Flame",
                "coords": {
                    "x": 6,
                    "y": 9
                }
            },
            {
                "id": 3,
                "name": "Tavio Bluefeldspar",
                "coords": {
                    "x": 7,
                    "y": 8
                }
            },
            {
                "id": 4,
                "name": "Caith Scarletjasper",
                "coords": {
                    "x": 10,
                    "y": 8
                }
            },
            {
                "id": 5,
                "name": "Riagan Rubygold",
                "coords": {
                    "x": 15,
                    "y": 8
                }
            }
        ],
        "team2": [
            {
                "id": 6,
                "name": "Anwas Marble-Track",
                "coords": {
                    "x": 5,
                    "y": 11
                }
            },
            {
                "id": 7,
                "name": "Kieran Forge-Ash",
                "coords": {
                    "x": 8,
                    "y": 11
                }
            },
            {
                "id": 8,
                "name": "Aproderick Moon-Fist",
                "coords": {
                    "x": 8,
                    "y": 10
                }
            },
            {
                "id": 9,
                "name": "Dunmore Slatetapper",
                "coords": {
                    "x": 11,
                    "y": 10
                }
            },
            {
                "id": 10,
                "name": "Patrick Topazchipper",
                "coords": {
                    "x": 13,
                    "y": 11
                }
            }
        ]
    }
}
```

### Sending a turn

When we finish calculating our dwarven movements, we have to send a response to the server. Our bot's response should look like this:

```javascript
{
    "type" : "player-turn",
    "actions": [
        { "botId": 1, "type": "MOVE", "direction": "WEST" },
        { "botId": 2, "type": "MOVE", "direction": "EAST" },
        { "botId": 3, "type": "MOVE", "direction": "NORTH" },
        { "botId": 4, "type": "MOVE", "direction": "NORTH" },
        { "botId": 5, "type": "MOVE", "direction": "NORTH" }
    ]
}
```

### End of the game

When the game ends, the server will send us the winner movement as a normal state message, but with a different type. Instead of `turn`, the type will be `loss-game` if we lost the game, or `win-game` if we won.

## Bot example

There is a bot example in [`bots/dummy`](https://github.com/PIWEEK/dwarven-tavern/blob/master/bots/dummy).

# Web visor

When the Dwarven Tavern server is up and running, it starts a web server with a simulation visor. The server starts by default listening the port `8080`. We can use this server to watch the tavern arguments and follow the exciting IA powered fights.

To connect to a simulation, we need to wait until there is a dwarf clan inside the tavern room. The room will be deleted when the simulation is over.

```
http://localhost:8080
```

# Acknowledgements

This game was developed during the stunning and breathtaking [Kaleidos IV ΠWEEK (July 2013)](http://piweek.es), and (until the opposite is proved) **we won!** This wouldn't be possible without the time and resources of [Kaleidos Open Source](http://kaleidos.net). Thank you!


![Kaleidos ΠWEEK](https://raw.github.com/PIWEEK/dwarven-tavern/master/client/imgs/PIWEEK_logo.png)


A lot of the game resources are from the interwebs, thank you too!

* Sprites & game background: http://vxresource.wordpress.com/about/
* Dwarf voices: http://opengameart.org/content/drunk-dwarf-voice-pack
* You can get some AWESOME dwarf names here: http://dwarf.namegeneratorfun.com/
* Fonts: http://www.dafont.com/dwarven-stonecraft.font
* Openclipart: http://openclipart.org/media/people/liftarn
* Background: google search image without copyright info nor references. Thank you anonymous fella!
* Dwarven Tavern logo: handmade with care and love by [@alotor](http://github.com/alotor), [CC by-sa](http://es.creativecommons.org/blog/wp-content/uploads/2013/04/by-sa_petit.png)
