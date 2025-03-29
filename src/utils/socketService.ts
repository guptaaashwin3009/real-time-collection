
import { io, Socket } from 'socket.io-client';
import { AppState } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private isConnecting: boolean = false;

  connect() {
    if (this.socket || this.isConnecting) return;
    
    this.isConnecting = true;
    console.log('Attempting to connect to WebSocket server...');
    
    this.socket = io('http://localhost:3001', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnecting = false;
      this.emit('connect', null);
      this.socket?.emit('get-initial-state');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnecting = false;
      this.emit('connection_error', error);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.emit('disconnect', reason);
    });
    
    this.socket.on('state-update', (state: AppState) => {
      console.log('Received state update from server');
      this.emit('state-update', state);
    });
  }

  updateState(state: AppState) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot update state: Socket not connected');
      return;
    }
    
    console.log('Emitting update-state event to server');
    this.socket.emit('update-state', state);
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
    if (!this.socket) return;
    console.log('Disconnecting socket');
    this.socket.disconnect();
    this.socket = null;
    this.isConnecting = false;
  }

  get connected() {
    return !!this.socket?.connected;
  }
}

export const socketService = new SocketService();
