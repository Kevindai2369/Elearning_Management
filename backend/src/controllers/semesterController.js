const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Semester, Course } = require('../models');
const { Op } = require('sequelize');

/**
 * Validation schema for creating a semester
 */
const createSemesterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Semester name is required',
    'string.max': 'Semester name must not exceed 255 characters',
    'any.required': 'Semester name is required'
  }),
  code: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'Semester code is required',
    'string.max': 'Semester code must not exceed 50 characters',
    'any.required': 'Semester code is required'
  }),
  start_date: Joi.date().iso().required().messages({
    'date.base': 'Start date must be a valid date',
    'any.required': 'Start date is required'
  }),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).required().messages({
    'date.base': 'End date must be a valid date',
    'date.greater': 'End date must be after start date',
    'any.required': 'End date is required'
  }),
  is_active: Joi.boolean().optional()
});

/**
 * Validation schema for updating a semester
 */
const updateSemesterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional().messages({
    'string.empty': 'Semester name cannot be empty',
    'string.max': 'Semester name must not exceed 255 characters'
  }),
  code: Joi.string().trim().min(1).max(50).optional().messages({
    'string.empty': 'Semester code cannot be empty',
    'string.max': 'Semester code must not exceed 50 characters'
  }),
  start_date: Joi.date().iso().optional().messages({
    'date.base': 'Start date must be a valid date'
  }),
  end_date: Joi.date().iso().optional().messages({
    'date.base': 'End date must be a valid date'
  }),
  is_active: Joi.boolean().optional()
}).min(1);

/**
 * @desc    Get all semesters with pagination
 * @route   GET /api/semesters
 * @access  Private
 */
const getSemesters = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Build filter conditions
  const where = {};
  
  if (req.query.is_active !== undefined) {
    where.is_active = req.query.is_active === 'true';
  }

  if (req.query.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${req.query.search}%` } },
      { code: { [Op.iLike]: `%${req.query.search}%` } }
    ];
  }

  // Get semesters with pagination
  const { count, rows: semesters } = await Semester.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']],
    attributes: ['id', 'name', 'code', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at']
  });

  res.status(200).json({
    success: true,
    data: {
      semesters,
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
 * @desc    Get semester by ID
 * @route   GET /api/semesters/:id
 * @access  Private
 */
const getSemesterById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const semester = await Semester.findByPk(id, {
    attributes: ['id', 'name', 'code', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at'],
    include: [
      {
        model: Course,
        as: 'courses',
        attributes: ['id', 'name', 'code']
      }
    ]
  });

  if (!semester) {
    throw ApiError.notFound('Semester not found');
  }

  res.status(200).json({
    success: true,
    data: semester
  });
});

/**
 * @desc    Create new semester
 * @route   POST /api/semesters
 * @access  Private (Instructor only)
 */
const createSemester = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = createSemesterSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Check for duplicate semester code
  const existingSemester = await Semester.findOne({
    where: { code: value.code }
  });

  if (existingSemester) {
    throw ApiError.conflict('Semester code already exists', {
      field: 'code',
      value: value.code
    });
  }

  // Create semester
  const semester = await Semester.create(value);

  res.status(201).json({
    success: true,
    data: semester,
    message: 'Semester created successfully'
  });
});

/**
 * @desc    Update semester
 * @route   PUT /api/semesters/:id
 * @access  Private (Instructor only)
 */
const updateSemester = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = updateSemesterSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Find semester
  const semester = await Semester.findByPk(id);

  if (!semester) {
    throw ApiError.notFound('Semester not found');
  }

  // If updating code, check for duplicates
  if (value.code && value.code !== semester.code) {
    const existingSemester = await Semester.findOne({
      where: { 
        code: value.code,
        id: { [Op.ne]: id }
      }
    });

    if (existingSemester) {
      throw ApiError.conflict('Semester code already exists', {
        field: 'code',
        value: value.code
      });
    }
  }

  // Validate date logic if both dates are being updated
  if (value.start_date && value.end_date) {
    if (new Date(value.end_date) <= new Date(value.start_date)) {
      throw new ApiError(400, 'End date must be after start date', 'VALIDATION_ERROR');
    }
  } else if (value.start_date && !value.end_date) {
    if (new Date(semester.end_date) <= new Date(value.start_date)) {
      throw new ApiError(400, 'End date must be after start date', 'VALIDATION_ERROR');
    }
  } else if (!value.start_date && value.end_date) {
    if (new Date(value.end_date) <= new Date(semester.start_date)) {
      throw new ApiError(400, 'End date must be after start date', 'VALIDATION_ERROR');
    }
  }

  // Update semester
  await semester.update(value);

  res.status(200).json({
    success: true,
    data: semester,
    message: 'Semester updated successfully'
  });
});

/**
 * @desc    Delete semester (cascade delete courses)
 * @route   DELETE /api/semesters/:id
 * @access  Private (Instructor only)
 */
const deleteSemester = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find semester
  const semester = await Semester.findByPk(id);

  if (!semester) {
    throw ApiError.notFound('Semester not found');
  }

  // Delete semester (cascade will handle related courses)
  await semester.destroy();

  res.status(200).json({
    success: true,
    message: 'Semester deleted successfully'
  });
});

module.exports = {
  getSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester
};
