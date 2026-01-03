/**
 * Seed Test Data Script
 * Populates the database with dummy data for testing payroll functionality
 * 
 * Run with: node scripts/seed-test-data.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting to seed test data...\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing test data...');
    await prisma.payroll.deleteMany({});
    await prisma.leave.deleteMany({});
    await prisma.attendance.deleteMany({});
    // Don't delete users - keep existing ones

    console.log('✅ Cleared existing data\n');

    // Get existing users or create test users
    let users = await prisma.user.findMany();

    if (users.length === 0) {
        console.log('👥 Creating test users...');
        const hashedPassword = await bcrypt.hash('Test@123', 10);

        const testUsers = [
            { name: 'John Doe', email: 'john@test.com', password: hashedPassword, role: 'Employee', department: 'Engineering', salary: 60000, leaveBalance: 24 },
            { name: 'Jane Smith', email: 'jane@test.com', password: hashedPassword, role: 'Employee', department: 'Marketing', salary: 55000, leaveBalance: 20 },
            { name: 'Mike Johnson', email: 'mike@test.com', password: hashedPassword, role: 'Manager', department: 'Sales', salary: 75000, leaveBalance: 18 },
            { name: 'Sarah Williams', email: 'sarah@test.com', password: hashedPassword, role: 'Employee', department: 'HR', salary: 50000, leaveBalance: 24 },
            { name: 'Tom Brown', email: 'tom@test.com', password: hashedPassword, role: 'Employee', department: 'Engineering', salary: 65000, leaveBalance: 22 },
        ];

        for (const userData of testUsers) {
            await prisma.user.create({ data: userData });
        }

        users = await prisma.user.findMany();
        console.log(`✅ Created ${users.length} test users\n`);
    } else {
        console.log(`✅ Using ${users.length} existing users\n`);

        // Update existing users with salary and leave balance if not set
        for (const user of users) {
            if (!user.salary || user.salary === 0) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        salary: 50000 + Math.floor(Math.random() * 30000), // Random salary between 50k-80k
                        leaveBalance: 20 + Math.floor(Math.random() * 10), // Random leave balance 20-30
                    }
                });
            }
        }
        users = await prisma.user.findMany(); // Refresh user data
    }

    // Generate attendance data for the current month
    console.log('📅 Creating attendance records...');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get first day of current month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    let attendanceCount = 0;

    for (const user of users) {
        // Create attendance for each working day (skip weekends)
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(currentYear, currentMonth, day);

            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            // Skip future dates
            if (date > today) continue;

            // Random chance of absence (20%)
            if (Math.random() < 0.2) continue;

            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Random check-in time between 8:00 AM and 10:00 AM
            const checkInHour = 8 + Math.floor(Math.random() * 2);
            const checkInMinute = Math.floor(Math.random() * 60);
            const checkIn = new Date(currentYear, currentMonth, day, checkInHour, checkInMinute);

            // Random check-out time between 5:00 PM and 7:00 PM (9-11 hours after check-in)
            const workHours = 8 + Math.random() * 3; // 8-11 hours
            const checkOut = new Date(checkIn.getTime() + workHours * 60 * 60 * 1000);

            const actualWorkHours = (checkOut - checkIn) / (1000 * 60 * 60);
            const status = actualWorkHours >= 8 ? 'Present' : actualWorkHours >= 4 ? 'Half Day' : 'Absent';

            await prisma.attendance.create({
                data: {
                    userId: user.id,
                    date: dateStr,
                    checkIn: checkIn.toISOString(),
                    checkOut: checkOut.toISOString(),
                    status: status,
                    workingHours: actualWorkHours,
                }
            });

            attendanceCount++;
        }
    }

    console.log(`✅ Created ${attendanceCount} attendance records\n`);

    // Create leave requests
    console.log('🏖️  Creating leave requests...');
    let leaveCount = 0;

    for (const user of users) {
        // Create 2-3 leave requests per user
        const numLeaves = 2 + Math.floor(Math.random() * 2);

        for (let i = 0; i < numLeaves; i++) {
            // Random date in current month
            const leaveDay = 1 + Math.floor(Math.random() * lastDay.getDate());
            const leaveDate = new Date(currentYear, currentMonth, leaveDay);

            // Skip if in the past
            if (leaveDate < today) continue;

            const fromDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(leaveDay).padStart(2, '0')}`;
            const toDay = leaveDay + Math.floor(Math.random() * 3); // 1-3 days
            const toDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(Math.min(toDay, lastDay.getDate())).padStart(2, '0')}`;

            const types = ['Paid', 'Unpaid', 'Sick'];
            const type = types[Math.floor(Math.random() * types.length)];

            const statuses = ['Pending', 'Approved', 'Rejected'];
            const status = statuses[Math.floor(Math.random() * statuses.length)];

            const reasons = [
                'Family emergency',
                'Medical appointment',
                'Personal work',
                'Vacation',
                'Sick leave',
                'Wedding to attend'
            ];

            await prisma.leave.create({
                data: {
                    userId: user.id,
                    type: type,
                    reason: reasons[Math.floor(Math.random() * reasons.length)],
                    from: fromDate,
                    to: toDate,
                    status: status,
                }
            });

            // If approved paid leave, deduct from balance
            if (status === 'Approved' && type === 'Paid') {
                const days = Math.ceil((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1;
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        leaveBalance: Math.max(0, user.leaveBalance - days)
                    }
                });
            }

            leaveCount++;
        }
    }

    console.log(`✅ Created ${leaveCount} leave requests\n`);

    // Generate payroll for previous month
    console.log('💰 Generating payroll records...');
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    for (const user of users) {
        // Get attendance for previous month
        const prevMonthStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
        const attendance = await prisma.attendance.findMany({
            where: {
                userId: user.id,
                date: { startsWith: prevMonthStr },
                status: 'Present'
            }
        });

        const presentDays = attendance.length;

        // Get approved paid leaves for previous month
        const paidLeaves = await prisma.leave.findMany({
            where: {
                userId: user.id,
                status: 'Approved',
                type: 'Paid',
                from: { startsWith: prevMonthStr }
            }
        });

        let paidLeaveDays = 0;
        paidLeaves.forEach(leave => {
            const start = new Date(leave.from);
            const end = new Date(leave.to);
            const diff = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
            paidLeaveDays += diff;
        });

        const perDaySalary = user.salary / 30;
        const totalPayableDays = presentDays + paidLeaveDays;
        const finalAmount = Math.round(perDaySalary * totalPayableDays);

        await prisma.payroll.create({
            data: {
                userId: user.id,
                month: `${monthNames[prevMonth]} ${prevYear}`,
                amount: finalAmount,
                status: Math.random() > 0.5 ? 'Paid' : 'Pending',
                details: {
                    basic: user.salary,
                    presentDays,
                    paidLeaveDays,
                    totalPayableDays
                }
            }
        });
    }

    console.log(`✅ Created ${users.length} payroll records\n`);

    console.log('🎉 Seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Attendance Records: ${attendanceCount}`);
    console.log(`   - Leave Requests: ${leaveCount}`);
    console.log(`   - Payroll Records: ${users.length}`);
    console.log('\n✨ You can now test the payroll functionality!\n');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding data:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
