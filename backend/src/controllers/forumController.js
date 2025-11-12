const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ForumThread, ForumReply, Course, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Validation schema for creating a forum thread
 */
const createThreadSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Title is required',
    'string.max': 'Title must not exceed 255 characters',
    'any.required': 'Title is required'
  }),
  content: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Content is required',
    'any.required': 'Content is required'
  }),
  attachments: Joi.array().items(Joi.string().uri()).default([])
});

/**
 * Validation schema for creating a reply
 */
const createReplySchema = Joi.object({
  content: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Content is required',
    'any.required': 'Content is required'
  }),
  attachments: Joi.array().items(Joi.string().uri()).default([])
});

/**
 * @desc    Create forum thread
 * @route   POST /api/courses/:courseId/forum
 * @access  Private
 */
const createThread = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Validate request body
  const { error, value } = createThreadSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Check if course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Create thread
  const thread = await ForumThread.create({
    course_id: courseId,
    author_id: req.user.id,
    ...value
  });

  // Fetch thread with author info
  const threadWithAuthor = await ForumThread.findByPk(thread.id, {
    include: [{
      model: User,
      as: 'author',
      attributes: ['id', 'name', 'email', 'role']
    }]
  });

  res.status(201).json({
    success: true,
    data: threadWithAuthor,
    message: 'Forum thread created successfully'
  });
});

/**
 * @desc    Get forum threads with pagination
 * @route   GET /api/courses/:courseId/forum
 * @access  Private
 */
const getThreads = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { search, author, date_from, date_to } = req.query;

  // Check if course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Build where clause
  const where = { course_id: courseId };

  // Search in title and content
  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { content: { [Op.iLike]: `%${search}%` } }
    ];
  }

  // Filter by author
  if (author) {
    where.author_id = author;
  }

  // Filter by date range
  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) {
      where.created_at[Op.gte] = new Date(date_from);
    }
    if (date_to) {
      where.created_at[Op.lte] = new Date(date_to);
    }
  }

  // Get threads with pagination
  const { count, rows: threads } = await ForumThread.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']],
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'role']
      },
      {
        model: ForumReply,
        as: 'replies',
        attributes: ['id'],
        separate: true
      }
    ]
  });

  // Add reply count to each thread
  const threadsWithCount = threads.map(thread => {
    const threadData = thread.toJSON();
    threadData.reply_count = threadData.replies ? threadData.replies.length : 0;
    delete threadData.replies;
    return threadData;
  });

  res.status(200).json({
    success: true,
    data: {
      threads: threadsWithCount,
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
 * @desc    Get thread detail with nested replies
 * @route   GET /api/forum/:threadId
 * @access  Private
 */
const getThreadById = asyncHandler(async (req, res) => {
  const { threadId } = req.params;

  // Find thread with author and replies
  const thread = await ForumThread.findByPk(threadId, {
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'role']
      },
      {
        model: ForumReply,
        as: 'replies',
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email', 'role']
        }],
        order: [['created_at', 'ASC']]
      }
    ]
  });

  if (!thread) {
    throw ApiError.notFound('Forum thread not found');
  }

  res.status(200).json({
    success: true,
    data: thread
  });
});

/**
 * @desc    Add reply to thread
 * @route   POST /api/forum/:threadId/reply
 * @access  Private
 */
const createReply = asyncHandler(async (req, res) => {
  const { threadId } = req.params;

  // Validate request body
  const { error, value } = createReplySchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Check if thread exists
  const thread = await ForumThread.findByPk(threadId);
  if (!thread) {
    throw ApiError.notFound('Forum thread not found');
  }

  // Create reply
  const reply = await ForumReply.create({
    thread_id: threadId,
    author_id: req.user.id,
    ...value
  });

  // Fetch reply with author info
  const replyWithAuthor = await ForumReply.findByPk(reply.id, {
    include: [{
      model: User,
      as: 'author',
      attributes: ['id', 'name', 'email', 'role']
    }]
  });

  res.status(201).json({
    success: true,
    data: replyWithAuthor,
    message: 'Reply added successfully'
  });
});

/**
 * @desc    Update forum thread
 * @route   PUT /api/forum/:threadId
 * @access  Private (Author only)
 */
const updateThread = asyncHandler(async (req, res) => {
  const { threadId } = req.params;

  // Validate request body
  const { error, value } = createThreadSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Find thread
  const thread = await ForumThread.findByPk(threadId);
  if (!thread) {
    throw ApiError.notFound('Forum thread not found');
  }

  // Verify user is the author
  if (thread.author_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to update this thread');
  }

  // Update thread
  await thread.update(value);

  // Fetch updated thread with author info
  const updatedThread = await ForumThread.findByPk(threadId, {
    include: [{
      model: User,
      as: 'author',
      attributes: ['id', 'name', 'email', 'role']
    }]
  });

  res.status(200).json({
    success: true,
    data: updatedThread,
    message: 'Thread updated successfully'
  });
});

/**
 * @desc    Delete forum thread
 * @route   DELETE /api/forum/:threadId
 * @access  Private (Author or Instructor only)
 */
const deleteThread = asyncHandler(async (req, res) => {
  const { threadId } = req.params;

  // Find thread
  const thread = await ForumThread.findByPk(threadId, {
    include: [{
      model: Course,
      as: 'course',
      attributes: ['id', 'instructor_id']
    }]
  });

  if (!thread) {
    throw ApiError.notFound('Forum thread not found');
  }

  // Verify user is the author or course instructor
  if (thread.author_id !== req.user.id && thread.course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to delete this thread');
  }

  // Delete thread (replies will be cascade deleted)
  await thread.destroy();

  res.status(200).json({
    success: true,
    message: 'Thread deleted successfully'
  });
});

/**
 * @desc    Update forum reply
 * @route   PUT /api/forum/reply/:replyId
 * @access  Private (Author only)
 */
const updateReply = asyncHandler(async (req, res) => {
  const { replyId } = req.params;

  // Validate request body
  const { error, value } = createReplySchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Find reply
  const reply = await ForumReply.findByPk(replyId);
  if (!reply) {
    throw ApiError.notFound('Reply not found');
  }

  // Verify user is the author
  if (reply.author_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to update this reply');
  }

  // Update reply
  await reply.update(value);

  // Fetch updated reply with author info
  const updatedReply = await ForumReply.findByPk(replyId, {
    include: [{
      model: User,
      as: 'author',
      attributes: ['id', 'name', 'email', 'role']
    }]
  });

  res.status(200).json({
    success: true,
    data: updatedReply,
    message: 'Reply updated successfully'
  });
});

/**
 * @desc    Delete forum reply
 * @route   DELETE /api/forum/reply/:replyId
 * @access  Private (Author or Instructor only)
 */
const deleteReply = asyncHandler(async (req, res) => {
  const { replyId } = req.params;

  // Find reply with thread and course info
  const reply = await ForumReply.findByPk(replyId, {
    include: [{
      model: ForumThread,
      as: 'thread',
      include: [{
        model: Course,
        as: 'course',
        attributes: ['id', 'instructor_id']
      }]
    }]
  });

  if (!reply) {
    throw ApiError.notFound('Reply not found');
  }

  // Verify user is the author or course instructor
  if (reply.author_id !== req.user.id && reply.thread.course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to delete this reply');
  }

  // Delete reply
  await reply.destroy();

  res.status(200).json({
    success: true,
    message: 'Reply deleted successfully'
  });
});

module.exports = {
  createThread,
  getThreads,
  getThreadById,
  createReply,
  updateThread,
  deleteThread,
  updateReply,
  deleteReply
};
