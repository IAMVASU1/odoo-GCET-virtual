"use client"

import { LayoutWrapper } from "@/components/layout-wrapper"
import { DataTable } from "@/components/data-table"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { CheckCircle, XCircle } from "lucide-react"

export default function Leave() {
  const [leaves, setLeaves] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 🔹 NEW (for reason popup)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [selectedReason, setSelectedReason] = useState("")

  const [formData, setFormData] = useState({
    type: "Sick Leave",
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
        alert(result.error || 'Failed to fetch leaves')
      }
    } catch (error) {
      alert('Error fetching leaves')
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
          reason: `${formData.type} - ${formData.reason}`,
          from: formData.from,
          to: formData.to,
          status: 'Pending'
        })
      })
      const result = await response.json()
      if (result.success) {
        alert('Leave request submitted successfully!')
        setShowForm(false)
        setFormData({ type: "Sick Leave", from: "", to: "", reason: "" })
        fetchLeaves()
      } else {
        alert(result.error || 'Failed to submit leave request')
      }
    } catch (error) {
      alert('Error submitting leave request')
    }
  }

  const handleApprove = async (leaveId) => {
    const token = localStorage.getItem('authToken')
    await fetch('/api/leave', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ leaveId, status: 'Approved' })
    })
    fetchLeaves()
  }

  const handleReject = async (leaveId) => {
    const token = localStorage.getItem('authToken')
    await fetch('/api/leave', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ leaveId, status: 'Rejected' })
    })
    fetchLeaves()
  }

  const headers = ["Name", "Type", "Start Date", "End Date", "Status", "Reason", "Actions"]

  const rows = leaves.map((leave) => [
    leave.user?.name || "N/A",
    leave.reason?.split(' - ')[0] || "Leave",
    new Date(leave.from).toLocaleDateString('en-GB'),
    new Date(leave.to).toLocaleDateString('en-GB'),
    <span
      key={`status-${leave.id}`}
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        leave.status === "Approved"
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
        <DataTable headers={headers} rows={rows} />
      </motion.div>

      {/* ✅ REASON MODAL */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Leave Reason</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {selectedReason}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowReasonModal(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutWrapper>
  )
}
