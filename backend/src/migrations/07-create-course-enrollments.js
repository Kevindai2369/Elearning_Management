'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('course_enrollments', {
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
      enrolled_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('course_enrollments', ['course_id'], {
      name: 'idx_course_enrollments_course_id'
    });

    await queryInterface.addIndex('course_enrollments', ['student_id'], {
      name: 'idx_course_enrollments_student_id'
    });

    // Unique constraint to prevent duplicate enrollments
    await queryInterface.addConstraint('course_enrollments', {
      fields: ['course_id', 'student_id'],
      type: 'unique',
      name: 'unique_course_student_enrollment'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('course_enrollments');
  }
};
