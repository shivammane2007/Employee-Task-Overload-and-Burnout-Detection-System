/**
 * =====================================================
 * Alert Service - SQLite Compatible
 * Manages system alerts and notifications
 * =====================================================
 */

const db = require('../config/db');

/**
 * Create a new alert
 */
async function createAlert(data) {
    try {
        const { userId, type, title, message, priority = 'medium', relatedId = null } = data;

        const result = await db.query(
            `INSERT INTO alerts (user_id, type, title, message, priority, related_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, type, title, message, priority, relatedId]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Create alert error:', error);
        throw error;
    }
}

/**
 * Create high workload alert
 */
async function createHighWorkloadAlert(employee, workload) {
    try {
        // Alert for employee
        await createAlert({
            userId: employee.id,
            type: 'high_workload',
            title: 'High Workload Detected',
            message: `Your current workload score is ${workload.score}. Consider reviewing your task priorities.`,
            priority: workload.riskLevel === 'high' ? 'high' : 'medium'
        });

        // Alert for manager if exists
        if (employee.manager_id) {
            await createAlert({
                userId: employee.manager_id,
                type: 'team_high_workload',
                title: `Team Member High Workload: ${employee.name}`,
                message: `${employee.name} has a workload score of ${workload.score}. Consider task redistribution.`,
                priority: workload.riskLevel === 'high' ? 'high' : 'medium'
            });
        }

        return true;
    } catch (error) {
        console.error('Create high workload alert error:', error);
        throw error;
    }
}

/**
 * Get alerts for a user
 */
async function getAlerts(userId, options = {}) {
    try {
        const { unreadOnly = false, limit = 20 } = options;

        let query = `SELECT * FROM alerts WHERE user_id = $1`;
        const params = [userId];
        let paramIndex = 2;

        if (unreadOnly) {
            query += ` AND is_read = 0`;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await db.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Get alerts error:', error);
        throw error;
    }
}

/**
 * Mark alert as read
 */
async function markAsRead(alertId, userId) {
    try {
        const result = await db.query(
            `UPDATE alerts 
             SET is_read = 1
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [alertId, userId]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Mark as read error:', error);
        throw error;
    }
}

/**
 * Mark all alerts as read for a user
 */
async function markAllAsRead(userId) {
    try {
        const result = await db.query(
            `UPDATE alerts SET is_read = 1 WHERE user_id = $1 AND is_read = 0`,
            [userId]
        );
        return { updated: result.rowCount || 0 };
    } catch (error) {
        console.error('Mark all as read error:', error);
        throw error;
    }
}

/**
 * Dismiss alert
 */
async function dismissAlert(alertId, userId) {
    try {
        const result = await db.query(
            `UPDATE alerts 
             SET is_dismissed = 1
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [alertId, userId]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Dismiss alert error:', error);
        throw error;
    }
}

/**
 * Get unread alert count
 */
async function getUnreadCount(userId) {
    try {
        const result = await db.query(
            `SELECT COUNT(*) as count FROM alerts 
             WHERE user_id = $1 AND is_read = 0 AND is_dismissed = 0`,
            [userId]
        );
        return parseInt(result.rows[0]?.count) || 0;
    } catch (error) {
        console.error('Get unread count error:', error);
        throw error;
    }
}

/**
 * Delete old alerts
 */
async function cleanupOldAlerts(daysOld = 30) {
    try {
        const result = await db.query(
            `DELETE FROM alerts 
             WHERE created_at < date('now', '-' || $1 || ' days')`,
            [daysOld]
        );
        return { deleted: result.rowCount || 0 };
    } catch (error) {
        console.error('Cleanup old alerts error:', error);
        throw error;
    }
}

module.exports = {
    createAlert,
    createHighWorkloadAlert,
    getAlerts,
    markAsRead,
    markAllAsRead,
    dismissAlert,
    getUnreadCount,
    cleanupOldAlerts
};
