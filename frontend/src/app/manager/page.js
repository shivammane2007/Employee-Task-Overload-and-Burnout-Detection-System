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
import { useAuth } from '@/context/AuthContext';
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
 * Manager Dashboard Page
 */
export default function ManagerDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [teamWorkload, setTeamWorkload] = useState(null);
    const [workloadReport, setWorkloadReport] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashboardRes, teamRes, reportRes] = await Promise.all([
                    reportsAPI.getDashboard(),
                    workloadAPI.getTeamWorkload(),
                    reportsAPI.getWorkloadReport(14)
                ]);

                if (dashboardRes.success) setDashboardData(dashboardRes.data);
                if (teamRes.success) setTeamWorkload(teamRes.data);
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

    const getRiskBadge = (level) => ({
        low: 'badge-risk-low',
        medium: 'badge-risk-medium',
        high: 'badge-risk-high'
    }[level] || 'badge-gray');

    // Team risk distribution chart
    const riskDistributionData = {
        labels: ['Low Risk', 'Medium Risk', 'High Risk'],
        datasets: [{
            data: [
                teamWorkload?.riskDistribution?.low || 0,
                teamWorkload?.riskDistribution?.medium || 0,
                teamWorkload?.riskDistribution?.high || 0
            ],
            backgroundColor: [
                'rgb(16, 185, 129)',
                'rgb(245, 158, 11)',
                'rgb(239, 68, 68)'
            ]
        }]
    };

    // Workload trend chart
    const trendChartData = {
        labels: workloadReport?.dailyTrend?.map(d =>
            new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
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

    // Risk count by day chart
    const riskByDayData = {
        labels: workloadReport?.dailyTrend?.map(d =>
            new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
        ) || [],
        datasets: [
            {
                label: 'High Risk',
                data: workloadReport?.dailyTrend?.map(d => d.highRisk) || [],
                backgroundColor: 'rgb(239, 68, 68)',
            },
            {
                label: 'Medium Risk',
                data: workloadReport?.dailyTrend?.map(d => d.mediumRisk) || [],
                backgroundColor: 'rgb(245, 158, 11)',
            }
        ]
    };

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">Team Dashboard</h1>
                <p className="page-subtitle">Monitor your team&apos;s workload and wellbeing</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 mb-xl">
                <div className="card stat-card">
                    <div className="stat-icon primary">👥</div>
                    <div className="stat-content">
                        <div className="stat-value">{dashboardData?.team?.team_size || 0}</div>
                        <div className="stat-label">Team Members</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon danger">⚠️</div>
                    <div className="stat-content">
                        <div className="stat-value">{dashboardData?.team?.high_risk || 0}</div>
                        <div className="stat-label">High Risk</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon warning">📊</div>
                    <div className="stat-content">
                        <div className="stat-value">{dashboardData?.team?.medium_risk || 0}</div>
                        <div className="stat-label">Medium Risk</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon success">📋</div>
                    <div className="stat-content">
                        <div className="stat-value">{Math.round(dashboardData?.team?.avg_workload || 0)}</div>
                        <div className="stat-label">Avg Workload</div>
                    </div>
                </div>
            </div>

            {/* Alert Banner for High Risk */}
            {(dashboardData?.team?.high_risk || 0) > 0 && (
                <div className="alert alert-danger mb-xl">
                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                    <div>
                        <strong>{dashboardData.team.high_risk} team member(s) at high burnout risk!</strong>
                        <p className="text-sm mt-xs">Review their workload and consider redistributing tasks.</p>
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
                            <h3 className="card-title">Team Workload Trend (14 Days)</h3>
                        </div>
                        <div className="card-body">
                            <div className="chart-container">
                                <Line
                                    data={trendChartData}
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

                    {/* Risk Count by Day */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">At-Risk Employees by Day</h3>
                        </div>
                        <div className="card-body">
                            <div className="chart-container">
                                <Bar
                                    data={riskByDayData}
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
                    {/* Risk Distribution */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Team Risk Distribution</h3>
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

                    {/* Team Members at Risk */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Team Members</h3>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {(!teamWorkload?.members || teamWorkload.members.length === 0) ? (
                                <div className="empty-state">
                                    <div className="empty-icon">👥</div>
                                    <div className="empty-title">No team members</div>
                                    <div className="empty-description">
                                        No employees assigned to your team yet
                                    </div>
                                </div>
                            ) : (
                                <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                                    {teamWorkload.members
                                        .sort((a, b) => (b.workloadScore || 0) - (a.workloadScore || 0))
                                        .map((member) => (
                                            <div
                                                key={member.id}
                                                style={{
                                                    padding: 'var(--spacing-md) var(--spacing-lg)',
                                                    borderBottom: '1px solid var(--border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}
                                            >
                                                <div>
                                                    <div className="font-medium">{member.name}</div>
                                                    <div className="text-xs text-muted">{member.department}</div>
                                                </div>
                                                <div className="flex items-center gap-sm">
                                                    <span className="text-sm font-semibold">
                                                        {Math.round(member.workloadScore || 0)}
                                                    </span>
                                                    <span className={`badge ${getRiskBadge(member.riskLevel)}`}>
                                                        {member.riskLevel || 'low'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
