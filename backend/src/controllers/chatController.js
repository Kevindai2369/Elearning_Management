const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ChatConversation, ChatMessage, User, Student } = require('../models');
const { Op } = require('sequelize');

/**
 * Validation schema for sending a message
 */
const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Content is required',
    'any.required': 'Content is required'
  }),
  attachment_url: Joi.string().uri().allow(null).optional()
});

/**
 * @desc    Get conversation list
 * @route   GET /api/chat/conversations
 * @access  Private
 */
const getConversations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Build where clause based on user role
  const where = {};
  if (req.user.role === 'student') {
    where.student_id = req.user.id;
  } else if (req.user.role === 'instructor') {
    where.instructor_id = req.user.id;
  }

  // Get conversations with pagination
  const { count, rows: conversations } = await ChatConversation.findAndCountAll({
    where,
    limit,
    offset,
    order: [['updated_at', 'DESC']],
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'email', 'avatar_url']
      },
      {
        model: User,
        as: 'instructor',
        attributes: ['id', 'name', 'email', 'avatar_url']
      },
      {
        model: ChatMessage,
        as: 'messages',
        limit: 1,
        order: [['created_at', 'DESC']],
        separate: true
      }
    ]
  });

  // Add last message and unread count to each conversation
  const conversationsWithDetails = await Promise.all(
    conversations.map(async (conversation) => {
      const conversationData = conversation.toJSON();
      
      // Get last message
      conversationData.last_message = conversationData.messages[0] || null;
      delete conversationData.messages;

      // Get unread count
      const unreadCount = await ChatMessage.count({
        where: {
          conversation_id: conversation.id,
          sender_id: { [Op.ne]: req.user.id },
          is_read: false
        }
      });
      conversationData.unread_count = unreadCount;

      return conversationData;
    })
  );

  res.status(200).json({
    success: true,
    data: {
      conversations: conversationsWithDetails,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    }
  });
});

/**
 * @desc    Get or create conversation
 * @route   POST /api/chat/conversations
 * @access  Private
 */
const getOrCreateConversation = asyncHandler(async (req, res) => {
  const { participant_id } = req.body;

  if (!participant_id) {
    throw new ApiError(400, 'Participant ID is required', 'VALIDATION_ERROR');
  }

  // Verify participant exists
  const participant = await User.findByPk(participant_id);
  if (!participant) {
    throw ApiError.notFound('Participant not found');
  }

  // Determine student and instructor IDs
  let studentId, instructorId;
  
  if (req.user.role === 'student') {
    if (participant.role !== 'instructor') {
      throw new ApiError(400, 'Students can only chat with instructors', 'VALIDATION_ERROR');
    }
    studentId = req.user.id;
    instructorId = participant_id;
  } else if (req.user.role === 'instructor') {
    if (participant.role !== 'student') {
      throw new ApiError(400, 'Instructors can only chat with students', 'VALIDATION_ERROR');
    }
    studentId = participant_id;
    instructorId = req.user.id;
  } else {
    throw new ApiError(400, 'Invalid user role', 'VALIDATION_ERROR');
  }

  // Find or create conversation
  let conversation = await ChatConversation.findOne({
    where: {
      student_id: studentId,
      instructor_id: instructorId
    },
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'email', 'avatar_url']
      },
      {
        model: User,
        as: 'instructor',
        attributes: ['id', 'name', 'email', 'avatar_url']
      }
    ]
  });

  if (!conversation) {
    conversation = await ChatConversation.create({
      student_id: studentId,
      instructor_id: instructorId
    });

    // Fetch with user details
    conversation = await ChatConversation.findByPk(conversation.id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'avatar_url']
        },
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'name', 'email', 'avatar_url']
        }
      ]
    });
  }

  res.status(200).json({
    success: true,
    data: conversation
  });
});

/**
 * @desc    Get message history
 * @route   GET /api/chat/:conversationId/messages
 * @access  Private
 */
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  // Verify conversation exists and user is a participant
  const conversation = await ChatConversation.findByPk(conversationId);
  if (!conversation) {
    throw ApiError.notFound('Conversation not found');
  }

  // Check if user is a participant
  if (conversation.student_id !== req.user.id && conversation.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You are not a participant in this conversation');
  }

  // Get messages with pagination
  const { count, rows: messages } = await ChatMessage.findAndCountAll({
    where: { conversation_id: conversationId },
    limit,
    offset,
    order: [['created_at', 'DESC']],
    include: [{
      model: User,
      as: 'sender',
      attributes: ['id', 'name', 'email', 'avatar_url', 'role']
    }]
  });

  res.status(200).json({
    success: true,
    data: {
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    }
  });
});

/**
 * @desc    Send message (REST API fallback)
 * @route   POST /api/chat/:conversationId/messages
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Validate request body
  const { error, value } = sendMessageSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Verify conversation exists and user is a participant
  const conversation = await ChatConversation.findByPk(conversationId);
  if (!conversation) {
    throw ApiError.notFound('Conversation not found');
  }

  // Check if user is a participant
  if (conversation.student_id !== req.user.id && conversation.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You are not a participant in this conversation');
  }

  // Create message
  const message = await ChatMessage.create({
    conversation_id: conversationId,
    sender_id: req.user.id,
    content: value.content,
    attachment_url: value.attachment_url || null,
    is_read: false
  });

  // Fetch message with sender info
  const messageWithSender = await ChatMessage.findByPk(message.id, {
    include: [{
      model: User,
      as: 'sender',
      attributes: ['id', 'name', 'email', 'avatar_url', 'role']
    }]
  });

  // Update conversation updated_at
  await conversation.update({ updated_at: new Date() });

  res.status(201).json({
    success: true,
    data: messageWithSender,
    message: 'Message sent successfully'
  });
});

/**
 * @desc    Mark messages as read
 * @route   PUT /api/chat/:conversationId/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Verify conversation exists and user is a participant
  const conversation = await ChatConversation.findByPk(conversationId);
  if (!conversation) {
    throw ApiError.notFound('Conversation not found');
  }

  // Check if user is a participant
  if (conversation.student_id !== req.user.id && conversation.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You are not a participant in this conversation');
  }

  // Mark all unread messages from other participant as read
  const [updatedCount] = await ChatMessage.update(
    { is_read: true },
    {
      where: {
        conversation_id: conversationId,
        sender_id: { [Op.ne]: req.user.id },
        is_read: false
      }
    }
  );

  res.status(200).json({
    success: true,
    data: {
      marked_read: updatedCount
    },
    message: 'Messages marked as read'
  });
});

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead
};
