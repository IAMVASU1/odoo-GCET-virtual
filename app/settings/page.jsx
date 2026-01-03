"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/context/auth-context"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { 
  Settings as SettingsIcon, 
  Building2, 
  Users, 
  Bell, 
  Shield, 
  Palette,
  Save,
  Moon,
  Sun,
  Clock,
  Calendar,
  IndianRupee
} from "lucide-react"
import toast, { Toaster } from "react-hot-toast"
import { useRouter } from "next/navigation"

export default function Settings() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("general")
  const [isSaving, setIsSaving] = useState(false)

  // General Settings
  const [companyName, setCompanyName] = useState("")
  const [companyEmail, setCompanyEmail] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")

  // Working Hours Settings
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00")
  const [workingHoursEnd, setWorkingHoursEnd] = useState("18:00")
  const [fullDayHours, setFullDayHours] = useState(8)
  const [halfDayHours, setHalfDayHours] = useState(4)

  // Leave Settings
  const [annualLeave, setAnnualLeave] = useState(20)
  const [sickLeave, setSickLeave] = useState(10)
  const [casualLeave, setCasualLeave] = useState(12)

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [attendanceAlerts, setAttendanceAlerts] = useState(true)
  const [leaveApprovalAlerts, setLeaveApprovalAlerts] = useState(true)
  const [payrollAlerts, setPayrollAlerts] = useState(true)

  // Theme Settings
  const [theme, setTheme] = useState("light")

  // Attendance Alert State
  const [isCheckingAttendance, setIsCheckingAttendance] = useState(false)
  const [lastAttendanceCheck, setLastAttendanceCheck] = useState(null)

  // Leave Approval Alert State
  const [isCheckingLeaves, setIsCheckingLeaves] = useState(false)
  const [lastLeaveCheck, setLastLeaveCheck] = useState(null)

  // Payroll Alert State
  const [isCheckingPayroll, setIsCheckingPayroll] = useState(false)
  const [lastPayrollCheck, setLastPayrollCheck] = useState(null)

  // Check if user is Admin or Manager
  useEffect(() => {
    if (user && !['Admin', 'Manager'].includes(user.role)) {
      toast.error("Access denied. Admin or Manager access required.")
      router.push("/dashboard")
    }
  }, [user, router])

  useEffect(() => {
    loadSettings()
    
    // Check attendance alerts on mount
    const checkTime = localStorage.getItem('lastAttendanceCheck')
    if (checkTime) {
      setLastAttendanceCheck(new Date(checkTime))
    }

    // Check leave alerts on mount
    const leaveCheckTime = localStorage.getItem('lastLeaveCheck')
    if (leaveCheckTime) {
      setLastLeaveCheck(new Date(leaveCheckTime))
    }

    // Check payroll alerts on mount
    const payrollCheckTime = localStorage.getItem('lastPayrollCheck')
    if (payrollCheckTime) {
      setLastPayrollCheck(new Date(payrollCheckTime))
    }
  }, [])

  const loadSettings = () => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('appSettings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setCompanyName(settings.companyName || "")
      setCompanyEmail(settings.companyEmail || "")
      setCompanyPhone(settings.companyPhone || "")
      setCompanyAddress(settings.companyAddress || "")
      setWorkingHoursStart(settings.workingHoursStart || "09:00")
      setWorkingHoursEnd(settings.workingHoursEnd || "18:00")
      setFullDayHours(settings.fullDayHours || 8)
      setHalfDayHours(settings.halfDayHours || 4)
      setAnnualLeave(settings.annualLeave || 20)
      setSickLeave(settings.sickLeave || 10)
      setCasualLeave(settings.casualLeave || 12)
      setEmailNotifications(settings.emailNotifications ?? true)
      setAttendanceAlerts(settings.attendanceAlerts ?? true)
      setLeaveApprovalAlerts(settings.leaveApprovalAlerts ?? true)
      setPayrollAlerts(settings.payrollAlerts ?? true)
      setTheme(settings.theme || "light")
    }
  }

  const checkAttendanceIssues = async () => {
    if (!attendanceAlerts) {
      toast.error("Attendance alerts are disabled")
      return
    }

    setIsCheckingAttendance(true)

    try {
      const authToken = localStorage.getItem('authToken')
      const today = new Date().toISOString().split('T')[0]

      // Fetch all users
      const usersResponse = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!usersResponse.ok) throw new Error('Failed to fetch users')
      const usersData = await usersResponse.json()

      // Fetch today's attendance
      const attendanceResponse = await fetch('/api/attendance', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!attendanceResponse.ok) throw new Error('Failed to fetch attendance')
      const attendanceData = await attendanceResponse.json()

      // Filter today's attendance
      const todayAttendance = attendanceData.data?.filter(record => 
        record.date === today
      ) || []

      // Find users with issues
      const absentUsers = []
      const halfDayUsers = []
      const notCheckedIn = []

      usersData.data?.forEach(user => {
        const userAttendance = todayAttendance.find(a => a.userId === user.id)
        
        if (!userAttendance) {
          notCheckedIn.push(user.name)
        } else if (userAttendance.status === 'Absent') {
          absentUsers.push(user.name)
        } else if (userAttendance.status === 'Half Day') {
          halfDayUsers.push(user.name)
        }
      })

      // Show alerts
      let alertMessages = []
      
      if (notCheckedIn.length > 0) {
        alertMessages.push(`${notCheckedIn.length} employees haven't checked in today`)
      }
      if (absentUsers.length > 0) {
        alertMessages.push(`${absentUsers.length} employees marked absent`)
      }
      if (halfDayUsers.length > 0) {
        alertMessages.push(`${halfDayUsers.length} employees on half day`)
      }

      if (alertMessages.length > 0) {
        toast.error(
          <div>
            <p className="font-bold">Attendance Alerts:</p>
            {alertMessages.map((msg, i) => (
              <p key={i} className="text-sm">• {msg}</p>
            ))}
          </div>,
          { duration: 6000 }
        )
      } else {
        toast.success("✅ All employees have good attendance today!", {
          duration: 4000
        })
      }

      // Save last check time
      const now = new Date()
      localStorage.setItem('lastAttendanceCheck', now.toISOString())
      setLastAttendanceCheck(now)

    } catch (error) {
      console.error("Error checking attendance:", error)
      toast.error("Failed to check attendance")
    } finally {
      setIsCheckingAttendance(false)
    }
  }

  const checkLeaveApprovals = async () => {
    if (!leaveApprovalAlerts) {
      toast.error("Leave approval alerts are disabled")
      return
    }

    setIsCheckingLeaves(true)

    try {
      const authToken = localStorage.getItem('authToken')

      // Fetch all leave requests
      const leaveResponse = await fetch('/api/leave', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!leaveResponse.ok) throw new Error('Failed to fetch leave requests')
      const leaveData = await leaveResponse.json()

      // Filter pending leave requests
      const pendingLeaves = leaveData.data?.filter(leave => 
        leave.status === 'Pending'
      ) || []

      // Group by user
      const leavesByUser = {}
      pendingLeaves.forEach(leave => {
        const userName = leave.user?.name || 'Unknown'
        if (!leavesByUser[userName]) {
          leavesByUser[userName] = []
        }
        leavesByUser[userName].push({
          from: new Date(leave.from).toLocaleDateString(),
          to: new Date(leave.to).toLocaleDateString(),
          reason: leave.reason
        })
      })

      if (pendingLeaves.length > 0) {
        const userCount = Object.keys(leavesByUser).length
        
        toast(
          <div>
            <p className="font-bold">⏳ Pending Leave Approvals:</p>
            <p className="text-sm mb-2">{pendingLeaves.length} request(s) from {userCount} employee(s)</p>
            <div className="max-h-40 overflow-y-auto">
              {Object.entries(leavesByUser).map(([userName, leaves], i) => (
                <div key={i} className="text-xs mt-1 p-2 bg-white/10 rounded">
                  <p className="font-semibold">{userName}</p>
                  {leaves.map((leave, j) => (
                    <p key={j} className="ml-2">
                      • {leave.from} to {leave.to}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>,
          { 
            duration: 8000,
            icon: '⚠️',
            style: {
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FCD34D'
            }
          }
        )
      } else {
        toast.success("✅ No pending leave approvals!", {
          duration: 4000
        })
      }

      // Save last check time
      const now = new Date()
      localStorage.setItem('lastLeaveCheck', now.toISOString())
      setLastLeaveCheck(now)

    } catch (error) {
      console.error("Error checking leave approvals:", error)
      toast.error("Failed to check leave approvals")
    } finally {
      setIsCheckingLeaves(false)
    }
  }

  const checkPayrollStatus = async () => {
    if (!payrollAlerts) {
      toast("Payroll alerts are disabled", { icon: '🔕' })
      return
    }

    setIsCheckingPayroll(true)
    try {
      const authToken = localStorage.getItem('authToken')

      // Fetch all payroll records
      const response = await fetch('/api/payroll', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch payroll data')
      }

      const payrollData = await response.json()

      // Get current month
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      // Filter pending and processing payrolls
      const pendingPayrolls = payrollData.data?.filter(payroll => 
        payroll.status === 'Pending' || payroll.status === 'Processing'
      ) || []

      // Group by status
      const pendingCount = pendingPayrolls.filter(p => p.status === 'Pending').length
      const processingCount = pendingPayrolls.filter(p => p.status === 'Processing').length

      // Group by user for detailed view
      const payrollsByUser = {}
      pendingPayrolls.forEach(payroll => {
        const userName = payroll.user?.name || 'Unknown'
        if (!payrollsByUser[userName]) {
          payrollsByUser[userName] = []
        }
        payrollsByUser[userName].push({
          month: payroll.month,
          amount: payroll.amount,
          status: payroll.status
        })
      })

      if (pendingPayrolls.length > 0) {
        const userCount = Object.keys(payrollsByUser).length
        
        toast(
          <div>
            <p className="font-bold">💰 Payroll Status Alert:</p>
            <p className="text-sm mb-2">
              {pendingCount > 0 && `${pendingCount} Pending`}
              {pendingCount > 0 && processingCount > 0 && ', '}
              {processingCount > 0 && `${processingCount} Processing`}
            </p>
            <div className="max-h-40 overflow-y-auto">
              {Object.entries(payrollsByUser).map(([userName, payrolls], i) => (
                <div key={i} className="text-xs mt-1 p-2 bg-white/10 rounded">
                  <p className="font-semibold">{userName}</p>
                  {payrolls.map((payroll, j) => (
                    <p key={j} className="ml-2">
                      • {payroll.month}: ₹{payroll.amount} - {payroll.status}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>,
          { 
            duration: 8000,
            icon: '⚠️',
            style: {
              background: '#DBEAFE',
              color: '#1E40AF',
              border: '1px solid #60A5FA'
            }
          }
        )
      } else {
        toast.success("✅ All payrolls are paid!", {
          duration: 4000
        })
      }

      // Save last check time
      const now = new Date()
      localStorage.setItem('lastPayrollCheck', now.toISOString())
      setLastPayrollCheck(now)

    } catch (error) {
      console.error("Error checking payroll status:", error)
      toast.error("Failed to check payroll status")
    } finally {
      setIsCheckingPayroll(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)

    try {
      const settings = {
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        workingHoursStart,
        workingHoursEnd,
        fullDayHours,
        halfDayHours,
        annualLeave,
        sickLeave,
        casualLeave,
        emailNotifications,
        attendanceAlerts,
        leaveApprovalAlerts,
        payrollAlerts,
        theme
      }

      // Save to localStorage
      localStorage.setItem('appSettings', JSON.stringify(settings))

      // Apply theme
      if (theme === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }

      toast.success("Settings saved successfully!", {
        duration: 3000,
        icon: "✅",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const tabs = [
    { id: "general", label: "General", icon: Building2 },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "leave", label: "Leave Policy", icon: Calendar },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
  ]

  if (!user || !['Admin', 'Manager'].includes(user.role)) {
    return null
  }

  return (
    <LayoutWrapper>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization's settings and preferences
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-card border border-border rounded-lg p-8">
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Company Information</h2>
                <p className="text-muted-foreground mb-6">
                  Basic information about your organization
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Email
                  </label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="company@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Phone
                  </label>
                  <input
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Address
                  </label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter company address"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Attendance Settings</h2>
                <p className="text-muted-foreground mb-6">
                  Configure working hours and attendance policies
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Working Hours Start
                  </label>
                  <input
                    type="time"
                    value={workingHoursStart}
                    onChange={(e) => setWorkingHoursStart(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Working Hours End
                  </label>
                  <input
                    type="time"
                    value={workingHoursEnd}
                    onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Full Day Hours
                  </label>
                  <input
                    type="number"
                    value={fullDayHours}
                    onChange={(e) => setFullDayHours(parseInt(e.target.value))}
                    min="1"
                    max="24"
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum hours for full day attendance
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Half Day Hours
                  </label>
                  <input
                    type="number"
                    value={halfDayHours}
                    onChange={(e) => setHalfDayHours(parseInt(e.target.value))}
                    min="1"
                    max="24"
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum hours for half day attendance
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> Less than {halfDayHours+2} hours will be marked as Absent. 
                  Between {halfDayHours+2}-{fullDayHours} hours will be Half Day. 
                  {fullDayHours}+ hours will be Present.
                </p>
              </div>
            </div>
          )}

          {activeTab === "leave" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Leave Policy</h2>
                <p className="text-muted-foreground mb-6">
                  Configure annual leave allowances for employees
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Annual Leave Days
                  </label>
                  <input
                    type="number"
                    value={annualLeave}
                    onChange={(e) => setAnnualLeave(parseInt(e.target.value))}
                    min="0"
                    max="365"
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Per year
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Sick Leave Days
                  </label>
                  <input
                    type="number"
                    value={sickLeave}
                    onChange={(e) => setSickLeave(parseInt(e.target.value))}
                    min="0"
                    max="365"
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Per year
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Casual Leave Days
                  </label>
                  <input
                    type="number"
                    value={casualLeave}
                    onChange={(e) => setCasualLeave(parseInt(e.target.value))}
                    min="0"
                    max="365"
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Per year
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Total Leave:</strong> {annualLeave + sickLeave + casualLeave} days per year
                </p>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Notification Preferences</h2>
                <p className="text-muted-foreground mb-6">
                  Choose what notifications you want to receive
                </p>
              </div>

              <div className="space-y-4">
                {/* <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <h3 className="font-medium text-foreground">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important events
                    </p>
                  </div>
                  <button
                    onClick={() => setEmailNotifications(!emailNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      emailNotifications ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        emailNotifications ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div> */}

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">Attendance Alerts</h3>
                      <p className="text-sm text-muted-foreground">
                        Get notified about attendance issues
                      </p>
                    </div>
                    <button
                      onClick={() => setAttendanceAlerts(!attendanceAlerts)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        attendanceAlerts ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          attendanceAlerts ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  
                  {attendanceAlerts && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <button
                        onClick={checkAttendanceIssues}
                        disabled={isCheckingAttendance}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 w-full justify-center"
                      >
                        <Bell size={16} />
                        {isCheckingAttendance ? "Checking..." : "Check Attendance Now"}
                      </button>
                      
                      {lastAttendanceCheck && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Last checked: {lastAttendanceCheck.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">Leave Approval Alerts</h3>
                      <p className="text-sm text-muted-foreground">
                        Notifications for pending leave approvals
                      </p>
                    </div>
                    <button
                      onClick={() => setLeaveApprovalAlerts(!leaveApprovalAlerts)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        leaveApprovalAlerts ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          leaveApprovalAlerts ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  
                  {leaveApprovalAlerts && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <button
                        onClick={checkLeaveApprovals}
                        disabled={isCheckingLeaves}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 w-full justify-center"
                      >
                        <Calendar size={16} />
                        {isCheckingLeaves ? "Checking..." : "Check Pending Leaves Now"}
                      </button>
                      
                      {lastLeaveCheck && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Last checked: {lastLeaveCheck.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">Payroll Alerts</h3>
                      <p className="text-sm text-muted-foreground">
                        Get notified about payroll processing and pending payments
                      </p>
                    </div>
                    <button
                      onClick={() => setPayrollAlerts(!payrollAlerts)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        payrollAlerts ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          payrollAlerts ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  {payrollAlerts && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <button
                        onClick={checkPayrollStatus}
                        disabled={isCheckingPayroll}
                        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <IndianRupee className="w-4 h-4" />
                        {isCheckingPayroll ? "Checking..." : "Check Payroll Status Now"}
                      </button>
                      {lastPayrollCheck && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Last checked: {lastPayrollCheck.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Appearance</h2>
                <p className="text-muted-foreground mb-6">
                  Customize the look and feel of the application
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-4">
                  Theme
                </label>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <button
                    onClick={() => setTheme("light")}
                    className={`p-6 border-2 rounded-lg flex flex-col items-center gap-3 transition-all ${
                      theme === "light"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Sun className="w-8 h-8" />
                    <span className="font-medium">Light Mode</span>
                  </button>

                  <button
                    onClick={() => setTheme("dark")}
                    className={`p-6 border-2 rounded-lg flex flex-col items-center gap-3 transition-all ${
                      theme === "dark"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Moon className="w-8 h-8" />
                    <span className="font-medium">Dark Mode</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  <strong>Note:</strong> Theme changes will be applied immediately after saving settings.
                </p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-border flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save size={18} />
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
      <Toaster />
    </LayoutWrapper>
  )
}
