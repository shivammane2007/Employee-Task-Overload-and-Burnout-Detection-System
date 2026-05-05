'use client';

import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
    TASK_ASSIGNED: { icon: '📝', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: 'Task Assigned' },
    TASK_UPDATED:  { icon: '🔄', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Task Updated'  },
    TASK_COMPLETED:{ icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Completed'     },
    TASK_OVERDUE:  { icon: '⚠️', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Overdue'       },
    default:       { icon: '🔔', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: 'Notification'  },
};

export default function NotificationDropdown({ notifications, onMarkRead, onMarkAllRead, unreadCount, onClose }) {
    const getConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.default;

    return (
        <div style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 380,
            background: 'var(--surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            zIndex: 9999,
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.05) 100%)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>🔔</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        Notifications
                    </span>
                    {unreadCount > 0 && (
                        <span style={{
                            background: '#ef4444',
                            color: '#fff',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0 6px',
                            lineHeight: '18px',
                            minWidth: 18,
                            textAlign: 'center',
                        }}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {unreadCount > 0 && (
                        <button
                            onClick={onMarkAllRead}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '0.75rem',
                                color: 'var(--primary-600)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => e.target.style.background = 'rgba(99,102,241,0.08)'}
                            onMouseLeave={e => e.target.style.background = 'none'}
                        >
                            Mark all read
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            fontSize: '1rem',
                            transition: 'background 0.2s, color 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-100)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        aria-label="Close notifications"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Notification List */}
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                    <div style={{
                        padding: '3rem 1.5rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔕</div>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                            All caught up!
                        </div>
                        <div style={{ fontSize: '0.8rem' }}>No notifications yet</div>
                    </div>
                ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        {notifications.map((notification) => {
                            const cfg = getConfig(notification.type);
                            return (
                                <li
                                    key={notification.id}
                                    onClick={() => { if (!notification.is_read) onMarkRead(notification.id); }}
                                    style={{
                                        display: 'flex',
                                        gap: '0.75rem',
                                        padding: '0.875rem 1.25rem',
                                        borderBottom: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        background: notification.is_read ? 'transparent' : 'rgba(99,102,241,0.04)',
                                        transition: 'background 0.15s',
                                        position: 'relative',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                    onMouseLeave={e => e.currentTarget.style.background = notification.is_read ? 'transparent' : 'rgba(99,102,241,0.04)'}
                                >
                                    {/* Icon bubble */}
                                    <div style={{
                                        flexShrink: 0,
                                        width: 38,
                                        height: 38,
                                        borderRadius: '50%',
                                        background: cfg.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1rem',
                                        marginTop: 2,
                                    }}>
                                        {cfg.icon}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontSize: '0.825rem',
                                            fontWeight: notification.is_read ? 400 : 600,
                                            color: 'var(--text-primary)',
                                            marginBottom: '0.25rem',
                                            lineHeight: 1.4,
                                        }}>
                                            {notification.message}
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                From: <strong>{notification.sender_name}</strong>
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Unread dot */}
                                    {!notification.is_read && (
                                        <div style={{
                                            position: 'absolute',
                                            left: 6,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: '#6366f1',
                                        }} />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div style={{
                    padding: '0.75rem 1.25rem',
                    borderTop: '1px solid var(--border-color)',
                    textAlign: 'center',
                    background: 'var(--gray-50)',
                }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Showing latest {notifications.length} notifications
                    </span>
                </div>
            )}
        </div>
    );
}
