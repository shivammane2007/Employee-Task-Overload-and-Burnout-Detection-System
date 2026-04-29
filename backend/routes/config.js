/**
 * =====================================================
 * Configuration Routes
 * Admin endpoints for system configuration
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');

/**
 * @route   GET /api/config
 * @desc    Get all configurations
 * @access  Admin
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { category } = req.query;

        let query = `
            SELECT c.*, u.name as updated_by_name
            FROM configurations c
            LEFT JOIN users u ON c.updated_by = u.id
        `;
        let params = [];

        if (category) {
            query += ' WHERE c.category = $1';
            params.push(category);
        }

        query += ' ORDER BY c.category, c.key';

        const result = await db.query(query, params);

        // Parse values based on type
        const configs = result.rows.map(config => ({
            ...config,
            parsedValue: parseConfigValue(config.value, config.value_type)
        }));

        res.json({
            success: true,
            data: configs
        });

    } catch (error) {
        console.error('Get configurations error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching configurations'
        });
    }
});

/**
 * @route   GET /api/config/categories
 * @desc    Get configuration categories
 * @access  Admin
 */
router.get('/categories', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT DISTINCT category FROM configurations ORDER BY category`
        );

        res.json({
            success: true,
            data: result.rows.map(r => r.category)
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories'
        });
    }
});

/**
 * @route   GET /api/config/:key
 * @desc    Get specific configuration by key
 * @access  Admin
 */
router.get('/:key', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, u.name as updated_by_name
             FROM configurations c
             LEFT JOIN users u ON c.updated_by = u.id
             WHERE c.key = $1`,
            [req.params.key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuration not found'
            });
        }

        const config = result.rows[0];

        res.json({
            success: true,
            data: {
                ...config,
                parsedValue: parseConfigValue(config.value, config.value_type)
            }
        });

    } catch (error) {
        console.error('Get configuration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching configuration'
        });
    }
});

/**
 * @route   PUT /api/config/:key
 * @desc    Update configuration value
 * @access  Admin
 */
router.put('/:key', authenticate, requireAdmin, [
    param('key').trim().notEmpty(),
    body('value').notEmpty().withMessage('Value is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { key } = req.params;
        const { value } = req.body;

        // Check if config exists and is editable
        const existing = await db.query(
            'SELECT is_editable, value_type FROM configurations WHERE key = $1',
            [key]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuration not found'
            });
        }

        if (!existing.rows[0].is_editable) {
            return res.status(403).json({
                success: false,
                message: 'This configuration cannot be edited'
            });
        }

        // Validate value type
        const valueType = existing.rows[0].value_type;
        if (!validateConfigValue(value, valueType)) {
            return res.status(400).json({
                success: false,
                message: `Value must be a valid ${valueType}`
            });
        }

        // Convert value to string for storage
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        const result = await db.query(
            `UPDATE configurations 
             SET value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
             WHERE key = $3
             RETURNING *`,
            [stringValue, req.user.id, key]
        );

        res.json({
            success: true,
            message: 'Configuration updated successfully',
            data: {
                ...result.rows[0],
                parsedValue: parseConfigValue(result.rows[0].value, result.rows[0].value_type)
            }
        });

    } catch (error) {
        console.error('Update configuration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating configuration'
        });
    }
});

/**
 * @route   POST /api/config
 * @desc    Create new configuration
 * @access  Admin
 */
router.post('/', authenticate, requireAdmin, [
    body('key').trim().notEmpty().withMessage('Key is required'),
    body('value').notEmpty().withMessage('Value is required'),
    body('value_type').isIn(['string', 'number', 'boolean', 'json']).withMessage('Valid type is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('description').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { key, value, value_type, category, description } = req.body;

        // Check if key already exists
        const existing = await db.query(
            'SELECT id FROM configurations WHERE key = $1',
            [key]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Configuration key already exists'
            });
        }

        // Validate value type
        if (!validateConfigValue(value, value_type)) {
            return res.status(400).json({
                success: false,
                message: `Value must be a valid ${value_type}`
            });
        }

        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        const result = await db.query(
            `INSERT INTO configurations (key, value, value_type, category, description, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [key, stringValue, value_type, category, description, req.user.id]
        );

        res.status(201).json({
            success: true,
            message: 'Configuration created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create configuration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating configuration'
        });
    }
});

/**
 * @route   DELETE /api/config/:key
 * @desc    Delete configuration
 * @access  Admin
 */
router.delete('/:key', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM configurations WHERE key = $1 AND is_editable = true RETURNING key',
            [req.params.key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuration not found or cannot be deleted'
            });
        }

        res.json({
            success: true,
            message: 'Configuration deleted successfully'
        });

    } catch (error) {
        console.error('Delete configuration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting configuration'
        });
    }
});

/**
 * Parse configuration value based on type
 */
function parseConfigValue(value, type) {
    switch (type) {
        case 'number':
            return parseFloat(value);
        case 'boolean':
            return value === 'true' || value === true;
        case 'json':
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        default:
            return value;
    }
}

/**
 * Validate value matches expected type
 */
function validateConfigValue(value, type) {
    switch (type) {
        case 'number':
            return !isNaN(parseFloat(value));
        case 'boolean':
            return typeof value === 'boolean' || value === 'true' || value === 'false';
        case 'json':
            if (typeof value === 'object') return true;
            try {
                JSON.parse(value);
                return true;
            } catch {
                return false;
            }
        default:
            return true;
    }
}

module.exports = router;
