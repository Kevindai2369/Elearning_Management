'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('instructor', 'student'),
        allowNull: false
      },
      avatar_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      notification_preferences: {
        type: Sequelize.JSONB,
        defaultValue: {
          email: true,
          push: true,
          inApp: true
        }
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

    // Create indexes for frequently queried fields
    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email',
      unique: true
    });

    await queryInterface.addIndex('users', ['role'], {
      name: 'idx_users_role'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};
