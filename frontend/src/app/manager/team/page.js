'use client';

import { useState, useEffect } from 'react';
import { workloadAPI, usersAPI, tasksAPI } from '@/lib/api';

/**
 * Manager Team Overview Page
 */
export default function ManagerTeamPage() {
    const [loading, setLoading] = useState(true);
    const [teamData, setTeamData] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [memberWorkload, setMemberWorkload] = useState(null);
    const [memberTasks, setMemberTasks] = useState([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchTeamData();
    }, []);

    const fetchTeamData = async () => {
        try {
            setLoading(true);
            const response = await workloadAPI.getTeamWorkload();
            if (response.success) {
                setTeamData(response.data);
            }
        } catch (error) {
            console.error('Error fetching team data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewMember = async (member) => {
        setSelectedMember(member);
        setShowModal(true);

        try {
            const [workloadRes, tasksRes] = await Promise.all([
                workloadAPI.getUserScore(member.id),
                tasksAPI.getAll({ employee_id: member.id, limit: 10 })
            ]);

            if (workloadRes.success) setMemberWorkload(workloadRes.data.workload);
            if (tasksRes.success) setMemberTasks(tasksRes.data || []);
        } catch (error) {
            console.error('Error fetching member details:', error);
        }
    };

    const getRiskBadge = (level) => ({
        low: 'badge-risk-low',
        medium: 'badge-risk-medium',
        high: 'badge-risk-high'
    }[level] || 'badge-gray');

    const getRiskColor = (level) => ({
        low: 'var(--success-500)',
        medium: 'var(--warning-500)',
        high: 'var(--danger-500)'
    }[level] || 'var(--gray-500)');

    const getPriorityBadge = (priority) => ({
        high: 'badge-priority-high',
        medium: 'badge-priority-medium',
        low: 'badge-priority-low'
    }[priority] || 'badge-gray');

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">Team Overview</h1>
                <p className="page-subtitle">View and manage your team members&apos; workload</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 mb-xl">
                <div className="card stat-card">
                    <div className="stat-icon primary">👥</div>
                    <div className="stat-content">
                        <div className="stat-value">{teamData?.members?.length || 0}</div>
                        <div className="stat-label">Total Members</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon success">✅</div>
                    <div className="stat-content">
                        <div className="stat-value">{teamData?.riskDistribution?.low || 0}</div>
                        <div className="stat-label">Low Risk</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon warning">⚡</div>
                    <div className="stat-content">
                        <div className="stat-value">{teamData?.riskDistribution?.medium || 0}</div>
                        <div className="stat-label">Medium Risk</div>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon danger">🔥</div>
                    <div className="stat-content">
                        <div className="stat-value">{teamData?.riskDistribution?.high || 0}</div>
                        <div className="stat-label">High Risk</div>
                    </div>
                </div>
            </div>

            {/* Team Members Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Team Members</h3>
                </div>
                <div className="table-container">
                    <table className="table table-clickable">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th>Workload Score</th>
                                <th>Risk Level</th>
                                <th>Active Tasks</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(!teamData?.members || teamData.members.length === 0) ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted" style={{ padding: '3rem' }}>
                                        No team members found
                                    </td>
                                </tr>
                            ) : (
                                teamData.members
                                    .sort((a, b) => (b.workloadScore || 0) - (a.workloadScore || 0))
                                    .map((member) => (
                                        <tr
                                            key={member.id}
                                            onClick={() => handleViewMember(member)}
                                        >
                                            <td>
                                                <div className="flex items-center gap-sm">
                                                    <div
                                                        style={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: '50%',
                                                            background: 'var(--primary-100)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 600,
                                                            color: 'var(--primary-700)'
                                                        }}
                                                    >
                                                        {member.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{member.name}</div>
                                                        <div className="text-xs text-muted">{member.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{member.department || '-'}</td>
                                            <td>
                                                <div className="flex items-center gap-sm">
                                                    <div
                                                        className="progress"
                                                        style={{ width: 60, height: 6 }}
                                                    >
                                                        <div
                                                            className="progress-bar"
                                                            style={{
                                                                width: `${member.workloadScore || 0}%`,
                                                                background: getRiskColor(member.riskLevel)
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="font-semibold">
                                                        {Math.round(member.workloadScore || 0)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${getRiskBadge(member.riskLevel)}`}>
                                                    {member.riskLevel || 'low'}
                                                </span>
                                            </td>
                                            <td>{member.activeTasks || 0}</td>
                                            <td>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewMember(member);
                                                    }}
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Member Detail Modal */}
            {showModal && selectedMember && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div
                        className="modal"
                        style={{ maxWidth: 700 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <div className="flex items-center gap-md">
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        background: 'var(--primary-100)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 600,
                                        fontSize: '1.25rem',
                                        color: 'var(--primary-700)'
                                    }}
                                >
                                    {selectedMember.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="modal-title">{selectedMember.name}</h3>
                                    <div className="text-sm text-muted">{selectedMember.email}</div>
                                </div>
                            </div>
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={() => setShowModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            {/* Workload Summary */}
                            <div className="grid grid-cols-3 gap-md mb-lg">
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'var(--gray-50)',
                                    borderRadius: 'var(--radius)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        color: getRiskColor(memberWorkload?.riskLevel || selectedMember.riskLevel)
                                    }}>
                                        {Math.round(memberWorkload?.score || selectedMember.workloadScore || 0)}
                                    </div>
                                    <div className="text-sm text-muted">Workload Score</div>
                                </div>
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'var(--gray-50)',
                                    borderRadius: 'var(--radius)',
                                    textAlign: 'center'
                                }}>
                                    <span className={`badge ${getRiskBadge(memberWorkload?.riskLevel || selectedMember.riskLevel)}`}>
                                        {memberWorkload?.riskLevel || selectedMember.riskLevel || 'Low'}
                                    </span>
                                    <div className="text-sm text-muted mt-sm">Risk Level</div>
                                </div>
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'var(--gray-50)',
                                    borderRadius: 'var(--radius)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                        {selectedMember.activeTasks || 0}
                                    </div>
                                    <div className="text-sm text-muted">Active Tasks</div>
                                </div>
                            </div>

                            {/* Tasks List */}
                            <div>
                                <h4 className="mb-md">Recent Tasks</h4>
                                {memberTasks.length === 0 ? (
                                    <div className="text-muted text-sm">No tasks assigned</div>
                                ) : (
                                    <div className="grid gap-sm">
                                        {memberTasks.slice(0, 5).map((task) => (
                                            <div
                                                key={task.id}
                                                style={{
                                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                                    background: 'var(--gray-50)',
                                                    borderRadius: 'var(--radius)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{task.title}</div>
                                                    <div className="text-xs text-muted">
                                                        Due: {new Date(task.deadline).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="flex gap-xs">
                                                    <span className={`badge ${getPriorityBadge(task.priority)}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
