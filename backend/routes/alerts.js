/**
 * =====================================================
 * Alert Management Routes
 * Endpoints for managing notifications and alerts
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const { param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const alertService = require('../services/alertService');

/**
 * @route   GET /api/alerts
 * @desc    Get user's alerts
 * @access  Private
 */
router.get('/', authenticate, [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const alerts = await alertService.getUserAlerts(req.user.id, {
            limit,
            offset,
            unreadOnly: false
        });

        res.json({
            success: true,
            data: alerts
        });

    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching alerts'
        });
    }
});

/**
 * @route   GET /api/alerts/unread
 * @desc    Get unread alerts only
 * @access  Private
 */
router.get('/unread', authenticate, async (req, res) => {
    try {
        const alerts = await alertService.getUserAlerts(req.user.id, {
            unreadOnly: true,
            limit: 20
        });

        const unreadCount = await alertService.getUnreadCount(req.user.id);

        res.json({
            success: true,
            data: {
                alerts,
                unreadCount
            }
        });

    } catch (error) {
        console.error('Get unread alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching unread alerts'
        });
    }
});

/**
 * @route   GET /api/alerts/count
 * @desc    Get unread alert count
 * @access  Private
 */
router.get('/count', authenticate, async (req, res) => {
    try {
        const count = await alertService.getUnreadCount(req.user.id);

        res.json({
            success: true,
            data: { unreadCount: count }
        });

    } catch (error) {
        console.error('Get alert count error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching alert count'
        });
    }
});

/**
 * @route   PUT /api/alerts/:id/read
 * @desc    Mark alert as read
 * @access  Private
 */
router.put('/:id/read', authenticate, [
    param('id').isInt().withMessage('Alert ID must be an integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const alertId = parseInt(req.params.id);
        const alert = await alertService.markAsRead(alertId, req.user.id);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        res.json({
            success: true,
            message: 'Alert marked as read',
            data: alert
        });

    } catch (error) {
        console.error('Mark alert read error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating alert'
        });
    }
});

/**
 * @route   PUT /api/alerts/read-all
 * @desc    Mark all alerts as read
 * @access  Private
 */
router.put('/read-all', authenticate, async (req, res) => {
    try {
        const count = await alertService.markAllAsRead(req.user.id);

        res.json({
            success: true,
            message: `${count} alerts marked as read`
        });

    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating alerts'
        });
    }
});

/**
 * @route   DELETE /api/alerts/:id
 * @desc    Dismiss an alert
 * @access  Private
 */
router.delete('/:id', authenticate, [
    param('id').isInt()
], async (req, res) => {
    try {
        const alertId = parseInt(req.params.id);
        const alert = await alertService.dismissAlert(alertId, req.user.id);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        res.json({
            success: true,
            message: 'Alert dismissed'
        });

    } catch (error) {
        console.error('Dismiss alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Error dismissing alert'
        });
    }
});

module.exports = router;
