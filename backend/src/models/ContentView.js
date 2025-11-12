const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ContentView = sequelize.define(
  'ContentView',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    content_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Type of content: announcement, assignment, quiz, material',
      validate: {
        isIn: [['announcement', 'assignment', 'quiz', 'material']]
      }
    },
    content_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    student_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    viewed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'content_views',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['content_type', 'content_id'],
        name: 'idx_content_views_content'
      },
      {
        fields: ['student_id']
      },
      {
        fields: ['viewed_at']
      },
      {
        unique: true,
        fields: ['content_type', 'content_id', 'student_id'],
        name: 'unique_content_student_view'
      }
    ]
  }
);

module.exports = ContentView;
