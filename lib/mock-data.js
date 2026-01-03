export const users = [
  { id: 1, name: "John Admin", email: "admin@workzen.com", role: "Admin", status: "Active", avatar: "JA" },
  { id: 2, name: "Sarah HR", email: "hr@workzen.com", role: "HR Officer", status: "Active", avatar: "SH" },
  {
    id: 3,
    name: "Mike Payroll",
    email: "payroll@workzen.com",
    role: "Payroll Officer",
    status: "Active",
    avatar: "MP",
  },
  { id: 4, name: "Emma Johnson", email: "emma@workzen.com", role: "Employee", status: "Active", avatar: "EJ" },
  { id: 5, name: "David Smith", email: "david@workzen.com", role: "Employee", status: "Active", avatar: "DS" },
]

export const attendanceRecords = [
  { id: 1, employeeName: "Emma Johnson", date: "2024-11-07", status: "Present", checkIn: "09:00", checkOut: "17:30" },
  { id: 2, employeeName: "David Smith", date: "2024-11-07", status: "Present", checkIn: "09:15", checkOut: "17:45" },
  { id: 3, employeeName: "Sarah HR", date: "2024-11-07", status: "Present", checkIn: "08:45", checkOut: "17:00" },
  { id: 4, employeeName: "Mike Payroll", date: "2024-11-07", status: "Absent" },
]

export const leaveRequests = [
  {
    id: 1,
    employeeName: "Emma Johnson",
    type: "Sick Leave",
    startDate: "2024-11-10",
    endDate: "2024-11-11",
    status: "Pending",
    reason: "Medical appointment",
  },
  {
    id: 2,
    employeeName: "David Smith",
    type: "Vacation",
    startDate: "2024-11-15",
    endDate: "2024-11-22",
    status: "Approved",
    reason: "Annual vacation",
  },
]

export const payrollData = [
  {
    id: 1,
    employeeName: "Emma Johnson",
    month: "November 2024",
    basicPay: 50000,
    hra: 10000,
    da: 5000,
    deductions: 8000,
    pf: 6000,
    tax: 2000,
    netSalary: 49000,
  },
  {
    id: 2,
    employeeName: "David Smith",
    month: "November 2024",
    basicPay: 55000,
    hra: 11000,
    da: 5500,
    deductions: 9000,
    pf: 6600,
    tax: 2200,
    netSalary: 53700,
  },
]

export const analyticsData = [
  { month: "Jan", attendance: 95, leaves: 5, payroll: 100 },
  { month: "Feb", attendance: 92, leaves: 8, payroll: 100 },
  { month: "Mar", attendance: 97, leaves: 3, payroll: 100 },
  { month: "Apr", attendance: 94, leaves: 6, payroll: 100 },
  { month: "May", attendance: 96, leaves: 4, payroll: 100 },
  { month: "Jun", attendance: 93, leaves: 7, payroll: 100 },
]

export const summaryStats = {
  totalEmployees: 42,
  attendancePercentage: 94,
  pendingLeaves: 3,
  payrollProcessed: 100,
}
