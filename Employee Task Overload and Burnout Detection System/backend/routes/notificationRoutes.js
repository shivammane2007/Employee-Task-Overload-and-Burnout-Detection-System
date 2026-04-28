/**
 * =====================================================
 * Notification Routes
 * Endpoints for real-time notifications
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// All notification routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/:userId', notificationController.getUserNotifications);

// Mark notification as read
router.put('/read/:id', notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

// Get unread notification count
router.get('/count/unread', notificationController.getUnreadCount);

module.exports = router;
