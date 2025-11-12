const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Course = sequelize.define(
  'Course',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    semester_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'semesters',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    instructor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  },
  {
    tableName: 'courses',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['semester_id']
      },
      {
        fields: ['instructor_id']
      },
      {
        fields: ['code']
      },
      {
        fields: ['name']
      },
      {
        unique: true,
        fields: ['semester_id', 'code'],
        name: 'unique_semester_course_code'
      }
    ]
  }
);

module.exports = Course;
