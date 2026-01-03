import { NextResponse } from 'next/server';
import { authenticateRequest, hasRole } from '../../../utils/auth.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * GET /api/payroll
 * Fetch payroll records.
 * - Employee: View own records.
 * - Admin/Manager: View all records.
 */
export async function GET(request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const filterUserId = searchParams.get('userId');

    let whereCondition = {};

    if (hasRole(user, ['Employee'])) {
      whereCondition.userId = user.id;
    } else if (filterUserId) {
      whereCondition.userId = parseInt(filterUserId);
    }

    const payrolls = await prisma.payroll.findMany({
      where: whereCondition,
      include: {
        user: { select: { id: true, name: true, email: true, department: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: payrolls });
  } catch (error) {
    console.error('GET /api/payroll error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/payroll
 * Generate or Create Payroll Record.
 * - Only Admin/Manager/Payroll Officer.
 * - Auto-calculates based on Attendance + Paid Leaves.
 */
export async function POST(request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const { user } = authResult;
    if (!hasRole(user, ['Admin', 'Manager', 'Payroll Officer'])) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, month, year } = body; // month: "October", year: 2025

    if (!userId || !month || !year) {
      return NextResponse.json({ success: false, error: 'UserId, month, and year required' }, { status: 400 });
    }

    // 1. Fetch User Salary Info
    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { id: true, salary: true, name: true }
    });

    if (!targetUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    const monthlySalary = targetUser.salary || 0;

    // 2. Calculate Attendance (Present Days)
    // Need to parse month string to date range. 
    // Assuming month is full name "October", or simple mapping.
    // For simplicity, let's use a strict Month Index or Name mapping.
    // Normalize month to Title Case for consistency
    const titleCaseMonth = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();

    const monthMap = {
      "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5,
      "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11
    };

    const monthIndex = monthMap[titleCaseMonth];
    if (monthIndex === undefined) return NextResponse.json({ success: false, error: 'Invalid month name. Use full English names (e.g., January).' }, { status: 400 });

    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0); // Last day of month

    // Fetch Attendance
    // Note: Database date is String "YYYY-MM-DD". We must filter carefully.
    // Or we can fetch all for user and filter in JS if dates are strings.
    // Prisma string filtering: startswith "YYYY-MM"
    const monthStr = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: targetUser.id,
        date: { startsWith: monthStr },
        status: 'Present' // Only count Present
      }
    });

    const presentDays = attendanceRecords.length;

    // Calculate total working hours
    let totalWorkingHours = 0;
    attendanceRecords.forEach(record => {
      if (record.workingHours) {
        totalWorkingHours += record.workingHours;
      } else if (record.checkIn && record.checkOut) {
        // Calculate if not stored
        const checkInDate = new Date(record.checkIn);
        const checkOutDate = new Date(record.checkOut);
        const hours = (checkOutDate - checkInDate) / (1000 * 60 * 60);
        totalWorkingHours += hours;
      }
    });

    // 3. Calculate Paid Leaves
    // Fetch Approved Paid Leaves overlapping this month
    const paidLeaves = await prisma.leave.findMany({
      where: {
        userId: targetUser.id,
        status: 'Approved',
        type: 'Paid',
        // Simplistic overlap check: just check if 'from' starts in this month
        // A better check would be full overlap calculation, but for now:
        from: { startsWith: monthStr }
      }
    });

    let paidLeaveDays = 0;
    paidLeaves.forEach(leave => {
      const start = new Date(leave.from);
      const end = new Date(leave.to);
      const diff = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
      paidLeaveDays += diff;
    });

    // 4. Calculate Final Amount
    // Formula: (Salary / 30) * (Present + PaidLeave)
    // Standardizing to 30 days per month
    const perDaySalary = monthlySalary / 30;
    const totalPayableDays = presentDays + paidLeaveDays;
    const finalAmount = Math.round(perDaySalary * totalPayableDays);

    // 5. Create/Update Payroll
    // Upsert not supported with @@unique([userId, month]) unless we have year too?
    // Schema says @@unique([userId, month]). If month is just name "October", it doesn't account for Year!
    // This is a flaw in original schema. "month" field should probably assume "October 2025" or we just override.
    // I entered "month" as String in input. I should store "October 2025" in DB to be safe unique.

    const uniqueMonthString = `${titleCaseMonth} ${year}`;

    const payroll = await prisma.payroll.upsert({
      where: {
        userId_month: {
          userId: targetUser.id,
          month: uniqueMonthString
        }
      },
      update: {
        amount: finalAmount,
        details: {
          basic: monthlySalary,
          presentDays,
          paidLeaveDays,
          totalPayableDays,
          totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
          perDaySalary: parseFloat(perDaySalary.toFixed(2)),
          calculatedAmount: finalAmount
        }
      },
      create: {
        userId: targetUser.id,
        month: uniqueMonthString,
        amount: finalAmount,
        status: 'Pending',
        details: {
          basic: monthlySalary,
          presentDays,
          paidLeaveDays,
          totalPayableDays,
          totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
          perDaySalary: parseFloat(perDaySalary.toFixed(2)),
          calculatedAmount: finalAmount
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Payroll generated successfully',
      data: payroll
    });

  } catch (error) {
    console.error('POST /api/payroll error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/payroll
 * Update Payroll Status (e.g. Approved, Paid).
 */
export async function PATCH(request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const { user } = authResult;
    // Authorized roles: Admin, Manager, Payroll Officer
    if (!hasRole(user, ['Admin', 'Manager', 'Payroll Officer'])) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { payrollId, status } = body;

    if (!payrollId || !status) {
      return NextResponse.json({ success: false, error: 'Payroll ID and status are required' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['Pending', 'Processing', 'Paid'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const updatedPayroll = await prisma.payroll.update({
      where: { id: parseInt(payrollId) },
      data: { status }
    });

    return NextResponse.json({
      success: true,
      message: 'Payroll status updated successfully',
      data: updatedPayroll
    });

  } catch (error) {
    console.error('PATCH /api/payroll error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
