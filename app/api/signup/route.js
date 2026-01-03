import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma.js';
import bcrypt from 'bcryptjs';

/**
 * POST /api/signup
 * Public endpoint for user registration (self-signup)
 * Creates a new Employee user without requiring authentication
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, companyName, phone } = body;

    // Required fields check
    if (!name || !email || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name, email, aur password zaruri hain' 
        },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Email format galat hai. Sahi email dalein.' },
        { status: 400 }
      );
    }

    // Password strength validation
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password kam se kam 6 characters ka hona chahiye' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Ye email pehle se registered hai. Kripya dusra email use karein.' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Signup page is only for creating Admin accounts
    // Employees should be created by Admin through the manage users section
    const userRole = 'Admin';

    // Create new Admin user
    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: userRole, // Always Admin for signup
        department: companyName || null, // Use companyName as department
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
      }
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Admin account successfully created! You can now login.',
        user: newUser 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Signup error:', error);
    
    // Agar Prisma ka specific error hai
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Ye email pehle se registered hai' },
        { status: 409 }
      );
    }
    
    // Generic server error
    return NextResponse.json(
      { 
        success: false, 
        error: 'Registration mein problem aa gayi. Thodi der baad try karein.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
