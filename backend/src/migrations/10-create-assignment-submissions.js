'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('assignment_submissions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      assignment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'assignments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      student_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      attachments: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      grade: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      graded_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create indexes
    await queryInterface.addIndex('assignment_submissions', ['assignment_id'], {
      name: 'idx_assignment_submissions_assignment_id'
    });

    await queryInterface.addIndex('assignment_submissions', ['student_id'], {
      name: 'idx_assignment_submissions_student_id'
    });

    await queryInterface.addIndex('assignment_submissions', ['submitted_at'], {
      name: 'idx_assignment_submissions_submitted_at'
    });

    // Unique constraint to prevent duplicate submissions
    await queryInterface.addConstraint('assignment_submissions', {
      fields: ['assignment_id', 'student_id'],
      type: 'unique',
      name: 'unique_assignment_student_submission'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('assignment_submissions');
  }
};
