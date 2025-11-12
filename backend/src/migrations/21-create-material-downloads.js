'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('material_downloads', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      material_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'materials',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      student_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      downloaded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('material_downloads', ['material_id'], {
      name: 'idx_material_downloads_material_id'
    });

    await queryInterface.addIndex('material_downloads', ['student_id'], {
      name: 'idx_material_downloads_student_id'
    });

    await queryInterface.addIndex('material_downloads', ['downloaded_at'], {
      name: 'idx_material_downloads_downloaded_at'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('material_downloads');
  }
};
