const fs = require('fs').promises;
const path = require('path');
const { sequelize } = require('../config/database');

/**
 * Run all migrations in order
 */
const runMigrations = async () => {
  const migrationsPath = path.join(__dirname, '../migrations');
  
  try {
    // Get all migration files
    const files = await fs.readdir(migrationsPath);
    const migrationFiles = files
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort to ensure correct order

    console.log(`Found ${migrationFiles.length} migration files`);

    // Run each migration
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migration = require(path.join(migrationsPath, file));
      
      await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
      console.log(`✓ Completed migration: ${file}`);
    }

    console.log('✓ All migrations completed successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    throw error;
  }
};

/**
 * Rollback all migrations in reverse order
 */
const rollbackMigrations = async () => {
  const migrationsPath = path.join(__dirname, '../migrations');
  
  try {
    // Get all migration files
    const files = await fs.readdir(migrationsPath);
    const migrationFiles = files
      .filter(file => file.endsWith('.js'))
      .sort()
      .reverse(); // Reverse order for rollback

    console.log(`Found ${migrationFiles.length} migration files to rollback`);

    // Rollback each migration
    for (const file of migrationFiles) {
      console.log(`Rolling back migration: ${file}`);
      const migration = require(path.join(migrationsPath, file));
      
      await migration.down(sequelize.getQueryInterface(), sequelize.Sequelize);
      console.log(`✓ Rolled back migration: ${file}`);
    }

    console.log('✓ All migrations rolled back successfully');
  } catch (error) {
    console.error('✗ Rollback failed:', error);
    throw error;
  }
};

module.exports = {
  runMigrations,
  rollbackMigrations
};
