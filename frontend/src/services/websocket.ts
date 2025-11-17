import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    this.socket = io(this.url, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.joinRoom('soc_analysts');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  joinRoom(room: string) {
    if (this.socket) {
      this.socket.emit('join_room', room);
    }
  }

  onEvent<T>(event: string, callback: (data: T) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  emitEvent<T>(event: string, data: T) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

// Create a singleton instance
export const webSocketService = new WebSocketService('http://localhost:8000');