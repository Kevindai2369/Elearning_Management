const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Authentication Service
 * Handles user authentication, token generation, and password management
 */
class AuthService {
  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a plain text password with a hashed password
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<boolean>} True if passwords match
   */
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload (user id, email, role)
   * @returns {string} JWT access token
   */
  generateAccessToken(payload) {
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '15m';

    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Generate JWT refresh token
   * @param {Object} payload - Token payload (user id)
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(payload) {
    const secret = process.env.JWT_REFRESH_SECRET;
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
    }

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object
   * @returns {Object} Object containing access and refresh tokens
   */
  generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken({ id: user.id });

    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * Verify JWT access token
   * @param {string} token - JWT access token
   * @returns {Object} Decoded token payload
   * @throws {ApiError} If token is invalid or expired
   */
  verifyAccessToken(token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
      }
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Access token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new ApiError(401, 'INVALID_TOKEN', 'Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Verify JWT refresh token
   * @param {string} token - JWT refresh token
   * @returns {Object} Decoded token payload
   * @throws {ApiError} If token is invalid or expired
   */
  verifyRefreshToken(token) {
    try {
      const secret = process.env.JWT_REFRESH_SECRET;
      if (!secret) {
        throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
      }
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ApiError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User object and tokens
   * @throws {ApiError} If credentials are invalid
   */
  async login(email, password) {
    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Return user data (without password) and tokens
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
      notification_preferences: user.notification_preferences
    };

    return {
      user: userData,
      ...tokens
    };
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - JWT refresh token
   * @returns {Promise<Object>} New access token
   * @throws {ApiError} If refresh token is invalid
   */
  async refreshAccessToken(refreshToken) {
    // Verify refresh token
    const decoded = this.verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new ApiError(401, 'USER_NOT_FOUND', 'User not found');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return { accessToken };
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object
   * @throws {ApiError} If user not found
   */
  async getUserById(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return user;
  }
}

module.exports = new AuthService();
