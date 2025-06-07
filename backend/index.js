const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../frontend')));

const users = {};

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('set-username', (username) => {
        users[socket.id] = username;
        socket.broadcast.emit('user-joined', `${username} joined the session`);
    });

    socket.on('code-change', (data) => {
        socket.broadcast.emit('code-change', data);
    });

    socket.on('chat-message', (msg) => {
        const username = users[socket.id] || 'Anonymous';
        io.emit('chat-message', `${username}: ${msg}`);
    });

    socket.on('disconnect', () => {
        const username = users[socket.id];
        if (username) {
            socket.broadcast.emit('user-left', `${username} left the session`);
            delete users[socket.id];
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
