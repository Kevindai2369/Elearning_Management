const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Learning Platform API',
      version: '1.0.0',
      description: 'RESTful API for E-Learning Platform with course management, content delivery, and real-time communication',
      contact: {
        name: 'API Support',
        email: 'support@elearning.com'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object'
                  }
                }
              }
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              example: 100
            },
            page: {
              type: 'integer',
              example: 1
            },
            limit: {
              type: 'integer',
              example: 20
            },
            totalPages: {
              type: 'integer',
              example: 5
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Semesters',
        description: 'Semester management'
      },
      {
        name: 'Courses',
        description: 'Course management'
      },
      {
        name: 'Groups',
        description: 'Group management'
      },
      {
        name: 'Students',
        description: 'Student management and bulk import'
      },
      {
        name: 'Content',
        description: 'Announcements, assignments, and materials'
      },
      {
        name: 'Question Bank',
        description: 'Question bank management'
      },
      {
        name: 'Quizzes',
        description: 'Quiz management and taking'
      },
      {
        name: 'Forum',
        description: 'Forum threads and replies'
      },
      {
        name: 'Chat',
        description: 'Private chat conversations'
      },
      {
        name: 'Notifications',
        description: 'Notification management'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI
 * @param {Object} app - Express app instance
 */
const setupSwagger = (app) => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'E-Learning API Documentation'
  }));

  // Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('Swagger documentation available at /api-docs');
};

module.exports = {
  setupSwagger,
  swaggerSpec
};
