'use client';

import { useState, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { reportsAPI, workloadAPI } from '@/lib/api';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

/**
 * Admin Dashboard Page
 */
export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [orgStats, setOrgStats] = useState(null);
    const [workloadReport, setWorkloadReport] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashboardRes, orgRes, reportRes] = await Promise.all([
                    reportsAPI.getDashboard(),
                    workloadAPI.getOrganizationStats(),
                    reportsAPI.getWorkloadReport(30)
                ]);

                if (dashboardRes.success) setDashboardData(dashboardRes.data);
                if (orgRes.success) setOrgStats(orgRes.data);
                if (reportRes.success) setWorkloadReport(reportRes.data);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
                <div className="spinner"></div>
            </div>
        );
    }

    // Prepare charts
    const userDistributionData = {
        labels: ['Employees', 'Managers', 'Inactive'],
        datasets: [{
            data: [
                dashboardData?.users?.employees || 0,
                dashboardData?.users?.managers || 0,
                dashboardData?.users?.inactive || 0
            ],
            backgroundColor: [
                'rgb(59, 130, 246)',
                'rgb(16, 185, 129)',
                'rgb(156, 163, 175)'
            ]
        }]
    };

    const riskDistributionData = {
        labels: ['Low Risk', 'Medium Risk', 'High Risk'],
        datasets: [{
            data: [
                dashboardData?.workload?.low_risk || 0,
                dashboardData?.workload?.medium_risk || 0,
                dashboardData?.workload?.high_risk || 0
            ],
            backgroundColor: [
                'rgb(16, 185, 129)',
                'rgb(245, 158, 11)',
                'rgb(239, 68, 68)'
            ]
        }]
    };

    const departmentData = {
        labels: orgStats?.departmentBreakdown?.map(d => d.department || 'Unassigned') || [],
        datasets: [
            {
                label: 'Avg Workload',
                data: orgStats?.departmentBreakdown?.map(d => parseFloat(d.avg_score) || 0) || [],
                backgroundColor: 'rgba(59, 130, 246, 0.8)'
            },
            {
                label: 'High Risk Count',
                data: orgStats?.departmentBreakdown?.map(d => d.high_risk || 0) || [],
                backgroundColor: 'rgba(239, 68, 68, 0.8)'
            }
        ]
    };

    const trendData = {
        labels: workloadReport?.dailyTrend?.map(d =>
            new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ) || [],
        datasets: [
            {
                label: 'Avg Workload',
                data: workloadReport?.dailyTrend?.map(d => d.avgScore) || [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    };

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">Admin Dashboard</h1>
                <p className="page-subtitle">Organization-wide overview and analytics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 mb-xl">
                <div className="card stat-card">
                    <div className="stat-icon primary">👥</div>
                    <div className="stat-content">
                        <div className="stat-value">{dashboardData?.users?.total || 0}</div>
                        <div className="stat-label">Total Users</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon danger">🔥</div>
                    <div className="stat-content">
                        <div className="stat-value">{dashboardData?.workload?.high_risk || 0}</div>
                        <div className="stat-label">High Risk Employees</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon warning">⚡</div>
                    <div className="stat-content">
                        <div className="stat-value">{dashboardData?.workload?.medium_risk || 0}</div>
                        <div className="stat-label">Medium Risk</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon success">📊</div>
                    <div className="stat-content">
                        <div className="stat-value">{Math.round(dashboardData?.workload?.avg_score || 0)}</div>
                        <div className="stat-label">Avg Workload Score</div>
                    </div>
                </div>
            </div>

            {/* Alert for High Risk */}
            {(dashboardData?.workload?.high_risk || 0) > 0 && (
                <div className="alert alert-danger mb-xl">
                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                    <div>
                        <strong>{dashboardData.workload.high_risk} employees are at high burnout risk!</strong>
                        <p className="text-sm mt-xs">Immediate attention required. Review workload distribution across teams.</p>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-xl)' }}>
                {/* Left Column */}
                <div className="flex flex-col gap-lg">
                    {/* Workload Trend */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Organization Workload Trend (30 Days)</h3>
                        </div>
                        <div className="card-body">
                            <div className="chart-container">
                                <Line
                                    data={trendData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.05)' } },
                                            x: { grid: { display: false } }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Department Breakdown */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Department Analysis</h3>
                        </div>
                        <div className="card-body">
                            <div className="chart-container">
                                <Bar
                                    data={departmentData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'bottom' } },
                                        scales: {
                                            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                                            x: { grid: { display: false } }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-lg">
                    {/* User Distribution */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">User Distribution</h3>
                        </div>
                        <div className="card-body">
                            <div className="chart-container-sm">
                                <Doughnut
                                    data={userDistributionData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { position: 'bottom', labels: { usePointStyle: true } }
                                        },
                                        cutout: '60%'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Risk Distribution */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Risk Distribution</h3>
                        </div>
                        <div className="card-body">
                            <div className="chart-container-sm">
                                <Doughnut
                                    data={riskDistributionData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { position: 'bottom', labels: { usePointStyle: true } }
                                        },
                                        cutout: '60%'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Quick Actions</h3>
                        </div>
                        <div className="card-body">
                            <div className="grid gap-sm">
                                <a href="/admin/users" className="btn btn-secondary" style={{ textAlign: 'left' }}>
                                    👥 Manage Users
                                </a>
                                <a href="/admin/reports" className="btn btn-secondary" style={{ textAlign: 'left' }}>
                                    📊 View Reports
                                </a>
                                <a href="/admin/settings" className="btn btn-secondary" style={{ textAlign: 'left' }}>
                                    ⚙️ System Settings
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
