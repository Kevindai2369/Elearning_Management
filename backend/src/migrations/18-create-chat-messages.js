'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('chat_messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'chat_conversations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sender_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      attachment_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('chat_messages', ['conversation_id'], {
      name: 'idx_chat_messages_conversation_id'
    });

    await queryInterface.addIndex('chat_messages', ['sender_id'], {
      name: 'idx_chat_messages_sender_id'
    });

    await queryInterface.addIndex('chat_messages', ['created_at'], {
      name: 'idx_chat_messages_created_at'
    });

    await queryInterface.addIndex('chat_messages', ['is_read'], {
      name: 'idx_chat_messages_is_read'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('chat_messages');
  }
};
