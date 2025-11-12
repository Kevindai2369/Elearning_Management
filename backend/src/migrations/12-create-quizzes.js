'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('quizzes', {
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
      question_ids: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      time_limit: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Time limit in minutes'
      },
      point_value: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      passing_score: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      randomize_questions: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.addIndex('quizzes', ['course_id'], {
      name: 'idx_quizzes_course_id'
    });

    await queryInterface.addIndex('quizzes', ['published_at'], {
      name: 'idx_quizzes_published_at'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('quizzes');
  }
};
