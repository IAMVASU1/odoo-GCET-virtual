"use client"

import { LayoutWrapper } from "@/components/layout-wrapper"
import { DataTable } from "@/components/data-table"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { useAuth } from "@/app/context/auth-context"
import toast from "react-hot-toast"

// Helper function to get today's date in YYYY-MM-DD format (local timezone)
const getTodayDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Attendance Page Component
 * Displays employee attendance records in a table format
 * Fetches real employee data from the API
 */
export default function Attendance() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(getTodayDate())

  useEffect(() => {
    if (user) {
      fetchEmployees()
    }
  }, [user, selectedDate]) // Add selectedDate to dependencies

  const fetchEmployees = async () => {
    try {
      setLoading(true) // Show loading when refetching
      const authToken = localStorage.getItem('authToken')

      // Fetch users
      const usersResponse = await fetch(`/api/users`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })
      const usersData = await usersResponse.json()

      if (!usersData.success || !usersData.data || !Array.isArray(usersData.data)) {
        toast.error("Failed to load employees")
        setEmployees([])
        setLoading(false)
        return
      }

      // Fetch attendance records for selected date

      const attendanceResponse = await fetch(`/api/attendance`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })
      const attendanceData = await attendanceResponse.json()

      // Fetch approved leaves
      const leaveResponse = await fetch(`/api/leave?status=Approved`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })
      const leaveData = await leaveResponse.json()
      let leaveMap = {}

      if (leaveData.success && Array.isArray(leaveData.data)) {
        leaveData.data.forEach(leave => {
          const fromDate = new Date(leave.from)
          const toDate = new Date(leave.to)

          // Format dates as YYYY-MM-DD for comparison with selectedDate
          const fromStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`
          const toStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`

          if (selectedDate >= fromStr && selectedDate <= toStr) {
            leaveMap[leave.userId] = leave
          }
        })
      }

      // Merge user and attendance data
      const employeesWithAttendance = usersData.data.map(user => {
        const dateAttendance = attendanceData.data?.find(record => {
          const match = record.userId === user.id && record.date === selectedDate

          return match
        })

        const activeLeave = leaveMap[user.id]

        // Calculate actual status based on worked hours
        let calculatedStatus = 'absent'
        if (dateAttendance?.checkIn && dateAttendance?.checkOut) {
          const checkInDate = new Date(dateAttendance.checkIn)
          const checkOutDate = new Date(dateAttendance.checkOut)
          const workedHours = (checkOutDate - checkInDate) / (1000 * 60 * 60)

          if (workedHours >= 8) {
            calculatedStatus = 'present'
          } else if (workedHours >= 4) {
            calculatedStatus = 'half day'
          } else {
            calculatedStatus = 'absent'
          }
        } else if (dateAttendance?.checkIn && !dateAttendance?.checkOut) {
          // Only checked in, not yet checked out - consider present for now
          calculatedStatus = 'present'
        } else {
          calculatedStatus = 'absent'
        }

        // If user is on leave, override 'absent' status
        if (activeLeave && calculatedStatus === 'absent') {
          calculatedStatus = 'leave'
        }

        // Calculate working hours
        let workingHours = 0
        if (dateAttendance?.checkIn && dateAttendance?.checkOut) {
          const checkInDate = new Date(dateAttendance.checkIn)
          const checkOutDate = new Date(dateAttendance.checkOut)
          workingHours = (checkOutDate - checkInDate) / (1000 * 60 * 60) // Convert to hours
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          department: user.department,
          position: user.role, // Use role as position
          status: calculatedStatus,
          checkInTime: dateAttendance?.checkIn ? new Date(dateAttendance.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
          checkOutTime: dateAttendance?.checkOut ? new Date(dateAttendance.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
          workingHours: workingHours,
          avatar: user.name.charAt(0).toUpperCase(),
          avatarColor: '#8B5CF6'
        }
      })

      setEmployees(employeesWithAttendance)
    } catch (error) {
      console.error("Error fetching employees:", error)
      toast.error("Error loading attendance data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </LayoutWrapper>
    )
  }

  // Table column headers
  const headers = ["ID", "Name", "Department", "Position", "Status", "Check-In", "Check-Out", "Working Hours"]

  /**
   * Map employee records to table rows
   * Shows current attendance status for each employee
   */
  const rows = employees.map((emp) => [
    emp.id,
    <div key={emp.id} className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
        style={{ backgroundColor: emp.avatarColor || "#8B5CF6" }}
      >
        {emp.avatar}
      </div>
      <span className="font-medium">{emp.name}</span>
    </div>,
    emp.department,
    emp.position,
    <span
      key={emp.id}
      className={`px-3 py-1 rounded-full text-xs font-medium ${emp.status === "present"
        ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        : emp.status === "half day"
          ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          : emp.status === "leave"
            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
        }`}
    >
      {emp.status === "present" ? "Present" : emp.status === "half day" ? "Half Day" : emp.status === "leave" ? "Leave" : "Absent"}
    </span>,
    emp.checkInTime || "-",
    emp.checkOutTime || "-",
    <span
      key={`hours-${emp.id}`}
      className={`font-medium ${emp.workingHours >= 8
        ? "text-green-600 dark:text-green-400"
        : emp.workingHours >= 4
          ? "text-yellow-600 dark:text-yellow-400"
          : emp.workingHours > 0
            ? "text-red-600 dark:text-red-400"
            : "text-gray-400"
        }`}
    >
      {emp.workingHours > 0 ? `${emp.workingHours.toFixed(2)} hrs` : "-"}
    </span>,
  ])

  return (
    <LayoutWrapper>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
            <p className="text-muted-foreground">Track employee attendance in real-time</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)

              }}
              max={getTodayDate()} // Don't allow future dates
              className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {selectedDate !== getTodayDate() && (
              <button
                onClick={() => setSelectedDate(getTodayDate())}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Employees</p>
            <p className="text-3xl font-bold text-foreground">{employees.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">
              Present {selectedDate === getTodayDate() ? 'Today' : `on ${new Date(selectedDate).toLocaleDateString()}`}
            </p>
            <p className="text-3xl font-bold text-green-600">
              {employees.filter(emp => emp.status === "present").length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">
              Half Day {selectedDate === getTodayDate() ? 'Today' : `on ${new Date(selectedDate).toLocaleDateString()}`}
            </p>
            <p className="text-3xl font-bold text-yellow-600">
              {employees.filter(emp => emp.status === "half day").length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">
              Absent {selectedDate === getTodayDate() ? 'Today' : `on ${new Date(selectedDate).toLocaleDateString()}`}
            </p>
            <p className="text-3xl font-bold text-red-600">
              {employees.filter(emp => emp.status === "absent").length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Hours Worked</p>
            <p className="text-3xl font-bold text-primary">
              {employees.reduce((total, emp) => total + emp.workingHours, 0).toFixed(1)} hrs
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Attendance Records</h2>
          <DataTable headers={headers} rows={rows} />
        </div>
      </motion.div>
    </LayoutWrapper>
  )
}