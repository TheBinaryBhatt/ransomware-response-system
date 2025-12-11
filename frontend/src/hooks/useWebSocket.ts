// ============================================
// useWebSocket Hook - WebSocket Connection Manager
// ============================================

import { useEffect, useCallback, useRef } from 'react';
import { websocketService } from '../services/websocket';
import type { WebSocketEventType } from '../types';

// Track if we've already connected at the app level
let hasConnected = false;

interface UseWebSocketOptions {
    onConnect?: () => void;
    onDisconnect?: () => void;
    autoConnect?: boolean;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
    const { autoConnect = true } = options;
    const mountedRef = useRef(false);

    // Connect only once across the entire app lifecycle
    useEffect(() => {
        if (autoConnect && !hasConnected) {
            console.log('[useWebSocket] Establishing persistent connection');
            websocketService.connect();
            hasConnected = true;
        }
        mountedRef.current = true;

        // Do NOT disconnect on unmount - keep connection persistent
        return () => {
            mountedRef.current = false;
            // Intentionally NOT calling websocketService.disconnect()
            // The connection should persist across component lifecycles
        };
    }, [autoConnect]);

    // Subscribe to an event
    const on = useCallback((event: WebSocketEventType | string, handler: (data: any) => void) => {
        return websocketService.on(event, handler);
    }, []);

    // Unsubscribe from an event
    const off = useCallback((event: string, handler: (data: any) => void) => {
        websocketService.off(event, handler);
    }, []);

    // Emit an event
    const emit = useCallback((event: string, data: any) => {
        websocketService.emit(event, data);
    }, []);

    // Join a room
    const joinRoom = useCallback((room: string) => {
        websocketService.joinRoom(room);
    }, []);

    // Leave a room
    const leaveRoom = useCallback((room: string) => {
        websocketService.leaveRoom(room);
    }, []);

    // Check connection status
    const isConnected = useCallback(() => {
        return websocketService.isConnected();
    }, []);

    // Force reconnect (useful for auth changes)
    const reconnect = useCallback(() => {
        websocketService.disconnect();
        hasConnected = false;
        setTimeout(() => {
            websocketService.connect();
            hasConnected = true;
        }, 100);
    }, []);

    return {
        on,
        off,
        emit,
        joinRoom,
        leaveRoom,
        isConnected,
        reconnect,
    };
};

// Hook for specific event subscriptions
export const useWebSocketEvent = (
    event: WebSocketEventType | string,
    handler: (data: any) => void,
    deps: React.DependencyList = []
) => {
    useEffect(() => {
        const unsubscribe = websocketService.on(event, handler);

        return () => {
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event, ...deps]);
};

export default useWebSocket;

