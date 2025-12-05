// ============================================
// NOTIFICATION CENTER - Toast Notifications
// ============================================

import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const NotificationCenter: React.FC = () => {
    const { notifications, removeNotification } = useNotification();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-20 right-6 z-50 space-y-3 max-w-md">
            {notifications.map((notification) => (
                <Notification
                    key={notification.id}
                    notification={notification}
                    onClose={() => removeNotification(notification.id)}
                />
            ))}
        </div>
    );
};

interface NotificationProps {
    notification: {
        id: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    };
    onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
    const { type, message } = notification;

    const config = {
        success: {
            icon: CheckCircle,
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/30',
            textColor: 'text-green-400',
            iconColor: 'text-green-500',
        },
        error: {
            icon: XCircle,
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/30',
            textColor: 'text-red-400',
            iconColor: 'text-red-500',
        },
        warning: {
            icon: AlertTriangle,
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/30',
            textColor: 'text-amber-400',
            iconColor: 'text-amber-500',
        },
        info: {
            icon: Info,
            bgColor: 'bg-cyan-500/10',
            borderColor: 'border-cyan-500/30',
            textColor: 'text-cyan-400',
            iconColor: 'text-cyan-500',
        },
    };

    const { icon: Icon, bgColor, borderColor, textColor, iconColor } = config[type];

    return (
        <div
            className={`${bgColor} ${borderColor} border rounded-lg p-4 shadow-lg backdrop-blur-sm animate-slide-in-right flex items-start gap-3`}
            style={{
                animation: 'slideInRight 0.3s ease-out',
            }}
        >
            <Icon className={`${iconColor} flex-shrink-0 mt-0.5`} size={20} />
            <p className={`${textColor} text-sm flex-1`}>{message}</p>
            <button
                onClick={onClose}
                className={`${textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
                aria-label="Close notification"
            >
                <X size={18} />
            </button>

            <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
        </div>
    );
};

export default NotificationCenter;
