"use strict";

var net = require('net'),
    Backbone = require('backbone'),
    _ = require('underscore'),
    Client = require('./Client'),
    EventEmitter = require('events').EventEmitter;

var InputServer = Backbone.Model.extend({

    defaults: {
        port: 9000,
        server: null,
        emitter: null,
        clients: null
    },

    initialize: function() {
        var self = this;
        this.set("emitter", new EventEmitter());
        this.set("clients", []);

        this.set("server", net.createServer(function(socket) {
            console.log('++ New connection received!');

            var client = new Client({socket: socket, server: self});
            self.addClient(client);

            socket.on('data', function(data) {
                try {
                    var jsonContent = JSON.parse(data.toString());
                    self.get("emitter").emit('turn-received', jsonContent, client);
                } catch(err) {
                    console.log('-- Input malformed');
                    console.log('- ' + err);
                    socket.emit('input-malformed', socket);
                }
            });

            socket.on('input-malformed', function(socket) {
                var response = '{"type": "error", "message": "Invalid JSON"}\n';
                socket.write(response);
            });

            socket.on('end', _.bind(client.endConnection, client));
        }));
    },

    start: function() {
        var self = this;

        this.get("server").listen(this.get("port"), function() {
            console.log('===== Server started! =====\n++ Listening on ' + self.get("port") + '...');
        });
    },

    addClient: function(client) {
        this.get("clients").push(client);
    },

    removeClient: function(client) {
        this.set("clients", _.without(this.clients, client));
    }

});


module.exports = InputServer;