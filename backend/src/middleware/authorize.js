const ApiError = require('../utils/ApiError');

/**
 * Middleware to authorize requests based on user roles
 * Must be used after authenticate middleware
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Check if user role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        `Access denied. Required role: ${allowedRoles.join(' or ')}`
      );
    }

    next();
  };
};

/**
 * Middleware to check if user is an instructor
 */
const requireInstructor = authorize('instructor');

/**
 * Middleware to check if user is a student
 */
const requireStudent = authorize('student');

/**
 * Middleware to allow both instructors and students
 */
const requireAuthenticated = authorize('instructor', 'student');

module.exports = {
  authorize,
  requireInstructor,
  requireStudent,
  requireAuthenticated
};
