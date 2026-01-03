import { generateToken } from '../../../../utils/auth.js';
import { prisma } from '../../../../lib/prisma.js';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/login
 * User ko authenticate karta hai aur JWT token return karta hai
 */
export async function POST(request) {
  try {
    // Request body se email aur password nikalo
    const body = await request.json();
    const { email, password } = body;

    // Check karo ki email aur password diya hai ya nahi
    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email aur password dono required hain' },
        { status: 400 }
      );
    }

    // Database mein user ko email se dhundho (lowercase for case-insensitive matching)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Debug logging
    console.log('Login attempt for email:', email.toLowerCase());
    if (user) {
      console.log('Password hash starts with:', user.password.substring(0, 10));
    }

    // Agar user nahi mila, toh error return karo
    if (!user) {
      return Response.json(
        { success: false, error: 'Email ya password galat hai' },
        { status: 401 }
      );
    }

    // Password ko check karo - bcrypt se compare karo
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return Response.json(
        { success: false, error: 'Email ya password galat hai' },
        { status: 401 }
      );
    }

    // JWT token generate karo
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Success response bhejo with cookie
    const response = Response.json(
      {
        success: true,
        message: 'Login successful!',
        token: token,
        user: {
          id: user.id,
          loginId: user.email, // For backward compatibility with frontend
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        },
      },
      { status: 200 }
    );

    // Set cookie for middleware authentication
    response.headers.append(
      'Set-Cookie',
      `authToken=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}` // 7 days
    );

    return response;

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', error.message);
    
    // Handle specific errors
    if (error.message && error.message.includes('PrismaClient')) {
      return Response.json(
        { 
          success: false, 
          error: 'Database configuration error. Pehle "npx prisma generate" run karein.' 
        },
        { status: 500 }
      );
    }
    
    if (error.message && error.message.includes('connect')) {
      return Response.json(
        { 
          success: false, 
          error: 'Database se connection nahi ho pa raha hai.' 
        },
        { status: 500 }
      );
    }
    
    return Response.json(
      { 
        success: false, 
        error: process.env.NODE_ENV === 'development' 
          ? `Server error: ${error.message}` 
          : 'Server error ho gayi hai. Kripya dobara try karein.'
      },
      { status: 500 }
    );
  }
}
