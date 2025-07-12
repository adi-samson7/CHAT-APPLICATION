const socket = io();

let username = '';
let roomId = '';
let roomName = '';

function goToRoomSelection() {
  const input = document.getElementById('usernameInput').value.trim();
  if (!input) return alert('Please enter a username');

  username = input;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('room-screen').classList.remove('hidden');
}

function createRoom() {
  const name = document.getElementById('roomNameInput').value.trim();
  if (!name) return alert("Please enter a room name.");

  fetch('/create-room')
    .then(res => res.json())
    .then(data => {
      roomId = data.roomId;
      roomName = name;

      return fetch('/register-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, roomName })
      });
    })
    .then(() => {
      document.getElementById('roomInfo').innerText = `Room created with ID: ${roomId}`;
      setTimeout(joinChatRoom, 1000);
    });
}

function joinRoom() {
  const input = document.getElementById('joinRoomInput').value.trim();
  if (!input) return alert('Enter room ID to join.');

  roomId = input;

  fetch(`/room-name/${roomId}`)
    .then(res => res.json())
    .then(data => {
      roomName = data.roomName;
      joinChatRoom();
    })
    .catch(() => alert('Room not found.'));
}

function joinChatRoom() {
  document.getElementById('room-screen').classList.add('hidden');
  document.getElementById('chat-screen').classList.remove('hidden');
  document.getElementById('chatRoomName').innerText = `${roomName} | ID: ${roomId}`;

  socket.emit('join-room', { username, room: roomId, roomName });
}

document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = document.getElementById('messageInput').value.trim();
  if (msg) {
    socket.emit('chat message', msg);
    document.getElementById('messageInput').value = '';
  }
});

socket.on('chat message', (data) => {
  const li = document.createElement('li');

  if (typeof data === 'string') {
    const isMine = data.startsWith(`${username}:`);
    li.textContent = data;
    li.classList.add(isMine ? 'message-right' : 'message-left');
  } else if (data.type === 'system') {
    li.textContent = data.message;
    li.classList.add('system-message');
  }

  const messages = document.getElementById('messages');
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

socket.on('user-count', (count) => {
  document.getElementById('onlineCount').innerText = `Online: ${count}`;
});

socket.on('user-list', (users) => {
  const userList = document.getElementById('userList');
  userList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user;
    userList.appendChild(li);
  });
});

function exitRoom() {
  socket.emit('leave-room', roomId);
  resetChatUI();
  document.getElementById('room-screen').classList.remove('hidden');
}

function goHome() {
  socket.emit('leave-room', roomId);
  resetChatUI();
  document.getElementById('login-screen').classList.remove('hidden');
}

function resetChatUI() {
  roomId = '';
  roomName = '';
  document.getElementById('messages').innerHTML = '';
  document.getElementById('userList').innerHTML = '';
  document.getElementById('onlineCount').innerText = '';
  document.getElementById('chat-screen').classList.add('hidden');
  document.getElementById('room-screen').classList.add('hidden');
}
