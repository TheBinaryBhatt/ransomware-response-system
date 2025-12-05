// ============================================
// WEBSOCKET SERVICE - Socket.IO Client
// ============================================

import { io, Socket } from 'socket.io-client';
import { WS_URL, WS_EVENTS } from '../utils/constants';
import type { WebSocketEventType } from '../types';

class WebSocketService {
    private socket: Socket | null = null;
    private connected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();

    connect(): void {
        if (this.socket?.connected) {
            console.log('[WebSocket] Already connected');
            return;
        }

        console.log('[WebSocket] Connecting to', WS_URL);

        this.socket = io(WS_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        // Connection events
        this.socket.on('connect', () => {
            console.log('[WebSocket] Connected');
            this.connected = true;
            this.reconnectAttempts = 0;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[WebSocket] Disconnected:', reason);
            this.connected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('[WebSocket] Connection error:', error);
            this.reconnectAttempts++;

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('[WebSocket] Max reconnection attempts reached');
            }
        });

        // Subscribe to all predefined events
        this.setupEventListeners();
    }

    disconnect(): void {
        if (this.socket) {
            console.log('[WebSocket] Disconnecting');
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
            this.eventHandlers.clear();
        }
    }

    isConnected(): boolean {
        return this.connected;
    }

    private setupEventListeners(): void {
        if (!this.socket) return;

        // Listen to all standard events
        Object.values(WS_EVENTS).forEach((event) => {
            this.socket!.on(event, (data: any) => {
                console.log(`[WebSocket] Event received: ${event}`, data);
                this.notifyHandlers(event, data);
            });
        });

        // Generic event listener for any custom events
        this.socket.on('message', (data: any) => {
            console.log('[WebSocket] Message received:', data);
            this.notifyHandlers('message', data);
        });
    }

    private notifyHandlers(event: string, data: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`[WebSocket] Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    // Subscribe to a specific event
    on(event: WebSocketEventType | string, handler: (data: any) => void): () => void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }

        this.eventHandlers.get(event)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.off(event, handler);
        };
    }

    // Unsubscribe from an event
    off(event: string, handler: (data: any) => void): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.eventHandlers.delete(event);
            }
        }
    }

    // Emit an event to the server
    emit(event: string, data: any): void {
        if (!this.socket) {
            console.error('[WebSocket] Cannot emit, not connected');
            return;
        }

        this.socket.emit(event, data);
    }

    // Join a specific room
    joinRoom(room: string): void {
        if (!this.socket) {
            console.error('[WebSocket] Cannot join room, not connected');
            return;
        }

        console.log(`[WebSocket] Joining room: ${room}`);
        this.socket.emit('join_room', room);
    }

    // Leave a specific room
    leaveRoom(room: string): void {
        if (!this.socket) {
            console.error('[WebSocket] Cannot leave room, not connected');
            return;
        }

        console.log(`[WebSocket] Leaving room: ${room}`);
        this.socket.emit('leave_room', room);
    }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
