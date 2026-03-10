'use client';

import { formatDistanceToNow } from 'date-fns';

export default function NotificationDropdown({ notifications, onMarkRead, onMarkAllRead, unreadCount, onClose }) {

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'TASK_ASSIGNED':
                return '📝';
            case 'TASK_UPDATED':
                return '🔄';
            case 'TASK_COMPLETED':
                return '✅';
            case 'TASK_OVERDUE':
                return '⚠️';
            default:
                return '🔔';
        }
    };

    return (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-100 ring-1 ring-black ring-opacity-5">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                {unreadCount > 0 && (
                    <button
                        onClick={onMarkAllRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-center text-gray-500">
                        No notifications yet
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                            <li
                                key={notification.id}
                                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${notification.is_read ? 'opacity-70 bg-white' : 'bg-blue-50/30'}`}
                                onClick={() => {
                                    if (!notification.is_read) onMarkRead(notification.id);
                                    // Optional: onClose(); or router.push('/tasks/' + notification.task_id)
                                }}
                            >
                                <div className="flex space-x-3">
                                    <div className="flex-shrink-0 text-xl mt-1">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-800 font-medium">
                                            {notification.message}
                                        </p>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-xs text-gray-500 truncate">
                                                From: {notification.sender_name}
                                            </p>
                                            <p className="text-xs text-gray-400 whitespace-nowrap">
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                    {!notification.is_read && (
                                        <div className="flex-shrink-0 self-center">
                                            <span className="h-2 w-2 bg-blue-600 rounded-full inline-block"></span>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-center">
                    <button
                        onClick={onClose}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}
