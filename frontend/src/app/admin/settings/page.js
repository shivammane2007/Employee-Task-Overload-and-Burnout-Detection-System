'use client';

export default function AdminSettingsPage() {
    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">System Settings</h1>
                <p className="page-subtitle">Configure application algorithms and thresholds</p>
            </div>

            <div className="card text-center" style={{ padding: '4rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
                <h3 className="mb-sm">Settings functionality coming soon</h3>
                <p className="text-muted">
                    This section will allow admins to configure workload algorithm weights, burnout risk thresholds, and notification preferences.
                </p>
            </div>
        </div>
    );
}
