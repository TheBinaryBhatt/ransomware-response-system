import { useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

export const useWebSocket = (url: string) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Create socket connection
    socketRef.current = io(url, {
      transports: ['websocket'],
    });

    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket server');
      socketRef.current?.emit('join_room', 'soc_analysts');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [url]);

  // Function to emit events
  const emitEvent = useCallback(<T,>(event: string, data: T) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Function to listen to events
  const onEvent = useCallback(<T,>(event: string, callback: (data: T) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      
      // Return cleanup function
      return () => {
        if (socketRef.current) {
          socketRef.current.off(event, callback);
        }
      };
    }
  }, []);

  return { emitEvent, onEvent };
};