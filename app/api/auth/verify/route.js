import { authenticateRequest } from '../../../../utils/auth';

/**
 * GET /api/auth/verify
 * Verify if the provided JWT token is valid
 */
export async function GET(request) {
  try {
    // Verify token from Authorization header
    const authResult = await authenticateRequest(request);
    
    if (!authResult.success) {
      return Response.json(
        {
          success: false,
          error: authResult.error || 'Invalid or expired token',
        },
        { status: 401 }
      );
    }

    return Response.json(
      {
        success: true,
        message: 'Token is valid',
        user: authResult.user,
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message || 'Invalid or expired token',
      },
      { status: 401 }
    );
  }
}
