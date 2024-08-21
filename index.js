const express = require('express');
const http = require('http');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // For generating random UUIDs
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {}; // To keep track of connected users in each room

io.on('connection', (socket) => {
    let roomId = null;
    let userName = `User_${Math.floor(Math.random() * 1000)}`;

    console.log('New client connected');

    socket.on('joinRoom', (data) => {
        roomId = data.roomId || uuidv4();
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }

        rooms[roomId].push({ id: socket.id, userName });

        io.to(roomId).emit('roomJoined', { roomId, userName, connectedUsers: rooms[roomId] });
        io.to(roomId).emit('userJoined', { userName, connectedUsers: rooms[roomId] });
    });

    socket.on('sendFile', (data) => {
        io.to(roomId).emit('receiveFile', {
            fileName: data.fileName,
            fileBuffer: data.fileBuffer,
            userName: userName
        });
    });

    socket.on('disconnect', () => {
        if (roomId && rooms[roomId]) {
            rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);

            io.to(roomId).emit('userLeft', { connectedUsers: rooms[roomId] });
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
