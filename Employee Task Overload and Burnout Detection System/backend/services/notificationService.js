/**
 * =====================================================
 * Notification Service - SQLite Compatible
 * Manages real-time notifications via Socket.io
 * =====================================================
 */

const db = require('../config/db');

// This will be set by server.js initialization
let ioInstance = null;

/**
 * Initialize service with Socket.io instance
 */
function initSocket(io) {
    ioInstance = io;
}

/**
 * Format timestamp nicely
 */
function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Create a new notification and emit it
 */
async function createNotification(data) {
    try {
        const { receiver_id, sender_id, task_id = null, type, message } = data;

        // Insert into database
        let result;
        const createdAt = getTimestamp();

        if (task_id) {
            result = await db.query(
                `INSERT INTO notifications (receiver_id, sender_id, task_id, type, message, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [receiver_id, sender_id, task_id, type, message, createdAt]
            );
        } else {
            result = await db.query(
                `INSERT INTO notifications (receiver_id, sender_id, type, message, created_at)
                 VALUES ($1, $2, $3, $4, $5)`,
                [receiver_id, sender_id, type, message, createdAt]
            );
        }

        const newId = result.lastInsertRowid;

        // Fetch the full notification with sender details to send cleanly to front-end
        const notificationRecord = await db.query(
            `SELECT n.*, u.name as sender_name, u.email as sender_email
             FROM notifications n
             JOIN users u ON n.sender_id = u.id
             WHERE n.id = $1`,
            [newId]
        );

        const newNotification = notificationRecord.rows[0];

        // Emit real-time socket event if receiver is connected
        if (ioInstance) {
            // Emits specifically to the 'user_[ID]' room
            ioInstance.to(`user_${receiver_id}`).emit('newNotification', newNotification);
        } else {
            console.warn('⚠️  notificationService: ioInstance is null. Notification saved to DB but not emitted real-time.');
        }

        return newNotification;
    } catch (error) {
        console.error('Create notification error:', error);
        throw error;
    }
}

/**
 * Get notifications for a user
 */
async function getNotifications(userId, options = {}) {
    try {
        const { unreadOnly = false, limit = 50 } = options;

        let query = `
            SELECT n.*, u.name as sender_name, u.email as sender_email
            FROM notifications n
            JOIN users u ON n.sender_id = u.id
            WHERE n.receiver_id = $1
        `;
        const params = [userId];
        let paramIndex = 2;

        if (unreadOnly) {
            query += ` AND n.is_read = 0`;
        }

        query += ` ORDER BY n.created_at DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await db.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Get notifications error:', error);
        throw error;
    }
}

/**
 * Mark a single notification as read
 */
async function markAsRead(notificationId, userId) {
    try {
        await db.query(
            `UPDATE notifications 
             SET is_read = 1
             WHERE id = $1 AND receiver_id = $2`,
            [notificationId, userId]
        );

        const record = await db.query(
            `SELECT * FROM notifications WHERE id = $1`,
            [notificationId]
        );
        return record.rows[0];
    } catch (error) {
        console.error('Mark notification read error:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read for a user
 */
async function markAllAsRead(userId) {
    try {
        const result = await db.query(
            `UPDATE notifications SET is_read = 1 WHERE receiver_id = $1 AND is_read = 0`,
            [userId]
        );
        return { updated: result.rowCount || 0 };
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        throw error;
    }
}

/**
 * Get count of unread notifications
 */
async function getUnreadCount(userId) {
    try {
        const result = await db.query(
            `SELECT COUNT(*) as count FROM notifications 
             WHERE receiver_id = $1 AND is_read = 0`,
            [userId]
        );
        return parseInt(result.rows[0]?.count) || 0;
    } catch (error) {
        console.error('Get unread notification count error:', error);
        throw error;
    }
}

module.exports = {
    initSocket,
    createNotification,
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount
};
