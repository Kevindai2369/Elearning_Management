const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatConversation = sequelize.define(
  'ChatConversation',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    tableName: 'chat_conversations',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['student_id']
      },
      {
        fields: ['instructor_id']
      },
      {
        unique: true,
        fields: ['student_id', 'instructor_id'],
        name: 'unique_student_instructor_conversation'
      }
    ]
  }
);

module.exports = ChatConversation;
