import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const { isAuthenticated } = useAuth();

    const refreshUnreadCount = useCallback(async () => {
        if (!isAuthenticated) {
            setUnreadCount(0);
            return;
        }
        try {
            const res = await api.get('/notifications/unread-count');
            setUnreadCount(res.data.count);
        } catch (e) {
            console.error(e);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refreshUnreadCount();
        const interval = setInterval(refreshUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [refreshUnreadCount]);

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
    return context;
};
