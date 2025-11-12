const { Notification, User } = require('../models');
const { emitToUser } = require('../config/socket');
const emailService = require('./emailService');

/**
 * Notification types enum
 */
const NotificationTypes = {
  NEW_ANNOUNCEMENT: 'new_announcement',
  NEW_ASSIGNMENT: 'new_assignment',
  ASSIGNMENT_DUE_SOON: 'assignment_due_soon',
  ASSIGNMENT_GRADED: 'assignment_graded',
  NEW_QUIZ: 'new_quiz',
  QUIZ_GRADED: 'quiz_graded',
  NEW_MATERIAL: 'new_material',
  NEW_FORUM_POST: 'new_forum_post',
  NEW_FORUM_REPLY: 'new_forum_reply',
  NEW_MESSAGE: 'new_message',
  COURSE_ENROLLMENT: 'course_enrollment'
};

/**
 * Create notification for a user
 * @param {String} userId - User ID
 * @param {String} type - Notification type
 * @param {String} title - Notification title
 * @param {String} body - Notification body
 * @param {Object} data - Additional data
 * @param {Boolean} sendEmail - Whether to send email notification
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async (userId, type, title, body, data = {}, sendEmail = false) => {
  try {
    // Create notification in database
    const notification = await Notification.create({
      user_id: userId,
      type,
      title,
      body,
      data,
      is_read: false
    });

    // Emit real-time notification via Socket.IO
    try {
      emitToUser(userId, 'notification:new', notification);
    } catch (socketError) {
      console.error('Failed to emit notification via Socket.IO:', socketError.message);
      // Continue even if socket emission fails
    }

    // Send email notification if requested
    if (sendEmail) {
      try {
        const user = await User.findByPk(userId, {
          attributes: ['id', 'email', 'name']
        });

        if (user && user.email) {
          await emailService.sendNotificationEmail(user.email, user.name, title, body, data);
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError.message);
        // Continue even if email fails
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create notifications for multiple users
 * @param {Array<String>} userIds - Array of user IDs
 * @param {String} type - Notification type
 * @param {String} title - Notification title
 * @param {String} body - Notification body
 * @param {Object} data - Additional data
 * @param {Boolean} sendEmail - Whether to send email notifications
 * @returns {Promise<Array>} Created notifications
 */
const createBulkNotifications = async (userIds, type, title, body, data = {}, sendEmail = false) => {
  try {
    const notifications = await Promise.all(
      userIds.map(userId => createNotification(userId, type, title, body, data, sendEmail))
    );
    return notifications;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};

/**
 * Get unread notification count for a user
 * @param {String} userId - User ID
 * @returns {Promise<Number>} Unread count
 */
const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID (for verification)
 * @returns {Promise<Object>} Updated notification
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        user_id: userId
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.update({ is_read: true });
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {String} userId - User ID
 * @returns {Promise<Number>} Number of notifications marked as read
 */
const markAllAsRead = async (userId) => {
  try {
    const [updatedCount] = await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: userId,
          is_read: false
        }
      }
    );
    return updatedCount;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete notification
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID (for verification)
 * @returns {Promise<Boolean>} Success status
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        user_id: userId
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.destroy();
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Get notifications for a user with pagination
 * @param {String} userId - User ID
 * @param {Number} page - Page number
 * @param {Number} limit - Items per page
 * @returns {Promise<Object>} Notifications and pagination info
 */
const getUserNotifications = async (userId, page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: { user_id: userId },
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      notifications,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

module.exports = {
  NotificationTypes,
  createNotification,
  createBulkNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUserNotifications
};
