'use client';

import { useState, useEffect, useRef } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { reportsAPI, workloadAPI } from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const formatDate = (str) => {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return new Date(+y, +m - 1, +d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const RISK = {
    low:    { color: '#10b981', bg: '#ecfdf5', label: 'Low' },
    medium: { color: '#f59e0b', bg: '#fffbeb', label: 'Medium' },
    high:   { color: '#ef4444', bg: '#fef2f2', label: 'High' },
};

const StatCard = ({ icon, label, value, sub, color = '#6366f1' }) => (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 1 }}>{sub}</div>}
        </div>
    </div>
);

export default function ManagerReportsPage() {
    const [period, setPeriod] = useState('month');
    const [loading, setLoading] = useState(true);
    const [taskReport, setTaskReport] = useState(null);
    const [teamReport, setTeamReport] = useState(null);
    const [burnoutReport, setBurnoutReport] = useState(null);
    const [workloadReport, setWorkloadReport] = useState(null);
    const [generatedAt, setGeneratedAt] = useState(null);
    const reportRef = useRef(null);

    useEffect(() => { fetchAll(); }, [period]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [t, team, burn, wl] = await Promise.all([
                reportsAPI.getTaskReport(period),
                reportsAPI.getTeamReport(),
                reportsAPI.getBurnoutReport(),
                reportsAPI.getWorkloadReport(period === 'week' ? 7 : period === 'quarter' ? 90 : 30),
            ]);
            if (t.success) setTaskReport(t.data);
            if (team.success) setTeamReport(team.data);
            if (burn.success) setBurnoutReport(burn.data);
            if (wl.success) setWorkloadReport(wl.data);
            setGeneratedAt(new Date());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (typeof window === 'undefined') return;
        const content = reportRef.current;
        const printWin = window.open('', '_blank');
        printWin.document.write(`
            <html><head><title>Team Report — ${new Date().toLocaleDateString()}</title>
            <style>
                body { font-family: sans-serif; padding: 2rem; color: #0f172a; }
                h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
                .meta { color: #64748b; font-size: 0.85rem; margin-bottom: 2rem; }
                table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.85rem; }
                th { background: #f1f5f9; padding: 0.5rem 0.75rem; text-align: left; border: 1px solid #e2e8f0; }
                td { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; }
                .section { margin-bottom: 2rem; }
                .section h2 { font-size: 1rem; margin-bottom: 0.5rem; border-bottom: 2px solid #6366f1; padding-bottom: 0.25rem; }
                .stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem; margin-bottom: 1.5rem; }
                .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; text-align: center; }
                .stat-value { font-size: 1.5rem; font-weight: 800; color: #6366f1; }
                .stat-label { font-size: 0.75rem; color: #64748b; }
                .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
                .badge-low { background: #ecfdf5; color: #059669; }
                .badge-medium { background: #fffbeb; color: #d97706; }
                .badge-high { background: #fef2f2; color: #dc2626; }
            </style></head><body>
            <h1>📊 Team Performance Report</h1>
            <div class="meta">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Period: ${period === 'week' ? 'Last 7 Days' : period === 'quarter' ? 'Last 90 Days' : 'Last 30 Days'}</div>

            <div class="section">
                <h2>Task Summary</h2>
                <div class="stat-grid">
                    <div class="stat"><div class="stat-value">${taskReport?.summary?.total ?? 0}</div><div class="stat-label">Total Tasks</div></div>
                    <div class="stat"><div class="stat-value">${taskReport?.summary?.completed ?? 0}</div><div class="stat-label">Completed</div></div>
                    <div class="stat"><div class="stat-value">${taskReport?.summary?.overdue ?? 0}</div><div class="stat-label">Overdue</div></div>
                    <div class="stat"><div class="stat-value">${Math.round(taskReport?.summary?.completionRate ?? 0)}%</div><div class="stat-label">Completion Rate</div></div>
                </div>
            </div>

            <div class="section">
                <h2>Team Member Performance</h2>
                <table>
                    <thead><tr><th>Name</th><th>Department</th><th>Total Tasks</th><th>Completed</th><th>Overdue</th><th>Workload</th><th>Risk</th></tr></thead>
                    <tbody>${(teamReport?.teamMembers ?? []).map(m => `
                        <tr>
                            <td>${m.name}</td>
                            <td>${m.department || '—'}</td>
                            <td>${m.totalTasks}</td>
                            <td>${m.completedTasks}</td>
                            <td>${m.overdueTasks}</td>
                            <td>${Math.round(m.currentWorkload)}/100</td>
                            <td><span class="badge badge-${m.riskLevel}">${m.riskLevel}</span></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h2>At-Risk Employees</h2>
                ${burnoutReport?.atRiskEmployees?.length
                    ? `<table><thead><tr><th>Name</th><th>Department</th><th>Score</th></tr></thead><tbody>
                        ${burnoutReport.atRiskEmployees.map(e => `<tr><td>${e.name}</td><td>${e.department||'—'}</td><td>${Math.round(e.currentScore)}/100</td></tr>`).join('')}
                       </tbody></table>`
                    : '<p>No high-risk employees at this time.</p>'}
            </div>
            </body></html>`);
        printWin.document.close();
        printWin.print();
    };

    const s = taskReport?.summary;
    const distrib = workloadReport?.currentDistribution;

    const taskBarData = {
        labels: ['Pending', 'In Progress', 'Completed', 'Overdue'],
        datasets: [{
            label: 'Tasks',
            data: [s?.pending ?? 0, s?.inProgress ?? 0, s?.completed ?? 0, s?.overdue ?? 0],
            backgroundColor: ['#94a3b8', '#6366f1', '#10b981', '#ef4444'],
            borderRadius: 6,
        }]
    };

    const priorityData = taskReport?.byPriority ?? [];
    const priorityBarData = {
        labels: priorityData.map(p => p.priority.charAt(0).toUpperCase() + p.priority.slice(1)),
        datasets: [
            { label: 'Total', data: priorityData.map(p => p.total), backgroundColor: 'rgba(99,102,241,0.15)', borderColor: '#6366f1', borderWidth: 2, borderRadius: 6 },
            { label: 'Completed', data: priorityData.map(p => p.completed), backgroundColor: '#10b981', borderRadius: 6 },
        ]
    };

    const riskDonutData = {
        labels: ['Low Risk', 'Medium Risk', 'High Risk'],
        datasets: [{
            data: [distrib?.low?.count ?? 0, distrib?.medium?.count ?? 0, distrib?.high?.count ?? 0],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
            borderWidth: 0,
        }]
    };

    const trendDates = (workloadReport?.dailyTrend ?? []).map(d => formatDate(d.date));
    const trendScores = (workloadReport?.dailyTrend ?? []).map(d => d.avgScore);
    const workloadLineData = {
        labels: trendDates,
        datasets: [{
            label: 'Avg Workload',
            data: trendScores,
            fill: true,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.12)',
            tension: 0.4,
            pointBackgroundColor: '#6366f1',
            pointRadius: 4,
        }]
    };

    const chartOpts = (yMax = 100) => ({
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', padding: 10, cornerRadius: 8 } },
        scales: {
            y: { min: 0, max: yMax, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } }
        }
    });

    return (
        <div ref={reportRef}>
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="page-title">Team Reports</h1>
                    <p className="page-subtitle">
                        Live team analytics · Task completion · Burnout risk
                        {generatedAt && <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>· Updated {generatedAt.toLocaleTimeString()}</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Period selector */}
                    <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: '0.625rem', padding: 4, gap: 4 }}>
                        {[['week','7D'],['month','30D'],['quarter','90D']].map(([val, lbl]) => (
                            <button key={val} onClick={() => setPeriod(val)} style={{
                                padding: '0.35rem 0.875rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                                fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s',
                                background: period === val ? '#fff' : 'transparent',
                                color: period === val ? 'var(--primary-600)' : 'var(--text-muted)',
                                boxShadow: period === val ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                            }}>{lbl}</button>
                        ))}
                    </div>
                    <button onClick={fetchAll} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        🔄 Refresh
                    </button>
                    <button onClick={handleExport} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        📄 Export Report
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: '1rem' }}>
                    <div className="spinner" />
                    <p style={{ color: 'var(--text-muted)' }}>Generating report...</p>
                </div>
            ) : (
                <>
                    {/* Stat Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                        <StatCard icon="📋" label="Total Tasks" value={s?.total ?? 0} color="#6366f1" />
                        <StatCard icon="✅" label="Completed" value={s?.completed ?? 0} sub={`${Math.round(s?.completionRate ?? 0)}% rate`} color="#10b981" />
                        <StatCard icon="⚡" label="In Progress" value={s?.inProgress ?? 0} color="#f59e0b" />
                        <StatCard icon="🚨" label="Overdue" value={s?.overdue ?? 0} color="#ef4444" />
                    </div>

                    {/* Charts Row 1 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* Task Status Chart */}
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Task Status</h3></div>
                            <div className="card-body"><div style={{ height: 220 }}><Bar data={taskBarData} options={chartOpts(Math.max(s?.total ?? 1, 1))} /></div></div>
                        </div>
                        {/* Priority Breakdown */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">By Priority</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {[{c:'#6366f1',l:'Total'},{c:'#10b981',l:'Done'}].map(x=>(
                                        <span key={x.l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.7rem', color:'var(--text-muted)' }}>
                                            <span style={{ width:8, height:8, borderRadius:'50%', background:x.c, display:'inline-block' }}/>{x.l}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="card-body"><div style={{ height: 220 }}><Bar data={priorityBarData} options={{ ...chartOpts(), plugins: { legend: { display: false }, tooltip: { backgroundColor:'#0f172a', padding:10, cornerRadius:8 } } }} /></div></div>
                        </div>
                        {/* Risk Donut */}
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Risk Distribution</h3></div>
                            <div className="card-body">
                                <div style={{ height: 160, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    <Doughnut data={riskDonutData} options={{ responsive:true, maintainAspectRatio:false, plugins: { legend: { position:'bottom', labels:{ boxWidth:10, font:{size:11} } }, tooltip:{ backgroundColor:'#0f172a', padding:10 } }, cutout:'65%' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Workload Trend */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-header">
                            <h3 className="card-title">Team Workload Trend</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{trendDates.length} data points</span>
                        </div>
                        <div className="card-body">
                            {trendDates.length === 0
                                ? <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>No workload history available. Scores will appear after recalculation.</div>
                                : <div style={{ height: 220 }}><Line data={workloadLineData} options={{ ...chartOpts(), plugins:{ legend:{display:false}, tooltip:{backgroundColor:'#0f172a', padding:10, cornerRadius:8} } }} /></div>
                            }
                        </div>
                    </div>

                    {/* Team Member Table */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-header">
                            <h3 className="card-title">👥 Team Member Performance</h3>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom:'2px solid var(--gray-100)' }}>
                                        {['Employee','Department','Tasks','Completed','Overdue','Completion Rate','Workload','Risk'].map(h => (
                                            <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontWeight:600, color:'var(--text-secondary)', fontSize:'0.78rem', textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(teamReport?.teamMembers ?? []).length === 0
                                        ? <tr><td colSpan={8} style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted)' }}>No team data available.</td></tr>
                                        : (teamReport?.teamMembers ?? []).map((m, i) => {
                                            const cRate = m.totalTasks > 0 ? Math.round(m.completedTasks / m.totalTasks * 100) : 0;
                                            const rCfg = RISK[m.riskLevel] || RISK.low;
                                            return (
                                                <tr key={m.id} style={{ borderBottom:'1px solid var(--gray-100)', background: i%2===0?'transparent':'var(--gray-50)' }}>
                                                    <td style={{ padding:'0.75rem 1rem', fontWeight:600, color:'var(--text-primary)' }}>
                                                        <div style={{ display:'flex', alignItems:'center', gap:'0.625rem' }}>
                                                            <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#4338ca)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'0.75rem', flexShrink:0 }}>
                                                                {m.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            {m.name}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding:'0.75rem 1rem', color:'var(--text-secondary)' }}>{m.department || '—'}</td>
                                                    <td style={{ padding:'0.75rem 1rem', fontWeight:600 }}>{m.totalTasks}</td>
                                                    <td style={{ padding:'0.75rem 1rem', color:'#10b981', fontWeight:600 }}>{m.completedTasks}</td>
                                                    <td style={{ padding:'0.75rem 1rem', color: m.overdueTasks > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: m.overdueTasks > 0 ? 700 : 400 }}>{m.overdueTasks}</td>
                                                    <td style={{ padding:'0.75rem 1rem' }}>
                                                        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                                                            <div style={{ flex:1, height:6, background:'var(--gray-100)', borderRadius:99, overflow:'hidden' }}>
                                                                <div style={{ height:'100%', width:`${cRate}%`, background: cRate>=70?'#10b981':cRate>=40?'#f59e0b':'#ef4444', borderRadius:99 }}/>
                                                            </div>
                                                            <span style={{ fontSize:'0.78rem', fontWeight:600, minWidth:32 }}>{cRate}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding:'0.75rem 1rem' }}>
                                                        <span style={{ fontWeight:600, color: m.currentWorkload>70?'#ef4444':m.currentWorkload>40?'#f59e0b':'#10b981' }}>
                                                            {Math.round(m.currentWorkload)}/100
                                                        </span>
                                                    </td>
                                                    <td style={{ padding:'0.75rem 1rem' }}>
                                                        <span style={{ padding:'0.2rem 0.625rem', borderRadius:999, background:rCfg.bg, color:rCfg.color, fontSize:'0.72rem', fontWeight:700 }}>
                                                            {rCfg.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* At-Risk Employees */}
                    {(burnoutReport?.atRiskEmployees ?? []).length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">🔥 High Risk Employees — Action Required</h3>
                                <span style={{ padding:'0.2rem 0.75rem', borderRadius:999, background:'#fef2f2', color:'#dc2626', fontSize:'0.75rem', fontWeight:700 }}>
                                    {burnoutReport.atRiskEmployees.length} at risk
                                </span>
                            </div>
                            <div className="card-body" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'1rem' }}>
                                {burnoutReport.atRiskEmployees.map(e => (
                                    <div key={e.employeeId} style={{ padding:'1rem', border:'1px solid #fca5a5', borderRadius:'var(--radius)', background:'#fef2f2' }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', marginBottom:'0.5rem' }}>
                                            <div style={{ width:34, height:34, borderRadius:'50%', background:'#ef4444', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'0.85rem', flexShrink:0 }}>
                                                {e.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight:700, fontSize:'0.875rem', color:'#7f1d1d' }}>{e.name}</div>
                                                <div style={{ fontSize:'0.72rem', color:'#b91c1c' }}>{e.department || e.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                                            <div style={{ flex:1, height:7, background:'#fecaca', borderRadius:99, overflow:'hidden' }}>
                                                <div style={{ height:'100%', width:`${Math.round(e.currentScore)}%`, background:'#ef4444', borderRadius:99 }}/>
                                            </div>
                                            <span style={{ fontWeight:700, color:'#dc2626', fontSize:'0.85rem' }}>{Math.round(e.currentScore)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
