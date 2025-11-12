'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('quiz_attempts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      quiz_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'quizzes',
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
      answers: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      graded_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create indexes
    await queryInterface.addIndex('quiz_attempts', ['quiz_id'], {
      name: 'idx_quiz_attempts_quiz_id'
    });

    await queryInterface.addIndex('quiz_attempts', ['student_id'], {
      name: 'idx_quiz_attempts_student_id'
    });

    await queryInterface.addIndex('quiz_attempts', ['started_at'], {
      name: 'idx_quiz_attempts_started_at'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('quiz_attempts');
  }
};
