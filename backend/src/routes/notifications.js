const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
} = require('../controllers/notificationController');

// Get notifications with unread count
router.get('/notifications', authenticate, getNotifications);

// Get unread notification count
router.get('/notifications/unread-count', authenticate, getUnreadCount);

// Mark all notifications as read
router.put('/notifications/read-all', authenticate, markAllAsRead);

// Mark notification as read
router.put('/notifications/:id/read', authenticate, markNotificationAsRead);

// Delete notification
router.delete('/notifications/:id', authenticate, deleteNotification);

module.exports = router;
