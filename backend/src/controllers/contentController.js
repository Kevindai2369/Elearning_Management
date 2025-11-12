const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { 
  Announcement, 
  Assignment, 
  Material, 
  Course, 
  Group, 
  GroupMember,
  Student,
  AssignmentSubmission,
  ContentView,
  MaterialDownload,
  User
} = require('../models');
const { Op } = require('sequelize');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// ==================== ANNOUNCEMENT ENDPOINTS ====================

/**
 * Validation schema for creating an announcement
 */
const createAnnouncementSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Title is required',
    'string.max': 'Title must not exceed 255 characters',
    'any.required': 'Title is required'
  }),
  content: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Content is required',
    'any.required': 'Content is required'
  }),
  attachments: Joi.array().items(Joi.string().uri()).default([]),
  target_groups: Joi.array().items(Joi.string().uuid()).default([]).messages({
    'string.guid': 'Each group ID must be a valid UUID'
  })
});

/**
 * Validation schema for updating an announcement
 */
const updateAnnouncementSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).optional().messages({
    'string.empty': 'Title cannot be empty',
    'string.max': 'Title must not exceed 255 characters'
  }),
  content: Joi.string().trim().min(1).optional().messages({
    'string.empty': 'Content cannot be empty'
  }),
  attachments: Joi.array().items(Joi.string().uri()).optional(),
  target_groups: Joi.array().items(Joi.string().uuid()).optional().messages({
    'string.guid': 'Each group ID must be a valid UUID'
  })
}).min(1);

/**
 * @desc    Create announcement with group scoping
 * @route   POST /api/courses/:courseId/announcements
 * @access  Private (Instructor only)
 */
const createAnnouncement = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Validate request body
  const { error, value } = createAnnouncementSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Check if course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Verify instructor owns the course
  if (course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to create announcements for this course');
  }

  // If target_groups specified, validate they belong to this course
  if (value.target_groups && value.target_groups.length > 0) {
    const groups = await Group.findAll({
      where: {
        id: { [Op.in]: value.target_groups },
        course_id: courseId
      }
    });

    if (groups.length !== value.target_groups.length) {
      throw new ApiError(400, 'One or more group IDs are invalid for this course', 'VALIDATION_ERROR');
    }
  }

  // Create announcement
  const announcement = await Announcement.create({
    course_id: courseId,
    ...value
  });

  res.status(201).json({
    success: true,
    data: announcement,
    message: 'Announcement created successfully'
  });
});

/**
 * @desc    Get announcements filtered by student groups
 * @route   GET /api/courses/:courseId/announcements
 * @access  Private
 */
const getAnnouncements = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Check if course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  const where = { course_id: courseId };

  // If user is a student, filter by their groups
  if (req.user.role === 'student') {
    // Find student record
    const student = await Student.findOne({
      where: { user_id: req.user.id }
    });

    if (!student) {
      throw ApiError.notFound('Student record not found');
    }

    // Get student's groups in this course
    const studentGroups = await GroupMember.findAll({
      where: { student_id: student.id },
      include: [{
        model: Group,
        as: 'group',
        where: { course_id: courseId },
        attributes: ['id']
      }]
    });

    const groupIds = studentGroups.map(sg => sg.group.id);

    // Filter announcements: either no target_groups (all) or includes student's group
    where[Op.or] = [
      { target_groups: { [Op.eq]: [] } },
      { target_groups: { [Op.contains]: groupIds } }
    ];
  }

  // Get announcements with pagination
  const { count, rows: announcements } = await Announcement.findAndCountAll({
    where,
    limit,
    offset,
    order: [['published_at', 'DESC']],
    attributes: ['id', 'course_id', 'title', 'content', 'attachments', 'target_groups', 'published_at', 'created_at']
  });

  res.status(200).json({
    success: true,
    data: {
      announcements,
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
 * @desc    Update announcement
 * @route   PUT /api/announcements/:id
 * @access  Private (Instructor only)
 */
const updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = updateAnnouncementSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Find announcement
  const announcement = await Announcement.findByPk(id, {
    include: [{
      model: Course,
      as: 'course',
      attributes: ['id', 'instructor_id']
    }]
  });

  if (!announcement) {
    throw ApiError.notFound('Announcement not found');
  }

  // Verify instructor owns the course
  if (announcement.course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to update this announcement');
  }

  // If target_groups specified, validate they belong to this course
  if (value.target_groups && value.target_groups.length > 0) {
    const groups = await Group.findAll({
      where: {
        id: { [Op.in]: value.target_groups },
        course_id: announcement.course_id
      }
    });

    if (groups.length !== value.target_groups.length) {
      throw new ApiError(400, 'One or more group IDs are invalid for this course', 'VALIDATION_ERROR');
    }
  }

  // Update announcement
  await announcement.update(value);

  res.status(200).json({
    success: true,
    data: announcement,
    message: 'Announcement updated successfully'
  });
});

/**
 * @desc    Delete announcement
 * @route   DELETE /api/announcements/:id
 * @access  Private (Instructor only)
 */
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find announcement
  const announcement = await Announcement.findByPk(id, {
    include: [{
      model: Course,
      as: 'course',
      attributes: ['id', 'instructor_id']
    }]
  });

  if (!announcement) {
    throw ApiError.notFound('Announcement not found');
  }

  // Verify instructor owns the course
  if (announcement.course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to delete this announcement');
  }

  // Delete announcement
  await announcement.destroy();

  res.status(200).json({
    success: true,
    message: 'Announcement deleted successfully'
  });
});

// ==================== ASSIGNMENT ENDPOINTS ====================

/**
 * Validation schema for creating an assignment
 */
const createAssignmentSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Title is required',
    'string.max': 'Title must not exceed 255 characters',
    'any.required': 'Title is required'
  }),
  description: Joi.string().trim().allow('', null).optional(),
  attachments: Joi.array().items(Joi.string().uri()).default([]),
  target_groups: Joi.array().items(Joi.string().uuid()).default([]).messages({
    'string.guid': 'Each group ID must be a valid UUID'
  }),
  due_date: Joi.date().iso().required().messages({
    'date.base': 'Due date must be a valid date',
    'any.required': 'Due date is required'
  }),
  point_value: Joi.number().integer().min(0).required().messages({
    'number.base': 'Point value must be a number',
    'number.min': 'Point value must be at least 0',
    'any.required': 'Point value is required'
  })
});

/**
 * Validation schema for updating an assignment
 */
const updateAssignmentSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).optional().messages({
    'string.empty': 'Title cannot be empty',
    'string.max': 'Title must not exceed 255 characters'
  }),
  description: Joi.string().trim().allow('', null).optional(),
  attachments: Joi.array().items(Joi.string().uri()).optional(),
  target_groups: Joi.array().items(Joi.string().uuid()).optional().messages({
    'string.guid': 'Each group ID must be a valid UUID'
  }),
  due_date: Joi.date().iso().optional().messages({
    'date.base': 'Due date must be a valid date'
  }),
  point_value: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Point value must be a number',
    'number.min': 'Point value must be at least 0'
  })
}).min(1);

/**
 * Validation schema for submitting an assignment
 */
const submitAssignmentSchema = Joi.object({
  content: Joi.string().trim().allow('', null).optional(),
  attachments: Joi.array().items(Joi.string().uri()).default([])
});

/**
 * Validation schema for grading an assignment
 */
const gradeAssignmentSchema = Joi.object({
  grade: Joi.number().min(0).required().messages({
    'number.base': 'Grade must be a number',
    'number.min': 'Grade must be at least 0',
    'any.required': 'Grade is required'
  }),
  feedback: Joi.string().trim().allow('', null).optional()
});

/**
 * @desc    Create assignment with group scoping
 * @route   POST /api/courses/:courseId/assignments
 * @access  Private (Instructor only)
 */
const createAssignment = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Validate request body
  const { error, value } = createAssignmentSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Check if course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Verify instructor owns the course
  if (course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to create assignments for this course');
  }

  // If target_groups specified, validate they belong to this course
  if (value.target_groups && value.target_groups.length > 0) {
    const groups = await Group.findAll({
      where: {
        id: { [Op.in]: value.target_groups },
        course_id: courseId
      }
    });

    if (groups.length !== value.target_groups.length) {
      throw new ApiError(400, 'One or more group IDs are invalid for this course', 'VALIDATION_ERROR');
    }
  }

  // Create assignment
  const assignment = await Assignment.create({
    course_id: courseId,
    ...value
  });

  res.status(201).json({
    success: true,
    data: assignment,
    message: 'Assignment created successfully'
  });
});

/**
 * @desc    Get assignments filtered by student groups
 * @route   GET /api/courses/:courseId/assignments
 * @access  Private
 */
const getAssignments = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Check if course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  const where = { course_id: courseId };

  // If user is a student, filter by their groups
  if (req.user.role === 'student') {
    // Find student record
    const student = await Student.findOne({
      where: { user_id: req.user.id }
    });

    if (!student) {
      throw ApiError.notFound('Student record not found');
    }

    // Get student's groups in this course
    const studentGroups = await GroupMember.findAll({
      where: { student_id: student.id },
      include: [{
        model: Group,
        as: 'group',
        where: { course_id: courseId },
        attributes: ['id']
      }]
    });

    const groupIds = studentGroups.map(sg => sg.group.id);

    // Filter assignments: either no target_groups (all) or includes student's group
    where[Op.or] = [
      { target_groups: { [Op.eq]: [] } },
      { target_groups: { [Op.contains]: groupIds } }
    ];
  }

  // Get assignments with pagination
  const { count, rows: assignments } = await Assignment.findAndCountAll({
    where,
    limit,
    offset,
    order: [['due_date', 'ASC']],
    attributes: ['id', 'course_id', 'title', 'description', 'attachments', 'target_groups', 'due_date', 'point_value', 'published_at', 'created_at']
  });

  res.status(200).json({
    success: true,
    data: {
      assignments,
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
 * @desc    Submit assignment
 * @route   POST /api/assignments/:id/submit
 * @access  Private (Student only)
 */
const submitAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = submitAssignmentSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Check if assignment exists
  const assignment = await Assignment.findByPk(id);
  if (!assignment) {
    throw ApiError.notFound('Assignment not found');
  }

  // Find student record
  const student = await Student.findOne({
    where: { user_id: req.user.id }
  });

  if (!student) {
    throw ApiError.notFound('Student record not found');
  }

  // Check if student already submitted
  const existingSubmission = await AssignmentSubmission.findOne({
    where: {
      assignment_id: id,
      student_id: student.id
    }
  });

  if (existingSubmission) {
    // Update existing submission
    await existingSubmission.update({
      content: value.content,
      attachments: value.attachments,
      submitted_at: new Date()
    });

    return res.status(200).json({
      success: true,
      data: existingSubmission,
      message: 'Assignment resubmitted successfully'
    });
  }

  // Create new submission
  const submission = await AssignmentSubmission.create({
    assignment_id: id,
    student_id: student.id,
    content: value.content,
    attachments: value.attachments
  });

  res.status(201).json({
    success: true,
    data: submission,
    message: 'Assignment submitted successfully'
  });
});

/**
 * @desc    Get assignment submissions (Instructor view)
 * @route   GET /api/assignments/:id/submissions
 * @access  Private (Instructor only)
 */
const getAssignmentSubmissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Check if assignment exists
  const assignment = await Assignment.findByPk(id, {
    include: [{
      model: Course,
      as: 'course',
      attributes: ['id', 'instructor_id']
    }]
  });

  if (!assignment) {
    throw ApiError.notFound('Assignment not found');
  }

  // Verify instructor owns the course
  if (assignment.course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to view submissions for this assignment');
  }

  // Get submissions with pagination
  const { count, rows: submissions } = await AssignmentSubmission.findAndCountAll({
    where: { assignment_id: id },
    limit,
    offset,
    order: [['submitted_at', 'DESC']],
    include: [{
      model: Student,
      as: 'student',
      attributes: ['id', 'student_code'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    }]
  });

  res.status(200).json({
    success: true,
    data: {
      submissions,
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
 * @desc    Grade assignment submission
 * @route   PUT /api/assignments/:id/grade
 * @access  Private (Instructor only)
 */
const gradeAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = gradeAssignmentSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Find submission
  const submission = await AssignmentSubmission.findByPk(id, {
    include: [{
      model: Assignment,
      as: 'assignment',
      include: [{
        model: Course,
        as: 'course',
        attributes: ['id', 'instructor_id']
      }]
    }]
  });

  if (!submission) {
    throw ApiError.notFound('Submission not found');
  }

  // Verify instructor owns the course
  if (submission.assignment.course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to grade this submission');
  }

  // Validate grade doesn't exceed point value
  if (value.grade > submission.assignment.point_value) {
    throw new ApiError(400, `Grade cannot exceed ${submission.assignment.point_value} points`, 'VALIDATION_ERROR');
  }

  // Update submission with grade
  await submission.update({
    grade: value.grade,
    feedback: value.feedback,
    graded_at: new Date()
  });

  res.status(200).json({
    success: true,
    data: submission,
    message: 'Assignment graded successfully'
  });
});

// ==================== MATERIAL ENDPOINTS ====================

/**
 * Validation schema for creating a material
 */
const createMaterialSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Title is required',
    'string.max': 'Title must not exceed 255 characters',
    'any.required': 'Title is required'
  }),
  description: Joi.string().trim().allow('', null).optional()
});

/**
 * @desc    Create material with file upload
 * @route   POST /api/courses/:courseId/materials
 * @access  Private (Instructor only)
 */
const createMaterial = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Check if file was uploaded
  if (!req.file) {
    throw new ApiError(400, 'File is required', 'VALIDATION_ERROR');
  }

  // Validate request body
  const { error, value } = createMaterialSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Check if course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Verify instructor owns the course
  if (course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to create materials for this course');
  }

  // Upload file to Cloudinary
  const uploadResult = await uploadToCloudinary(req.file.path, {
    folder: `e-learning/courses/${courseId}/materials`,
    resource_type: 'auto'
  });

  // Create material
  const material = await Material.create({
    course_id: courseId,
    title: value.title,
    description: value.description,
    file_url: uploadResult.secure_url,
    file_type: req.file.mimetype,
    file_size: req.file.size
  });

  res.status(201).json({
    success: true,
    data: material,
    message: 'Material created successfully'
  });
});

/**
 * @desc    Get materials for a course
 * @route   GET /api/courses/:courseId/materials
 * @access  Private
 */
const getMaterials = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Check if course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Get materials with pagination
  const { count, rows: materials } = await Material.findAndCountAll({
    where: { course_id: courseId },
    limit,
    offset,
    order: [['published_at', 'DESC']],
    attributes: ['id', 'course_id', 'title', 'description', 'file_url', 'file_type', 'file_size', 'published_at', 'created_at']
  });

  res.status(200).json({
    success: true,
    data: {
      materials,
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
 * @desc    Download material with tracking
 * @route   GET /api/materials/:id/download
 * @access  Private
 */
const downloadMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find material
  const material = await Material.findByPk(id);
  if (!material) {
    throw ApiError.notFound('Material not found');
  }

  // If user is a student, track the download
  if (req.user.role === 'student') {
    await MaterialDownload.create({
      material_id: id,
      student_id: req.user.id
    });
  }

  // Return the file URL for download
  res.status(200).json({
    success: true,
    data: {
      file_url: material.file_url,
      file_name: material.title,
      file_type: material.file_type,
      file_size: material.file_size
    }
  });
});

/**
 * @desc    Delete material
 * @route   DELETE /api/materials/:id
 * @access  Private (Instructor only)
 */
const deleteMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find material
  const material = await Material.findByPk(id, {
    include: [{
      model: Course,
      as: 'course',
      attributes: ['id', 'instructor_id']
    }]
  });

  if (!material) {
    throw ApiError.notFound('Material not found');
  }

  // Verify instructor owns the course
  if (material.course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to delete this material');
  }

  // Extract public_id from Cloudinary URL to delete the file
  try {
    const urlParts = material.file_url.split('/');
    const publicIdWithExt = urlParts.slice(urlParts.indexOf('e-learning')).join('/');
    const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
    
    // Delete from Cloudinary
    await deleteFromCloudinary(publicId, { resource_type: 'raw' });
  } catch (error) {
    // Log error but continue with database deletion
    console.error('Failed to delete file from Cloudinary:', error.message);
  }

  // Delete material from database
  await material.destroy();

  res.status(200).json({
    success: true,
    message: 'Material deleted successfully'
  });
});

// ==================== TRACKING ENDPOINTS ====================

/**
 * @desc    Record content view
 * @route   POST /api/content/:contentId/view
 * @access  Private (Student only)
 */
const recordContentView = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  const { content_type } = req.body;

  // Validate content_type
  const validTypes = ['announcement', 'assignment', 'quiz', 'material'];
  if (!content_type || !validTypes.includes(content_type)) {
    throw new ApiError(400, 'Valid content_type is required (announcement, assignment, quiz, material)', 'VALIDATION_ERROR');
  }

  // Only students can record views
  if (req.user.role !== 'student') {
    throw new ApiError(400, 'Only students can record content views', 'VALIDATION_ERROR');
  }

  // Verify content exists based on type
  let content;
  switch (content_type) {
    case 'announcement':
      content = await Announcement.findByPk(contentId);
      break;
    case 'assignment':
      content = await Assignment.findByPk(contentId);
      break;
    case 'material':
      content = await Material.findByPk(contentId);
      break;
    default:
      throw new ApiError(400, 'Invalid content type', 'VALIDATION_ERROR');
  }

  if (!content) {
    throw ApiError.notFound('Content not found');
  }

  // Check if view already exists (unique constraint)
  const existingView = await ContentView.findOne({
    where: {
      content_type,
      content_id: contentId,
      student_id: req.user.id
    }
  });

  if (existingView) {
    // Update viewed_at timestamp
    await existingView.update({ viewed_at: new Date() });
    
    return res.status(200).json({
      success: true,
      data: existingView,
      message: 'Content view updated'
    });
  }

  // Create new view record
  const view = await ContentView.create({
    content_type,
    content_id: contentId,
    student_id: req.user.id
  });

  res.status(201).json({
    success: true,
    data: view,
    message: 'Content view recorded'
  });
});

/**
 * @desc    Get content tracking analytics
 * @route   GET /api/content/:contentId/tracking
 * @access  Private (Instructor only)
 */
const getContentTracking = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  const { content_type } = req.query;

  // Validate content_type
  const validTypes = ['announcement', 'assignment', 'material'];
  if (!content_type || !validTypes.includes(content_type)) {
    throw new ApiError(400, 'Valid content_type query parameter is required (announcement, assignment, material)', 'VALIDATION_ERROR');
  }

  // Verify content exists and instructor owns it
  let content;
  switch (content_type) {
    case 'announcement':
      content = await Announcement.findByPk(contentId, {
        include: [{
          model: Course,
          as: 'course',
          attributes: ['id', 'instructor_id']
        }]
      });
      break;
    case 'assignment':
      content = await Assignment.findByPk(contentId, {
        include: [{
          model: Course,
          as: 'course',
          attributes: ['id', 'instructor_id']
        }]
      });
      break;
    case 'material':
      content = await Material.findByPk(contentId, {
        include: [{
          model: Course,
          as: 'course',
          attributes: ['id', 'instructor_id']
        }]
      });
      break;
  }

  if (!content) {
    throw ApiError.notFound('Content not found');
  }

  // Verify instructor owns the course
  if (content.course.instructor_id !== req.user.id) {
    throw ApiError.forbidden('You do not have permission to view tracking for this content');
  }

  // Get view tracking
  const views = await ContentView.findAll({
    where: {
      content_type,
      content_id: contentId
    },
    include: [{
      model: User,
      as: 'student',
      attributes: ['id', 'name', 'email']
    }],
    order: [['viewed_at', 'DESC']]
  });

  // Get download tracking for materials
  let downloads = [];
  if (content_type === 'material') {
    downloads = await MaterialDownload.findAll({
      where: { material_id: contentId },
      include: [{
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'email']
      }],
      order: [['downloaded_at', 'DESC']]
    });
  }

  res.status(200).json({
    success: true,
    data: {
      content_type,
      content_id: contentId,
      views: {
        total: views.length,
        records: views
      },
      downloads: {
        total: downloads.length,
        records: downloads
      }
    }
  });
});

module.exports = {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  createAssignment,
  getAssignments,
  submitAssignment,
  getAssignmentSubmissions,
  gradeAssignment,
  createMaterial,
  getMaterials,
  downloadMaterial,
  deleteMaterial,
  recordContentView,
  getContentTracking
};
