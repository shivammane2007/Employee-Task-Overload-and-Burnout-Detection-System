'use client';

import { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { useAuth } from '@/context/AuthContext';
import { reportsAPI, workloadAPI, tasksAPI } from '@/lib/api';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

/**
 * Employee Dashboard Page
 */
export default function EmployeeDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [workloadData, setWorkloadData] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [workloadHistory, setWorkloadHistory] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashboardRes, workloadRes, tasksRes, historyRes] = await Promise.all([
                    reportsAPI.getDashboard(),
                    workloadAPI.getScore(),
                    tasksAPI.getAll({ status: 'pending,in_progress', limit: 5 }),
                    workloadAPI.getHistory(14)
                ]);

                if (dashboardRes.success) setDashboardData(dashboardRes.data);
                if (workloadRes.success) setWorkloadData(workloadRes.data);
                if (tasksRes.success) setTasks(tasksRes.data || []);
                if (historyRes.success) setWorkloadHistory(historyRes.data || []);
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

    // Prepare chart data
    const workloadChartData = {
        labels: workloadHistory.map(h => new Date(h.calculated_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })),
        datasets: [
            {
                label: 'Workload Score',
                data: workloadHistory.map(h => h.score),
                fill: true,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }
        ]
    };

    const taskStatusChartData = {
        labels: ['Completed', 'In Progress', 'Pending', 'Overdue'],
        datasets: [
            {
                data: [
                    dashboardData?.tasks?.completed || 0,
                    dashboardData?.tasks?.in_progress || 0,
                    dashboardData?.tasks?.pending || 0,
                    dashboardData?.tasks?.overdue || 0
                ],
                backgroundColor: [
                    'rgb(16, 185, 129)',
                    'rgb(59, 130, 246)',
                    'rgb(156, 163, 175)',
                    'rgb(239, 68, 68)'
                ]
            }
        ]
    };

    const getRiskBadge = (level) => {
        const classes = {
            low: 'badge-risk-low',
            medium: 'badge-risk-medium',
            high: 'badge-risk-high'
        };
        return classes[level] || 'badge-gray';
    };

    const getPriorityBadge = (priority) => {
        const classes = {
            high: 'badge-priority-high',
            medium: 'badge-priority-medium',
            low: 'badge-priority-low'
        };
        return classes[priority] || 'badge-gray';
    };

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}!</h1>
                <p className="page-subtitle">Here&apos;s an overview of your workload and tasks</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 mb-xl">
                <div className="card stat-card">
                    <div className="stat-icon primary">📋</div>
                    <div className="stat-content">
                        <div className="stat-value">{dashboardData?.tasks?.total || 0}</div>
                        <div className="stat-label">Total Tasks</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon success">✅</div>
                    <div className="stat-content">
                        <div className="stat-value">{dashboardData?.tasks?.completed || 0}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon warning">⏰</div>
                    <div className="stat-content">
                        <div className="stat-value">{dashboardData?.tasks?.due_soon || 0}</div>
                        <div className="stat-label">Due Soon</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon danger">⚠️</div>
                    <div className="stat-content">
                        <div className="stat-value">{dashboardData?.tasks?.overdue || 0}</div>
                        <div className="stat-label">Overdue</div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-xl)' }}>
                {/* Left Column */}
                <div className="flex flex-col gap-lg">
                    {/* Workload Score Card */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Current Workload</h3>
                            <span className={`badge ${getRiskBadge(workloadData?.riskLevel || dashboardData?.workload?.risk_level || 'low')}`}>
                                {workloadData?.riskLevel || dashboardData?.workload?.risk_level || 'Low'} Risk
                            </span>
                        </div>
                        <div className="card-body">
                            <div className="flex items-center gap-lg mb-lg">
                                <div style={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: '50%',
                                    background: `conic-gradient(
                                        ${(workloadData?.score || dashboardData?.workload?.score || 0) > 70 ? 'var(--danger-500)' :
                                            (workloadData?.score || dashboardData?.workload?.score || 0) > 40 ? 'var(--warning-500)' : 'var(--success-500)'} 
                                        ${(workloadData?.score || dashboardData?.workload?.score || 0) * 3.6}deg, 
                                        var(--gray-200) 0
                                    )`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <div style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        background: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'column'
                                    }}>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                            {Math.round(workloadData?.score || dashboardData?.workload?.score || 0)}
                                        </span>
                                        <span className="text-xs text-muted">/100</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="score-meter">
                                        <div
                                            className="score-indicator"
                                            style={{ left: `${workloadData?.score || dashboardData?.workload?.score || 0}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-sm text-xs text-muted">
                                        <span>Low</span>
                                        <span>Medium</span>
                                        <span>High</span>
                                    </div>
                                </div>
                            </div>

                            {workloadData?.breakdown && (
                                <div className="grid grid-cols-2 gap-md">
                                    <div style={{ padding: 'var(--spacing-md)', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                                        <div className="text-sm text-secondary">Task Load</div>
                                        <div className="font-semibold">{Math.round(workloadData.breakdown.taskLoad || 0)}%</div>
                                    </div>
                                    <div style={{ padding: 'var(--spacing-md)', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                                        <div className="text-sm text-secondary">Priority Score</div>
                                        <div className="font-semibold">{Math.round(workloadData.breakdown.priorityScore || 0)}%</div>
                                    </div>
                                    <div style={{ padding: 'var(--spacing-md)', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                                        <div className="text-sm text-secondary">Deadline Pressure</div>
                                        <div className="font-semibold">{Math.round(workloadData.breakdown.deadlineScore || 0)}%</div>
                                    </div>
                                    <div style={{ padding: 'var(--spacing-md)', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                                        <div className="text-sm text-secondary">Hours Load</div>
                                        <div className="font-semibold">{Math.round(workloadData.breakdown.hoursLoad || 0)}%</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Workload History Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Workload Trend (Last 14 Days)</h3>
                        </div>
                        <div className="card-body">
                            <div className="chart-container">
                                <Line
                                    data={workloadChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false }
                                        },
                                        scales: {
                                            y: {
                                                min: 0,
                                                max: 100,
                                                grid: { color: 'rgba(0,0,0,0.05)' }
                                            },
                                            x: {
                                                grid: { display: false }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-lg">
                    {/* Task Status Breakdown */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Task Breakdown</h3>
                        </div>
                        <div className="card-body">
                            <div className="chart-container-sm">
                                <Doughnut
                                    data={taskStatusChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: 'bottom',
                                                labels: {
                                                    usePointStyle: true,
                                                    padding: 15
                                                }
                                            }
                                        },
                                        cutout: '60%'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Tasks */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Upcoming Tasks</h3>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {tasks.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">🎉</div>
                                    <div className="empty-title">All caught up!</div>
                                    <div className="empty-description">No pending tasks</div>
                                </div>
                            ) : (
                                <div>
                                    {tasks.slice(0, 5).map((task) => (
                                        <div
                                            key={task.id}
                                            style={{
                                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                                borderBottom: '1px solid var(--border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div className="font-medium text-sm">{task.title}</div>
                                                <div className="text-xs text-muted">
                                                    Due: {new Date(task.deadline).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <span className={`badge ${getPriorityBadge(task.priority)}`}>
                                                {task.priority}
                                            </span>
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
