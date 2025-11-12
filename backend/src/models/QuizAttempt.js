const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuizAttempt = sequelize.define(
  'QuizAttempt',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    quiz_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'quizzes',
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
    answers: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Object mapping question IDs to student answers'
    },
    score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    graded_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'quiz_attempts',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['quiz_id']
      },
      {
        fields: ['student_id']
      },
      {
        fields: ['started_at']
      }
    ]
  }
);

module.exports = QuizAttempt;
