const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Question } = require('../models');
const { Op } = require('sequelize');

/**
 * Validation schema for creating a question
 */
const createQuestionSchema = Joi.object({
  type: Joi.string().valid('multiple_choice', 'true_false', 'short_answer', 'essay').required().messages({
    'any.only': 'Type must be one of: multiple_choice, true_false, short_answer, essay',
    'any.required': 'Type is required'
  }),
  question_text: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Question text is required',
    'any.required': 'Question text is required'
  }),
  options: Joi.array().items(Joi.string()).when('type', {
    is: Joi.string().valid('multiple_choice', 'true_false'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': 'Options are required for multiple choice and true/false questions'
  }),
  correct_answer: Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.number()))
  ).optional(),
  points: Joi.number().integer().min(0).default(1).messages({
    'number.base': 'Points must be a number',
    'number.min': 'Points must be at least 0'
  }),
  tags: Joi.array().items(Joi.string()).default([])
});

/**
 * Validation schema for updating a question
 */
const updateQuestionSchema = Joi.object({
  type: Joi.string().valid('multiple_choice', 'true_false', 'short_answer', 'essay').optional().messages({
    'any.only': 'Type must be one of: multiple_choice, true_false, short_answer, essay'
  }),
  question_text: Joi.string().trim().min(1).optional().messages({
    'string.empty': 'Question text cannot be empty'
  }),
  options: Joi.array().items(Joi.string()).optional(),
  correct_answer: Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.number()))
  ).optional(),
  points: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Points must be a number',
    'number.min': 'Points must be at least 0'
  }),
  tags: Joi.array().items(Joi.string()).optional()
}).min(1);

/**
 * @desc    Create question in question bank
 * @route   POST /api/question-bank
 * @access  Private (Instructor only)
 */
const createQuestion = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = createQuestionSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Create question
  const question = await Question.create({
    instructor_id: req.user.id,
    ...value
  });

  res.status(201).json({
    success: true,
    data: question,
    message: 'Question created successfully'
  });
});

/**
 * @desc    Get questions with search and filter
 * @route   GET /api/question-bank
 * @access  Private (Instructor only)
 */
const getQuestions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { search, type, tags } = req.query;

  // Build where clause
  const where = {
    instructor_id: req.user.id
  };

  // Search in question text
  if (search) {
    where.question_text = {
      [Op.iLike]: `%${search}%`
    };
  }

  // Filter by type
  if (type) {
    const validTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay'];
    if (!validTypes.includes(type)) {
      throw new ApiError(400, 'Invalid question type', 'VALIDATION_ERROR');
    }
    where.type = type;
  }

  // Filter by tags
  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    where.tags = {
      [Op.contains]: tagArray
    };
  }

  // Get questions with pagination
  const { count, rows: questions } = await Question.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']]
  });

  res.status(200).json({
    success: true,
    data: {
      questions,
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
 * @desc    Get single question by ID
 * @route   GET /api/question-bank/:id
 * @access  Private (Instructor only)
 */
const getQuestionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const question = await Question.findOne({
    where: {
      id,
      instructor_id: req.user.id
    }
  });

  if (!question) {
    throw ApiError.notFound('Question not found');
  }

  res.status(200).json({
    success: true,
    data: question
  });
});

/**
 * @desc    Update question
 * @route   PUT /api/question-bank/:id
 * @access  Private (Instructor only)
 */
const updateQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = updateQuestionSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Find question
  const question = await Question.findOne({
    where: {
      id,
      instructor_id: req.user.id
    }
  });

  if (!question) {
    throw ApiError.notFound('Question not found');
  }

  // Update question
  await question.update(value);

  res.status(200).json({
    success: true,
    data: question,
    message: 'Question updated successfully'
  });
});

/**
 * @desc    Delete question
 * @route   DELETE /api/question-bank/:id
 * @access  Private (Instructor only)
 */
const deleteQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find question
  const question = await Question.findOne({
    where: {
      id,
      instructor_id: req.user.id
    }
  });

  if (!question) {
    throw ApiError.notFound('Question not found');
  }

  // Delete question
  await question.destroy();

  res.status(200).json({
    success: true,
    message: 'Question deleted successfully'
  });
});

module.exports = {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion
};
