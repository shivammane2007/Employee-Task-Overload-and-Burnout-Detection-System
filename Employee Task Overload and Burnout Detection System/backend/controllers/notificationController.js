/**
 * =====================================================
 * Notification Controller
 * Handles notification requests
 * =====================================================
 */

const notificationService = require('../services/notificationService');

/**
 * Get notifications for a user
 */
async function getUserNotifications(req, res) {
    try {
        const userId = parseInt(req.params.userId || req.user.id);

        // Security check
        if (userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view these notifications'
            });
        }

        const options = {
            unreadOnly: req.query.unread === 'true',
            limit: parseInt(req.query.limit) || 20
        };

        const notifications = await notificationService.getNotifications(userId, options);

        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error('Get user notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications'
        });
    }
}

/**
 * Mark a notification as read
 */
async function markAsRead(req, res) {
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;

        const updated = await notificationService.markAsRead(notificationId, userId);

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found or unauthorized'
            });
        }

        res.json({
            success: true,
            message: 'Notification marked as read',
            data: updated
        });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating notification status'
        });
    }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(req, res) {
    try {
        const userId = req.user.id;

        const result = await notificationService.markAllAsRead(userId);

        res.json({
            success: true,
            message: 'All notifications marked as read',
            data: result
        });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating notification statuses'
        });
    }
}

/**
 * Get unread notification count
 */
async function getUnreadCount(req, res) {
    try {
        const userId = req.user.id;

        const count = await notificationService.getUnreadCount(userId);

        res.json({
            success: true,
            data: { unreadCount: count }
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching unread count'
        });
    }
}

module.exports = {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount
};
