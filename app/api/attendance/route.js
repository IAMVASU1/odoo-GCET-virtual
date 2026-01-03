import { NextResponse } from 'next/server';
import { authenticateRequest, hasRole } from '../../../utils/auth.js';
import { prisma } from '../../../lib/prisma.js';

// Helper function to get today's date in YYYY-MM-DD format (local timezone)
const getTodayDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * GET /api/attendance
 * Database se attendance records fetch karta hai
 * 
 * Kaise kaam karta hai:
 * - Employee: Sirf apne attendance records dekh sakta hai
 * - Manager/Admin: Sabhi employees ke records dekh sakte hain
 * - Filter by userId aur date bhi kar sakte ho
 */
export async function GET(request) {
  try {
    // Pehle user ko authenticate karo
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // URL se query parameters nikalo (userId, date for filtering)
    const { searchParams } = new URL(request.url);
    const filterUserId = searchParams.get('userId');
    const filterDate = searchParams.get('date');

    // Database query ki condition banao
    let whereCondition = {};

    // Agar Employee hai, toh sirf uska apna data dikhao
    if (hasRole(user, ['Employee'])) {
      whereCondition.userId = user.id;
    } else {
      // Manager/Admin ke liye userId filter optional hai
      if (filterUserId) {
        whereCondition.userId = parseInt(filterUserId);
      }
    }

    // Date filter add karo agar diya gaya hai
    if (filterDate) {
      whereCondition.date = filterDate;
    }

    // Database se attendance records fetch karo
    const attendanceRecords = await prisma.attendance.findMany({
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
        date: 'desc' // Latest date pehle
      }
    });

    return NextResponse.json({
      success: true,
      count: attendanceRecords.length,
      data: attendanceRecords
    });

  } catch (error) {
    console.error('GET /api/attendance error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attendance
 * Database mein naya attendance record create karta hai
 * 
 * Kaise kaam karta hai:
 * - Employee: Sirf apna attendance mark kar sakta hai
 * - Manager/Admin: Kisi bhi employee ka attendance mark kar sakte hain
 * - Duplicate check: Same user same date pe duplicate nahi bana sakta
 */
export async function POST(request) {
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

    // Request body se data nikalo
    const body = await request.json();
    let { userId, date, status, checkIn, checkOut } = body;

    // Agar userId nahi diya toh logged-in user ki ID use karo
    if (!userId) {
      userId = user.id;
    }

    // Convert userId to integer for database consistency
    userId = parseInt(userId);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid userId - received: ' + body.userId },
        { status: 400 }
      );
    }

    // Agar date nahi diya toh aaj ka date use karo
    if (!date) {
      date = getTodayDate()
    }

    // Agar status nahi diya toh default "Present" set karo
    if (!status) {
      status = 'Present';
    }

    // Status validate karo
    const validStatuses = ['Present', 'Absent', 'Half Day', 'Leave'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Status Present, Absent, Half Day ya Leave hona chahiye' 
        },
        { status: 400 }
      );
    }

    // Employee sirf apna attendance mark kar sakta hai
    if (hasRole(user, ['Employee']) && userId !== user.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tum sirf apna khud ka attendance mark kar sakte ho' 
        },
        { status: 403 }
      );
    }

    // Check karo ki user exist karta hai ya nahi
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User nahi mila' },
        { status: 404 }
      );
    }

    // Check karo ki is date pe pehle se attendance marked hai ya nahi
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: userId,
          date: date
        }
      }
    });

    if (existingAttendance) {
      return NextResponse.json(
        { 
          success: false, 
          error: `${date} ke liye attendance pehle se marked hai` 
        },
        { status: 409 }
      );
    }

    // Database mein naya attendance record create karo
    const newAttendance = await prisma.attendance.create({
      data: {
        userId: userId,
        date: date,
        status: status,
        checkIn: checkIn ? new Date(checkIn) : new Date(),
        checkOut: checkOut ? new Date(checkOut) : null,
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
        message: 'Attendance successfully mark ho gaya!',
        data: newAttendance 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('POST /api/attendance error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/attendance
 * Existing attendance record ko update karta hai (mainly check-out ke liye)
 * 
 * Kaise kaam karta hai:
 * - Employee: Sirf apna attendance update kar sakta hai
 * - Manager/Admin: Kisi bhi employee ka attendance update kar sakte hain
 */
export async function PATCH(request) {
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

    // Request body se data nikalo
    const body = await request.json();
    let { id, checkOut, status } = body;

    // Convert id to integer
    id = parseInt(id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid attendance ID' },
        { status: 400 }
      );
    }

    // Pehle existing record check karo
    const existingAttendance = await prisma.attendance.findUnique({
      where: { id: id },
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

    if (!existingAttendance) {
      return NextResponse.json(
        { success: false, error: 'Attendance record nahi mila' },
        { status: 404 }
      );
    }

    // Permission check karo
    // Employee sirf apna attendance update kar sakta hai
    if (user.role === 'Employee' && existingAttendance.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Aap sirf apna attendance update kar sakte hain' },
        { status: 403 }
      );
    }

    // Update data prepare karo
    const updateData = {};
    if (checkOut) {
      updateData.checkOut = new Date(checkOut);
    }
    
    // Auto-calculate status based on worked hours if checkOut is provided
    if (checkOut && existingAttendance.checkIn) {
      const checkInTime = new Date(existingAttendance.checkIn);
      const checkOutTime = new Date(checkOut);
      
      const workedMilliseconds = checkOutTime - checkInTime;
      const workedHours = workedMilliseconds / (1000 * 60 * 60);
      
      const FULL_DAY_HOURS = 8;
      const HALF_DAY_MIN_HOURS = 4;
      
      if (workedHours >= FULL_DAY_HOURS) {
        updateData.status = 'Present';
      } else if (workedHours >= HALF_DAY_MIN_HOURS && workedHours < FULL_DAY_HOURS) {
        updateData.status = 'Half Day';
      } else {
        updateData.status = 'Absent';
      }
    } else if (status) {
      // Manual status update (only if checkOut not provided)
      const validStatuses = ['Present', 'Absent', 'Half Day', 'Leave'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    // Database mein attendance record update karo
    const updatedAttendance = await prisma.attendance.update({
      where: { id: id },
      data: updateData,
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
        message: 'Attendance successfully update ho gaya!',
        data: updatedAttendance 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('PATCH /api/attendance error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

