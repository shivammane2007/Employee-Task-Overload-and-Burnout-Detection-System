'use client';

import { useState, useEffect } from 'react';
import { tasksAPI } from '@/lib/api';

/**
 * Employee Tasks Page
 */
export default function EmployeeTasksPage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('deadline');
    const [showModal, setShowModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    useEffect(() => {
        fetchTasks();
    }, [filter, sortBy]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const params = { sort_by: sortBy };
            if (filter !== 'all') params.status = filter;

            const response = await tasksAPI.getAll(params);
            if (response.success) {
                setTasks(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProgress = async (taskId, progress) => {
        try {
            await tasksAPI.updateProgress(taskId, progress);
            fetchTasks();
        } catch (error) {
            console.error('Error updating progress:', error);
        }
    };

    const handleUpdateStatus = async (taskId, status) => {
        try {
            await tasksAPI.updateStatus(taskId, status);
            fetchTasks();
            setShowModal(false);
            setSelectedTask(null);
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const getPriorityBadge = (priority) => ({
        high: 'badge-priority-high',
        medium: 'badge-priority-medium',
        low: 'badge-priority-low'
    }[priority] || 'badge-gray');

    const getStatusBadge = (status) => ({
        completed: 'badge-success',
        in_progress: 'badge-primary',
        pending: 'badge-gray',
        overdue: 'badge-danger'
    }[status] || 'badge-gray');

    const isOverdue = (task) => {
        return task.status !== 'completed' && new Date(task.deadline) < new Date();
    };

    return (
        <div>
            {/* Page Header */}
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1 className="page-title">My Tasks</h1>
                    <p className="page-subtitle">Manage and track your assigned tasks</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-lg">
                <div className="card-body flex items-center gap-md" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                    <div className="flex items-center gap-sm">
                        <span className="text-sm text-secondary">Status:</span>
                        <select
                            className="form-select"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{ width: 'auto', padding: '0.375rem 2rem 0.375rem 0.75rem' }}
                        >
                            <option value="all">All Tasks</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-sm">
                        <span className="text-sm text-secondary">Sort by:</span>
                        <select
                            className="form-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{ width: 'auto', padding: '0.375rem 2rem 0.375rem 0.75rem' }}
                        >
                            <option value="deadline">Deadline</option>
                            <option value="priority">Priority</option>
                            <option value="created_at">Created Date</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tasks List */}
            {loading ? (
                <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
                    <div className="spinner"></div>
                </div>
            ) : tasks.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <div className="empty-title">No tasks found</div>
                        <div className="empty-description">
                            {filter !== 'all' ? 'No tasks match the current filter' : 'You have no assigned tasks'}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid gap-md">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="card"
                            style={{
                                cursor: 'pointer',
                                borderLeft: isOverdue(task) ? '4px solid var(--danger-500)' : 'none'
                            }}
                            onClick={() => {
                                setSelectedTask(task);
                                setShowModal(true);
                            }}
                        >
                            <div className="card-body flex justify-between items-start gap-lg">
                                <div style={{ flex: 1 }}>
                                    <div className="flex items-center gap-sm mb-sm">
                                        <h4 className="font-semibold">{task.title}</h4>
                                        <span className={`badge ${getPriorityBadge(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                        <span className={`badge ${getStatusBadge(isOverdue(task) ? 'overdue' : task.status)}`}>
                                            {isOverdue(task) ? 'Overdue' : task.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    {task.description && (
                                        <p className="text-sm text-secondary mb-md" style={{ maxWidth: 600 }}>
                                            {task.description.length > 150
                                                ? task.description.substring(0, 150) + '...'
                                                : task.description}
                                        </p>
                                    )}
                                    <div className="flex gap-lg text-sm text-muted">
                                        <span>📅 Due: {new Date(task.deadline).toLocaleDateString()}</span>
                                        {task.estimated_hours && (
                                            <span>⏱️ Est: {task.estimated_hours}h</span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ minWidth: 150 }}>
                                    <div className="text-xs text-muted mb-xs">Progress</div>
                                    <div className="progress mb-xs">
                                        <div
                                            className={`progress-bar ${task.progress === 100 ? 'success' : ''}`}
                                            style={{ width: `${task.progress || 0}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-right">{task.progress || 0}%</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Task Detail Modal */}
            {showModal && selectedTask && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{selectedTask.title}</h3>
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={() => setShowModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="flex gap-sm mb-lg">
                                <span className={`badge ${getPriorityBadge(selectedTask.priority)}`}>
                                    {selectedTask.priority} priority
                                </span>
                                <span className={`badge ${getStatusBadge(isOverdue(selectedTask) ? 'overdue' : selectedTask.status)}`}>
                                    {isOverdue(selectedTask) ? 'Overdue' : selectedTask.status.replace('_', ' ')}
                                </span>
                            </div>

                            {selectedTask.description && (
                                <div className="mb-lg">
                                    <div className="text-sm font-medium mb-xs">Description</div>
                                    <p className="text-secondary">{selectedTask.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-md mb-lg">
                                <div>
                                    <div className="text-sm font-medium mb-xs">Deadline</div>
                                    <p className="text-secondary">
                                        {new Date(selectedTask.deadline).toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <div className="text-sm font-medium mb-xs">Estimated Hours</div>
                                    <p className="text-secondary">
                                        {selectedTask.estimated_hours || 'Not set'}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-lg">
                                <div className="text-sm font-medium mb-sm">Progress: {selectedTask.progress || 0}%</div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={selectedTask.progress || 0}
                                    onChange={(e) => {
                                        const progress = parseInt(e.target.value);
                                        setSelectedTask({ ...selectedTask, progress });
                                    }}
                                    onMouseUp={(e) => handleUpdateProgress(selectedTask.id, parseInt(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <div className="text-sm font-medium mb-sm">Update Status</div>
                                <div className="flex gap-sm">
                                    <button
                                        className={`btn ${selectedTask.status === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => handleUpdateStatus(selectedTask.id, 'pending')}
                                    >
                                        Pending
                                    </button>
                                    <button
                                        className={`btn ${selectedTask.status === 'in_progress' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => handleUpdateStatus(selectedTask.id, 'in_progress')}
                                    >
                                        In Progress
                                    </button>
                                    <button
                                        className={`btn ${selectedTask.status === 'completed' ? 'btn-success' : 'btn-secondary'}`}
                                        onClick={() => handleUpdateStatus(selectedTask.id, 'completed')}
                                    >
                                        ✓ Complete
                                    </button>
                                </div>
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
