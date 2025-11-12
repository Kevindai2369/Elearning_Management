const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AssignmentSubmission = sequelize.define(
  'AssignmentSubmission',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    assignment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'assignments',
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
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    grade: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    graded_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'assignment_submissions',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['assignment_id']
      },
      {
        fields: ['student_id']
      },
      {
        fields: ['submitted_at']
      },
      {
        unique: true,
        fields: ['assignment_id', 'student_id'],
        name: 'unique_assignment_student_submission'
      }
    ]
  }
);

module.exports = AssignmentSubmission;
