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
import { workloadAPI, tasksAPI } from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/** Safe date label — avoids UTC timezone shift for YYYY-MM-DD strings */
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const date = new Date(+y, +m - 1, +d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const RISK_CONFIG = {
    low:    { color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7', emoji: '✅', label: 'Low Risk', text: 'Your workload is healthy and manageable.' },
    medium: { color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', emoji: '⚠️', label: 'Medium Risk', text: 'Workload is elevated. Monitor closely.' },
    high:   { color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', emoji: '🔥', label: 'High Risk', text: 'Workload is critical. Action recommended.' },
};
const getRisk = (level) => RISK_CONFIG[level] || RISK_CONFIG.low;

/** Animated counter */
function AnimatedNumber({ value, duration = 1000 }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const start = Date.now();
        const end = value;
        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [value, duration]);
    return display;
}

/** Radial gauge component */
function RadialGauge({ score, riskLevel }) {
    const risk = getRisk(riskLevel);
    const pct = Math.round(score || 0);
    const r = 54;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;

    return (
        <div style={{ position: 'relative', width: 148, height: 148, flexShrink: 0 }}>
            <svg width="148" height="148" viewBox="0 0 148 148">
                {/* Track */}
                <circle cx="74" cy="74" r={r} fill="none" stroke="var(--gray-100)" strokeWidth="12" />
                {/* Progress */}
                <circle
                    cx="74" cy="74" r={r}
                    fill="none"
                    stroke={risk.color}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ - dash}`}
                    strokeDashoffset={circ / 4}
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
            }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: risk.color, lineHeight: 1 }}>
                    <AnimatedNumber value={pct} />
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ 100</span>
            </div>
        </div>
    );
}

/** Score breakdown bar */
function BreakdownBar({ label, value }) {
    const color = value > 70 ? '#ef4444' : value > 40 ? '#f59e0b' : '#10b981';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: 130, flexShrink: 0, textTransform: 'capitalize' }}>
                {label.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <div style={{ flex: 1, height: 8, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${Math.round(value)}%`,
                    background: color, borderRadius: 99,
                    transition: 'width 1s ease',
                }} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color, width: 38, textAlign: 'right' }}>
                {Math.round(value)}%
            </span>
        </div>
    );
}

export default function EmployeeWorkloadPage() {
    const [loading, setLoading] = useState(true);
    const [workload, setWorkload] = useState(null);
    const [burnout, setBurnout] = useState(null);
    const [history, setHistory] = useState([]);
    const [taskStats, setTaskStats] = useState(null);
    const [calculating, setCalculating] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [workloadRes, burnoutRes, historyRes] = await Promise.all([
                workloadAPI.getScore(),
                workloadAPI.getBurnoutAssessment(),
                workloadAPI.getHistory(30),
            ]);
            if (workloadRes.success) setWorkload(workloadRes.data);
            if (burnoutRes.success) setBurnout(burnoutRes.data);
            if (historyRes.success) setHistory(historyRes.data || []);

            // Task summary — separate call so failures don't block the main data
            try {
                const tasksRes = await tasksAPI.getSummary();
                if (tasksRes.success) setTaskStats(tasksRes.data);
            } catch {
                // Summary is optional — page still works without it
            }

            setLastUpdated(new Date());
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
                setLastUpdated(new Date());
                await fetchData(); // Refresh history too
            }
        } catch (error) {
            console.error('Error calculating workload:', error);
        } finally {
            setCalculating(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: '1rem' }}>
                <div className="spinner" />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading your workload data...</p>
            </div>
        );
    }

    const risk = getRisk(workload?.riskLevel);
    const burnoutRisk = getRisk(burnout?.riskLevel);
    const score = Math.round(workload?.score || 0);

    // Chart data — FIX: parse YYYY-MM-DD safely without UTC shift
    const chartLabels = history.map(h => formatDate(h.calculated_date));
    const chartScores = history.map(h => h.score);
    const avgScore = chartScores.length ? Math.round(chartScores.reduce((a, b) => a + b, 0) / chartScores.length) : 0;
    const trend = chartScores.length >= 2
        ? chartScores[chartScores.length - 1] - chartScores[chartScores.length - 2]
        : 0;

    const chartData = {
        labels: chartLabels,
        datasets: [{
            label: 'Workload Score',
            data: chartScores,
            fill: true,
            borderColor: '#6366f1',
            backgroundColor: (ctx) => {
                const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
                gradient.addColorStop(0, 'rgba(99,102,241,0.25)');
                gradient.addColorStop(1, 'rgba(99,102,241,0.0)');
                return gradient;
            },
            borderWidth: 2.5,
            tension: 0.4,
            pointBackgroundColor: '#6366f1',
            pointRadius: 4,
            pointHoverRadius: 7,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#0f172a',
                titleColor: '#fff',
                bodyColor: '#94a3b8',
                padding: 12,
                cornerRadius: 10,
                callbacks: {
                    label: (ctx) => `Score: ${ctx.parsed.y}`,
                    afterLabel: (ctx) => {
                        const v = ctx.parsed.y;
                        return v > 70 ? '🔥 High Risk' : v > 40 ? '⚠️ Medium Risk' : '✅ Low Risk';
                    }
                }
            }
        },
        scales: {
            y: {
                min: 0, max: 100,
                grid: { color: 'rgba(0,0,0,0.04)' },
                ticks: { color: 'var(--text-muted)', font: { size: 11 } },
            },
            x: {
                grid: { display: false },
                ticks: { color: 'var(--text-muted)', font: { size: 11 } },
            }
        }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="page-title">Workload Analysis</h1>
                    <p className="page-subtitle">
                        Real-time burnout risk and task load monitoring
                        {lastUpdated && (
                            <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                · Last updated {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleRecalculate}
                    disabled={calculating}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    {calculating ? (
                        <><span className="spinner" style={{ width: 16, height: 16 }} /> Calculating...</>
                    ) : (
                        <><span>🔄</span> Recalculate</>
                    )}
                </button>
            </div>

            {/* Risk Status Banner */}
            <div style={{
                background: risk.bg,
                border: `1px solid ${risk.border}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
            }}>
                <span style={{ fontSize: '1.75rem' }}>{risk.emoji}</span>
                <div>
                    <div style={{ fontWeight: 700, color: risk.color, fontSize: '0.95rem' }}>{risk.label}</div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{risk.text}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>30-Day Average</div>
                    <div style={{ fontWeight: 700, color: risk.color, fontSize: '1.1rem' }}>{avgScore}/100</div>
                </div>
                <div style={{ textAlign: 'right', paddingLeft: '1rem', borderLeft: `1px solid ${risk.border}` }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trend</div>
                    <div style={{ fontWeight: 700, color: trend > 0 ? '#ef4444' : trend < 0 ? '#10b981' : 'var(--text-secondary)', fontSize: '1.1rem' }}>
                        {trend > 0 ? `↑ +${trend}` : trend < 0 ? `↓ ${trend}` : '→ Stable'}
                    </div>
                </div>
            </div>

            {/* Quick Task Stats */}
            {taskStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Total Tasks', value: taskStats.total || 0, icon: '📋', color: '#6366f1' },
                        { label: 'In Progress', value: taskStats.in_progress || 0, icon: '⚡', color: '#f59e0b' },
                        { label: 'Completed', value: taskStats.completed || 0, icon: '✅', color: '#10b981' },
                        { label: 'Overdue', value: taskStats.overdue || 0, icon: '🚨', color: '#ef4444' },
                    ].map(stat => (
                        <div key={stat.label} className="card" style={{ overflow: 'visible' }}>
                            <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: '0.75rem',
                                    background: `${stat.color}18`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.25rem', flexShrink: 0,
                                }}>
                                    {stat.icon}
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.625rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                                        <AnimatedNumber value={stat.value} />
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Score + Burnout Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                {/* Workload Score Card */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Current Workload Score</h3>
                        <span style={{
                            padding: '0.25rem 0.75rem', borderRadius: 999,
                            background: risk.bg, color: risk.color,
                            fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${risk.border}`
                        }}>
                            {risk.emoji} {risk.label}
                        </span>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
                            <RadialGauge score={workload?.score} riskLevel={workload?.riskLevel} />
                            <div style={{ flex: 1 }}>
                                <h4 style={{ marginBottom: '0.875rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    Score Breakdown
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                    {workload?.breakdown
                                        ? Object.entries(workload.breakdown).map(([k, v]) => (
                                            <BreakdownBar key={k} label={k} value={v} />
                                        ))
                                        : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No breakdown data yet.</p>
                                    }
                                </div>
                            </div>
                        </div>
                        <div style={{
                            padding: '0.875rem 1rem', borderRadius: 'var(--radius)',
                            background: 'var(--gray-50)', border: '1px solid var(--gray-100)',
                            fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6,
                        }}>
                            💡 Score is calculated from task volume, priority weights, deadline proximity, and estimated hours.
                        </div>
                    </div>
                </div>

                {/* Burnout Assessment Card */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Burnout Risk Assessment</h3>
                        <span style={{
                            padding: '0.25rem 0.75rem', borderRadius: 999,
                            background: burnoutRisk.bg, color: burnoutRisk.color,
                            fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${burnoutRisk.border}`
                        }}>
                            {burnoutRisk.emoji} {burnoutRisk.label}
                        </span>
                    </div>
                    <div className="card-body">
                        {/* Risk Score Meter */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Burnout Risk Score</span>
                                <span style={{ fontWeight: 700, color: burnoutRisk.color, fontSize: '1rem' }}>
                                    <AnimatedNumber value={Math.round(burnout?.riskScore || 0)} />%
                                </span>
                            </div>
                            <div style={{ height: 10, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                                {/* Zone markers */}
                                <div style={{ position: 'absolute', left: '40%', top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.1)', zIndex: 1 }} />
                                <div style={{ position: 'absolute', left: '70%', top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.1)', zIndex: 1 }} />
                                <div style={{
                                    height: '100%', borderRadius: 99,
                                    width: `${burnout?.riskScore || 0}%`,
                                    background: `linear-gradient(90deg, #10b981, #f59e0b 40%, #ef4444 70%)`,
                                    transition: 'width 1s ease',
                                }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                                <span style={{ fontSize: '0.65rem', color: '#10b981' }}>Low</span>
                                <span style={{ fontSize: '0.65rem', color: '#f59e0b' }}>Medium</span>
                                <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>High</span>
                            </div>
                        </div>

                        {/* Risk Factors */}
                        {burnout?.factors && Object.keys(burnout.factors).length > 0 && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    Contributing Factors
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    {Object.entries(burnout.factors).map(([key, value]) => (
                                        <div key={key} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: 'var(--radius-sm)',
                                            background: value > 0 ? '#fffbeb' : 'var(--gray-50)',
                                            border: `1px solid ${value > 0 ? '#fcd34d' : 'var(--gray-100)'}`,
                                        }}>
                                            <span style={{ fontSize: '0.8rem', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                                                {value > 0 ? '⚠️ ' : '✓ '}{key.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: value > 0 ? '#f59e0b' : '#10b981' }}>
                                                {value > 0 ? `+${value}` : value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        {burnout?.recommendations && burnout.recommendations.length > 0 && (
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    💡 Recommendations
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    {burnout.recommendations.map((rec, idx) => (
                                        <div key={idx} style={{
                                            padding: '0.625rem 0.875rem',
                                            background: 'var(--primary-50)',
                                            border: '1px solid var(--primary-100)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '0.8rem',
                                        }}>
                                            <div style={{ fontWeight: 600, color: 'var(--primary-700)', marginBottom: typeof rec === 'object' && rec.description ? '0.2rem' : 0 }}>
                                                {typeof rec === 'object' ? rec.title : rec}
                                            </div>
                                            {typeof rec === 'object' && rec.description && (
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{rec.description}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Chart */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 className="card-title">30-Day Workload History</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {history.length} data points · Avg: {avgScore}/100
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[
                            { color: '#10b981', label: 'Low (0–40)' },
                            { color: '#f59e0b', label: 'Medium (40–70)' },
                            { color: '#ef4444', label: 'High (70+)' },
                        ].map(z => (
                            <span key={z.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: z.color, display: 'inline-block' }} />
                                {z.label}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="card-body">
                    {history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📈</div>
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No history yet</div>
                            <div style={{ fontSize: '0.85rem' }}>Click Recalculate to start tracking your workload</div>
                        </div>
                    ) : (
                        <div style={{ height: 260 }}>
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    )}
                </div>
            </div>

            {/* Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[
                    {
                        icon: '📊', title: 'Workload Score',
                        body: 'Calculated from task count, priority levels, deadline proximity, and estimated hours. Range: 0–100.',
                        color: '#6366f1',
                    },
                    {
                        icon: '⚡', title: 'Burnout Detection',
                        body: 'Analyzes consecutive high-workload days, deadline clustering, and trends to predict burnout risk.',
                        color: '#f59e0b',
                    },
                    {
                        icon: '🔔', title: 'Alerts & Notifications',
                        body: 'Receive alerts when risk is high. Your manager is also notified to redistribute tasks as needed.',
                        color: '#10b981',
                    },
                ].map(card => (
                    <div key={card.title} className="card">
                        <div style={{ padding: '1.25rem' }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: '0.75rem',
                                background: `${card.color}18`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.3rem', marginBottom: '0.875rem',
                            }}>
                                {card.icon}
                            </div>
                            <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.925rem' }}>{card.title}</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{card.body}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
