const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CourseEnrollment = sequelize.define(
  'CourseEnrollment',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    course_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id'
      }
    },
    student_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id'
      }
    },
    enrolled_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'course_enrollments',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['course_id']
      },
      {
        fields: ['student_id']
      },
      {
        unique: true,
        fields: ['course_id', 'student_id'],
        name: 'unique_course_student_enrollment'
      }
    ]
  }
);

module.exports = CourseEnrollment;
