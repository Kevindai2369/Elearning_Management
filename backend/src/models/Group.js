const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Group = sequelize.define(
  'Group',
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    }
  },
  {
    tableName: 'groups',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['course_id']
      },
      {
        unique: true,
        fields: ['course_id', 'name'],
        name: 'unique_course_group_name'
      }
    ]
  }
);

module.exports = Group;
