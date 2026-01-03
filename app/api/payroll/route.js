import { NextResponse } from 'next/server';
import { authenticateRequest, hasRole } from '../../../utils/auth.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * GET /api/payroll
 * Database se payroll records fetch karta hai
 * 
 * Kaise kaam karta hai:
 * - Employee: Sirf apni payroll dekh sakta hai
 * - Manager/Admin: Sabhi employees ki payroll dekh sakte hain
 * - Filter by userId aur month bhi kar sakte ho
 */
export async function GET(request) {
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

    // URL se query parameters nikalo
    const { searchParams } = new URL(request.url);
    const filterUserId = searchParams.get('userId');
    const filterMonth = searchParams.get('month');

    // Database query condition banao
    let whereCondition = {};

    // Employee sirf apni payroll dekh sakta hai
    if (hasRole(user, ['Employee'])) {
      whereCondition.userId = user.id;
    } else {
      // Manager/Admin filter kar sakte hain
      if (filterUserId) {
        whereCondition.userId = parseInt(filterUserId);
      }
    }

    // Month filter add karo
    if (filterMonth) {
      whereCondition.month = filterMonth;
    }

    // Database se payroll records fetch karo
    const payrollRecords = await prisma.payroll.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Latest payroll pehle
      }
    });

    return NextResponse.json({
      success: true,
      count: payrollRecords.length,
      data: payrollRecords
    });

  } catch (error) {
    console.error('GET /api/payroll error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payroll
 * Database mein naya payroll record create karta hai
 * 
 * Kaise kaam karta hai:
 * - Sirf Manager/Admin hi payroll create kar sakte hain
 * - Employee payroll create nahi kar sakta
 * - Duplicate check: Same user same month ke liye duplicate nahi
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

    // Sirf Manager/Admin/Payroll Officer hi payroll create kar sakte hain
    if (!hasRole(user, ['Manager', 'Admin', 'Payroll Officer'])) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Sirf Manager, Admin aur Payroll Officer payroll create kar sakte hain' 
        },
        { status: 403 }
      );
    }

    // Request body se data nikalo
    const body = await request.json();
    let { userId, month, amount, status } = body;

    // Agar userId nahi diya toh logged-in user ki ID use karo
    // Manager/Admin apna khud ka payroll bhi create kar sakte hain
    if (!userId) {
      userId = user.id;
    }

    // Required fields check karo (userId ab optional hai)
    if (!month || !amount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'month aur amount required hain' 
        },
        { status: 400 }
      );
    }

    // Amount validate karo (negative nahi hona chahiye)
    if (amount < 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Amount negative nahi ho sakta' 
        },
        { status: 400 }
      );
    }

    // Status validate karo
    const validStatuses = ['Pending', 'Paid', 'Processing'];
    const payrollStatus = status || 'Pending'; // Default Pending
    
    if (!validStatuses.includes(payrollStatus)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Status Pending, Paid ya Processing hona chahiye' 
        },
        { status: 400 }
      );
    }

    // Check karo ki user exist karta hai
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User nahi mila' },
        { status: 404 }
      );
    }

    // Check karo ki is month ke liye pehle se payroll hai ya nahi
    const existingPayroll = await prisma.payroll.findUnique({
      where: {
        userId_month: {
          userId: userId,
          month: month
        }
      }
    });

    if (existingPayroll) {
      return NextResponse.json(
        { 
          success: false, 
          error: `${month} ke liye payroll pehle se exist karta hai` 
        },
        { status: 409 }
      );
    }

    // Database mein naya payroll record create karo
    const newPayroll = await prisma.payroll.create({
      data: {
        userId: userId,
        month: month,
        amount: parseFloat(amount),
        status: payrollStatus,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          }
        }
      }
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Payroll record successfully create ho gaya!',
        data: newPayroll 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('POST /api/payroll error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/payroll
 * Payroll status update karta hai (Pending -> Paid)
 * 
 * Kaise kaam karta hai:
 * - Sirf Manager/Admin/Payroll Officer hi status update kar sakte hain
 * - Status ko "Paid", "Pending" ya "Processing" mein update karta hai
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

    // Only Admin/Manager/Payroll Officer can update status
    if (!hasRole(user, ['Admin', 'Manager', 'Payroll Officer'])) {
      return NextResponse.json(
        { success: false, error: 'Only Admin, Manager or Payroll Officer can update payroll status' },
        { status: 403 }
      );
    }

    // Request body se data nikalo
    const body = await request.json();
    const { payrollId, status } = body;
    // Validation
    if (!payrollId) {
      return NextResponse.json(
        { success: false, error: 'payrollId required hai' },
        { status: 400 }
      );
    }

    const validStatuses = ['Pending', 'Processing', 'Paid'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status Pending, Processing ya Paid hona chahiye' },
        { status: 400 }
      );
    }

    // Payroll record find karo
    const payroll = await prisma.payroll.findUnique({
      where: { id: parseInt(payrollId) }
    });

    if (!payroll) {
      return NextResponse.json(
        { success: false, error: 'Payroll record nahi mila' },
        { status: 404 }
      );
    }

    // Validate status transitions - prevent backward movement
    if (payroll.status === 'Paid') {
      return NextResponse.json(
        { success: false, error: 'Cannot change status of already paid payroll' },
        { status: 400 }
      );
    }

    if (payroll.status === 'Processing' && status === 'Pending') {
      return NextResponse.json(
        { success: false, error: 'Cannot move back to Pending from Processing' },
        { status: 400 }
      );
    }

    // Update payroll status
    const updatedPayroll = await prisma.payroll.update({
      where: { id: parseInt(payrollId) },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          }
        }
      }
    });
    return NextResponse.json({
      success: true,
      message: `Payroll ${status.toLowerCase()} successfully!`,
      data: updatedPayroll
    });

  } catch (error) {
    console.error('PATCH /api/payroll error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
