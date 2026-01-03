import { NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../utils/auth.js';
import { prisma } from '../../../../lib/prisma.js';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/password
 * Change user password
 */
export async function POST(request) {
  try {
    // Authenticate the user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Get request body
    const body = await request.json();
    const { oldPassword, newPassword } = body;

    // Validate input
    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Old password and new password are required' },
        { status: 400 }
      );
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, dbUser.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Old password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('POST /api/auth/password error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
