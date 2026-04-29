'use client';

import { useState, useEffect } from 'react';
import { reportsAPI } from '@/lib/api';

export default function ManagerReportsPage() {
    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Team Reports</h1>
                <p className="page-subtitle">View detailed analytics about your team's performance</p>
            </div>

            <div className="card text-center" style={{ padding: '4rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
                <h3 className="mb-sm">Reports functionality coming soon</h3>
                <p className="text-muted">
                    This section will include detailed workload history, task completion analytics, and burnout trend predictions.
                </p>
            </div>
        </div>
    );
}
