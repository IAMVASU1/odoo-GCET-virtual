"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/context/auth-context"
import { useRouter } from "next/navigation"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { ChartContainer } from "@/components/chart-container"
import { motion } from "framer-motion"
import toast from "react-hot-toast"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export default function Reports() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState({
    monthlyAttendance: [],
    leaveStats: [],
    payrollDistribution: [],
    summaryStats: {
      totalEmployees: 0,
      totalAttendance: 0,
      totalLeaves: 0,
      totalPayroll: 0,
      pendingLeaves: 0,
      paidPayroll: 0
    }
  })

  useEffect(() => {
    // Only admins, managers and HR officers can access reports
    if (user && user.role !== "Admin" && user.role !== "Manager" && user.role !== "HR Officer") {
      toast.error("Access denied. Only admins, managers and HR officers can view reports.")
      router.push("/dashboard")
      return
    }
    
    if (user) {
      fetchReportsData()
    }
  }, [user, router])

  const fetchReportsData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      
      // Fetch all data in parallel
      const [usersRes, attendanceRes, leaveRes, payrollRes] = await Promise.all([
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/attendance', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/leave', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/payroll', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      const usersData = await usersRes.json()
      const attendanceData = await attendanceRes.json()
      const leaveData = await leaveRes.json()
      const payrollData = await payrollRes.json()

      if (usersData.success && attendanceData.success && leaveData.success && payrollData.success) {
        const users = usersData.data || []
        const attendanceRecords = attendanceData.data || []
        const leaveRecords = leaveData.data || []
        const payrollRecords = payrollData.data || []

        // Process data for charts
        const processedData = processReportsData(users, attendanceRecords, leaveRecords, payrollRecords)
        setReportData(processedData)
      } else {
        toast.error('Failed to load reports data')
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Error loading reports')
    } finally {
      setLoading(false)
    }
  }

  const processReportsData = (users, attendance, leaves, payroll) => {
    // Get last 6 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const last6Months = []
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12
      last6Months.push(months[monthIndex])
    }

    // Calculate working days for each month (excluding weekends)
    const getWorkingDaysInMonth = (monthName) => {
      const monthIndex = months.indexOf(monthName)
      let year = currentYear
      
      // If month is in future (wrapped from previous year), use previous year
      if (monthIndex > currentMonth) {
        year = currentYear - 1
      }
      
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
      let workingDays = 0
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthIndex, day)
        const dayOfWeek = date.getDay()
        // Count only weekdays (Monday-Friday)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDays++
        }
      }
      
      return workingDays
    }

    // Group attendance by month
    const attendanceByMonth = {}
    const employeeAttendanceByMonth = {} // Track unique employees per month
    
    attendance.forEach(record => {
      if (record.date) {
        const month = months[new Date(record.date).getMonth()]
        if (!attendanceByMonth[month]) {
          attendanceByMonth[month] = { total: 0, present: 0, absent: 0, halfDay: 0 }
          employeeAttendanceByMonth[month] = new Set()
        }
        attendanceByMonth[month].total++
        
        // Track unique employees who marked attendance this month
        if (record.userId) {
          employeeAttendanceByMonth[month].add(record.userId)
        }
        
        // Count by status
        if (record.status === 'Present') {
          attendanceByMonth[month].present++
        } else if (record.status === 'Absent') {
          attendanceByMonth[month].absent++
        } else if (record.status === 'Half Day') {
          attendanceByMonth[month].halfDay++
        }
      }
    })

    // Group leaves by month
    const leavesByMonth = {}
    leaves.forEach(record => {
      if (record.from) {
        const month = months[new Date(record.from).getMonth()]
        leavesByMonth[month] = (leavesByMonth[month] || 0) + 1
      }
    })

    // Group payroll by month
    const payrollByMonth = {}
    payroll.forEach(record => {
      if (record.month) {
        // Extract month name from "November 2025" format
        const monthName = record.month.split(' ')[0].substring(0, 3)
        if (!payrollByMonth[monthName]) {
          payrollByMonth[monthName] = { total: 0, amount: 0 }
        }
        payrollByMonth[monthName].total++
        payrollByMonth[monthName].amount += record.amount || 0
      }
    })

    // Create chart data
    const monthlyData = last6Months.map(month => {
      const monthData = attendanceByMonth[month]
      const workingDays = getWorkingDaysInMonth(month)
      const activeEmployees = employeeAttendanceByMonth[month] ? employeeAttendanceByMonth[month].size : 0
      const expectedAttendance = activeEmployees * workingDays
      
      // Calculate attendance percentage based on actual vs expected
      let attendancePercentage = 0
      if (monthData && expectedAttendance > 0) {
        // Present + Half Day (counted as 0.5) vs expected
        const effectivePresent = monthData.present + (monthData.halfDay * 0.5)
        attendancePercentage = Math.round((effectivePresent / expectedAttendance) * 100)
      }
      
      return {
        month,
        attendance: attendancePercentage,
        leaves: leavesByMonth[month] || 0,
        payroll: payrollByMonth[month] ? payrollByMonth[month].total : 0,
        payrollAmount: payrollByMonth[month] ? Math.round(payrollByMonth[month].amount / 1000) : 0 // in thousands
      }
    })

    // Calculate summary stats
    const totalAttendance = attendance.length
    const presentCount = attendance.filter(a => a.status === 'Present').length
    const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0
    
    const pendingLeaves = leaves.filter(l => l.status === 'Pending').length
    const paidPayroll = payroll.filter(p => p.status === 'Paid').length
    const totalPayrollAmount = payroll.reduce((sum, p) => sum + (p.amount || 0), 0)

    return {
      monthlyAttendance: monthlyData,
      leaveStats: monthlyData,
      payrollDistribution: monthlyData,
      summaryStats: {
        totalEmployees: users.length,
        totalAttendance: totalAttendance,
        attendancePercentage: attendancePercentage,
        totalLeaves: leaves.length,
        pendingLeaves: pendingLeaves,
        totalPayroll: payroll.length,
        paidPayroll: paidPayroll,
        totalPayrollAmount: Math.round(totalPayrollAmount / 1000) // in thousands
      }
    }
  }

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-xl text-muted-foreground">Loading reports...</div>
          </div>
        </div>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">View comprehensive HR analytics</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Employees</p>
            <p className="text-2xl font-bold text-foreground">{reportData.summaryStats.totalEmployees}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Attendance Rate</p>
            <p className="text-2xl font-bold text-green-600">{reportData.summaryStats.attendancePercentage}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Pending Leaves</p>
            <p className="text-2xl font-bold text-yellow-600">{reportData.summaryStats.pendingLeaves}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Payroll Paid</p>
            <p className="text-2xl font-bold text-green-600">
              {reportData.summaryStats.paidPayroll}/{reportData.summaryStats.totalPayroll}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Monthly Attendance (%)">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={reportData.monthlyAttendance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
                <Legend />
                <Bar dataKey="attendance" fill="var(--primary)" radius={[8, 8, 0, 0]} name="Attendance %" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Leave Requests by Month">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={reportData.leaveStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
                <Legend />
                <Line type="monotone" dataKey="leaves" stroke="var(--accent)" strokeWidth={2} name="Leave Requests" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Payroll Distribution (₹ in thousands)">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={reportData.payrollDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
                <Legend />
                <Bar dataKey="payrollAmount" fill="var(--primary)" radius={[8, 8, 0, 0]} name="Amount (₹K)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="HR Overview">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={reportData.monthlyAttendance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
                <Legend />
                <Line type="monotone" dataKey="attendance" stroke="var(--primary)" strokeWidth={2} name="Attendance %" />
                <Line type="monotone" dataKey="leaves" stroke="var(--accent)" strokeWidth={2} name="Leaves" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </motion.div>
    </LayoutWrapper>
  )
}
