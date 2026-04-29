'use client';

import { useState, useEffect } from 'react';
import { usersAPI } from '@/lib/api';

/**
 * Admin User Management Page
 */
export default function AdminUsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ role: '', department: '', search: '' });
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [departments, setDepartments] = useState([]);
    const [managers, setManagers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // create, edit
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'employee', department: '', manager_id: ''
    });
    const [formError, setFormError] = useState('');

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
        fetchManagers();
    }, [filter, pagination.page]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...filter
            };
            Object.keys(params).forEach(key => !params[key] && delete params[key]);

            const response = await usersAPI.getAll(params);
            if (response.success) {
                setUsers(response.data || []);
                setPagination(prev => ({ ...prev, total: response.pagination?.total || 0 }));
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await usersAPI.getDepartments();
            if (response.success) setDepartments(response.data || []);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchManagers = async () => {
        try {
            const response = await usersAPI.getManagers();
            if (response.success) setManagers(response.data || []);
        } catch (error) {
            console.error('Error fetching managers:', error);
        }
    };

    const handleCreateUser = () => {
        setModalMode('create');
        setSelectedUser(null);
        setFormData({
            name: '', email: '', password: '', role: 'employee', department: '', manager_id: ''
        });
        setFormError('');
        setShowModal(true);
    };

    const handleEditUser = (user) => {
        setModalMode('edit');
        setSelectedUser(user);
        setFormData({
            name: user.name || '',
            email: user.email || '',
            password: '',
            role: user.role || 'employee',
            department: user.department || '',
            manager_id: user.manager_id || ''
        });
        setFormError('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        try {
            let response;
            if (modalMode === 'create') {
                if (!formData.password) {
                    setFormError('Password is required for new users');
                    return;
                }
                response = await usersAPI.create(formData);
            } else {
                const updateData = { ...formData };
                if (!updateData.password) delete updateData.password;
                response = await usersAPI.update(selectedUser.id, updateData);
            }

            if (response.success) {
                setShowModal(false);
                fetchUsers();
            } else {
                setFormError(response.message || 'Operation failed');
            }
        } catch (error) {
            setFormError(error.message || 'An error occurred');
        }
    };

    const handleDeactivate = async (userId) => {
        if (!confirm('Are you sure you want to deactivate this user?')) return;

        try {
            await usersAPI.delete(userId);
            fetchUsers();
        } catch (error) {
            console.error('Error deactivating user:', error);
        }
    };

    const getRoleBadge = (role) => ({
        admin: 'badge-danger',
        manager: 'badge-primary',
        employee: 'badge-gray'
    }[role] || 'badge-gray');

    return (
        <div>
            {/* Page Header */}
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">Manage all users in the organization</p>
                </div>
                <button className="btn btn-primary" onClick={handleCreateUser}>
                    + Add User
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-lg">
                <div className="card-body flex items-center gap-md" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by name or email..."
                        value={filter.search}
                        onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                        style={{ maxWidth: 250 }}
                    />
                    <select
                        className="form-select"
                        value={filter.role}
                        onChange={(e) => setFilter({ ...filter, role: e.target.value })}
                        style={{ width: 'auto' }}
                    >
                        <option value="">All Roles</option>
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                    </select>
                    <select
                        className="form-select"
                        value={filter.department}
                        onChange={(e) => setFilter({ ...filter, department: e.target.value })}
                        style={{ width: 'auto' }}
                    >
                        <option value="">All Departments</option>
                        {departments.map((dept, idx) => (
                            <option key={idx} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Manager</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center" style={{ padding: '3rem' }}>
                                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted" style={{ padding: '3rem' }}>
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id}>
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
                                                    {user.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{user.name}</div>
                                                    <div className="text-xs text-muted">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getRoleBadge(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>{user.department || '-'}</td>
                                        <td>{user.manager_name || '-'}</td>
                                        <td>
                                            <span className={`badge ${user.is_active ? 'badge-success' : 'badge-gray'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-xs">
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => handleEditUser(user)}
                                                >
                                                    ✏️
                                                </button>
                                                {user.is_active && user.role !== 'admin' && (
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => handleDeactivate(user.id)}
                                                    >
                                                        🚫
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.total > pagination.limit && (
                    <div className="card-footer flex justify-between items-center">
                        <div className="text-sm text-muted">
                            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </div>
                        <div className="flex gap-xs">
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            >
                                Previous
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={pagination.page * pagination.limit >= pagination.total}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {modalMode === 'create' ? 'Add New User' : 'Edit User'}
                            </h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {formError && (
                                    <div className="alert alert-danger mb-lg">{formError}</div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        Password {modalMode === 'edit' && '(leave blank to keep current)'}
                                    </label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={modalMode === 'create'}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select
                                        className="form-select"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="employee">Employee</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        placeholder="e.g., Engineering, Marketing"
                                    />
                                </div>

                                {formData.role === 'employee' && (
                                    <div className="form-group">
                                        <label className="form-label">Assigned Manager</label>
                                        <select
                                            className="form-select"
                                            value={formData.manager_id}
                                            onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                                        >
                                            <option value="">No Manager</option>
                                            {managers.map((mgr) => (
                                                <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
