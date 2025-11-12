'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('group_members', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'groups',
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
      joined_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('group_members', ['group_id'], {
      name: 'idx_group_members_group_id'
    });

    await queryInterface.addIndex('group_members', ['student_id'], {
      name: 'idx_group_members_student_id'
    });

    // Unique constraint to prevent duplicate memberships
    await queryInterface.addConstraint('group_members', {
      fields: ['group_id', 'student_id'],
      type: 'unique',
      name: 'unique_group_student'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('group_members');
  }
};
