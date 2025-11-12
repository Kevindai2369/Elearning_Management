const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ForumThread = sequelize.define(
  'ForumThread',
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
    author_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: []
    }
  },
  {
    tableName: 'forum_threads',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['course_id']
      },
      {
        fields: ['author_id']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['title']
      }
    ]
  }
);

module.exports = ForumThread;
