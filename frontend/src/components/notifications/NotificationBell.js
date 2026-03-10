'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../lib/api';
import NotificationDropdown from './NotificationDropdown';

export default function NotificationBell() {
    const { user } = useAuth();
    const { socket, isConnected } = useSocket();
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fetch initial notifications
    const fetchNotifications = async () => {
        try {
            const countRes = await notificationsAPI.getUnreadCount();
            if (countRes.success) {
                setUnreadCount(countRes.data.unreadCount);
            }

            const notifsRes = await notificationsAPI.getAll(user.id, { limit: 10 });
            if (notifsRes.success) {
                setNotifications(notifsRes.data);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    // Handle real-time socket events
    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (notification) => {
            // Add new notification to top of list
            setNotifications(prev => [notification, ...prev].slice(0, 20)); // keep last 20

            // Increment unread count
            setUnreadCount(prev => prev + 1);

            // Play a subtle sound (optional, could be added later)
        };

        socket.on('newNotification', handleNewNotification);

        return () => {
            socket.off('newNotification', handleNewNotification);
        };
    }, [socket]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleMarkAsRead = async (id) => {
        try {
            const res = await notificationsAPI.markAsRead(id);
            if (res.success) {
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const res = await notificationsAPI.markAllAsRead();
            if (res.success) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="View notifications"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>

                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <NotificationDropdown
                    notifications={notifications}
                    onMarkRead={handleMarkAsRead}
                    onMarkAllRead={handleMarkAllRead}
                    unreadCount={unreadCount}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
