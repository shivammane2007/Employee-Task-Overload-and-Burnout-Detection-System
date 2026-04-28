'use client';

import { useState, useEffect } from 'react';
import { tasksAPI, workloadAPI } from '@/lib/api';

/**
 * Manager Tasks Page
 */
export default function ManagerTasksPage() {
    const [tasks, setTasks] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('deadline');
    const [showModal, setShowModal] = useState(false);
    const [taskModalType, setTaskModalType] = useState('create'); // 'create', 'view'
    const [selectedTask, setSelectedTask] = useState(null);
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        deadline: '',
        estimated_hours: '',
        employee_id: ''
    });

    useEffect(() => {
        fetchTasks();
        fetchTeamMembers();
    }, [filter, sortBy]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const params = { sort: sortBy };
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

    const fetchTeamMembers = async () => {
        try {
            const response = await workloadAPI.getTeamWorkload();
            if (response.success && response.data.members) {
                setTeamMembers(response.data.members);
            }
        } catch (error) {
            console.error('Error fetching team members:', error);
        }
    };

    const handleCreateTask = () => {
        setTaskModalType('create');
        setFormData({
            title: '',
            description: '',
            priority: 'medium',
            deadline: '',
            estimated_hours: '',
            employee_id: ''
        });
        setFormError('');
        setShowModal(true);
    };

    const handleViewTask = (task) => {
        setTaskModalType('view');
        setSelectedTask(task);
        setShowModal(true);
    };

    const handleSubmitTask = async (e) => {
        e.preventDefault();
        setFormError('');

        try {
            const submitData = {
                ...formData,
                estimated_hours: parseFloat(formData.estimated_hours)
            };

            // Convert to int if provided
            if (submitData.employee_id) {
                submitData.employee_id = parseInt(submitData.employee_id);
            } else {
                delete submitData.employee_id;
            }

            const response = await tasksAPI.create(submitData);
            if (response.success) {
                setShowModal(false);
                fetchTasks(); // Refresh list
            } else {
                setFormError(response.message || 'Failed to create task');
            }
        } catch (error) {
            setFormError(error.message || 'Error creating task');
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
                    <h1 className="page-title">Team Tasks</h1>
                    <p className="page-subtitle">Monitor and assign tasks to your team</p>
                </div>
                <button className="btn btn-primary" onClick={handleCreateTask}>
                    + Assign New Task
                </button>
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
                            <option value="progress">Progress</option>
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
                            {filter !== 'all' ? 'No tasks match the current filter' : 'Your team has no assigned tasks'}
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
                            onClick={() => handleViewTask(task)}
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
                                    <div className="text-sm font-medium mb-sm text-primary-700">
                                        Assigned to: {task.employee_name || 'Unassigned'}
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

            {/* Modal for Create/View Task */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {taskModalType === 'create' ? 'Assign New Task' : selectedTask?.title}
                            </h3>
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={() => setShowModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        {taskModalType === 'create' ? (
                            <form onSubmit={handleSubmitTask}>
                                <div className="modal-body">
                                    {formError && (
                                        <div className="alert alert-danger mb-lg">{formError}</div>
                                    )}

                                    <div className="form-group">
                                        <label className="form-label">Task Title</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            required
                                            placeholder="Enter task title"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Assign To</label>
                                        <select
                                            className="form-select"
                                            value={formData.employee_id}
                                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Select Team Member --</option>
                                            {teamMembers.map(member => (
                                                <option key={member.id} value={member.id}>{member.name} ({member.department})</option>
                                            ))}
                                            <option value="unassigned">Keep Unassigned (Self)</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Description</label>
                                        <textarea
                                            className="form-input"
                                            rows="3"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Task details and expectations..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-md">
                                        <div className="form-group">
                                            <label className="form-label">Priority</label>
                                            <select
                                                className="form-select"
                                                value={formData.priority}
                                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Estimated Hours</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                step="0.5"
                                                min="0.5"
                                                value={formData.estimated_hours}
                                                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Deadline</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            value={formData.deadline}
                                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Assign Task
                                    </button>
                                </div>
                            </form>
                        ) : (
                            // View Task Mode
                            <div>
                                <div className="modal-body">
                                    <div className="flex gap-sm mb-lg">
                                        <span className={`badge ${getPriorityBadge(selectedTask.priority)}`}>
                                            {selectedTask.priority} priority
                                        </span>
                                        <span className={`badge ${getStatusBadge(isOverdue(selectedTask) ? 'overdue' : selectedTask.status)}`}>
                                            {isOverdue(selectedTask) ? 'Overdue' : selectedTask.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="mb-lg">
                                        <div className="text-sm font-medium mb-xs">Assigned To</div>
                                        <div className="p-sm bg-gray-50 rounded">
                                            {selectedTask.employee_name || 'Unassigned'}
                                            <span className="text-muted text-sm ml-sm">({selectedTask.employee_email})</span>
                                        </div>
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
                                        <div className="text-sm font-medium mb-sm">Current Progress: {selectedTask.progress || 0}%</div>
                                        <div className="progress">
                                            <div
                                                className={`progress-bar ${selectedTask.progress === 100 ? 'success' : ''}`}
                                                style={{ width: `${selectedTask.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
