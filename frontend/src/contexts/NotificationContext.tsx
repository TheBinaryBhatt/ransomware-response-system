// ============================================
// NOTIFICATION CONTEXT - Toast Notifications
// ============================================

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { generateId } from '../utils/helpers';
import { NOTIFICATION_DURATION } from '../utils/constants';
import type { Notification } from '../types';

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (message: string, type: Notification['type'], duration?: number) => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
    children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback(
        (message: string, type: Notification['type'], duration?: number) => {
            const id = generateId();
            const defaultDuration = NOTIFICATION_DURATION[type.toUpperCase() as keyof typeof NOTIFICATION_DURATION];

            const notification: Notification = {
                id,
                message,
                type,
                duration: duration !== undefined ? duration : defaultDuration,
                timestamp: new Date().toISOString(),
            };

            setNotifications((prev) => [...prev, notification]);

            // Auto-remove after duration
            if (notification.duration && notification.duration > 0) {
                setTimeout(() => {
                    removeNotification(id);
                }, notification.duration);
            }
        },
        []
    );

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const value: NotificationContextType = {
        notifications,
        addNotification,
        removeNotification,
        clearAll,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export default NotificationContext;
