const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const roomMap = {};      // { roomId: roomName }
const roomUsers = {};    // { roomId: [username, ...] }

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


// Generate a 6-character room ID
function generateRoomID() {
  return crypto.randomBytes(3).toString('hex');
}

// Send updated user list and count
function updateRoomState(room) {
  const users = roomUsers[room] || [];
  io.to(room).emit('user-count', users.length);
  io.to(room).emit('user-list', users);
}

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join-room', ({ username, room }) => {
    socket.username = username;
    socket.room = room;
    socket.join(room);

    roomUsers[room] = roomUsers[room] || [];
    if (!roomUsers[room].includes(username)) {
      roomUsers[room].push(username);
    }

    io.to(room).emit('chat message', {
      type: 'system',
      message: `${username} joined the room.`,
    });

    updateRoomState(room);
  });

  socket.on('chat message', (msg) => {
    if (socket.room) {
      io.to(socket.room).emit('chat message', `${socket.username}: ${msg}`);
    }
  });

  socket.on('system message', (data) => {
    if (socket.room) {
      io.to(socket.room).emit('chat message', data);
    }
  });

  socket.on('leave-room', (room) => {
    socket.leave(room);

    if (socket.username && roomUsers[room]) {
      roomUsers[room] = roomUsers[room].filter(u => u !== socket.username);

      io.to(room).emit('chat message', {
        type: 'system',
        message: `${socket.username} left the room.`,
      });

      updateRoomState(room);
    }
  });

  socket.on('disconnect', () => {
    const { room, username } = socket;

    if (room && username && roomUsers[room]) {
      roomUsers[room] = roomUsers[room].filter(u => u !== username);

      socket.to(room).emit('chat message', {
        type: 'system',
        message: `${username} was disconnected.`,
      });

      updateRoomState(room);
    }
  });
});

// Create room
app.get('/create-room', (req, res) => {
  const roomId = generateRoomID();
  res.json({ roomId });
});

// Register room name
app.post('/register-room', (req, res) => {
  const { roomId, roomName } = req.body;

  if (!roomId || !roomName) {
    return res.status(400).json({ error: 'Missing roomId or roomName' });
  }

  roomMap[roomId] = roomName;
  res.status(200).json({ message: 'Room registered' });
});

// Get room name
app.get('/room-name/:roomId', (req, res) => {
  const name = roomMap[req.params.roomId];
  if (!name) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({ roomName: name });
});

// Start server
server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
