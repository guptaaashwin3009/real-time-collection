
import { io, Socket } from 'socket.io-client';
import { AppState } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (this.socket) return;
    
    this.socket = io('http://localhost:3001');
    
    this.socket.on('state-update', (state: AppState) => {
      this.emit('state-update', state);
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socket?.emit('get-initial-state');
    });
  }

  updateState(state: AppState) {
    if (!this.socket) return;
    this.socket.emit('update-state', state);
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners.has(event)) return;
    
    const callbackIndex = this.listeners.get(event)?.indexOf(callback);
    if (callbackIndex !== undefined && callbackIndex > -1) {
      this.listeners.get(event)?.splice(callbackIndex, 1);
    }
  }

  private emit(event: string, data: any) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event)?.forEach(callback => {
      callback(data);
    });
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();
