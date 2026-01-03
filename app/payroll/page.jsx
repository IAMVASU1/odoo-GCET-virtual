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
  const [formData, setFormData] = useState({
    userId: "",
    month: "",
    amount: "",
    status: "Pending"
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.userId || !formData.month || !formData.amount) {
      toast.error('Please fill all required fields')
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
          amount: parseFloat(formData.amount),
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
      setFormData({ userId: "", month: "", amount: "", status: "Pending" })
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

  const headers = ["Employee", "Month", "Amount", "Status", "Created", "Actions"]
  const rows = payrollRecords.map((record) => [
    record.user?.name || "N/A",
    record.month,
    `₹${record.amount?.toLocaleString() || 0}`,
    <span
      key={`status-${record.id}`}
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        record.status === "Paid"
          ? "bg-green-50 text-green-700"
          : record.status === "Processing"
            ? "bg-blue-50 text-blue-700"
            : "bg-yellow-50 text-yellow-700"
      }`}
    >
      {record.status}
    </span>,
    new Date(record.createdAt).toLocaleDateString('en-GB'),
    // Actions - Status change dropdown
    (user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Payroll Officer') ? (
      <select
        key={`action-${record.id}`}
        value={record.status}
        onChange={(e) => handleStatusChange(record.id, e.target.value, record.status)}
        disabled={record.status === 'Paid'}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 focus:outline-none focus:ring-2 focus:ring-accent ${
          record.status === "Paid"
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
            <h3 className="text-lg font-semibold text-foreground">Create Payroll Record</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Employee *</label>
                  <select
                    value={formData.userId}
                    onChange={(e) => setFormData({...formData, userId: e.target.value})}
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
                  <input
                    type="text"
                    value={formData.month}
                    onChange={(e) => setFormData({...formData, month: e.target.value})}
                    placeholder="e.g., November 2025"
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Amount (₹) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="50000"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Create Payroll Record
              </button>
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
      </motion.div>
    </LayoutWrapper>
  )
}
