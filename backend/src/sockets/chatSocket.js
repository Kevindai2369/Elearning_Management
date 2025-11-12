const { ChatConversation, ChatMessage, User } = require('../models');
const { getIO, emitToUser } = require('../config/socket');

/**
 * Initialize chat socket handlers
 */
const initializeChatSocket = () => {
  const io = getIO();

  io.on('connection', (socket) => {
    /**
     * Join conversation room
     */
    socket.on('chat:join', async (data) => {
      try {
        const { conversationId } = data;

        // Verify conversation exists and user is a participant
        const conversation = await ChatConversation.findByPk(conversationId);
        
        if (!conversation) {
          socket.emit('chat:error', { message: 'Conversation not found' });
          return;
        }

        // Check if user is a participant
        if (conversation.student_id !== socket.user.id && conversation.instructor_id !== socket.user.id) {
          socket.emit('chat:error', { message: 'You are not a participant in this conversation' });
          return;
        }

        // Join conversation room
        socket.join(`conversation:${conversationId}`);
        
        socket.emit('chat:joined', { conversationId });
        console.log(`User ${socket.user.id} joined conversation ${conversationId}`);
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('chat:error', { message: 'Failed to join conversation' });
      }
    });

    /**
     * Leave conversation room
     */
    socket.on('chat:leave', (data) => {
      const { conversationId } = data;
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${socket.user.id} left conversation ${conversationId}`);
    });

    /**
     * Send message
     */
    socket.on('chat:send', async (data) => {
      try {
        const { conversationId, content, attachmentUrl } = data;

        // Verify conversation exists and user is a participant
        const conversation = await ChatConversation.findByPk(conversationId);
        
        if (!conversation) {
          socket.emit('chat:error', { message: 'Conversation not found' });
          return;
        }

        // Check if user is a participant
        if (conversation.student_id !== socket.user.id && conversation.instructor_id !== socket.user.id) {
          socket.emit('chat:error', { message: 'You are not a participant in this conversation' });
          return;
        }

        // Create message
        const message = await ChatMessage.create({
          conversation_id: conversationId,
          sender_id: socket.user.id,
          content,
          attachment_url: attachmentUrl || null,
          is_read: false
        });

        // Fetch message with sender info
        const messageWithSender = await ChatMessage.findByPk(message.id, {
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'email', 'role']
          }]
        });

        // Emit to conversation room
        io.to(`conversation:${conversationId}`).emit('chat:message', messageWithSender);

        // Determine recipient
        const recipientId = conversation.student_id === socket.user.id 
          ? conversation.instructor_id 
          : conversation.student_id;

        // Emit notification to recipient
        emitToUser(recipientId, 'notification:new', {
          type: 'new_message',
          title: 'New Message',
          body: `${socket.user.name} sent you a message`,
          data: {
            conversationId,
            messageId: message.id
          }
        });

        console.log(`Message sent in conversation ${conversationId} by user ${socket.user.id}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    /**
     * Mark message as read
     */
    socket.on('chat:read', async (data) => {
      try {
        const { messageId } = data;

        // Find message
        const message = await ChatMessage.findByPk(messageId, {
          include: [{
            model: ChatConversation,
            as: 'conversation'
          }]
        });

        if (!message) {
          socket.emit('chat:error', { message: 'Message not found' });
          return;
        }

        // Verify user is a participant
        const conversation = message.conversation;
        if (conversation.student_id !== socket.user.id && conversation.instructor_id !== socket.user.id) {
          socket.emit('chat:error', { message: 'You are not a participant in this conversation' });
          return;
        }

        // Mark as read if user is not the sender
        if (message.sender_id !== socket.user.id && !message.is_read) {
          await message.update({ is_read: true });

          // Emit read receipt to conversation room
          io.to(`conversation:${conversation.id}`).emit('chat:message_read', {
            messageId: message.id,
            conversationId: conversation.id,
            readBy: socket.user.id
          });

          console.log(`Message ${messageId} marked as read by user ${socket.user.id}`);
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
        socket.emit('chat:error', { message: 'Failed to mark message as read' });
      }
    });

    /**
     * Typing indicator - start
     */
    socket.on('chat:typing_start', async (data) => {
      try {
        const { conversationId } = data;

        // Verify conversation exists and user is a participant
        const conversation = await ChatConversation.findByPk(conversationId);
        
        if (!conversation) {
          return;
        }

        // Check if user is a participant
        if (conversation.student_id !== socket.user.id && conversation.instructor_id !== socket.user.id) {
          return;
        }

        // Emit to conversation room (except sender)
        socket.to(`conversation:${conversationId}`).emit('chat:typing', {
          conversationId,
          userId: socket.user.id,
          userName: socket.user.name,
          isTyping: true
        });
      } catch (error) {
        console.error('Error handling typing start:', error);
      }
    });

    /**
     * Typing indicator - stop
     */
    socket.on('chat:typing_stop', async (data) => {
      try {
        const { conversationId } = data;

        // Verify conversation exists and user is a participant
        const conversation = await ChatConversation.findByPk(conversationId);
        
        if (!conversation) {
          return;
        }

        // Check if user is a participant
        if (conversation.student_id !== socket.user.id && conversation.instructor_id !== socket.user.id) {
          return;
        }

        // Emit to conversation room (except sender)
        socket.to(`conversation:${conversationId}`).emit('chat:typing', {
          conversationId,
          userId: socket.user.id,
          userName: socket.user.name,
          isTyping: false
        });
      } catch (error) {
        console.error('Error handling typing stop:', error);
      }
    });
  });

  console.log('Chat socket handlers initialized');
};

module.exports = {
  initializeChatSocket
};
