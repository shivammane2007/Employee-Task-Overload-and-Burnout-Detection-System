/**
 * =====================================================
 * User Management Routes
 * Admin routes for managing users
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult, param, query } = require('express-validator');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireManager } = require('../middleware/roleCheck');
const { sanitizeUser, paginate, createPaginationMeta } = require('../utils/helpers');

/**
 * @route   GET /api/users
 * @desc    Get all users (with pagination and filters)
 * @access  Admin/Manager
 */
router.get('/', authenticate, requireManager, async (req, res) => {
    try {
        const { page = 1, limit = 20, role, department, search, managerId } = req.query;
        const pagination = paginate(page, limit);

        let whereConditions = ['1=1'];
        let params = [];
        let paramIndex = 1;

        // Filter by role
        if (role) {
            whereConditions.push(`role = $${paramIndex++}`);
            params.push(role);
        }

        // Filter by department
        if (department) {
            whereConditions.push(`department = $${paramIndex++}`);
            params.push(department);
        }

        // Filter by manager (for managers viewing their team)
        if (managerId) {
            whereConditions.push(`manager_id = $${paramIndex++}`);
            params.push(managerId);
        } else if (req.user.role === 'manager') {
            // Managers can only see their team members
            whereConditions.push(`(manager_id = $${paramIndex++} OR id = $${paramIndex++})`);
            params.push(req.user.id, req.user.id);
        }

        // Search by name or email
        if (search) {
            whereConditions.push(`(name LIKE $${paramIndex} OR email LIKE $${paramIndex++})`);
            params.push(`%${search}%`);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) FROM users WHERE ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // Get users with pagination
        const result = await db.query(
            `SELECT u.id, u.name, u.email, u.role, u.manager_id, u.department,
                    u.is_active, u.last_login, u.created_at,
                    m.name as manager_name
             FROM users u
             LEFT JOIN users m ON u.manager_id = m.id
             WHERE ${whereClause}
             ORDER BY u.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            [...params, pagination.limit, pagination.offset]
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: createPaginationMeta(total, pagination.page, pagination.limit)
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
});

/**
 * @route   GET /api/users/managers
 * @desc    Get all managers (for assigning to employees)
 * @access  Admin
 */
router.get('/managers', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, name, email, department 
             FROM users 
             WHERE role IN ('manager', 'admin') AND is_active = 1
             ORDER BY name ASC`
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get managers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching managers'
        });
    }
});

/**
 * @route   GET /api/users/departments
 * @desc    Get list of departments
 * @access  Private
 */
router.get('/departments', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT DISTINCT department FROM users 
             WHERE department IS NOT NULL AND department != ''
             ORDER BY department ASC`
        );

        res.json({
            success: true,
            data: result.rows.map(r => r.department)
        });

    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching departments'
        });
    }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Admin/Manager (for team)
 */
router.get('/:id', authenticate, requireManager, [
    param('id').isInt().withMessage('User ID must be an integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const userId = parseInt(req.params.id);

        // Managers can only view their team members
        if (req.user.role === 'manager') {
            const teamCheck = await db.query(
                'SELECT id FROM users WHERE id = $1 AND manager_id = $2',
                [userId, req.user.id]
            );
            if (teamCheck.rows.length === 0 && userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Not your team member.'
                });
            }
        }

        const result = await db.query(
            `SELECT u.id, u.name, u.email, u.role, u.manager_id, u.department,
                    u.avatar_url, u.is_active, u.last_login, u.created_at,
                    m.name as manager_name
             FROM users u
             LEFT JOIN users m ON u.manager_id = m.id
             WHERE u.id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user'
        });
    }
});

/**
 * @route   POST /api/users
 * @desc    Create new user (Admin only)
 * @access  Admin
 */
router.post('/', authenticate, requireAdmin, [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['employee', 'manager', 'admin']).withMessage('Valid role is required'),
    body('department').optional().trim(),
    body('manager_id').optional().isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, email, password, role, department, manager_id } = req.body;

        // Check if email exists
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await db.query(
            `INSERT INTO users (name, email, password, role, department, manager_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, email, role, department, manager_id, created_at`,
            [name, email, hashedPassword, role, department, manager_id]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user'
        });
    }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Admin
 */
router.put('/:id', authenticate, requireAdmin, [
    param('id').isInt(),
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('department').optional().trim(),
    body('is_active').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const userId = parseInt(req.params.id);
        const { name, email, department, is_active } = req.body;

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (name) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (email) {
            // Check if email is taken by another user
            const existing = await db.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, userId]
            );
            if (existing.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already taken'
                });
            }
            updates.push(`email = $${paramIndex++}`);
            values.push(email);
        }
        if (department !== undefined) {
            updates.push(`department = $${paramIndex++}`);
            values.push(department);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(userId);

        const result = await db.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
             RETURNING id, name, email, role, department, is_active`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user'
        });
    }
});

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role
 * @access  Admin
 */
router.put('/:id/role', authenticate, requireAdmin, [
    param('id').isInt(),
    body('role').isIn(['employee', 'manager', 'admin']).withMessage('Valid role is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const userId = parseInt(req.params.id);
        const { role } = req.body;

        // Prevent changing own role
        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot change your own role'
            });
        }

        const result = await db.query(
            `UPDATE users SET role = $1 WHERE id = $2
             RETURNING id, name, email, role`,
            [role, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User role updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user role'
        });
    }
});

/**
 * @route   PUT /api/users/:id/manager
 * @desc    Assign manager to user
 * @access  Admin
 */
router.put('/:id/manager', authenticate, requireAdmin, [
    param('id').isInt(),
    body('manager_id').optional({ nullable: true }).isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const userId = parseInt(req.params.id);
        const { manager_id } = req.body;

        // Verify manager exists and has manager/admin role
        if (manager_id) {
            const manager = await db.query(
                `SELECT id FROM users WHERE id = $1 AND role IN ('manager', 'admin')`,
                [manager_id]
            );
            if (manager.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid manager ID or user is not a manager'
                });
            }
        }

        const result = await db.query(
            `UPDATE users SET manager_id = $1 WHERE id = $2
             RETURNING id, name, email, manager_id`,
            [manager_id || null, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Manager assigned successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Assign manager error:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning manager'
        });
    }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete by deactivating)
 * @access  Admin
 */
router.delete('/:id', authenticate, requireAdmin, [
    param('id').isInt()
], async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Prevent self-deletion
        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        // Soft delete - deactivate account
        const result = await db.query(
            `UPDATE users SET is_active = 0 WHERE id = $1
             RETURNING id, name, email`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deactivated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user'
        });
    }
});

module.exports = router;
