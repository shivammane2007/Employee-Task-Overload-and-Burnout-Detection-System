'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { alertsAPI } from '@/lib/api';
import NotificationBell from '../notifications/NotificationBell';

/**
 * Dashboard Layout Component
 * Provides sidebar navigation and header for dashboard pages
 */
export default function DashboardLayout({ children }) {
    const pathname = usePathname();
    const { user, logout, loading } = useAuth();
    const [unreadAlerts, setUnreadAlerts] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Fetch unread alerts count
    useEffect(() => {
        const fetchAlertCount = async () => {
            try {
                const response = await alertsAPI.getCount();
                if (response.success) {
                    setUnreadAlerts(response.data.unreadCount);
                }
            } catch (err) {
                console.error('Error fetching alerts:', err);
            }
        };

        if (user) {
            fetchAlertCount();
            // Refresh every 30 seconds
            const interval = setInterval(fetchAlertCount, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    if (loading) {
        return (
            <div className="auth-page">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect in page component
    }

    // Get navigation items based on user role
    const getNavItems = () => {
        const baseItems = [
            {
                section: 'Main',
                items: []
            }
        ];

        if (user.role === 'employee') {
            baseItems[0].items = [
                { href: '/employee', label: 'Dashboard', icon: '📊' },
                { href: '/employee/tasks', label: 'My Tasks', icon: '✅' },
                { href: '/employee/workload', label: 'My Workload', icon: '📈' },
            ];
        } else if (user.role === 'manager') {
            baseItems[0].items = [
                { href: '/manager', label: 'Dashboard', icon: '📊' },
                { href: '/manager/team', label: 'Team Overview', icon: '👥' },
                { href: '/manager/tasks', label: 'Team Tasks', icon: '✅' },
                { href: '/manager/reports', label: 'Reports', icon: '📈' },
            ];
        } else if (user.role === 'admin') {
            baseItems[0].items = [
                { href: '/admin', label: 'Dashboard', icon: '📊' },
                { href: '/admin/users', label: 'User Management', icon: '👥' },
                { href: '/admin/reports', label: 'Organization Reports', icon: '📈' },
                { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
            ];
        }

        return baseItems;
    };

    const navItems = getNavItems();

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">⚡</div>
                    <div>
                        <h1>OverloadX</h1>
                        <span>Burnout Detection</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((section, idx) => (
                        <div key={idx} className="nav-section">
                            <div className="nav-section-title">{section.section}</div>
                            {section.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    ))}

                    <div className="nav-section">
                        <div className="nav-section-title">Account</div>
                        <button
                            className="nav-item"
                            onClick={logout}
                            style={{ width: '100%', textAlign: 'left' }}
                        >
                            <span className="nav-icon">🚪</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main">
                {/* Header */}
                <header className="dashboard-header" style={{ overflow: 'visible', position: 'relative', zIndex: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            style={{ display: 'none' }} // Show on mobile with media query
                        >
                            ☰
                        </button>
                        {/* Greeting */}
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                👋 Welcome back, {user.name.split(' ')[0]}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <NotificationBell />

                        {/* Divider */}
                        <div style={{ width: 1, height: 28, background: 'var(--gray-200)' }} />

                        {/* User Pill */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            padding: '0.375rem 0.75rem 0.375rem 0.375rem',
                            borderRadius: '9999px',
                            border: '1px solid var(--gray-200)',
                            background: 'var(--gray-50)',
                            cursor: 'default',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--primary-50)';
                            e.currentTarget.style.borderColor = 'var(--primary-200)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'var(--gray-50)';
                            e.currentTarget.style.borderColor = 'var(--gray-200)';
                        }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: 30,
                                height: 30,
                                background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                color: '#fff',
                                fontSize: '0.8rem',
                                flexShrink: 0,
                                boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                            }}>
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            {/* Name + Role */}
                            <div style={{ lineHeight: 1.3 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                    {user.name}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                    {user.role}{user.department && ` · ${user.department}`}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="dashboard-content">
                    {children}
                </div>
            </main>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 99
                    }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
