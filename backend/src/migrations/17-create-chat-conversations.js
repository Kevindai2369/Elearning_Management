'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('chat_conversations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      instructor_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
    await queryInterface.addIndex('chat_conversations', ['student_id'], {
      name: 'idx_chat_conversations_student_id'
    });

    await queryInterface.addIndex('chat_conversations', ['instructor_id'], {
      name: 'idx_chat_conversations_instructor_id'
    });

    // Unique constraint to prevent duplicate conversations
    await queryInterface.addConstraint('chat_conversations', {
      fields: ['student_id', 'instructor_id'],
      type: 'unique',
      name: 'unique_student_instructor_conversation'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('chat_conversations');
  }
};
