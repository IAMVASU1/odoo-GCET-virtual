"use client"

import { LayoutWrapper } from "@/components/layout-wrapper"
import { DataTable } from "@/components/data-table"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Plus, Calendar } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

export default function Leave() {
  const [leaves, setLeaves] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 🔹 NEW (for reason popup)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [selectedReason, setSelectedReason] = useState("")

  const [formData, setFormData] = useState({
    type: "Paid",
    from: "",
    to: "",
    reason: ""
  })

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'))
    setUser(userData)
    if (userData) {
      fetchLeaves(userData)
    }
  }, [])

  const fetchLeaves = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/leave', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.success) {
        setLeaves(result.data || [])
      } else {
        toast.error(result.error || 'Failed to fetch leaves')
      }
    } catch (error) {
      toast.error('Error fetching leaves')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: formData.type,
          reason: formData.reason,
          from: formData.from,
          to: formData.to,
          status: 'Pending'
        })
      })
      const result = await response.json()
      if (result.success) {
        toast.success('Leave request submitted successfully!')
        setShowForm(false)
        setFormData({ type: "Paid", from: "", to: "", reason: "" })
        fetchLeaves()
      } else {
        toast.error(result.error || 'Failed to submit leave request')
      }
    } catch (error) {
      toast.error('Error submitting leave request')
    }
  }

  const handleApprove = async (leaveId) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/leave', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ leaveId, status: 'Approved' })
      })
      const result = await response.json()
      if (result.success) {
        toast.success('Leave approved successfully!')
        fetchLeaves()
      } else {
        toast.error(result.error || 'Failed to approve leave')
      }
    } catch (error) {
      toast.error('Error approving leave')
    }
  }

  const handleReject = async (leaveId) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/leave', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ leaveId, status: 'Rejected' })
      })
      const result = await response.json()
      if (result.success) {
        toast.success('Leave rejected')
        fetchLeaves()
      } else {
        toast.error(result.error || 'Failed to reject leave')
      }
    } catch (error) {
      toast.error('Error rejecting leave')
    }
  }

  const headers = ["Name", "Type", "Start Date", "End Date", "Status", "Reason", "Actions"]

  const rows = leaves.map((leave) => [
    leave.user?.name || "N/A",
    leave.reason?.split(' - ')[0] || "Leave",
    new Date(leave.from).toLocaleDateString('en-GB'),
    new Date(leave.to).toLocaleDateString('en-GB'),
    <span
      key={`status-${leave.id}`}
      className={`px-3 py-1 rounded-full text-xs font-medium ${leave.status === "Approved"
        ? "bg-green-50 text-green-700"
        : leave.status === "Pending"
          ? "bg-yellow-50 text-yellow-700"
          : "bg-red-50 text-red-700"
        }`}
    >
      {leave.status}
    </span>,

    // ✅ UPDATED REASON COLUMN (click → popup)
    <button
      key={`reason-${leave.id}`}
      onClick={() => {
        setSelectedReason(leave.reason?.split(' - ')[1] || leave.reason)
        setShowReasonModal(true)
      }}
      className="max-w-[220px] truncate whitespace-nowrap overflow-hidden text-left text-sm text-primary hover:underline"
      title="Click to view full reason"
    >
      {leave.reason?.split(' - ')[1] || leave.reason || "N/A"}
    </button>,

    (user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'HR Officer') &&
      leave.status === 'Pending' ? (
      <div key={`actions-${leave.id}`} className="flex gap-2">
        <button onClick={() => handleApprove(leave.id)} className="p-1.5 bg-green-50 text-green-600 rounded-lg">
          <CheckCircle className="w-4 h-4" />
        </button>
        <button onClick={() => handleReject(leave.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg">
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    ) : (
      <span key={`actions-${leave.id}`} className="text-muted-foreground text-sm">
        {leave.status === 'Pending' ? '-' : 'Processed'}
      </span>
    )
  ])

  return (
    <LayoutWrapper>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Leave Management</h1>
            <p className="text-muted-foreground">Request and manage employee leaves</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {showForm ? "Cancel" : "Apply Leave"}
          </button>
        </div>

        {/* Leave Application Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-lg p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold text-foreground">Apply for Leave</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Leave Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Paid">Paid Leave</option>
                    <option value="Unpaid">Unpaid Leave</option>
                    <option value="Sick">Sick Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">From Date *</label>
                  <input
                    type="date"
                    value={formData.from}
                    onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">To Date *</label>
                  <input
                    type="date"
                    value={formData.to}
                    onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Reason *</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                    rows={1}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Brief reason for leave"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Submit Leave Request
              </button>
            </form>
          </motion.div>
        )}

        {/* Leave Records Table */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Leave Records</h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading leave records...</div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No leave records found</div>
          ) : (
            <DataTable headers={headers} rows={rows} />
          )}
        </div>
      </motion.div>

      {/* ✅ REASON MODAL */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowReasonModal(false)}>
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Leave Reason</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {selectedReason}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowReasonModal(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </LayoutWrapper>
  )
}
