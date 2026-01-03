import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma.js';
import bcrypt from 'bcryptjs';

/**
 * GET /api/seed
 * Database mein initial users create karta hai
 * Sirf development ke liye - production mein delete kar dena
 */
export async function GET() {
  try {
    // Check karo ki already users hain ya nahi
    const existingUsers = await prisma.user.count();
    
    if (existingUsers > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Database mein already ${existingUsers} users hain. Pehle unhe delete karo.` 
        },
        { status: 400 }
      );
    }

    // Password hash karo
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Admin user create karo
    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@workzen.com',
        password: hashedPassword,
        role: 'Admin',
        department: 'Management',
      },
    });

    // Employee user create karo
    const employee = await prisma.user.create({
      data: {
        name: 'Rohit Sharma',
        email: 'rohit@workzen.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        department: 'Development',
      },
    });

    // Manager user create karo
    const manager = await prisma.user.create({
      data: {
        name: 'Ananya Patel',
        email: 'ananya@workzen.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Manager',
        department: 'HR',
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: '3 users successfully create ho gaye!',
        users: [
          {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            password: 'admin123', // Dikhane ke liye (hashed hai database mein)
          },
          {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            role: employee.role,
            password: 'password123',
          },
          {
            id: manager.id,
            name: manager.name,
            email: manager.email,
            role: manager.role,
            password: 'password123',
          },
        ],
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
