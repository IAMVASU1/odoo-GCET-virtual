import { NextResponse } from 'next/server';
import { authenticateRequest, hasRole } from '../../../utils/auth.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * GET /api/leave
 * Database se leave requests fetch karta hai
 * 
 * Kaise kaam karta hai:
 * - Employee: Sirf apne leave requests dekh sakta hai
 * - Manager/Admin: Sabhi employees ke leave requests dekh sakte hain
 * - Filter by userId aur status bhi kar sakte ho
 */
export async function GET(request) {
  try {
    // User authentication check karo
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
    const filterStatus = searchParams.get('status'); // Pending, Approved, Rejected

    // Database query condition banao
    let whereCondition = {};

    // Employee sirf apne leaves dekh sakta hai
    if (hasRole(user, ['Employee'])) {
      whereCondition.userId = user.id;
    } else {
      // Manager/Admin filter kar sakte hain
      if (filterUserId) {
        whereCondition.userId = parseInt(filterUserId);
      }
    }

    // Status filter add karo
    if (filterStatus) {
      whereCondition.status = filterStatus;
    }
    // Database se leave requests fetch karo
    const leaveRequests = await prisma.leave.findMany({
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
        createdAt: 'desc' // Latest request pehle
      }
    });
    return NextResponse.json({
      success: true,
      count: leaveRequests.length,
      data: leaveRequests
    });

  } catch (error) {
    console.error('GET /api/leave error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leave
 * Database mein naya leave request create karta hai
 * 
 * Kaise kaam karta hai:
 * - Employee: Sirf apne liye leave request kar sakta hai
 * - Manager/Admin: Kisi ke liye bhi leave request/approve kar sakte hain
 * - Date overlap check: Same user ke liye dates overlap nahi honi chahiye
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

    // Request body se data nikalo
    const body = await request.json();
    let { userId, reason, from, to, status } = body;

    // Agar userId nahi diya toh logged-in user ki ID use karo
    if (!userId) {
      userId = user.id;
    }

    // Required fields check karo (userId ab optional hai)
    if (!reason || !from || !to) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'reason, from aur to date required hain' 
        },
        { status: 400 }
      );
    }

    // Status validate karo
    const validStatuses = ['Pending', 'Approved', 'Rejected'];
    const leaveStatus = status || 'Pending'; // Default Pending
    
    if (!validStatuses.includes(leaveStatus)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Status Pending, Approved ya Rejected hona chahiye' 
        },
        { status: 400 }
      );
    }

    // Employee sirf apne liye request kar sakta hai
    if (hasRole(user, ['Employee']) && userId !== user.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tum sirf apne liye leave request kar sakte ho' 
        },
        { status: 403 }
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

    // Date overlap check karo - same user ke existing leaves ke saath
    const overlappingLeaves = await prisma.leave.findMany({
      where: {
        userId: userId,
        OR: [
          {
            AND: [
              { from: { lte: from } },
              { to: { gte: from } }
            ]
          },
          {
            AND: [
              { from: { lte: to } },
              { to: { gte: to } }
            ]
          },
          {
            AND: [
              { from: { gte: from } },
              { to: { lte: to } }
            ]
          }
        ]
      }
    });

    if (overlappingLeaves.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'In dates ke liye pehle se leave request hai' 
        },
        { status: 409 }
      );
    }

    // Database mein naya leave request create karo
    const newLeave = await prisma.leave.create({
      data: {
        userId: userId,
        reason: reason,
        from: from,
        to: to,
        status: leaveStatus,
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
        message: 'Leave request successfully create ho gaya!',
        data: newLeave 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('POST /api/leave error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/leave
 * Leave request ko approve/reject karta hai
 * 
 * Kaise kaam karta hai:
 * - Sirf Manager/Admin approve/reject kar sakte hain
 * - Status ko "Approved" ya "Rejected" mein update karta hai
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

    // Only Admin/Manager/HR Officer can approve/reject
    if (!hasRole(user, ['Admin', 'Manager', 'HR Officer'])) {
      return NextResponse.json(
        { success: false, error: 'Only Admin, Manager or HR Officer can approve/reject leaves' },
        { status: 403 }
      );
    }

    // Request body se data nikalo
    const body = await request.json();
    const { leaveId, status } = body;
    // Validation
    if (!leaveId) {
      return NextResponse.json(
        { success: false, error: 'leaveId required hai' },
        { status: 400 }
      );
    }

    const validStatuses = ['Approved', 'Rejected'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status Approved ya Rejected hona chahiye' },
        { status: 400 }
      );
    }

    // Leave request find karo
    const leave = await prisma.leave.findUnique({
      where: { id: parseInt(leaveId) }
    });

    if (!leave) {
      return NextResponse.json(
        { success: false, error: 'Leave request nahi mila' },
        { status: 404 }
      );
    }

    // Already processed check
    if (leave.status !== 'Pending') {
      return NextResponse.json(
        { success: false, error: `Leave already ${leave.status}` },
        { status: 400 }
      );
    }

    // Update leave status
    const updatedLeave = await prisma.leave.update({
      where: { id: parseInt(leaveId) },
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
      message: `Leave ${status.toLowerCase()} successfully!`,
      data: updatedLeave
    });

  } catch (error) {
    console.error('PATCH /api/leave error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
