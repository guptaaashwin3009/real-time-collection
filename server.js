import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const STATE_FILE_BACKUP = path.join(__dirname, 'app-state.backup.json');

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
    try {
      appState = JSON.parse(data);
      console.log('Loaded saved state');
      
      // Create a backup of the successfully loaded state
      fs.writeFileSync(STATE_FILE_BACKUP, data);
      console.log('Created backup of current state');
    } catch (parseErr) {
      console.error('Error parsing state file:', parseErr);
      
      // Try to load from backup
      if (fs.existsSync(STATE_FILE_BACKUP)) {
        try {
          const backupData = fs.readFileSync(STATE_FILE_BACKUP, 'utf8');
          appState = JSON.parse(backupData);
          console.log('Restored from backup state file');
          
          // Restore the main state file from backup
          fs.writeFileSync(STATE_FILE, backupData);
          console.log('Restored main state file from backup');
        } catch (backupErr) {
          console.error('Error loading backup state:', backupErr);
        }
      }
    }
  }
} catch (err) {
  console.error('Error loading saved state:', err);
}

// Queue state saves to avoid multiple concurrent writes
let saveQueue = Promise.resolve();
let pendingSave = false;

// Save state to file
const saveState = () => {
  if (pendingSave) return; // Skip if we already have a save pending
  
  pendingSave = true;
  saveQueue = saveQueue.then(() => {
    try {
      const stateData = JSON.stringify(appState, null, 2);
      
      // First write to a temporary file
      const tempFile = STATE_FILE + '.tmp';
      fs.writeFileSync(tempFile, stateData);
      
      // Then rename it to replace the original (atomic operation)
      fs.renameSync(tempFile, STATE_FILE);
      
      // Create a backup after successful save
      fs.writeFileSync(STATE_FILE_BACKUP, stateData);
      
      console.log('State saved to file');
    } catch (err) {
      console.error('Error saving state:', err);
    } finally {
      pendingSave = false;
    }
  }).catch(err => {
    console.error('Error in save queue:', err);
    pendingSave = false;
  });
};

// Throttle state saves to at most once every 1 second
let saveTimeout = null;
const throttledSaveState = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    saveState();
    saveTimeout = null;
  }, 1000);
};

// Track connected clients
const clients = new Set();

// Track last update time and content for each client to prevent loops
const clientUpdates = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  clients.add(socket.id);
  clientUpdates.set(socket.id, {
    lastUpdateTime: 0,
    lastUpdateHash: ''
  });
  
  // Send current state to client who requested it
  socket.on('get-initial-state', () => {
    console.log('Sending initial state to client:', socket.id);
    socket.emit('state-update', appState);
  });
  
  // Update state from client
  socket.on('update-state', (newState) => {
    // Get the client's update tracking data
    const clientData = clientUpdates.get(socket.id);
    const now = Date.now();
    
    // Basic rate limiting - don't process updates too frequently from the same client
    if (now - clientData.lastUpdateTime < 100) { // 100ms minimum between updates
      return;
    }
    
    // Generate a hash of the state to check if it's a duplicate
    const stateHash = JSON.stringify(newState);
    if (stateHash === clientData.lastUpdateHash) {
      return; // Skip duplicate updates
    }
    
    // Update the client's tracking data
    clientData.lastUpdateTime = now;
    clientData.lastUpdateHash = stateHash;
    
    try {
      // Validate new state has required properties
      if (!newState || 
          !Array.isArray(newState.items) || 
          !Array.isArray(newState.folders) ||
          !Array.isArray(newState.itemOrder) ||
          !Array.isArray(newState.folderOrder)) {
        throw new Error('Invalid state format');
      }
      
      console.log(`State update from ${socket.id}: ${newState.items.length} items, ${newState.folders.length} folders`);
      
      appState = newState;
      
      // Broadcast to all other clients
      socket.broadcast.emit('state-update', appState);
      
      // Save state to file (throttled)
      throttledSaveState();
    } catch (error) {
      console.error(`Error processing state update:`, error);
      socket.emit('error', { message: 'Invalid state data' });
    }
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected (${socket.id}): ${reason}`);
    clients.delete(socket.id);
    clientUpdates.delete(socket.id);
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
  
  // Give some time for the save to complete before exiting
  setTimeout(() => {
    process.exit(0);
  }, 500);
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open your browser to http://localhost:${PORT} to view the app`);
  console.log(`Connected clients: ${clients.size}`);
});

// Log any unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Save state before potential crash
  saveState();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
