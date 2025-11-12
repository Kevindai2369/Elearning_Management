const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Question = sequelize.define(
  'Question',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    instructor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('multiple_choice', 'true_false', 'short_answer', 'essay'),
      allowNull: false,
      validate: {
        isIn: [['multiple_choice', 'true_false', 'short_answer', 'essay']]
      }
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    options: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of options for multiple choice questions'
    },
    correct_answer: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Correct answer(s) for objective questions'
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 0
      }
    },
    tags: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Tags for categorization and search'
    }
  },
  {
    tableName: 'questions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['instructor_id']
      },
      {
        fields: ['type']
      }
    ]
  }
);

module.exports = Question;
