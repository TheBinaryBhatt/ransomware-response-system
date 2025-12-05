// ============================================
// useWebSocket Hook - WebSocket Connection Manager
// ============================================

import { useEffect, useCallback, useRef } from 'react';
import { websocketService } from '../services/websocket';
import type { WebSocketEventType } from '../types';

interface UseWebSocketOptions {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: any) => void;
    autoConnect?: boolean;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
    const { onConnect, onDisconnect, autoConnect = true } = options;
    const isConnectedRef = useRef(false);

    // Connect on mount if autoConnect is true
    useEffect(() => {
        if (autoConnect && !isConnectedRef.current) {
            websocketService.connect();
            isConnectedRef.current = true;

            if (onConnect) {
                onConnect();
            }
        }

        // Cleanup on unmount
        return () => {
            if (isConnectedRef.current) {
                websocketService.disconnect();
                isConnectedRef.current = false;

                if (onDisconnect) {
                    onDisconnect();
                }
            }
        };
    }, [autoConnect, onConnect, onDisconnect]);

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

    return {
        on,
        off,
        emit,
        joinRoom,
        leaveRoom,
        isConnected,
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
