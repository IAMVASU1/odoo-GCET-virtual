import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

/**
 * Generate JWT token for authenticated user
 * @param {Object} user - User object with id, email, role
 * @returns {String} JWT token
 */
export function generateToken(user) {
  try {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // Token expires in 7 days
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '7d',
    });

    return token;
  } catch (error) {
    throw new Error('Failed to generate token');
  }
}

/**
 * Verify JWT token from Authorization header
 * @param {String} token - JWT token
 * @returns {Object} Decoded user payload
 */
export function verifyToken(token) {
  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace('Bearer ', '');
    
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

/**
 * Middleware to extract and verify token from request
 * @param {Request} request - Next.js request object
 * @returns {Object} { success: boolean, user?: object, error?: string }
 */
export async function authenticateRequest(request) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return { success: false, error: 'No authorization token provided' };
    }

    // Verify token
    const user = verifyToken(authHeader);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if user has required role
 * @param {Object} user - User object from token
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Boolean}
 */
export function hasRole(user, allowedRoles) {
  return allowedRoles.includes(user.role);
}
