const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GroupMember = sequelize.define(
  'GroupMember',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    group_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'groups',
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
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'group_members',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['group_id']
      },
      {
        fields: ['student_id']
      },
      {
        unique: true,
        fields: ['group_id', 'student_id'],
        name: 'unique_group_student'
      }
    ]
  }
);

module.exports = GroupMember;
