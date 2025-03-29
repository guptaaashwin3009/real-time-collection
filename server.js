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
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Serve static files for testing
app.use(express.static('dist'));
app.use(express.json());

// Add basic health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
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
    console.log('State saved to file');
  } catch (err) {
    console.error('Error saving state:', err);
  }
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current state to client who requested it
  socket.on('get-initial-state', () => {
    console.log('Sending initial state to client:', socket.id);
    socket.emit('state-update', appState);
  });
  
  // Update state from client
  socket.on('update-state', (newState) => {
    console.log('Received state update from client:', socket.id);
    appState = newState;
    
    // Broadcast to all other clients
    socket.broadcast.emit('state-update', appState);
    
    // Save state to file
    saveState();
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected (${socket.id}): ${reason}`);
  });
  
  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error);
  });
  
  // Heartbeat mechanism to keep connection alive
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  console.log('Server shutting down, saving state...');
  saveState();
  process.exit(0);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open your browser to http://localhost:${PORT} to view the app`);
});

// Log any unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
