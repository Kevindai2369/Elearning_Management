const express = require('express');
const { checkDatabaseHealth } = require('../config/database');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const semesterRoutes = require('./semesters');
const courseRoutes = require('./courses');
const groupRoutes = require('./groups');
const studentRoutes = require('./students');
const contentRoutes = require('./content');
const questionBankRoutes = require('./questionBank');
const quizRoutes = require('./quizzes');
const forumRoutes = require('./forum');
const chatRoutes = require('./chat');
const notificationRoutes = require('./notifications');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    
    const healthStatus = {
      success: true,
      status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: 'healthy',
          uptime: process.uptime()
        },
        database: dbHealth
      }
    };
    
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database health check endpoint (detailed)
router.get('/health/db', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      success: dbHealth.status === 'healthy',
      data: dbHealth
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_HEALTH_CHECK_FAILED',
        message: error.message
      }
    });
  }
});

// API version info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'E-Learning Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      dbHealth: '/api/health/db',
      auth: '/api/auth',
      semesters: '/api/semesters',
      courses: '/api/courses',
      groups: '/api/groups',
      students: '/api/students',
      content: '/api/content',
      questionBank: '/api/question-bank',
      quizzes: '/api/quizzes',
      forum: '/api/forum',
      chat: '/api/chat',
      notifications: '/api/notifications'
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/semesters', semesterRoutes);
router.use('/courses', courseRoutes);
router.use('/groups', groupRoutes);
router.use('/students', studentRoutes);
router.use('/', contentRoutes);
router.use('/question-bank', questionBankRoutes);
router.use('/', quizRoutes);
router.use('/', forumRoutes);
router.use('/', chatRoutes);
router.use('/', notificationRoutes);

module.exports = router;
