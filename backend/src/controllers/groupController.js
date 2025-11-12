const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Group, Course, Student, User, GroupMember } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Validation schema for creating a group
 */
const createGroupSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Group name is required',
    'string.max': 'Group name must not exceed 255 characters',
    'any.required': 'Group name is required'
  })
});

/**
 * Validation schema for updating a group
 */
const updateGroupSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Group name is required',
    'string.max': 'Group name must not exceed 255 characters',
    'any.required': 'Group name is required'
  })
});

/**
 * Validation schema for adding members
 */
const addMembersSchema = Joi.object({
  student_ids: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.min': 'At least one student ID is required',
    'any.required': 'Student IDs are required'
  })
});

/**
 * @desc    Get all groups for a course
 * @route   GET /api/courses/:courseId/groups
 * @access  Private
 */
const getGroupsByCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Check if course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Get groups with member count
  const groups = await Group.findAll({
    where: { course_id: courseId },
    attributes: [
      'id',
      'name',
      'course_id',
      'created_at',
      'updated_at',
      [sequelize.fn('COUNT', sequelize.col('members.id')), 'member_count']
    ],
    include: [
      {
        model: Student,
        as: 'members',
        attributes: [],
        through: { attributes: [] }
      }
    ],
    group: ['Group.id'],
    order: [['created_at', 'ASC']]
  });

  res.status(200).json({
    success: true,
    data: groups
  });
});

/**
 * @desc    Get group by ID with member count
 * @route   GET /api/groups/:id
 * @access  Private
 */
const getGroupById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const group = await Group.findByPk(id, {
    attributes: [
      'id',
      'name',
      'course_id',
      'created_at',
      'updated_at'
    ],
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'name', 'code']
      },
      {
        model: Student,
        as: 'members',
        attributes: ['id', 'student_code'],
        through: { attributes: ['joined_at'] },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      }
    ]
  });

  if (!group) {
    throw ApiError.notFound('Group not found');
  }

  // Add member count
  const groupData = group.toJSON();
  groupData.member_count = groupData.members ? groupData.members.length : 0;

  res.status(200).json({
    success: true,
    data: groupData
  });
});

/**
 * @desc    Create new group in a course
 * @route   POST /api/courses/:courseId/groups
 * @access  Private (Instructor only)
 */
const createGroup = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Validate request body
  const { error, value } = createGroupSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Check if course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw ApiError.notFound('Course not found');
  }

  // Check for duplicate group name within the same course
  const existingGroup = await Group.findOne({
    where: { 
      course_id: courseId,
      name: value.name
    }
  });

  if (existingGroup) {
    throw ApiError.conflict('Group name already exists in this course', {
      field: 'name',
      value: value.name,
      course_id: courseId
    });
  }

  // Create group
  const group = await Group.create({
    course_id: courseId,
    name: value.name
  });

  // Fetch the created group with associations
  const createdGroup = await Group.findByPk(group.id, {
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'name', 'code']
      }
    ]
  });

  // Add member count (0 for new group)
  const groupData = createdGroup.toJSON();
  groupData.member_count = 0;

  res.status(201).json({
    success: true,
    data: groupData,
    message: 'Group created successfully'
  });
});

/**
 * @desc    Update group
 * @route   PUT /api/groups/:id
 * @access  Private (Instructor only)
 */
const updateGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = updateGroupSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Find group
  const group = await Group.findByPk(id);

  if (!group) {
    throw ApiError.notFound('Group not found');
  }

  // Check for duplicate group name within the same course
  if (value.name !== group.name) {
    const existingGroup = await Group.findOne({
      where: { 
        course_id: group.course_id,
        name: value.name,
        id: { [Op.ne]: id }
      }
    });

    if (existingGroup) {
      throw ApiError.conflict('Group name already exists in this course', {
        field: 'name',
        value: value.name,
        course_id: group.course_id
      });
    }
  }

  // Update group
  await group.update(value);

  // Fetch updated group with associations and member count
  const updatedGroup = await Group.findByPk(id, {
    attributes: [
      'id',
      'name',
      'course_id',
      'created_at',
      'updated_at'
    ],
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'name', 'code']
      },
      {
        model: Student,
        as: 'members',
        attributes: ['id']
      }
    ]
  });

  const groupData = updatedGroup.toJSON();
  groupData.member_count = groupData.members ? groupData.members.length : 0;
  delete groupData.members;

  res.status(200).json({
    success: true,
    data: groupData,
    message: 'Group updated successfully'
  });
});

/**
 * @desc    Delete group
 * @route   DELETE /api/groups/:id
 * @access  Private (Instructor only)
 */
const deleteGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find group
  const group = await Group.findByPk(id);

  if (!group) {
    throw ApiError.notFound('Group not found');
  }

  // Delete group (cascade will handle group members)
  await group.destroy();

  res.status(200).json({
    success: true,
    message: 'Group deleted successfully'
  });
});

/**
 * @desc    Add students to group
 * @route   POST /api/groups/:id/members
 * @access  Private (Instructor only)
 */
const addGroupMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = addMembersSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message, 'VALIDATION_ERROR');
  }

  // Find group
  const group = await Group.findByPk(id);

  if (!group) {
    throw ApiError.notFound('Group not found');
  }

  // Verify all students exist
  const students = await Student.findAll({
    where: {
      id: { [Op.in]: value.student_ids }
    }
  });

  if (students.length !== value.student_ids.length) {
    throw ApiError.notFound('One or more students not found');
  }

  // Get existing members
  const existingMembers = await GroupMember.findAll({
    where: {
      group_id: id,
      student_id: { [Op.in]: value.student_ids }
    }
  });

  const existingStudentIds = existingMembers.map(m => m.student_id);
  const newStudentIds = value.student_ids.filter(sid => !existingStudentIds.includes(sid));

  // Add new members
  if (newStudentIds.length > 0) {
    const membersToAdd = newStudentIds.map(student_id => ({
      group_id: id,
      student_id
    }));

    await GroupMember.bulkCreate(membersToAdd);
  }

  // Get updated member list
  const members = await GroupMember.findAll({
    where: { group_id: id },
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'student_code'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      }
    ]
  });

  res.status(200).json({
    success: true,
    data: {
      added: newStudentIds.length,
      skipped: existingStudentIds.length,
      total: members.length,
      members: members.map(m => ({
        student_id: m.student_id,
        student_code: m.student.student_code,
        name: m.student.user.name,
        email: m.student.user.email,
        joined_at: m.joined_at
      }))
    },
    message: `${newStudentIds.length} student(s) added to group`
  });
});

/**
 * @desc    Remove student from group
 * @route   DELETE /api/groups/:id/members/:studentId
 * @access  Private (Instructor only)
 */
const removeGroupMember = asyncHandler(async (req, res) => {
  const { id, studentId } = req.params;

  // Find group
  const group = await Group.findByPk(id);

  if (!group) {
    throw ApiError.notFound('Group not found');
  }

  // Find student
  const student = await Student.findByPk(studentId);

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  // Find and delete group member
  const groupMember = await GroupMember.findOne({
    where: {
      group_id: id,
      student_id: studentId
    }
  });

  if (!groupMember) {
    throw ApiError.notFound('Student is not a member of this group');
  }

  await groupMember.destroy();

  res.status(200).json({
    success: true,
    message: 'Student removed from group successfully'
  });
});

/**
 * @desc    Get group members
 * @route   GET /api/groups/:id/members
 * @access  Private
 */
const getGroupMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find group
  const group = await Group.findByPk(id);

  if (!group) {
    throw ApiError.notFound('Group not found');
  }

  // Get members
  const members = await GroupMember.findAll({
    where: { group_id: id },
    attributes: ['joined_at'],
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'student_code', 'phone'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      }
    ],
    order: [['joined_at', 'ASC']]
  });

  const formattedMembers = members.map(m => ({
    student_id: m.student.id,
    student_code: m.student.student_code,
    name: m.student.user.name,
    email: m.student.user.email,
    phone: m.student.phone,
    joined_at: m.joined_at
  }));

  res.status(200).json({
    success: true,
    data: {
      group_id: id,
      group_name: group.name,
      member_count: formattedMembers.length,
      members: formattedMembers
    }
  });
});

module.exports = {
  getGroupsByCourse,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMembers,
  removeGroupMember,
  getGroupMembers
};
