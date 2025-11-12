const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');
const ApiError = require('../utils/ApiError');

/**
 * Validation schema for login
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(1).required().messages({
    'string.min': 'Password is required',
    'any.required': 'Password is required'
  })
});

/**
 * Validation schema for refresh token
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required'
  })
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = loginSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, 'VALIDATION_ERROR', error.details[0].message);
  }

  const { email, password } = value;

  // Authenticate user
  const result = await authService.login(email, password);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // In a stateless JWT system, logout is handled client-side by removing tokens
  // If using token blacklist or database storage, implement invalidation here
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refresh = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = refreshTokenSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, 'VALIDATION_ERROR', error.details[0].message);
  }

  const { refreshToken } = value;

  // Generate new access token
  const result = await authService.refreshAccessToken(refreshToken);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * @desc    Get current user info
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  // User is already attached to req by authenticate middleware
  res.status(200).json({
    success: true,
    data: req.user
  });
});

module.exports = {
  login,
  logout,
  refresh,
  getCurrentUser
};
