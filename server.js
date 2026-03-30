const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

let rooms = {}; // { roomCode: [socketIds] }

// Generate 5-digit room code
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

io.on('connection', (socket) => {
    console.log("Connected:", socket.id);

    // Create room
    socket.on('createRoom', () => {
        let code = generateCode();

        rooms[code] = [socket.id];
        socket.join(code);

        socket.emit('roomCreated', code);
        console.log("Room created:", code);
    });

    // Join room
    socket.on('joinRoom', (code) => {
        if (!rooms[code]) {
            socket.emit('errorMsg', "Room not found");
            return;
        }

        if (rooms[code].length >= 2) {
            socket.emit('errorMsg', "Room full");
            return;
        }

        rooms[code].push(socket.id);
        socket.join(code);

        socket.emit('joinedRoom', code);
        io.to(code).emit('playerCount', rooms[code].length);

        console.log("Player joined room:", code);
    });

    // Movement sync within room
    socket.on('move', ({ room, x, y }) => {
        socket.to(room).emit('playerMoved', { x, y });
    });

    // Restart
    socket.on('restart', (room) => {
        io.to(room).emit('restart');
    });

    socket.on('disconnect', () => {
        console.log("Disconnected:", socket.id);

        for (let room in rooms) {
            rooms[room] = rooms[room].filter(id => id !== socket.id);

            if (rooms[room].length === 0) {
                delete rooms[room];
            }
        }
    });
});

server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
