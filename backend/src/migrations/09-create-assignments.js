'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('assignments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      course_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'courses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      attachments: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      target_groups: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      point_value: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('assignments', ['course_id'], {
      name: 'idx_assignments_course_id'
    });

    await queryInterface.addIndex('assignments', ['due_date'], {
      name: 'idx_assignments_due_date'
    });

    await queryInterface.addIndex('assignments', ['published_at'], {
      name: 'idx_assignments_published_at'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('assignments');
  }
};
