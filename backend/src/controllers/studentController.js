const Joi = require('joi');
const bcrypt = require('bcrypt');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Student, User, Course, CourseEnrollment } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const csvService = require('../services/csvService');
const bulkImportService = require('../services/bulkImportService');

/**
 * Validation schema for creating a student
 */
const createStudentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Student name is required',
    'string.max': 'Student name must not exceed 255 characters',
    'any.required': 'Student name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  student_code: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'Student code is required',
    'string.max': 'Student code must not exceed 50 characters',
    'any.required': 'Student code is required'
  }),
  phone: Joi.string().trim().max(20).allow('', null).optional(),
  password: Joi.string().min(8).optional().messages({
    'string.min': 'Password must be at least 8 characters'
  })
});

/**
 * Validation schema for updating a student
 */
const updateStudentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional().messages({
    'string.empty': 'Student name cannot be empty',
    'string.max': 'Student name must not exceed 255 characters'
  }),
  email: Joi.string().email().optional().messages({
    'string.email': 'Email must be a valid email address'
  }),
  student_code: Joi.string().trim().min(1).max(50).optional().messages({
    'string.empty': 'Student code cannot be empty',
    'string.max': 'Student code must not exceed 50 characters'
  }),
  phone: Joi.string().trim().max(20).allow('', null).optional()
}).min(1);

/**
 * Validation schema for enrolling a student in courses
 */
const enrollStudentSchema = Joi.object({
  course_ids: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.min': 'At least one course ID is required',
    'any.required': 'Course IDs are required'
  })
});

/**
 * @desc    Get all students with search, filter, sort, and pagination
 * @route   GET /api/students
 * @access  Private (Instructor only)
 */
const getStudents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Build filter conditions for User model
  const userWhere = {};
  const studentWhere = {};

  // Search across name, email, and student code fields
  if (req.query.search) {
    const searchConditions = [
      { '$user.name$': { [Op.iLike]: `%${req.query.search}%` } },
      { '$user.email$': { [Op.iLike]: `%${req.query.search}%` } },
      { student_code: { [Op.iLike]: `%${req.query.search}%` } }
    ];
    
    // Apply search to the main where clause
    Object.assign(studentWhere, { [Op.or]: searchConditions });
  }

  // Filter by course enrollment
  let courseFilter = null;
  if (req.query.course_id) {
    courseFilter = {
      model: Course,
      as: 'enrolledCourses',
      where: { id: req.query.course_id },
      attributes: [],
      through: { attributes: [] }
    };
  }

  // Build sort order
  let order = [['created_at', 'DESC']]; // Default sort
  
  if (req.query.sort) {
    const sortField = req.query.sort;
    const sortOrder = req.query.order && req.query.order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Validate sort field
    const validSortFields = ['student_code', 'created_at', 'updated_at'];
    const validUserSortFields = ['name', 'email'];
    
    if (validSortFields.includes(sortField)) {
      order = [[sortField, sortOrder]];
    } else if (validUserSortFields.includes(sortField)) {
      order = [[{ model: User, as: 'user' }, sortField, sortOrder]];
    }
  }

  // Build include array
  const include = [
    {
      model: User,
      as: 'user',
      attributes: ['id', 'name', 'email', 'avatar_url', 'created_at'],
      where: userWhere
    }
  ];

  if (courseFilter) {
    include.push(courseFilter);
  }

  // Get students with pagination
  const { count, rows: students } = await Student.findAndCountAll({
    where: studentWhere,
    limit,
    offset,
    order,
    attributes: ['id', 'user_id', 'student_code', 'phone', 'created_at', 'updated_at'],
    include,
    distinct: true
  });

  res.status(200).json({
    success: true,
    data: {
      students,
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
 * @desc    Get student by ID
 * @route   GET /api/students/:id
 * @access  Private
 */
const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await Student.findByPk(id, {
    attributes: ['id', 'user_id', 'student_code', 'phone', 'created_at', 'updated_at'],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'avatar_url', 'created_at']
      },
      {
        model: Course,
        as: 'enrolledCourses',
        attributes: ['id', 'name', 'code'],
        through: { 
          attributes: ['enrolled_at'],
          as: 'enrollment'
        }
      }
    ]
  });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  res.status(200).json({
    success: true,
    data: student
  });
});

/**
 * @desc    Create new student with user account
 * @route   POST /api/students
 * @access  Private (Instructor only)
 */
const createStudent = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = createStudentSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Check for duplicate email
  const existingUserByEmail = await User.findOne({
    where: { email: value.email }
  });

  if (existingUserByEmail) {
    throw ApiError.conflict('Email already exists', {
      field: 'email',
      value: value.email
    });
  }

  // Check for duplicate student code
  const existingStudentByCode = await Student.findOne({
    where: { student_code: value.student_code }
  });

  if (existingStudentByCode) {
    throw ApiError.conflict('Student code already exists', {
      field: 'student_code',
      value: value.student_code
    });
  }

  // Use transaction to create both user and student
  const transaction = await sequelize.transaction();

  try {
    // Generate default password if not provided
    const password = value.password || 'student123';
    const password_hash = await bcrypt.hash(password, 10);

    // Create user account
    const user = await User.create({
      email: value.email,
      name: value.name,
      password_hash,
      role: 'student'
    }, { transaction });

    // Create student profile
    const student = await Student.create({
      user_id: user.id,
      student_code: value.student_code,
      phone: value.phone || null
    }, { transaction });

    await transaction.commit();

    // Fetch the created student with user data
    const createdStudent = await Student.findByPk(student.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'avatar_url', 'created_at']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdStudent,
      message: 'Student created successfully'
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
});

/**
 * @desc    Update student
 * @route   PUT /api/students/:id
 * @access  Private (Instructor only)
 */
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = updateStudentSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Find student
  const student = await Student.findByPk(id, {
    include: [
      {
        model: User,
        as: 'user'
      }
    ]
  });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  // Separate user fields from student fields
  const userFields = {};
  const studentFields = {};

  if (value.name !== undefined) userFields.name = value.name;
  if (value.email !== undefined) userFields.email = value.email;
  if (value.student_code !== undefined) studentFields.student_code = value.student_code;
  if (value.phone !== undefined) studentFields.phone = value.phone;

  // Check for duplicate email if updating
  if (value.email && value.email !== student.user.email) {
    const existingUserByEmail = await User.findOne({
      where: { 
        email: value.email,
        id: { [Op.ne]: student.user_id }
      }
    });

    if (existingUserByEmail) {
      throw ApiError.conflict('Email already exists', {
        field: 'email',
        value: value.email
      });
    }
  }

  // Check for duplicate student code if updating
  if (value.student_code && value.student_code !== student.student_code) {
    const existingStudentByCode = await Student.findOne({
      where: { 
        student_code: value.student_code,
        id: { [Op.ne]: id }
      }
    });

    if (existingStudentByCode) {
      throw ApiError.conflict('Student code already exists', {
        field: 'student_code',
        value: value.student_code
      });
    }
  }

  // Use transaction to update both user and student
  const transaction = await sequelize.transaction();

  try {
    // Update user if there are user fields
    if (Object.keys(userFields).length > 0) {
      await student.user.update(userFields, { transaction });
    }

    // Update student if there are student fields
    if (Object.keys(studentFields).length > 0) {
      await student.update(studentFields, { transaction });
    }

    await transaction.commit();

    // Fetch updated student with user data
    const updatedStudent = await Student.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'avatar_url', 'created_at']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: updatedStudent,
      message: 'Student updated successfully'
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
});

/**
 * @desc    Delete student (cascade delete)
 * @route   DELETE /api/students/:id
 * @access  Private (Instructor only)
 */
const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find student
  const student = await Student.findByPk(id, {
    include: [
      {
        model: User,
        as: 'user'
      }
    ]
  });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  // Use transaction to delete both student and user
  const transaction = await sequelize.transaction();

  try {
    // Delete student (this will cascade to enrollments, submissions, etc.)
    await student.destroy({ transaction });

    // Delete user account
    await student.user.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
});

/**
 * @desc    Enroll student in courses
 * @route   POST /api/students/:id/enroll
 * @access  Private (Instructor only)
 */
const enrollStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = enrollStudentSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Find student
  const student = await Student.findByPk(id);

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  // Validate all courses exist
  const courses = await Course.findAll({
    where: {
      id: { [Op.in]: value.course_ids }
    }
  });

  if (courses.length !== value.course_ids.length) {
    const foundIds = courses.map(c => c.id);
    const missingIds = value.course_ids.filter(id => !foundIds.includes(id));
    throw ApiError.notFound(`Courses not found: ${missingIds.join(', ')}`);
  }

  // Use transaction to enroll in all courses
  const transaction = await sequelize.transaction();

  try {
    const enrollmentResults = [];

    for (const courseId of value.course_ids) {
      // Check if already enrolled
      const existingEnrollment = await CourseEnrollment.findOne({
        where: {
          student_id: id,
          course_id: courseId
        },
        transaction
      });

      if (existingEnrollment) {
        enrollmentResults.push({
          course_id: courseId,
          status: 'already_enrolled',
          message: 'Student is already enrolled in this course'
        });
      } else {
        // Create enrollment
        await CourseEnrollment.create({
          student_id: id,
          course_id: courseId
        }, { transaction });

        enrollmentResults.push({
          course_id: courseId,
          status: 'enrolled',
          message: 'Successfully enrolled'
        });
      }
    }

    await transaction.commit();

    // Fetch updated student with enrolled courses
    const updatedStudent = await Student.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Course,
          as: 'enrolledCourses',
          attributes: ['id', 'name', 'code'],
          through: { 
            attributes: ['enrolled_at'],
            as: 'enrollment'
          }
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        student: updatedStudent,
        enrollmentResults
      },
      message: 'Enrollment completed'
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
});

/**
 * Validation schema for CSV validation request
 */
const validateCSVSchema = Joi.object({
  csvData: Joi.string().required().messages({
    'any.required': 'CSV data is required'
  })
});

/**
 * Validation schema for bulk import request
 */
const bulkImportSchema = Joi.object({
  csvData: Joi.string().required().messages({
    'any.required': 'CSV data is required'
  }),
  strategy: Joi.string()
    .valid('skip', 'update', 'suffix')
    .default('skip')
    .messages({
      'any.only': 'Strategy must be one of: skip, update, suffix'
    })
});

/**
 * @desc    Validate CSV file for preview
 * @route   POST /api/students/validate-csv
 * @access  Private (Instructor only)
 */
const validateCSV = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = validateCSVSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Parse and validate CSV
  const validationResults = await csvService.parseAndValidateCSV(value.csvData);

  if (!validationResults.success) {
    throw new ApiError(400, validationResults.error, 'CSV_PARSE_ERROR');
  }

  // Check for internal duplicates within the CSV
  const internalDuplicates = csvService.detectInternalDuplicates(
    validationResults.validRecords
  );

  // Check for duplicates in database
  const dbDuplicates = await bulkImportService.detectDatabaseDuplicates(
    validationResults.validRecords
  );

  // Identify which records have database duplicates
  const recordsWithDbDuplicates = validationResults.validRecords.map(record => {
    const email = record.email.toLowerCase();
    const studentCode = record.student_code;
    
    const emailExists = dbDuplicates.emailMap.has(email);
    const codeExists = dbDuplicates.studentCodeMap.has(studentCode);

    return {
      rowNumber: record._rowNumber,
      data: {
        name: record.name,
        email: record.email,
        student_code: record.student_code,
        phone: record.phone
      },
      duplicates: {
        email: emailExists,
        student_code: codeExists,
        hasAnyDuplicate: emailExists || codeExists
      }
    };
  });

  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalRecords: validationResults.totalRecords,
        validRecords: validationResults.validCount,
        invalidRecords: validationResults.invalidCount,
        internalDuplicates: internalDuplicates.duplicateCount,
        databaseDuplicates: recordsWithDbDuplicates.filter(r => r.duplicates.hasAnyDuplicate).length
      },
      validRecords: recordsWithDbDuplicates,
      invalidRecords: validationResults.invalidRecords,
      internalDuplicates: internalDuplicates.duplicates
    },
    message: 'CSV validation completed'
  });
});

/**
 * @desc    Bulk import students from CSV
 * @route   POST /api/students/bulk-import
 * @access  Private (Instructor only)
 */
const bulkImport = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = bulkImportSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Parse and validate CSV
  const validationResults = await csvService.parseAndValidateCSV(value.csvData);

  if (!validationResults.success) {
    throw new ApiError(400, validationResults.error, 'CSV_PARSE_ERROR');
  }

  if (validationResults.validCount === 0) {
    throw new ApiError(400, 'No valid records to import', 'NO_VALID_RECORDS');
  }

  // Check for internal duplicates
  const internalDuplicates = csvService.detectInternalDuplicates(
    validationResults.validRecords
  );

  if (internalDuplicates.hasDuplicates) {
    throw new ApiError(
      400,
      'CSV contains internal duplicates. Please remove duplicate entries and try again.',
      'INTERNAL_DUPLICATES',
      { duplicates: internalDuplicates.duplicates }
    );
  }

  // Process bulk import with specified strategy
  const importResults = await bulkImportService.processBulkImport(
    validationResults.validRecords,
    value.strategy
  );

  res.status(200).json({
    success: true,
    data: {
      summary: {
        total: importResults.total,
        created: importResults.created,
        updated: importResults.updated,
        skipped: importResults.skipped,
        failed: importResults.failed,
        strategy: value.strategy
      },
      details: importResults.details
    },
    message: `Bulk import completed: ${importResults.created} created, ${importResults.updated} updated, ${importResults.skipped} skipped, ${importResults.failed} failed`
  });
});

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  enrollStudent,
  validateCSV,
  bulkImport
};
