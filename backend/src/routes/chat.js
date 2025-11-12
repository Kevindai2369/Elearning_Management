const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead
} = require('../controllers/chatController');

// Get conversation list
router.get('/chat/conversations', authenticate, getConversations);

// Get or create conversation
router.post('/chat/conversations', authenticate, getOrCreateConversation);

// Get message history
router.get('/chat/:conversationId/messages', authenticate, getMessages);

// Send message (REST API fallback)
router.post('/chat/:conversationId/messages', authenticate, sendMessage);

// Mark messages as read
router.put('/chat/:conversationId/read', authenticate, markAsRead);

module.exports = router;
