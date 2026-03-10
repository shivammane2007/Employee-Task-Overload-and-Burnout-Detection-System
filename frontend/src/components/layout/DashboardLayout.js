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
                    <h1>SEAPM</h1>
                    <span>Burnout Detection System</span>
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
                <header className="dashboard-header">
                    <div className="flex items-center gap-md">
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            style={{ display: 'none' }} // Show on mobile with media query
                        >
                            ☰
                        </button>
                        <div>
                            <div className="font-semibold">{user.name}</div>
                            <div className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>
                                {user.role} {user.department && `• ${user.department}`}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-md">
                        {/* Original Alerts Button (optional to keep side by side or comment out, but let's replace it with the new comprehensive notification bell) */}
                        <NotificationBell />

                        {/* User Menu */}
                        <div className="flex items-center gap-sm">
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    background: 'var(--primary-100)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 600,
                                    color: 'var(--primary-700)'
                                }}
                            >
                                {user.name.charAt(0).toUpperCase()}
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
