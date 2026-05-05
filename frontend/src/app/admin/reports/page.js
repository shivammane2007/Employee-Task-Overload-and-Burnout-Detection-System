'use client';

<<<<<<< HEAD
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
import { reportsAPI } from '@/lib/api';

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

export default function AdminReportsPage() {
    const [loading, setLoading] = useState(true);
    const [workloadReport, setWorkloadReport] = useState(null);
    const [burnoutReport, setBurnoutReport] = useState(null);
    const [taskReport, setTaskReport] = useState(null);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const [workloadRes, burnoutRes, taskRes] = await Promise.all([
                    reportsAPI.getWorkloadReport(30),
                    reportsAPI.getBurnoutReport(),
                    reportsAPI.getTaskReport('month')
                ]);

                if (workloadRes.success) setWorkloadReport(workloadRes.data);
                if (burnoutRes.success) setBurnoutReport(burnoutRes.data);
                if (taskRes.success) setTaskReport(taskRes.data);
            } catch (error) {
                console.error('Error fetching reports:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
                <div className="spinner"></div>
            </div>
        );
    }

    // Chart Data Preparation
    const workloadTrendData = {
        labels: workloadReport?.dailyTrend?.map(d =>
            new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ) || [],
        datasets: [
            {
                label: 'Avg Workload',
                data: workloadReport?.dailyTrend?.map(d => d.avgScore) || [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    };

    const riskDistributionData = {
        labels: ['Low Risk', 'Medium Risk', 'High Risk'],
        datasets: [{
            data: [
                workloadReport?.currentDistribution?.low?.count || 0,
                workloadReport?.currentDistribution?.medium?.count || 0,
                workloadReport?.currentDistribution?.high?.count || 0
            ],
            backgroundColor: [
                'rgb(16, 185, 129)',
                'rgb(245, 158, 11)',
                'rgb(239, 68, 68)'
            ]
        }]
    };

    const priorityData = {
        labels: taskReport?.byPriority?.map(p => p.priority) || [],
        datasets: [{
            data: taskReport?.byPriority?.map(p => p.total) || [],
            backgroundColor: [
                'rgb(239, 68, 68)',
                'rgb(245, 158, 11)',
                'rgb(59, 130, 246)'
            ]
        }]
    };
    
    const burnoutTrendData = {
        labels: burnoutReport?.trend?.map(d => 
            new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ) || [],
        datasets: [
            {
                label: 'High Risk %',
                data: burnoutReport?.trend?.map(d => d.percentage) || [],
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    };

=======
export default function AdminReportsPage() {
>>>>>>> 886ef1d9b39e16d77f35cc5693beb1684b91f17d
    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Organization Reports</h1>
                <p className="page-subtitle">View system-wide workload and performance analytics</p>
            </div>

<<<<<<< HEAD
            {/* Quick Stats */}
            <div className="grid grid-cols-4 mb-xl">
                <div className="card stat-card">
                    <div className="stat-icon primary">📋</div>
                    <div className="stat-content">
                        <div className="stat-value">{taskReport?.summary?.total || 0}</div>
                        <div className="stat-label">Total Tasks (Month)</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon success">✅</div>
                    <div className="stat-content">
                        <div className="stat-value">{taskReport?.summary?.completionRate || 0}%</div>
                        <div className="stat-label">Completion Rate</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon warning">⚠️</div>
                    <div className="stat-content">
                        <div className="stat-value">{taskReport?.summary?.overdue || 0}</div>
                        <div className="stat-label">Overdue Tasks</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon danger">🔥</div>
                    <div className="stat-content">
                        <div className="stat-value">{burnoutReport?.atRiskEmployees?.length || 0}</div>
                        <div className="stat-label">At-Risk Employees</div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-lg mb-xl">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Workload Trend (30 Days)</h3>
                    </div>
                    <div className="card-body">
                        <div className="chart-container">
                            <Line
                                data={workloadTrendData}
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
                
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Burnout Risk Trend (% High Risk)</h3>
                    </div>
                    <div className="card-body">
                        <div className="chart-container">
                            <Line
                                data={burnoutTrendData}
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
            </div>

            <div className="grid grid-cols-2 gap-lg mb-xl">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Current Risk Distribution</h3>
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

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Task Priority Distribution</h3>
                    </div>
                    <div className="card-body">
                        <div className="chart-container-sm">
                            <Doughnut
                                data={priorityData}
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
            </div>

            {/* At Risk Employees Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">High Risk Employees</h3>
                </div>
                <div className="card-body">
                    {burnoutReport?.atRiskEmployees?.length > 0 ? (
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Department</th>
                                        <th>Risk Score</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {burnoutReport.atRiskEmployees.map(emp => (
                                        <tr key={emp.employeeId}>
                                            <td>
                                                <div className="font-medium">{emp.name}</div>
                                                <div className="text-sm text-muted">{emp.email}</div>
                                            </td>
                                            <td>{emp.department || 'N/A'}</td>
                                            <td>
                                                <span className="badge badge-danger">
                                                    {emp.currentScore} - High Risk
                                                </span>
                                            </td>
                                            <td>
                                                <a href={`/admin/users?highlight=${emp.employeeId}`} className="btn btn-sm btn-secondary">
                                                    View Profile
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center text-muted py-md">
                            No employees are currently at high risk.
                        </div>
                    )}
                </div>
=======
            <div className="card text-center" style={{ padding: '4rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                <h3 className="mb-sm">Organization Reports functionality coming soon</h3>
                <p className="text-muted">
                    This section will provide system-wide analytics, department comparisons, and long-term burnout risk trends.
                </p>
>>>>>>> 886ef1d9b39e16d77f35cc5693beb1684b91f17d
            </div>
        </div>
    );
}
