const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const PORT = process.env.PORT || 3000;

let players = {};
let hostId = null;

io.on('connection', (socket) => {
    console.log("Connected:", socket.id);

    // Assign host
    if (!hostId) hostId = socket.id;

    players[socket.id] = {
        x: Math.random() * 400,
        y: Math.random() * 400,
        isHost: socket.id === hostId
    };

    // Send initial state
    socket.emit('init', {
        id: socket.id,
        players,
        hostId
    });

    socket.broadcast.emit('playerJoined', {
        id: socket.id,
        data: players[socket.id]
    });

    // Movement
    socket.on('move', (data) => {
        if (!players[socket.id]) return;

        players[socket.id].x = data.x;
        players[socket.id].y = data.y;

        socket.broadcast.emit('playerMoved', {
            id: socket.id,
            x: data.x,
            y: data.y
        });
    });

    // Restart (host only)
    socket.on('restart', () => {
        if (socket.id !== hostId) return;

        for (let id in players) {
            players[id].x = Math.random() * 400;
            players[id].y = Math.random() * 400;
        }

        io.emit('restart', players);
    });

    socket.on('disconnect', () => {
        console.log("Disconnected:", socket.id);

        delete players[socket.id];

        if (socket.id === hostId) {
            const ids = Object.keys(players);
            hostId = ids.length > 0 ? ids[0] : null;
        }

        io.emit('playerLeft', socket.id);
    });
});

server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
