/**
 * Error Handling Utility for API Routes
 * Provides consistent error responses with Hinglish messages
 */

/**
 * Handle Prisma database errors with user-friendly messages
 * @param {Error} error - The error object from Prisma
 * @returns {Object} { message, status } - Error message and HTTP status code
 */
export function handlePrismaError(error) {
  // Unique constraint violation (duplicate entry)
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return {
      message: field === 'email' 
        ? 'Ye email pehle se registered hai. Kripya dusra email use karein.'
        : `Ye ${field} pehle se exist karta hai.`,
      status: 409
    };
  }

  // Record not found
  if (error.code === 'P2025') {
    return {
      message: 'Record nahi mila. Kripya sahi details enter karein.',
      status: 404
    };
  }

  // Foreign key constraint violation
  if (error.code === 'P2003') {
    return {
      message: 'Related data nahi mila. Pehle required data create karein.',
      status: 400
    };
  }

  // Required field missing
  if (error.code === 'P2011') {
    return {
      message: 'Kuch required fields missing hain. Saari details fill karein.',
      status: 400
    };
  }

  // Connection timeout
  if (error.code === 'P1008') {
    return {
      message: 'Database connection timeout. Thodi der baad try karein.',
      status: 503
    };
  }

  // Authentication failed
  if (error.code === 'P1000' || error.code === 'P1001' || error.code === 'P1002') {
    return {
      message: 'Database authentication failed. Admin se contact karein.',
      status: 500
    };
  }

  // Generic Prisma error
  return {
    message: 'Database error aayi hai. Kripya dobara try karein.',
    status: 500
  };
}

/**
 * Handle general API errors
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred (e.g., 'login', 'signup')
 * @returns {Object} { message, status, details } - Error response
 */
export function handleAPIError(error, context = 'operation') {
  console.error(`${context} error:`, error);
  console.error('Error details:', {
    name: error.name,
    message: error.message,
    code: error.code,
    stack: error.stack
  });

  // Prisma-specific errors
  if (error.code && error.code.startsWith('P')) {
    return handlePrismaError(error);
  }

  // PrismaClient not generated
  if (error.message && error.message.includes('PrismaClient')) {
    return {
      message: 'Database setup nahi hui hai. Pehle "npx prisma generate" run karein.',
      status: 500
    };
  }

  // Database connection error
  if (error.message && (
    error.message.includes('connect') || 
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('ETIMEDOUT')
  )) {
    return {
      message: 'Database se connection nahi ho pa raha. DATABASE_URL check karein.',
      status: 500
    };
  }

  // JWT token errors
  if (error.name === 'TokenExpiredError') {
    return {
      message: 'Aapka session expire ho gaya hai. Please login again.',
      status: 401
    };
  }

  if (error.name === 'JsonWebTokenError') {
    return {
      message: 'Invalid authentication token. Please login again.',
      status: 401
    };
  }

  // Bcrypt errors
  if (error.message && error.message.includes('bcrypt')) {
    return {
      message: 'Password encryption error. Dobara try karein.',
      status: 500
    };
  }

  // Network errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return {
      message: 'Network error. Internet connection check karein.',
      status: 503
    };
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return {
      message: error.message || 'Invalid data entered. Sahi details fill karein.',
      status: 400
    };
  }

  // Generic error
  const isDevelopment = process.env.NODE_ENV === 'development';
  return {
    message: isDevelopment 
      ? `${context} error: ${error.message}` 
      : `${context} mein error aayi hai. Kripya dobara try karein.`,
    status: 500,
    details: isDevelopment ? error.stack : undefined
  };
}

/**
 * Create standardized error response
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @returns {Object} - JSON response object
 */
export function createErrorResponse(error, context) {
  const { message, status, details } = handleAPIError(error, context);
  
  return {
    success: false,
    error: message,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
}

/**
 * Create standardized success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @returns {Object} - JSON response object
 */
export function createSuccessResponse(data, message) {
  return {
    success: true,
    ...(message && { message }),
    ...(data && { data }),
    timestamp: new Date().toISOString()
  };
}
