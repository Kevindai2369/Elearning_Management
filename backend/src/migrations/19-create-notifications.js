'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      data: {
        type: Sequelize.JSONB,
        defaultValue: {}
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
    await queryInterface.addIndex('notifications', ['user_id'], {
      name: 'idx_notifications_user_id'
    });

    await queryInterface.addIndex('notifications', ['is_read'], {
      name: 'idx_notifications_is_read'
    });

    await queryInterface.addIndex('notifications', ['created_at'], {
      name: 'idx_notifications_created_at'
    });

    await queryInterface.addIndex('notifications', ['type'], {
      name: 'idx_notifications_type'
    });

    // Composite index for unread notifications per user
    await queryInterface.addIndex('notifications', ['user_id', 'is_read'], {
      name: 'idx_notifications_user_unread'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notifications');
  }
};
