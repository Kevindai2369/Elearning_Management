const authService = require('../services/authService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Middleware to authenticate requests using JWT
 * Extracts token from Authorization header and verifies it
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHORIZED', 'No token provided');
  }

  // Extract token
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'No token provided');
  }

  // Verify token
  const decoded = authService.verifyAccessToken(token);

  // Get user from database
  const user = await authService.getUserById(decoded.id);

  // Attach user to request object
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar_url: user.avatar_url,
    notification_preferences: user.notification_preferences
  };

  next();
});

module.exports = authenticate;
