import { NextResponse } from 'next/server';
import { authenticateRequest, hasRole } from '../../../utils/auth.js';
import { prisma } from '../../../lib/prisma.js';
import bcrypt from 'bcryptjs';

/**
 * GET /api/users
 * Database se users ko fetch karta hai
 * Employee: Sirf apna profile dekh sakta hai
 * Manager/Admin: Sabhi users dekh sakte hain
 */
export async function GET(request) {
  try {
    // Pehle check karo ki user logged in hai ya nahi
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Debug: User ki details console mein print karo
    // Agar Employee hai, toh sirf uska apna profile dikhao
    if (hasRole(user, ['Employee'])) {
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          createdAt: true,
        }
      });

      if (!currentUser) {
        return NextResponse.json(
          { success: false, error: 'User nahi mila' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: [currentUser], // Array mein wrap karo for consistency
        count: 1
      });
    }

    // Agar Manager, Admin, HR Officer ya Payroll Officer hai, toh sabhi users dikhao
    if (hasRole(user, ['Manager', 'Admin', 'HR Officer', 'Payroll Officer'])) {
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          createdAt: true,
        },
        orderBy: {
          id: 'asc'
        }
      });

      return NextResponse.json({
        success: true,
        data: allUsers,
        count: allUsers.length
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    );

  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Database mein naya user create karta hai
 * Sirf Admin aur Manager hi naye users bana sakte hain
 */
export async function POST(request) {
  try {
    // Authentication check karo
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Sirf Admin, Manager aur HR Officer hi user create kar sakte hain
    if (!hasRole(user, ['Admin', 'Manager', 'HR Officer'])) {
      return NextResponse.json(
        { success: false, error: 'Sirf Admin, Manager aur HR Officer user bana sakte hain' },
        { status: 403 }
      );
    }

    // Request body se data nikalo
    const body = await request.json();
    const { name, email, role, department, password } = body;

    // Required fields check karo
    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name, email, role aur password required hain' 
        },
        { status: 400 }
      );
    }

    // Role validate karo - Allow all valid roles
    const validRoles = ['Employee', 'Manager', 'Admin', 'HR Officer', 'Payroll Officer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Valid roles: Employee, Manager, Admin, HR Officer, Payroll Officer' },
        { status: 400 }
      );
    }

    // Sirf Admin hi Admin user bana sakta hai
    if (role === 'Admin' && !hasRole(user, ['Admin'])) {
      return NextResponse.json(
        { success: false, error: 'Sirf Admin hi dusre Admin bana sakta hai' },
        { status: 403 }
      );
    }

    // Check karo ki email pehle se exist toh nahi karta
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Ye email pehle se registered hai' },
        { status: 409 }
      );
    }

    // Password ko hash karo (10 rounds of salting)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Database mein naya user create karo
    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword, // Hashed password save hoga
        role: role,
        department: department || null,
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
        message: 'User successfully create ho gaya!',
        data: newUser 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users
 * User ka role update karta hai
 * Sirf Admin hi role change kar sakta hai
 */
export async function PATCH(request) {
  try {
    // Authentication check karo
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Sirf Admin hi role update kar sakta hai
    if (!hasRole(user, ['Admin'])) {
      return NextResponse.json(
        { success: false, error: 'Sirf Admin role change kar sakta hai' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role } = body;

    // Required fields check karo
    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: 'userId aur role dono required hain' },
        { status: 400 }
      );
    }

    // Role validate karo - Allow all valid roles
    const validRoles = ['Employee', 'Manager', 'Admin', 'HR Officer', 'Payroll Officer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Valid roles: Employee, Manager, Admin, HR Officer, Payroll Officer' },
        { status: 400 }
      );
    }

    // Database mein user ko dhundho
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User nahi mila' },
        { status: 404 }
      );
    }

    // Admin apna khud ka role remove nahi kar sakta
    if (userId === user.id && role !== 'Admin') {
      return NextResponse.json(
        { success: false, error: 'Tum apna khud ka Admin role nahi hata sakte' },
        { status: 400 }
      );
    }

    // Database mein role update karo
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Role successfully update ho gaya!',
        data: updatedUser 
      }
    );

  } catch (error) {
    console.error('PATCH /api/users error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
