"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/context/auth-context"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Search, Plane, Clock, LogIn, LogOut as LogOutIcon, Users, CheckCircle, XCircle, Calendar, IndianRupee, TrendingUp, Award } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import toast, { Toaster } from "react-hot-toast"

// Helper function to get today's date in YYYY-MM-DD format (local timezone)
const getTodayDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function Dashboard() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [currentTime, setCurrentTime] = useState("")
  const [loading, setLoading] = useState(true)

  // ✅ Fetch employees only after user loads
  useEffect(() => {
    if (user?.id || user?.loginId) {
      fetchEmployees()
    }
  }, [user])

  // Re-fetch employees when attendance is updated elsewhere (navbar / attendance page)
  useEffect(() => {
    const handler = () => {
      fetchEmployees()
    }

    window.addEventListener("attendanceUpdated", handler)
    return () => window.removeEventListener("attendanceUpdated", handler)
  }, [user])
  // ✅ Update time every second for accuracy
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const authToken = localStorage.getItem('authToken')

      // Fetch users
      const response = await fetch(`/api/users`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      // Check if response is OK
      if (!response.ok) {
        console.error("API response not OK:", response.status, response.statusText)
        setEmployees([])
        setLoading(false)
        return
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON:", contentType)
        setEmployees([])
        setLoading(false)
        return
      }

      const data = await response.json()

      if (data.success && data.data && Array.isArray(data.data)) {
        // Fetch today's attendance for all users
        const attendanceResponse = await fetch(`/api/attendance`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })

        let attendanceMap = {}
        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json()

          if (attendanceData.success && Array.isArray(attendanceData.data)) {
            const today = getTodayDate()

            attendanceData.data.forEach(record => {
              if (record.date === today) {
                attendanceMap[record.userId] = record
              }
            })
          }
        }

        // Fetch approved leaves
        const leaveResponse = await fetch(`/api/leave?status=Approved`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })

        let leaveMap = {}
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json()
          console.log("Leaves Fetched:", leaveData) // Debug log

          if (leaveData.success && Array.isArray(leaveData.data)) {
            const todayStr = getTodayDate()
            console.log("Today's Date for comparison:", todayStr)

            leaveData.data.forEach(leave => {
              // Convert leave dates to YYYY-MM-DD strings in local time
              const fromDate = new Date(leave.from)
              const toDate = new Date(leave.to)

              const fromStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`
              const toStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`

              console.log(`Checking Leave: User ${leave.userId}, From: ${fromStr}, To: ${toStr}, Today: ${todayStr}`)

              if (todayStr >= fromStr && todayStr <= toStr) {
                console.log(`MATCH! User ${leave.userId} is on leave.`)
                leaveMap[leave.userId] = leave
              }
            })
          }
        }

        // Transform API data to match dashboard expectations and merge with attendance
        const transformedEmployees = data.data.map(user => {
          const todayAttendance = attendanceMap[user.id]
          const activeLeave = leaveMap[user.id]

          // DEBUG logging for User 3 (or any user with leave)
          if (leaveMap[user.id]) {
            console.log(`[DEBUG] Mapping User ${user.id}: Found in leaveMap?`, !!activeLeave)
            console.log(`[DEBUG] Attendance for User ${user.id}:`, todayAttendance)
          }

          const checkInTime = todayAttendance?.checkIn
            ? new Date(todayAttendance.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            : null

          const checkOutTime = todayAttendance?.checkOut
            ? new Date(todayAttendance.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            : null

          // Calculate actual status based on worked hours
          let calculatedStatus = 'absent'
          let leaveReason = null

          if (todayAttendance?.checkIn && todayAttendance?.checkOut) {
            const checkInDate = new Date(todayAttendance.checkIn)
            const checkOutDate = new Date(todayAttendance.checkOut)
            const workedHours = (checkOutDate - checkInDate) / (1000 * 60 * 60)

            if (workedHours >= 8) {
              calculatedStatus = 'present'
            } else if (workedHours >= 4) {
              calculatedStatus = 'half day'
            } else {
              calculatedStatus = 'absent'
            }
          } else if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
            // Only checked in, not yet checked out - consider present for now
            calculatedStatus = 'present'
          } else {
            calculatedStatus = 'absent'
          }

          // If user is on leave, override 'absent' status
          if (activeLeave && calculatedStatus === 'absent') {
            calculatedStatus = 'on-leave'
            leaveReason = activeLeave.reason
          }

          return {
            id: user.id,
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            position: user.role, // Use role as position
            avatar: user.name.charAt(0).toUpperCase(),
            avatarColor: '#8B5CF6',
            status: calculatedStatus,
            leaveReason: leaveReason,
            checkInTime: checkInTime,
            checkInTime: checkInTime,
            checkOutTime: checkOutTime,
            leaveBalance: user.leaveBalance,
          }
        })
        setEmployees(transformedEmployees)
      } else {
        setEmployees([])
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (employeeId) => {
    try {
      const authToken = localStorage.getItem('authToken')
      const today = getTodayDate()

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          userId: employeeId,
          date: today,
          checkIn: new Date().toISOString(),
        }),
      })
      const data = await response.json()

      if (data.success) {
        toast.success("Checked in successfully!", {
          duration: 3000,
          position: "top-center",
          icon: "✅",
        })
        fetchEmployees()
      } else {
        toast.error(data.error || "Failed to check in")
      }
    } catch (error) {
      console.error("Error checking in:", error)
      toast.error("Error checking in: " + error.message)
    }
  }

  const handleCheckOut = async (employeeId) => {
    try {
      const authToken = localStorage.getItem('authToken')

      const getResponse = await fetch(`/api/attendance?userId=${employeeId}`, {
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      })
      const attendanceData = await getResponse.json()

      const today = getTodayDate()
      const todayAttendance = attendanceData.data?.find(record =>
        record.date === today && !record.checkOut
      )

      if (!todayAttendance) {
        toast.error("No check-in record found for today")
        return
      }

      const response = await fetch("/api/attendance", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          id: todayAttendance.id,
          checkOut: new Date().toISOString(),
        }),
      })
      const data = await response.json()

      if (data.success) {
        toast.success("Checked out successfully!", {
          duration: 3000,
          position: "top-center",
          icon: "✅",
        })
        fetchEmployees()
      } else {
        toast.error(data.error || "Failed to check out")
      }
    } catch (error) {
      console.error("Error checking out:", error)
      toast.error("Error checking out: " + error.message)
    }
  }

  const filteredEmployees = employees.filter((emp) =>
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusIndicator = (status) => {
    const normalizedStatus = status?.toLowerCase()
    switch (normalizedStatus) {
      case "present":
        return <div className="w-3 h-3 rounded-full bg-green-500" title="Present in office" />
      case "half day":
        return <div className="w-3 h-3 rounded-full bg-blue-500" title="Half Day" />
      case "on-leave":
      case "leave":
        return <Plane className="w-3 h-3 text-orange-500" title="On leave" />
      case "absent":
        return <div className="w-3 h-3 rounded-full bg-yellow-500" title="Absent" />
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-400" />
    }
  }

  return (
    <LayoutWrapper>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {user?.role === 'Admin' ? 'Employee Management' : 'My Dashboard'}
            </h1>
            <p className="text-muted-foreground">
              {user?.role === 'Admin' ? 'Manage and view employee information' : 'Your personal workspace'}
            </p>
          </div>

          {/* Search bar - Only for Admin */}
          {user?.role === 'Admin' && (
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </div>

        {/* Quick Stats Cards - Blue/White Professional Theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Employees */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 border-2 border-blue-100 dark:border-blue-900 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Employees</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{employees.length}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-full">
                <Users size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>

          {/* Present Today */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 border-2 border-green-100 dark:border-green-900 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Present Today</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {employees.filter(e => e.status?.toLowerCase() === 'present').length}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-full">
                <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>

          {/* On Leave */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 border-2 border-orange-100 dark:border-orange-900 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">On Leave</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  {employees.filter(e => e.status?.toLowerCase() === 'on-leave' || e.status?.toLowerCase() === 'leave').length}
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-full">
                <Plane size={24} className="text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </motion.div>

          {/* Absent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-800 border-2 border-red-100 dark:border-red-900 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Absent</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {employees.filter(e => e.status?.toLowerCase() === 'absent').length}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-full">
                <XCircle size={24} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* User Info Card - Blue/White Professional Theme */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 shadow-lg"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{user.name}</h3>
                  <p className="text-blue-100">{user.role}</p>
                  <p className="text-sm text-blue-100 mt-1">
                    <Clock className="inline w-4 h-4 mr-1" />
                    {currentTime}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                {/* Salary Card */}
                {user.salary && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 min-w-[140px]">
                    <div className="flex items-center gap-2 mb-1">
                      <IndianRupee size={16} />
                      <p className="text-sm font-medium">Monthly Salary</p>
                    </div>
                    <p className="text-2xl font-bold">₹{user.salary.toLocaleString()}</p>
                  </div>
                )}

                {/* Leave Balance */}
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 min-w-[140px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Plane size={16} />
                    <p className="text-sm font-medium">Leave Balance</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {employees.find(e => e.id === user.id)?.leaveBalance ?? user.leaveBalance ?? 0} days
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading spinner */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-muted-foreground">Loading employees...</p>
          </div>
        ) : user?.role === 'Admin' && filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No employees found</p>
            <p className="text-sm text-muted-foreground mt-2">Total employees in system: {employees.length}</p>
          </div>
        ) : user?.role === 'Admin' ? (
          // Employee grid - Only show for Admin
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <motion.div
                key={employee._id || employee.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="relative bg-card border border-border rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedEmployee(employee)}
              >
                <div className="absolute top-4 right-4">
                  {getStatusIndicator(employee.status)}
                </div>

                <div className="flex flex-col items-center space-y-3">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: employee.avatarColor || "#4F46E5" }}
                  >
                    {employee.avatar || employee.name?.[0]?.toUpperCase() || "?"}
                  </div>

                  <div className="text-center">
                    <h3 className="font-semibold text-lg text-foreground">{employee.name}</h3>
                    <p className="text-sm text-muted-foreground">{employee.position}</p>
                    <p className="text-xs text-muted-foreground">{employee.department}</p>
                  </div>
                </div>

                {/* Show attendance times for any employee who has checked in */}
                {(employee.checkInTime || employee.checkOutTime) && (
                  <div className="mt-4 text-center text-xs text-muted-foreground space-y-1">
                    {employee.checkInTime && (
                      <p className="flex items-center justify-center gap-1">
                        <LogIn className="w-3 h-3" />
                        In: {employee.checkInTime}
                      </p>
                    )}
                    {employee.checkOutTime && (
                      <p className="flex items-center justify-center gap-1">
                        <LogOutIcon className="w-3 h-3" />
                        Out: {employee.checkOutTime}
                      </p>
                    )}
                  </div>
                )}

                {employee.status === "on-leave" && (
                  <div className="mt-4 text-center">
                    <span className="inline-block px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded">
                      {"On Leave"}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : null}

        {/* Modal for selected employee */}
        <AnimatePresence>
          {selectedEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedEmployee(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card border border-border rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                      style={{ backgroundColor: selectedEmployee.avatarColor || "#4F46E5" }}
                    >
                      {selectedEmployee.avatar || selectedEmployee.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{selectedEmployee.name}</h2>
                      <p className="text-muted-foreground">{selectedEmployee.position}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="text-muted-foreground hover:text-foreground text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* Modal Body */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Employee ID</label>
                      <p className="text-foreground">{selectedEmployee._id || selectedEmployee.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Department</label>
                      <p className="text-foreground">{selectedEmployee.department}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-foreground">{selectedEmployee.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="text-foreground">{selectedEmployee.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <p className="text-foreground capitalize">
                        {selectedEmployee.status ? selectedEmployee.status.replace("-", " ") : "Unknown"}
                      </p>
                    </div>
                    {selectedEmployee.checkInTime && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Check In Time</label>
                        <p className="text-foreground">{selectedEmployee.checkInTime}</p>
                      </div>
                    )}
                    {selectedEmployee.checkOutTime && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Check Out Time</label>
                        <p className="text-foreground">{selectedEmployee.checkOutTime}</p>
                      </div>
                    )}
                  </div>

                  {/* Admin Actions */}
                  {user?.role === "Admin" && (
                    <div className="flex gap-4 pt-4 border-t border-border">
                      {selectedEmployee.status !== "present" || !selectedEmployee.checkInTime ? (
                        <button
                          onClick={() => {


                            handleCheckIn(selectedEmployee.id)
                            setSelectedEmployee(null)
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          Check In
                        </button>
                      ) : !selectedEmployee.checkOutTime ? (
                        <button
                          onClick={() => {


                            handleCheckOut(selectedEmployee.id)
                            setSelectedEmployee(null)
                          }}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          Check Out
                        </button>
                      ) : (
                        <div className="flex-1 text-center py-2 text-muted-foreground">
                          Already checked out today
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Check-In/Out Panel (Bottom Right) */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 bg-card border-2 border-border rounded-lg shadow-2xl p-4 z-40 min-w-[280px]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Quick Attendance</h3>
            </div>

            <div className="text-sm text-muted-foreground mb-3">
              Current time: <strong>{currentTime}</strong>
            </div>

            {/* Find current user's employee record */}
            {(() => {
              // Try to find employee by ID first, then by email
              const currentEmployee = employees.find((emp) =>
                emp.id === user.id ||
                emp.id === user.loginId ||
                emp.email === user.email
              )

              const userId = currentEmployee?.id // Use employee's actual ID from database
              const isCheckedIn = currentEmployee?.checkInTime && !currentEmployee?.checkOutTime
              const isCheckedOut = currentEmployee?.checkOutTime


              if (!currentEmployee || !userId) {
                return (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    Employee record not found
                  </div>
                )
              }

              return (
                <div className="space-y-2">
                  {!isCheckedIn && !isCheckedOut && (
                    <button
                      onClick={() => {

                        handleCheckIn(userId)
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      Check In
                    </button>
                  )}

                  {isCheckedIn && (
                    <>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="font-medium">Checked In</span>
                        </div>
                        <p className="text-green-600 dark:text-green-400 mt-1">
                          Since: {currentEmployee?.checkInTime}
                        </p>
                      </div>
                      <button
                        onClick={() => {

                          handleCheckOut(userId)
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOutIcon className="w-4 h-4" />
                        Check Out
                      </button>
                    </>
                  )}

                  {isCheckedOut && (
                    <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-sm text-center">
                      <p className="text-muted-foreground">
                        ✅ Checked out for today
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Out: {currentEmployee?.checkOutTime}
                      </p>
                    </div>
                  )}
                </div>
              )
            })()}
          </motion.div>
        )}

        {/* Toast Container */}
        <Toaster />
      </div>
    </LayoutWrapper>
  )
}