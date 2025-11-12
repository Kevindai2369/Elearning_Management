const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ForumReply = sequelize.define(
  'ForumReply',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    thread_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'forum_threads',
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
    tableName: 'forum_replies',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['thread_id']
      },
      {
        fields: ['author_id']
      },
      {
        fields: ['created_at']
      }
    ]
  }
);

module.exports = ForumReply;
