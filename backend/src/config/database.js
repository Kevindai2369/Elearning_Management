const { Sequelize } = require('sequelize');
require('dotenv').config();

// Initialize Sequelize with PostgreSQL
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Connection pool configuration for optimal performance
    pool: {
      max: 10,           // Maximum number of connections in pool
      min: 2,            // Minimum number of connections in pool
      acquire: 30000,    // Maximum time (ms) to acquire connection before throwing error
      idle: 10000,       // Maximum time (ms) connection can be idle before being released
      evict: 1000        // Time interval (ms) to run eviction to remove idle connections
    },
    
    // Retry configuration
    retry: {
      max: 3,            // Maximum number of retry attempts
      timeout: 3000      // Timeout for each retry attempt
    },
    
    // Additional options
    dialectOptions: {
      connectTimeout: 60000,  // Connection timeout
      // For production with SSL (Render, Heroku, etc.)
      ...(process.env.NODE_ENV === 'production' && {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      })
    },
    
    // Define timezone
    timezone: '+00:00'
  }
);

/**
 * Connect to database and verify connection
 */
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');
    console.log(`  Database: ${process.env.DB_NAME}`);
    console.log(`  Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}`);
    
    // Log pool configuration
    if (process.env.NODE_ENV === 'development') {
      console.log('  Pool config:', {
        max: sequelize.config.pool.max,
        min: sequelize.config.pool.min
      });
    }
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error.message);
    throw error;
  }
};

/**
 * Check database health status
 * @returns {Promise<Object>} Health status object
 */
const checkDatabaseHealth = async () => {
  try {
    await sequelize.authenticate();
    
    // Get pool status
    const pool = sequelize.connectionManager.pool;
    
    return {
      status: 'healthy',
      connected: true,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      pool: {
        size: pool ? pool.size : 0,
        available: pool ? pool.available : 0,
        using: pool ? pool.using : 0,
        waiting: pool ? pool.waiting : 0
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Sync database models (use with caution in production)
 * @param {Object} options - Sequelize sync options
 */
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✓ Database synchronized successfully.');
  } catch (error) {
    console.error('✗ Database synchronization failed:', error.message);
    throw error;
  }
};

/**
 * Close database connection gracefully
 */
const closeDatabase = async () => {
  try {
    await sequelize.close();
    console.log('✓ Database connection closed successfully.');
  } catch (error) {
    console.error('✗ Error closing database connection:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectDB,
  checkDatabaseHealth,
  syncDatabase,
  closeDatabase
};
