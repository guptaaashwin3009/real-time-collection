
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const STATE_FILE = path.join(__dirname, 'app-state.json');

// Initial state
let appState = {
  items: [],
  folders: [],
  itemOrder: [],
  folderOrder: []
};

// Try to load saved state
try {
  if (fs.existsSync(STATE_FILE)) {
    const data = fs.readFileSync(STATE_FILE, 'utf8');
    appState = JSON.parse(data);
    console.log('Loaded saved state');
  }
} catch (err) {
  console.error('Error loading saved state:', err);
}

// Save state to file
const saveState = () => {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(appState, null, 2));
  } catch (err) {
    console.error('Error saving state:', err);
  }
};

io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send current state to new client
  socket.on('get-initial-state', () => {
    socket.emit('state-update', appState);
  });
  
  // Update state from client
  socket.on('update-state', (newState) => {
    appState = newState;
    // Broadcast to all other clients
    socket.broadcast.emit('state-update', appState);
    // Save state to file
    saveState();
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
