const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const notificationService = require('../services/notificationService');

/**
 * @desc    Get notifications with unread count
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  // Get notifications
  const result = await notificationService.getUserNotifications(req.user.id, page, limit);

  // Get unread count
  const unreadCount = await notificationService.getUnreadCount(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      ...result,
      unread_count: unreadCount
    }
  });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await notificationService.markAsRead(id, req.user.id);

  res.status(200).json({
    success: true,
    data: notification,
    message: 'Notification marked as read'
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const updatedCount = await notificationService.markAllAsRead(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      marked_read: updatedCount
    },
    message: 'All notifications marked as read'
  });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await notificationService.deleteNotification(id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully'
  });
});

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      unread_count: count
    }
  });
});

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
};
