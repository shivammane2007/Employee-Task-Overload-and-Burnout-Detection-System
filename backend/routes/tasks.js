/**
 * =====================================================
 * Task Management Routes - SQLite Compatible
 * CRUD operations for employee tasks
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const { body, validationResult, param, query } = require('express-validator');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireManager, requireTeamAccess } = require('../middleware/roleCheck');
const { paginate, createPaginationMeta, getDaysUntilDeadline } = require('../utils/helpers');
const workloadEngine = require('../services/workloadEngine');
const notificationService = require('../services/notificationService');

/**
 * @route   GET /api/tasks
 * @desc    Get tasks (own tasks or filtered)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            priority,
            employee_id,
            sort = 'deadline',
            order = 'asc'
        } = req.query;

        const pagination = paginate(page, limit);

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        // Managers/Admins can view team tasks, employees see only their own
        if (req.user.role === 'employee') {
            whereConditions.push(`t.employee_id = $${paramIndex++}`);
            params.push(req.user.id);
        } else if (employee_id) {
            whereConditions.push(`t.employee_id = $${paramIndex++}`);
            params.push(parseInt(employee_id));
        } else if (req.user.role === 'manager') {
            // Get tasks for all team members
            whereConditions.push(`(t.employee_id IN (SELECT id FROM users WHERE manager_id = $${paramIndex++}) OR t.employee_id = $${paramIndex++})`);
            params.push(req.user.id, req.user.id);
        }
        // Admins can see all tasks

        // Filter by status
        if (status) {
            whereConditions.push(`t.status = $${paramIndex++}`);
            params.push(status);
        }

        // Filter by priority
        if (priority) {
            whereConditions.push(`t.priority = $${paramIndex++}`);
            params.push(priority);
        }

        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        // Validate sort column
        const validSorts = ['deadline', 'priority', 'created_at', 'status', 'progress'];
        const sortColumn = validSorts.includes(sort) ? sort : 'deadline';
        const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

        // Priority ordering needs special handling
        let orderClause = `t.${sortColumn} ${sortOrder}`;
        if (sortColumn === 'priority') {
            orderClause = `CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END ${sortOrder}`;
        }

        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) as count FROM tasks t ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0]?.count) || 0;

        // Get tasks
        const result = await db.query(
            `SELECT t.*, u.name as employee_name, u.email as employee_email
             FROM tasks t
             LEFT JOIN users u ON t.employee_id = u.id
             ${whereClause}
             ORDER BY ${orderClause}
             LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            [...params, pagination.limit, pagination.offset]
        );

        // Add computed fields
        const tasks = result.rows.map(task => ({
            ...task,
            days_until_deadline: getDaysUntilDeadline(task.deadline),
            is_overdue: getDaysUntilDeadline(task.deadline) < 0 && task.status !== 'completed'
        }));

        res.json({
            success: true,
            data: tasks,
            pagination: createPaginationMeta(total, pagination.page, pagination.limit)
        });

    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tasks'
        });
    }
});

/**
 * @route   GET /api/tasks/summary
 * @desc    Get task summary statistics
 * @access  Private
 */
router.get('/summary', authenticate, async (req, res) => {
    try {
        const { employee_id } = req.query;

        let targetUserId = req.user.id;

        // Managers/Admins can view other users' summaries
        if (employee_id && req.user.role !== 'employee') {
            targetUserId = parseInt(employee_id);
        }

        const result = await db.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN deadline < datetime('now') AND status NOT IN ('completed') THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN priority = 'high' AND status NOT IN ('completed') THEN 1 ELSE 0 END) as high_priority,
                SUM(CASE WHEN deadline BETWEEN datetime('now') AND datetime('now', '+3 days') AND status NOT IN ('completed') THEN 1 ELSE 0 END) as due_soon,
                COALESCE(SUM(estimated_hours), 0) as total_estimated_hours,
                COALESCE(SUM(actual_hours), 0) as total_actual_hours
             FROM tasks
             WHERE employee_id = $1`,
            [targetUserId]
        );

        res.json({
            success: true,
            data: {
                total: parseInt(result.rows[0]?.total) || 0,
                pending: parseInt(result.rows[0]?.pending) || 0,
                in_progress: parseInt(result.rows[0]?.in_progress) || 0,
                completed: parseInt(result.rows[0]?.completed) || 0,
                overdue: parseInt(result.rows[0]?.overdue) || 0,
                high_priority: parseInt(result.rows[0]?.high_priority) || 0,
                due_soon: parseInt(result.rows[0]?.due_soon) || 0,
                total_estimated_hours: parseFloat(result.rows[0]?.total_estimated_hours) || 0,
                total_actual_hours: parseFloat(result.rows[0]?.total_actual_hours) || 0
            }
        });

    } catch (error) {
        console.error('Get task summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching task summary'
        });
    }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task by ID
 * @access  Private (own task or manager's team)
 */
router.get('/:id', authenticate, [
    param('id').isInt().withMessage('Task ID must be an integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const taskId = parseInt(req.params.id);

        const result = await db.query(
            `SELECT t.*, u.name as employee_name, u.email as employee_email
             FROM tasks t
             LEFT JOIN users u ON t.employee_id = u.id
             WHERE t.id = $1`,
            [taskId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const task = result.rows[0];

        // Check access - employees can only view their own tasks
        if (req.user.role === 'employee' && task.employee_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Not your task.'
            });
        }

        // Managers can only view their team's tasks
        if (req.user.role === 'manager') {
            const teamCheck = await db.query(
                'SELECT id FROM users WHERE id = $1 AND manager_id = $2',
                [task.employee_id, req.user.id]
            );
            if (teamCheck.rows.length === 0 && task.employee_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Not your team member\'s task.'
                });
            }
        }

        res.json({
            success: true,
            data: {
                ...task,
                days_until_deadline: getDaysUntilDeadline(task.deadline),
                is_overdue: getDaysUntilDeadline(task.deadline) < 0 && task.status !== 'completed'
            }
        });

    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching task'
        });
    }
});

/**
 * @route   POST /api/tasks
 * @desc    Create new task
 * @access  Private
 */
router.post('/', authenticate, [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().trim(),
    body('priority').isIn(['low', 'medium', 'high']).withMessage('Valid priority is required'),
    body('deadline').isISO8601().withMessage('Valid deadline is required'),
    body('estimated_hours').isFloat({ min: 0.5 }).withMessage('Estimated hours must be at least 0.5'),
    body('employee_id').optional().isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { title, description, priority, deadline, estimated_hours, employee_id } = req.body;

        // Determine task owner
        let taskOwnerId = req.user.id;

        // Managers/Admins can assign tasks to others
        if (employee_id && req.user.role !== 'employee') {
            taskOwnerId = employee_id;
        }

        const result = await db.query(
            `INSERT INTO tasks (employee_id, title, description, priority, deadline, estimated_hours, created_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [taskOwnerId, title, description, priority, deadline, estimated_hours, req.user.id, 'pending']
        );

        const newTask = result.rows[0];

        // Trigger workload recalculation for this employee
        await workloadEngine.processEmployeeWorkload(taskOwnerId);

        // Send real-time notification to the assigned employee
        if (taskOwnerId !== req.user.id) {
            await notificationService.createNotification({
                receiver_id: taskOwnerId,
                sender_id: req.user.id,
                task_id: newTask.id,
                type: 'TASK_ASSIGNED',
                message: `New task assigned: "${title}"`
            });
        }

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: {
                ...newTask,
                days_until_deadline: getDaysUntilDeadline(newTask.deadline)
            }
        });

    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating task'
        });
    }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task
 * @access  Private (own task)
 */
router.put('/:id', authenticate, [
    param('id').isInt(),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('deadline').optional().isISO8601(),
    body('estimated_hours').optional().isFloat({ min: 0.5 }),
    body('actual_hours').optional().isFloat({ min: 0 }),
    body('notes').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const taskId = parseInt(req.params.id);

        // Check task ownership
        const taskCheck = await db.query(
            'SELECT employee_id FROM tasks WHERE id = $1',
            [taskId]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Only task owner or admin can update
        if (taskCheck.rows[0].employee_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Not your task.'
            });
        }

        const { title, description, priority, deadline, estimated_hours, actual_hours, notes } = req.body;

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (title) { updates.push(`title = $${paramIndex++}`); values.push(title); }
        if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
        if (priority) { updates.push(`priority = $${paramIndex++}`); values.push(priority); }
        if (deadline) { updates.push(`deadline = $${paramIndex++}`); values.push(deadline); }
        if (estimated_hours) { updates.push(`estimated_hours = $${paramIndex++}`); values.push(estimated_hours); }
        if (actual_hours !== undefined) { updates.push(`actual_hours = $${paramIndex++}`); values.push(actual_hours); }
        if (notes !== undefined) { updates.push(`notes = $${paramIndex++}`); values.push(notes); }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(taskId);

        const result = await db.query(
            `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex}
             RETURNING *`,
            values
        );

        res.json({
            success: true,
            message: 'Task updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating task'
        });
    }
});

/**
 * @route   PUT /api/tasks/:id/progress
 * @desc    Update task progress
 * @access  Private (own task)
 */
router.put('/:id/progress', authenticate, [
    param('id').isInt(),
    body('progress').isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const taskId = parseInt(req.params.id);
        const { progress } = req.body;

        // Verify ownership and get task details for notification
        const taskCheck = await db.query(
            'SELECT employee_id, status, title, created_by FROM tasks WHERE id = $1',
            [taskId]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (taskCheck.rows[0].employee_id !== req.user.id && req.user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Auto-update status based on progress
        let newStatus = taskCheck.rows[0].status;
        if (progress === 100) {
            newStatus = 'completed';
        } else if (progress > 0 && newStatus === 'pending') {
            newStatus = 'in_progress';
        }

        let result;
        if (progress === 100) {
            result = await db.query(
                `UPDATE tasks 
                 SET progress = $1, status = $2, completed_at = datetime('now')
                 WHERE id = $3
                 RETURNING *`,
                [progress, newStatus, taskId]
            );
        } else {
            result = await db.query(
                `UPDATE tasks 
                 SET progress = $1, status = $2, completed_at = NULL
                 WHERE id = $3
                 RETURNING *`,
                [progress, newStatus, taskId]
            );
        }

        // Trigger workload recalculation
        try {
            await workloadEngine.processEmployeeWorkload(taskCheck.rows[0].employee_id);
        } catch (error) {
            console.error('Workload recalculation error (ignored):', error);
        }

        // Send real-time notification to the manager who assigned it
        if (taskCheck.rows[0].created_by && taskCheck.rows[0].created_by !== req.user.id) {
            const type = progress === 100 ? 'TASK_COMPLETED' : 'TASK_UPDATED';
            const actionStr = progress === 100 ? 'completed' : `updated progress to ${progress}% on`;

            await notificationService.createNotification({
                receiver_id: taskCheck.rows[0].created_by,
                sender_id: req.user.id,
                task_id: taskId,
                type: type,
                message: `Task ${actionStr}: "${taskCheck.rows[0].title}"`
            });
        }

        res.json({
            success: true,
            message: 'Progress updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating progress'
        });
    }
});

/**
 * @route   PUT /api/tasks/:id/status
 * @desc    Update task status
 * @access  Private (own task)
 */
router.put('/:id/status', authenticate, [
    param('id').isInt(),
    body('status').isIn(['pending', 'in_progress', 'completed', 'overdue']).withMessage('Valid status is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const taskId = parseInt(req.params.id);
        const { status } = req.body;

        // Verify ownership
        const taskCheck = await db.query(
            'SELECT employee_id FROM tasks WHERE id = $1',
            [taskId]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (taskCheck.rows[0].employee_id !== req.user.id && req.user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Update progress if completing
        let result;
        if (status === 'completed') {
            result = await db.query(
                `UPDATE tasks 
                 SET status = $1, progress = 100, completed_at = datetime('now')
                 WHERE id = $2
                 RETURNING *`,
                [status, taskId]
            );
        } else {
            result = await db.query(
                `UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *`,
                [status, taskId]
            );
        }

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 * @access  Private (own task or admin)
 */
router.delete('/:id', authenticate, [
    param('id').isInt()
], async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);

        // Check ownership
        const taskCheck = await db.query(
            'SELECT employee_id FROM tasks WHERE id = $1',
            [taskId]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (taskCheck.rows[0].employee_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);

        res.json({
            success: true,
            message: 'Task deleted successfully'
        });

    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting task'
        });
    }
});

module.exports = router;
