'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('courses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      semester_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'semesters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      instructor_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
    await queryInterface.addIndex('courses', ['semester_id'], {
      name: 'idx_courses_semester_id'
    });

    await queryInterface.addIndex('courses', ['instructor_id'], {
      name: 'idx_courses_instructor_id'
    });

    await queryInterface.addIndex('courses', ['code'], {
      name: 'idx_courses_code'
    });

    await queryInterface.addIndex('courses', ['name'], {
      name: 'idx_courses_name'
    });

    // Unique constraint for semester_id + code combination
    await queryInterface.addConstraint('courses', {
      fields: ['semester_id', 'code'],
      type: 'unique',
      name: 'unique_semester_course_code'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('courses');
  }
};
