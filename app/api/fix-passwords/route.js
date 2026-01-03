import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma.js';
import bcrypt from 'bcryptjs';

/**
 * GET /api/fix-passwords
 * Existing users ke plain text passwords ko hash karta hai
 * One-time fix API - baad mein delete kar dena
 */
export async function GET() {
  try {
    // Sabhi users ko fetch karo
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        password: true,
      }
    });

    const fixed = [];
    const alreadyHashed = [];

    for (const user of users) {
      // Check karo ki password already hashed hai ya nahi
      // Bcrypt hash "$2a$" or "$2b$" se shuru hota hai
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        alreadyHashed.push(user.email);
        continue;
      }

      // Plain text password ko hash karo
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Database mein update karo
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      fixed.push({
        email: user.email,
        originalPassword: user.password, // Dikhane ke liye
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `${fixed.length} users ke passwords hash ho gaye!`,
        fixed: fixed,
        alreadyHashed: alreadyHashed,
        note: 'Ab tum original passwords se login kar sakte ho. Example: admin@workzen.com / admin123'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Fix passwords error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
