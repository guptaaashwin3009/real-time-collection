import { io, Socket } from 'socket.io-client';
import { AppState } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  connect() {
    if (this.socket || this.isConnecting) return;
    
    this.isConnecting = true;
    console.log('Attempting to connect to WebSocket server...');
    
    // Clear any existing reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? `http://${window.location.hostname}:3001`
      : window.location.origin;
    
    console.log(`Connecting to socket server at: ${serverUrl}`);
    
    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket', 'polling']
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server with ID:', this.socket?.id);
      this.isConnecting = false;
      this.emit('connect', null);
      this.socket?.emit('get-initial-state');
      
      // Setup heartbeat to keep connection alive
      this.setupHeartbeat();
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnecting = false;
      this.emit('connection_error', error);
      
      // Try to reconnect after a delay
      this.scheduleReconnect();
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.emit('disconnect', reason);
      
      // Clean up heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      // Try to reconnect if not already reconnecting
      if (!this.isConnecting) {
        this.scheduleReconnect();
      }
    });
    
    this.socket.on('state-update', (state: AppState) => {
      console.log('Received state update from server');
      this.emit('state-update', state);
    });
    
    this.socket.on('pong', () => {
      console.log('Received heartbeat response from server');
    });
  }

  private setupHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        console.log('Sending heartbeat to server');
        this.socket.emit('ping');
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    console.log('Scheduling reconnection attempt in 3 seconds...');
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.socket?.close();
      this.socket = null;
      this.connect();
    }, 3000);
  }

  updateState(state: AppState) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot update state: Socket not connected. Will try to connect...');
      // Store state locally until connected
      localStorage.setItem('collectionAppPendingState', JSON.stringify(state));
      this.connect();
      return;
    }
    
    console.log('Emitting update-state event to server');
    this.socket.emit('update-state', state);
    
    // Also save to local storage as backup
    localStorage.setItem('collectionAppState', JSON.stringify(state));
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
    
    // If we're adding a connect listener and we're already connected, call it immediately
    if (event === 'connect' && this.socket?.connected) {
      callback();
    }
  }

  off(event: string, callback: Function) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks?.indexOf(callback);
    if (index !== undefined && index > -1) {
      callbacks?.splice(index, 1);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in "${event}" event handler:`, error);
      }
    });
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (!this.socket) return;
    console.log('Disconnecting socket');
    this.socket.disconnect();
    this.socket = null;
    this.isConnecting = false;
  }

  get connected() {
    return !!this.socket?.connected;
  }

  // Force reconnection attempt
  reconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.connect();
  }
}

export const socketService = new SocketService();
