'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function EmployeeLayout({ children }) {
    const router = useRouter();
    const { user, loading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated()) {
                router.push('/login');
            } else if (user && user.role !== 'employee') {
                // Redirect to correct dashboard
                router.push(`/${user.role}`);
            }
        }
    }, [loading, user, isAuthenticated, router]);

    if (loading || !user || user.role !== 'employee') {
        return (
            <div className="auth-page">
                <div className="spinner"></div>
            </div>
        );
    }

    return <DashboardLayout>{children}</DashboardLayout>;
}
