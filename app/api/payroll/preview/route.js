import { NextResponse } from 'next/server';
import { authenticateRequest, hasRole } from '../../../../utils/auth.js';
import { prisma } from '../../../../lib/prisma.js';

/**
 * POST /api/payroll/preview
 * Preview payroll calculation without creating a record
 * - Only Admin/Manager/Payroll Officer
 * - Returns calculated breakdown
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
        const { userId, month, year } = body;

        if (!userId || !month || !year) {
            return NextResponse.json({ success: false, error: 'UserId, month, and year required' }, { status: 400 });
        }

        // 1. Fetch User Salary Info
        const targetUser = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: { id: true, salary: true, name: true, email: true, department: true }
        });

        if (!targetUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

        const monthlySalary = targetUser.salary || 0;

        // 2. Normalize month to Title Case
        const titleCaseMonth = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();

        const monthMap = {
            "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5,
            "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11
        };

        const monthIndex = monthMap[titleCaseMonth];
        if (monthIndex === undefined) return NextResponse.json({ success: false, error: 'Invalid month name' }, { status: 400 });

        const monthStr = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;

        // 3. Calculate Attendance (Present Days)
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                userId: targetUser.id,
                date: { startsWith: monthStr },
                status: 'Present'
            }
        });

        const presentDays = attendanceRecords.length;

        // Calculate total working hours
        let totalWorkingHours = 0;
        attendanceRecords.forEach(record => {
            if (record.workingHours) {
                totalWorkingHours += record.workingHours;
            } else if (record.checkIn && record.checkOut) {
                const checkInDate = new Date(record.checkIn);
                const checkOutDate = new Date(record.checkOut);
                const hours = (checkOutDate - checkInDate) / (1000 * 60 * 60);
                totalWorkingHours += hours;
            }
        });

        // 4. Calculate Paid Leaves
        const paidLeaves = await prisma.leave.findMany({
            where: {
                userId: targetUser.id,
                status: 'Approved',
                type: 'Paid',
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

        // 5. Calculate Final Amount
        const perDaySalary = monthlySalary / 30;
        const totalPayableDays = presentDays + paidLeaveDays;
        const finalAmount = Math.round(perDaySalary * totalPayableDays);

        // Return preview data
        return NextResponse.json({
            success: true,
            data: {
                user: targetUser,
                month: `${titleCaseMonth} ${year}`,
                calculation: {
                    basic: monthlySalary,
                    presentDays,
                    paidLeaveDays,
                    totalPayableDays,
                    totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
                    perDaySalary: parseFloat(perDaySalary.toFixed(2)),
                    calculatedAmount: finalAmount
                },
                amount: finalAmount
            }
        });

    } catch (error) {
        console.error('POST /api/payroll/preview error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
