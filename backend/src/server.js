const app = require('./app');
const { connectDB } = require('./config/database');
const { initializeSocket } = require('./config/socket');
const { initializeChatSocket } = require('./sockets/chatSocket');
const { initializeNotificationSocket } = require('./sockets/notificationSocket');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`API URL: ${process.env.API_URL || `http://localhost:${PORT}`}`);
    });

    // Initialize Socket.IO
    initializeSocket(server);
    initializeChatSocket();
    initializeNotificationSocket();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
