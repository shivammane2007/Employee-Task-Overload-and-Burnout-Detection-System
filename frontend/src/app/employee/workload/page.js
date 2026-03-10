'use client';

import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { workloadAPI } from '@/lib/api';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

/**
 * Employee Workload Analysis Page
 */
export default function EmployeeWorkloadPage() {
    const [loading, setLoading] = useState(true);
    const [workload, setWorkload] = useState(null);
    const [burnout, setBurnout] = useState(null);
    const [history, setHistory] = useState([]);
    const [calculating, setCalculating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [workloadRes, burnoutRes, historyRes] = await Promise.all([
                workloadAPI.getScore(),
                workloadAPI.getBurnoutAssessment(),
                workloadAPI.getHistory(30)
            ]);

            if (workloadRes.success) setWorkload(workloadRes.data);
            if (burnoutRes.success) setBurnout(burnoutRes.data);
            if (historyRes.success) setHistory(historyRes.data || []);
        } catch (error) {
            console.error('Error fetching workload data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculate = async () => {
        try {
            setCalculating(true);
            const response = await workloadAPI.calculate();
            if (response.success) {
                setWorkload(response.data.workload);
                setBurnout(response.data.burnoutAssessment);
            }
        } catch (error) {
            console.error('Error calculating workload:', error);
        } finally {
            setCalculating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
                <div className="spinner"></div>
            </div>
        );
    }

    const chartData = {
        labels: history.map(h => new Date(h.calculated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [
            {
                label: 'Workload Score',
                data: history.map(h => h.score),
                fill: true,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }
        ]
    };

    const getRiskColor = (level) => ({
        low: 'var(--success-500)',
        medium: 'var(--warning-500)',
        high: 'var(--danger-500)'
    }[level] || 'var(--gray-500)');

    const getRiskBadge = (level) => ({
        low: 'badge-risk-low',
        medium: 'badge-risk-medium',
        high: 'badge-risk-high'
    }[level] || 'badge-gray');

    return (
        <div>
            {/* Page Header */}
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1 className="page-title">Workload Analysis</h1>
                    <p className="page-subtitle">Monitor your workload and burnout risk</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleRecalculate}
                    disabled={calculating}
                >
                    {calculating ? (
                        <>
                            <span className="spinner" style={{ width: 16, height: 16 }}></span>
                            Calculating...
                        </>
                    ) : (
                        '🔄 Recalculate'
                    )}
                </button>
            </div>

            {/* Main Score Card */}
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)' }}>
                {/* Current Workload */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Current Workload Score</h3>
                        <span className={`badge ${getRiskBadge(workload?.riskLevel || 'low')}`}>
                            {workload?.riskLevel || 'Low'} Risk
                        </span>
                    </div>
                    <div className="card-body">
                        <div className="flex items-center gap-xl mb-xl">
                            <div style={{
                                width: 140,
                                height: 140,
                                borderRadius: '50%',
                                background: `conic-gradient(${getRiskColor(workload?.riskLevel)} ${(workload?.score || 0) * 3.6}deg, var(--gray-200) 0)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <div style={{
                                    width: 110,
                                    height: 110,
                                    borderRadius: '50%',
                                    background: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column'
                                }}>
                                    <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>
                                        {Math.round(workload?.score || 0)}
                                    </span>
                                    <span className="text-muted">/ 100</span>
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 className="mb-md">Score Breakdown</h4>
                                <div className="grid gap-sm">
                                    {workload?.breakdown && Object.entries(workload.breakdown).map(([key, value]) => (
                                        <div key={key} className="flex items-center gap-sm">
                                            <span className="text-sm" style={{ width: 120, textTransform: 'capitalize' }}>
                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                            <div className="progress" style={{ flex: 1, height: 6 }}>
                                                <div
                                                    className="progress-bar"
                                                    style={{
                                                        width: `${value}%`,
                                                        background: value > 70 ? 'var(--danger-500)' :
                                                            value > 40 ? 'var(--warning-500)' : 'var(--success-500)'
                                                    }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium" style={{ width: 40, textAlign: 'right' }}>
                                                {Math.round(value)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Burnout Risk */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Burnout Risk Assessment</h3>
                        <span className={`badge ${getRiskBadge(burnout?.riskLevel || 'low')}`}>
                            {burnout?.riskLevel || 'Low'} Risk
                        </span>
                    </div>
                    <div className="card-body">
                        <div className="mb-lg">
                            <div className="text-sm text-muted mb-sm">Risk Score</div>
                            <div className="flex items-center gap-md">
                                <div style={{
                                    fontSize: '2.5rem',
                                    fontWeight: 700,
                                    color: getRiskColor(burnout?.riskLevel)
                                }}>
                                    {Math.round(burnout?.riskScore || 0)}%
                                </div>
                                <div className="score-meter" style={{ flex: 1 }}>
                                    <div
                                        className="score-indicator"
                                        style={{ left: `${burnout?.riskScore || 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {burnout?.factors && Object.keys(burnout.factors).length > 0 && (
                            <div className="mb-lg">
                                <div className="text-sm font-medium mb-sm">Risk Factors</div>
                                <div className="grid gap-xs">
                                    {Object.entries(burnout.factors).map(([key, value]) => (
                                        <div
                                            key={key}
                                            style={{
                                                padding: 'var(--spacing-sm)',
                                                background: value > 0 ? 'var(--warning-50)' : 'var(--gray-50)',
                                                borderRadius: 'var(--radius)',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            <span style={{ textTransform: 'capitalize' }}>
                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                            <span className="font-semibold" style={{ float: 'right' }}>
                                                {value > 0 ? `+${value}` : value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {burnout?.recommendations && burnout.recommendations.length > 0 && (
                            <div>
                                <div className="text-sm font-medium mb-sm">Recommendations</div>
                                <div className="grid gap-xs">
                                    {burnout.recommendations.map((rec, idx) => (
                                        <div
                                            key={idx}
                                            className="alert alert-info"
                                            style={{ padding: 'var(--spacing-sm)' }}
                                        >
                                            <div className="flex items-center gap-sm">
                                                <span>💡</span>
                                                <div>
                                                    <strong>{typeof rec === 'object' ? rec.title : rec}</strong>
                                                    {typeof rec === 'object' && rec.description && (
                                                        <p className="text-sm text-muted mt-xs">{rec.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Chart */}
            <div className="card mt-xl">
                <div className="card-header">
                    <h3 className="card-title">30-Day Workload History</h3>
                </div>
                <div className="card-body">
                    <div className="chart-container-lg">
                        <Line
                            data={chartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => `Score: ${context.parsed.y}`
                                        }
                                    }
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

            {/* Info Cards */}
            <div className="grid grid-cols-3 mt-xl gap-lg">
                <div className="card">
                    <div className="card-body">
                        <div className="text-3xl mb-sm">📊</div>
                        <h4 className="mb-xs">What is Workload Score?</h4>
                        <p className="text-sm text-secondary">
                            Your workload score (0-100) is calculated based on task count, priority levels,
                            deadline proximity, and estimated hours.
                        </p>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body">
                        <div className="text-3xl mb-sm">⚡</div>
                        <h4 className="mb-xs">Burnout Detection</h4>
                        <p className="text-sm text-secondary">
                            We analyze patterns like consecutive high-workload days, deadline clustering,
                            and workload trends to assess burnout risk.
                        </p>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body">
                        <div className="text-3xl mb-sm">🔔</div>
                        <h4 className="mb-xs">Stay Informed</h4>
                        <p className="text-sm text-secondary">
                            You&apos;ll receive alerts when your workload is high or burnout risk increases.
                            Your manager will also be notified.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
