const { getIO } = require('../config/socket');
const notificationService = require('../services/notificationService');

/**
 * Initialize notification socket handlers
 */
const initializeNotificationSocket = () => {
  const io = getIO();

  io.on('connection', (socket) => {
    /**
     * Get unread notification count
     */
    socket.on('notification:get_unread_count', async () => {
      try {
        const count = await notificationService.getUnreadCount(socket.user.id);
        
        socket.emit('notification:unread_count', {
          count
        });
      } catch (error) {
        console.error('Error getting unread count:', error);
        socket.emit('notification:error', { message: 'Failed to get unread count' });
      }
    });

    /**
     * Mark notification as read
     */
    socket.on('notification:mark_read', async (data) => {
      try {
        const { notificationId } = data;
        
        await notificationService.markAsRead(notificationId, socket.user.id);
        
        socket.emit('notification:marked_read', {
          notificationId
        });

        // Send updated unread count
        const count = await notificationService.getUnreadCount(socket.user.id);
        socket.emit('notification:unread_count', { count });
      } catch (error) {
        console.error('Error marking notification as read:', error);
        socket.emit('notification:error', { message: 'Failed to mark notification as read' });
      }
    });

    /**
     * Mark all notifications as read
     */
    socket.on('notification:mark_all_read', async () => {
      try {
        await notificationService.markAllAsRead(socket.user.id);
        
        socket.emit('notification:all_marked_read');
        socket.emit('notification:unread_count', { count: 0 });
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        socket.emit('notification:error', { message: 'Failed to mark all notifications as read' });
      }
    });
  });

  console.log('Notification socket handlers initialized');
};

module.exports = {
  initializeNotificationSocket
};
