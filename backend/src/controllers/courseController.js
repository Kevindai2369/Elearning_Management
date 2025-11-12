const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Course, Semester, User, Group, Announcement, Assignment, Quiz, Material } = require('../models');
const { Op } = require('sequelize');

/**
 * Validation schema for creating a course
 */
const createCourseSchema = Joi.object({
  semester_id: Joi.string().uuid().required().messages({
    'string.guid': 'Semester ID must be a valid UUID',
    'any.required': 'Semester ID is required'
  }),
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Course name is required',
    'string.max': 'Course name must not exceed 255 characters',
    'any.required': 'Course name is required'
  }),
  code: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'Course code is required',
    'string.max': 'Course code must not exceed 50 characters',
    'any.required': 'Course code is required'
  }),
  description: Joi.string().trim().allow('', null).optional()
});

/**
 * Validation schema for updating a course
 */
const updateCourseSchema = Joi.object({
  semester_id: Joi.string().uuid().optional().messages({
    'string.guid': 'Semester ID must be a valid UUID'
  }),
  name: Joi.string().trim().min(1).max(255).optional().messages({
    'string.empty': 'Course name cannot be empty',
    'string.max': 'Course name must not exceed 255 characters'
  }),
  code: Joi.string().trim().min(1).max(50).optional().messages({
    'string.empty': 'Course code cannot be empty',
    'string.max': 'Course code must not exceed 50 characters'
  }),
  description: Joi.string().trim().allow('', null).optional()
}).min(1);

/**
 * @desc    Get all courses with search, filter, sort, and pagination
 * @route   GET /api/courses
 * @access  Private
 */
const getCourses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Build filter conditions
  const where = {};
  
  // Search across name and code fields
  if (req.query.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${req.query.search}%` } },
      { code: { [Op.iLike]: `%${req.query.search}%` } }
    ];
  }

  // Filter by semester
  if (req.query.semester_id) {
    where.semester_id = req.query.semester_id;
  }

  // Filter by instructor
  if (req.query.instructor_id) {
    where.instructor_id = req.query.instructor_id;
  }

  // Build sort order
  let order = [['created_at', 'DESC']]; // Default sort
  
  if (req.query.sort) {
    const sortField = req.query.sort;
    const sortOrder = req.query.order && req.query.order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Validate sort field
    const validSortFields = ['name', 'code', 'created_at', 'updated_at'];
    if (validSortFields.includes(sortField)) {
      order = [[sortField, sortOrder]];
    }
  }

  // Get courses with pagination
  const { count, rows: courses } = await Course.findAndCountAll({
    where,
    limit,
    offset,
    order,
    attributes: ['id', 'name', 'code', 'description', 'semester_id', 'instructor_id', 'created_at', 'updated_at'],
    include: [
      {
        model: Semester,
        as: 'semester',
        attributes: ['id', 'name', 'code']
      },
      {
        model: User,
        as: 'instructor',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  res.status(200).json({
    success: true,
    data: {
      courses,
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
 * @desc    Get course by ID
 * @route   GET /api/courses/:id
 * @access  Private
 */
const getCourseById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const course = await Course.findByPk(id, {
    attributes: ['id', 'name', 'code', 'description', 'semester_id', 'instructor_id', 'created_at', 'updated_at'],
    include: [
      {
        model: Semester,
        as: 'semester',
        attributes: ['id', 'name', 'code', 'start_date', 'end_date']
      },
      {
        model: User,
        as: 'instructor',
        attributes: ['id', 'name', 'email']
      },
      {
        model: Group,
        as: 'groups',
        attributes: ['id', 'name']
      }
    ]
  });

  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  res.status(200).json({
    success: true,
    data: course
  });
});

/**
 * @desc    Create new course
 * @route   POST /api/courses
 * @access  Private (Instructor only)
 */
const createCourse = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = createCourseSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Check if semester exists
  const semester = await Semester.findByPk(value.semester_id);
  if (!semester) {
    throw ApiError.notFound('Semester not found');
  }

  // Check for duplicate course code within the same semester
  const existingCourse = await Course.findOne({
    where: { 
      semester_id: value.semester_id,
      code: value.code
    }
  });

  if (existingCourse) {
    throw ApiError.conflict('Course code already exists in this semester', {
      field: 'code',
      value: value.code,
      semester_id: value.semester_id
    });
  }

  // Set instructor_id from authenticated user
  value.instructor_id = req.user.id;

  // Create course
  const course = await Course.create(value);

  // Fetch the created course with associations
  const createdCourse = await Course.findByPk(course.id, {
    include: [
      {
        model: Semester,
        as: 'semester',
        attributes: ['id', 'name', 'code']
      },
      {
        model: User,
        as: 'instructor',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  res.status(201).json({
    success: true,
    data: createdCourse,
    message: 'Course created successfully'
  });
});

/**
 * @desc    Update course
 * @route   PUT /api/courses/:id
 * @access  Private (Instructor only)
 */
const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = updateCourseSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Find course
  const course = await Course.findByPk(id);

  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // If updating semester_id, check if semester exists
  if (value.semester_id && value.semester_id !== course.semester_id) {
    const semester = await Semester.findByPk(value.semester_id);
    if (!semester) {
      throw ApiError.notFound('Semester not found');
    }
  }

  // If updating code or semester_id, check for duplicates
  const checkSemesterId = value.semester_id || course.semester_id;
  const checkCode = value.code || course.code;

  if ((value.code && value.code !== course.code) || (value.semester_id && value.semester_id !== course.semester_id)) {
    const existingCourse = await Course.findOne({
      where: { 
        semester_id: checkSemesterId,
        code: checkCode,
        id: { [Op.ne]: id }
      }
    });

    if (existingCourse) {
      throw ApiError.conflict('Course code already exists in this semester', {
        field: 'code',
        value: checkCode,
        semester_id: checkSemesterId
      });
    }
  }

  // Update course
  await course.update(value);

  // Fetch updated course with associations
  const updatedCourse = await Course.findByPk(id, {
    include: [
      {
        model: Semester,
        as: 'semester',
        attributes: ['id', 'name', 'code']
      },
      {
        model: User,
        as: 'instructor',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  res.status(200).json({
    success: true,
    data: updatedCourse,
    message: 'Course updated successfully'
  });
});

/**
 * @desc    Delete course (cascade delete content)
 * @route   DELETE /api/courses/:id
 * @access  Private (Instructor only)
 */
const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find course
  const course = await Course.findByPk(id);

  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Delete course (cascade will handle related content)
  await course.destroy();

  res.status(200).json({
    success: true,
    message: 'Course deleted successfully'
  });
});

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
};
