'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('content_views', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      content_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type of content: announcement, assignment, quiz, material'
      },
      content_id: {
        type: Sequelize.UUID,
        allowNull: false
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
      viewed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('content_views', ['content_type', 'content_id'], {
      name: 'idx_content_views_content'
    });

    await queryInterface.addIndex('content_views', ['student_id'], {
      name: 'idx_content_views_student_id'
    });

    await queryInterface.addIndex('content_views', ['viewed_at'], {
      name: 'idx_content_views_viewed_at'
    });

    // Unique constraint to track unique views per student per content
    await queryInterface.addConstraint('content_views', {
      fields: ['content_type', 'content_id', 'student_id'],
      type: 'unique',
      name: 'unique_content_student_view'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('content_views');
  }
};
