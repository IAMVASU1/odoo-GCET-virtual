"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/context/auth-context"
import { useRouter } from "next/navigation"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { ChartContainer } from "@/components/chart-container"
import { DataTable } from "@/components/data-table"
import { motion } from "framer-motion"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import toast from "react-hot-toast"
import { IndianRupee, CheckCircle } from "lucide-react"

export default function Payroll() {
  const { user } = useAuth()
  const router = useRouter()
  const [payrollRecords, setPayrollRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [selectedPayroll, setSelectedPayroll] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    userId: "",
    month: "",
    year: new Date().getFullYear().toString(),
    amount: "",
    status: "Pending",
    autoCalculate: false
  })

  useEffect(() => {
    // Only admins, managers and payroll officers can access payroll
    if (user && user.role !== "Admin" && user.role !== "Manager" && user.role !== "Payroll Officer") {
      toast.error("Access denied. Only admins, managers and payroll officers can view payroll.")
      router.push("/dashboard")
      return
    }

    if (user) {
      fetchPayrollRecords()
      fetchEmployees()
    }
  }, [user, router])

  const fetchPayrollRecords = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      const response = await fetch('/api/payroll', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()

      if (result.success) {
        setPayrollRecords(result.data || [])
      } else {
        toast.error(result.error || 'Failed to fetch payroll records')
      }
    } catch (error) {
      console.error('Error fetching payroll:', error)
      toast.error('Error fetching payroll records')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('authToken')

      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        setEmployees(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handlePreview = async () => {
    if (!formData.userId || !formData.month || !formData.year) {
      toast.error('Please select employee, month, and year')
      return
    }

    try {
      const token = localStorage.getItem('authToken')

      const response = await fetch('/api/payroll/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: parseInt(formData.userId),
          month: formData.month,
          year: parseInt(formData.year)
        })
      })

      const result = await response.json()

      if (result.success) {
        setPreviewData(result.data)
        setShowPreviewModal(true)
      } else {
        toast.error(result.error || 'Failed to calculate preview')
      }
    } catch (error) {
      console.error('Error previewing payroll:', error)
      toast.error('Error calculating preview')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.userId || !formData.month || !formData.year) {
      toast.error('Please select employee, month, and year')
      return
    }

    // Only require amount if NOT auto-calculating
    if (!formData.autoCalculate && !formData.amount) {
      toast.error('Please enter amount or enable auto-calculate')
      return
    }

    try {
      const token = localStorage.getItem('authToken')

      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: parseInt(formData.userId),
          month: formData.month,
          year: parseInt(formData.year),
          amount: formData.autoCalculate ? undefined : parseFloat(formData.amount),
          status: formData.status
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Payroll record created successfully!')
        setShowForm(false)
        setFormData({ userId: "", month: "", amount: "", status: "Pending" })
        fetchPayrollRecords()
      } else {
        toast.error(result.error || 'Failed to create payroll record')
      }
    } catch (error) {
      console.error('Error creating payroll:', error)
      toast.error('Error creating payroll record')
    }
  }

  const handleMarkPaid = async (payrollId) => {
    try {
      const token = localStorage.getItem('authToken')

      const response = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payrollId: payrollId,
          status: 'Paid'
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Payroll marked as paid!')
        fetchPayrollRecords()
      } else {
        toast.error(result.error || 'Failed to update payroll')
      }
    } catch (error) {
      console.error('Error updating payroll:', error)
      toast.error('Error updating payroll')
    }
  }

  const handleStatusChange = async (payrollId, newStatus, currentStatus) => {
    // Validation: Prevent backward status changes
    if (currentStatus === 'Paid') {
      toast.error('Cannot change status of already paid payroll!')
      return
    }

    if (currentStatus === 'Processing' && newStatus === 'Pending') {
      toast.error('Cannot move back to Pending from Processing!')
      return
    }

    try {
      const token = localStorage.getItem('authToken')

      const response = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payrollId: payrollId,
          status: newStatus
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Payroll status updated to ${newStatus}!`)
        fetchPayrollRecords()
      } else {
        toast.error(result.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Error updating status')
    }
  }

  const handleToggleForm = () => {
    if (!showForm) {
      // Clear form when opening
      setFormData({
        userId: "",
        month: "",
        year: new Date().getFullYear().toString(),
        amount: "",
        status: "Pending",
        autoCalculate: false
      })
      setEditMode(false)
    }
    setShowForm(!showForm)
  }

  // Calculate total for chart
  const totalAmount = payrollRecords.reduce((sum, record) => sum + (record.amount || 0), 0)
  const paidAmount = payrollRecords
    .filter(r => r.status === 'Paid')
    .reduce((sum, record) => sum + (record.amount || 0), 0)
  const pendingAmount = totalAmount - paidAmount

  const breakdownData = [
    { name: "Paid", value: paidAmount },
    { name: "Pending", value: pendingAmount },
  ].filter(item => item.value > 0)

  const COLORS = ["#22c55e", "#eab308"]

  const headers = ["Employee", "Month", "Amount", "Status", "Created", "Details", "Actions"]
  const rows = payrollRecords.map((record) => [
    record.user?.name || "N/A",
    record.month,
    `₹${record.amount?.toLocaleString() || 0}`,
    <span
      key={`status-${record.id}`}
      className={`px-3 py-1 rounded-full text-xs font-medium ${record.status === "Paid"
        ? "bg-green-50 text-green-700"
        : record.status === "Processing"
          ? "bg-blue-50 text-blue-700"
          : "bg-yellow-50 text-yellow-700"
        }`}
    >
      {record.status}
    </span>,
    new Date(record.createdAt).toLocaleDateString('en-GB'),
    // View Details Button
    <button
      key={`details-${record.id}`}
      onClick={() => {
        setSelectedPayroll(record)
        setShowDetailsModal(true)
      }}
      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
    >
      View Details
    </button>,
    // Actions - Edit and Status change
    (user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Payroll Officer') ? (
      <div key={`actions-${record.id}`} className="flex gap-2">
        <button
          onClick={() => {
            // Populate form with existing data
            setFormData({
              userId: record.userId.toString(),
              month: record.month.split(' ')[0], // Extract month name
              year: record.month.split(' ')[1] || new Date().getFullYear().toString(),
              amount: record.amount.toString(),
              status: record.status,
              autoCalculate: false
            })
            setEditMode(true)
            setSelectedPayroll(record)
            setShowForm(true)
          }}
          className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors"
        >
          Edit
        </button>
        <select
          key={`action-${record.id}`}
          value={record.status}
          onChange={(e) => handleStatusChange(record.id, e.target.value, record.status)}
          disabled={record.status === 'Paid'}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 focus:outline-none focus:ring-2 focus:ring-accent ${record.status === "Paid"
            ? "bg-green-50 text-green-700 border-green-200 cursor-not-allowed opacity-75"
            : record.status === "Processing"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-yellow-50 text-yellow-700 border-yellow-200"
            }`}
        >
          <option value="Pending" disabled={record.status === 'Processing' || record.status === 'Paid'}>
            Pending
          </option>
          <option value="Processing">Processing</option>
          <option value="Paid">Paid</option>
        </select>
      </div>
    ) : (
      <span key={`action-${record.id}`} className="text-muted-foreground text-sm">
        {record.status}
      </span>
    )
        
        ])

  return (
    <LayoutWrapper>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payroll Management</h1>
            <p className="text-muted-foreground">
              {user?.role === 'Payroll Officer' ? 'Manage employee salaries and payments' : 'View and manage payroll records'}
            </p>
          </div>
          {(user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Payroll Officer') && (
            <button
              onClick={handleToggleForm}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <IndianRupee className="w-5 h-5" />
              {showForm ? "Close" : "Add Payroll"}
            </button>
          )}
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-lg p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold text-foreground">
              {editMode ? 'Edit Payroll Record' : 'Create Payroll Record'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Employee *</label>
                  <select
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Month *</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Select Month</option>
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Year *</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="2025"
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="autoCalc"
                  checked={formData.autoCalculate}
                  onChange={(e) => setFormData({ ...formData, autoCalculate: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="autoCalc" className="text-sm font-medium text-foreground cursor-pointer">
                  Auto-calculate amount based on Attendance & Leave
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Amount (₹) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="50000"
                    required={!formData.autoCalculate}
                    disabled={formData.autoCalculate}
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent ${formData.autoCalculate ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handlePreview}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Preview Calculation
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  {editMode ? 'Update Payroll' : 'Create Payroll Record'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {breakdownData.length > 0 && (
          <ChartContainer title="Payment Status Overview">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={breakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ₹${value.toLocaleString()}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {breakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Payroll Records</h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payroll records...</div>
          ) : payrollRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No payroll records found</div>
          ) : (
            <DataTable headers={headers} rows={rows} />
          )}
        </div>

        {/* Payroll Details Modal */}
        {showDetailsModal && selectedPayroll && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowDetailsModal(false)}
          >
            <div
              className="bg-card border border-border rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Payroll Details</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedPayroll.user?.name} - {selectedPayroll.month}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-muted-foreground hover:text-foreground text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Breakdown Details */}
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-blue-600">💼</span> Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Employee</p>
                      <p className="font-medium text-foreground">{selectedPayroll.user?.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium text-foreground">{selectedPayroll.user?.department || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Month</p>
                      <p className="font-medium text-foreground">{selectedPayroll.month}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${selectedPayroll.status === 'Paid' ? 'bg-green-100 text-green-700' :
                        selectedPayroll.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                        {selectedPayroll.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown */}
                {selectedPayroll.details && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-green-600">💰</span> Salary Breakdown
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Base Monthly Salary</span>
                        <span className="font-semibold text-foreground">
                          ₹{selectedPayroll.details.basic?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Per Day Rate (÷ 30)</span>
                        <span className="font-medium text-foreground">
                          ₹{((selectedPayroll.details.basic || 0) / 30).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attendance Details */}
                {selectedPayroll.details && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-purple-600">📊</span> Attendance Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Days Present</span>
                        <span className="font-semibold text-green-600">
                          {selectedPayroll.details.presentDays || 0} days
                        </span>
                      </div>
                      {selectedPayroll.details.totalWorkingHours !== undefined && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Total Hours Worked</span>
                          <span className="font-semibold text-blue-600">
                            {selectedPayroll.details.totalWorkingHours?.toFixed(2) || 0} hrs
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Paid Leave Days</span>
                        <span className="font-semibold text-blue-600">
                          {selectedPayroll.details.paidLeaveDays || 0} days
                        </span>
                      </div>
                      <div className="border-t border-purple-200 dark:border-purple-700 pt-2 mt-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-foreground">Total Payable Days</span>
                          <span className="font-bold text-purple-600">
                            {selectedPayroll.details.totalPayableDays || 0} days
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Calculation Formula */}
                {selectedPayroll.details && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-orange-600">🧮</span> Calculation
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        Formula: (Base Salary ÷ 30) × (Present Days + Paid Leave Days)
                      </p>
                      <p className="font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded border border-orange-200 dark:border-orange-700">
                        (₹{selectedPayroll.details.basic?.toLocaleString() || 0} ÷ 30) × ({selectedPayroll.details.presentDays || 0} + {selectedPayroll.details.paidLeaveDays || 0})
                      </p>
                      <p className="font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded border border-orange-200 dark:border-orange-700">
                        ₹{((selectedPayroll.details.basic || 0) / 30).toFixed(2)} × {selectedPayroll.details.totalPayableDays || 0} = ₹{selectedPayroll.amount?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                )}

                {/* Final Amount */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Final Payable Amount</p>
                      <p className="text-3xl font-bold text-primary">
                        ₹{selectedPayroll.amount?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Created on</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(selectedPayroll.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && previewData && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowPreviewModal(false)}
          >
            <div
              className="bg-card border border-border rounded-lg max-w-2xl w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Payroll Preview</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {previewData.user?.name} - {previewData.month}
                  </p>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-muted-foreground hover:text-foreground text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Preview Content */}
              <div className="space-y-4">
                {/* Employee Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Employee</p>
                      <p className="font-medium text-foreground">{previewData.user?.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium text-foreground">{previewData.user?.department || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Calculation Breakdown */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-3">Salary Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Monthly Salary</span>
                      <span className="font-semibold">₹{previewData.calculation.basic?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Per Day Rate (÷ 30)</span>
                      <span className="font-medium">₹{previewData.calculation.perDaySalary?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Attendance Summary */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-3">Attendance Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Days Worked</span>
                      <span className="font-semibold text-green-600">{previewData.calculation.presentDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Hours</span>
                      <span className="font-semibold text-blue-600">{previewData.calculation.totalWorkingHours?.toFixed(2)} hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid Leaves</span>
                      <span className="font-semibold text-purple-600">{previewData.calculation.paidLeaveDays} days</span>
                    </div>
                    <div className="border-t border-purple-200 dark:border-purple-700 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-medium text-foreground">Total Payable Days</span>
                        <span className="font-bold text-purple-600">{previewData.calculation.totalPayableDays} days</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculation */}
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-3">Calculation</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">Formula: (Base Salary ÷ 30) × (Days Worked + Paid Leaves)</p>
                    <p className="font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded">
                      (₹{previewData.calculation.basic?.toLocaleString()} ÷ 30) × ({previewData.calculation.presentDays} + {previewData.calculation.paidLeaveDays})
                    </p>
                    <p className="font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded">
                      ₹{previewData.calculation.perDaySalary?.toFixed(2)} × {previewData.calculation.totalPayableDays} = ₹{previewData.amount?.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Final Amount */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Final Payable Amount</p>
                    <p className="text-4xl font-bold text-primary">₹{previewData.amount?.toLocaleString()}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowPreviewModal(false)
                      // Trigger form submission
                      document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
                    }}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    Confirm & Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </LayoutWrapper>
  )
}
