const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MaterialDownload = sequelize.define(
  'MaterialDownload',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    material_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'materials',
        key: 'id'
      }
    },
    student_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    downloaded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'material_downloads',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['material_id']
      },
      {
        fields: ['student_id']
      },
      {
        fields: ['downloaded_at']
      }
    ]
  }
);

module.exports = MaterialDownload;
