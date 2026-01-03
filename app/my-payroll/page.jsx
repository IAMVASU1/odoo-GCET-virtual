"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/context/auth-context"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { motion } from "framer-motion"
import { IndianRupee, Calendar, Clock, Briefcase, TrendingUp } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

export default function MyPayroll() {
    const { user } = useAuth()
    const [payrollRecords, setPayrollRecords] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedPayroll, setSelectedPayroll] = useState(null)

    useEffect(() => {
        if (user) {
            fetchMyPayroll()
        }
    }, [user])

    const fetchMyPayroll = async () => {
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
                // Auto-select the most recent payroll
                if (result.data && result.data.length > 0) {
                    setSelectedPayroll(result.data[0])
                }
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

    if (loading) {
        return (
            <LayoutWrapper>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            </LayoutWrapper>
        )
    }

    if (payrollRecords.length === 0) {
        return (
            <LayoutWrapper>
                <div className="p-6">
                    <h1 className="text-3xl font-bold text-foreground mb-2">My Payroll</h1>
                    <p className="text-muted-foreground mb-6">View your salary breakdown and payment history</p>
                    <div className="bg-card border border-border rounded-lg p-12 text-center">
                        <IndianRupee className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg text-muted-foreground">No payroll records found</p>
                        <p className="text-sm text-muted-foreground mt-2">Your salary records will appear here once processed</p>
                    </div>
                </div>
            </LayoutWrapper>
        )
    }

    return (
        <LayoutWrapper>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-foreground">My Payroll</h1>
                    <p className="text-muted-foreground">View your salary breakdown and payment history</p>
                </div>

                {/* Month Selector */}
                <div className="bg-card border border-border rounded-lg p-4">
                    <label className="block text-sm font-medium text-foreground mb-3">Select Month</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {payrollRecords.map((record) => (
                            <button
                                key={record.id}
                                onClick={() => setSelectedPayroll(record)}
                                className={`p-3 rounded-lg border-2 transition-all ${selectedPayroll?.id === record.id
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span className="font-medium text-sm">{record.month}</span>
                                </div>
                                <div className={`text-xs mt-1 ${record.status === 'Paid' ? 'text-green-600' :
                                        record.status === 'Processing' ? 'text-blue-600' :
                                            'text-yellow-600'
                                    }`}>
                                    {record.status}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Salary Breakdown */}
                {selectedPayroll && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Summary Cards */}
                        <div className="space-y-4">
                            {/* Final Amount Card */}
                            <div className="bg-gradient-to-br from-primary to-primary/80 text-white rounded-lg p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <IndianRupee className="w-5 h-5" />
                                    <span className="text-sm opacity-90">Total Salary</span>
                                </div>
                                <p className="text-4xl font-bold">₹{selectedPayroll.amount?.toLocaleString() || 0}</p>
                                <p className="text-sm opacity-75 mt-1">{selectedPayroll.month}</p>
                            </div>

                            {/* Base Salary */}
                            {selectedPayroll.details && (
                                <div className="bg-card border border-border rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrendingUp className="w-5 h-5 text-green-600" />
                                        <h3 className="font-semibold text-foreground">Base Salary</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Monthly Salary</span>
                                            <span className="font-semibold text-foreground">
                                                ₹{selectedPayroll.details.basic?.toLocaleString() || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Per Day Rate</span>
                                            <span className="font-medium text-foreground">
                                                ₹{((selectedPayroll.details.basic || 0) / 30).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Attendance Summary */}
                            {selectedPayroll.details && (
                                <div className="bg-card border border-border rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock className="w-5 h-5 text-blue-600" />
                                        <h3 className="font-semibold text-foreground">Attendance</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Days Worked</span>
                                            <span className="font-semibold text-green-600">
                                                {selectedPayroll.details.presentDays || 0} days
                                            </span>
                                        </div>
                                        {selectedPayroll.details.totalWorkingHours !== undefined && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Total Hours</span>
                                                <span className="font-semibold text-blue-600">
                                                    {selectedPayroll.details.totalWorkingHours?.toFixed(2) || 0} hrs
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Paid Leaves</span>
                                            <span className="font-semibold text-purple-600">
                                                {selectedPayroll.details.paidLeaveDays || 0} days
                                            </span>
                                        </div>
                                        <div className="border-t border-border pt-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-foreground">Total Payable Days</span>
                                                <span className="font-bold text-primary">
                                                    {selectedPayroll.details.totalPayableDays || 0} days
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Calculation Breakdown */}
                        <div className="space-y-4">
                            {/* Calculation Formula */}
                            {selectedPayroll.details && (
                                <div className="bg-card border border-border rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Briefcase className="w-5 h-5 text-orange-600" />
                                        <h3 className="font-semibold text-foreground">Salary Calculation</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-2">Formula:</p>
                                            <p className="text-sm font-mono bg-muted p-2 rounded">
                                                (Base Salary ÷ 30) × (Days Worked + Paid Leaves)
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-2">Calculation:</p>
                                            <div className="space-y-1">
                                                <p className="text-sm font-mono bg-muted p-2 rounded">
                                                    (₹{selectedPayroll.details.basic?.toLocaleString() || 0} ÷ 30) × ({selectedPayroll.details.presentDays || 0} + {selectedPayroll.details.paidLeaveDays || 0})
                                                </p>
                                                <p className="text-sm font-mono bg-muted p-2 rounded">
                                                    ₹{((selectedPayroll.details.basic || 0) / 30).toFixed(2)} × {selectedPayroll.details.totalPayableDays || 0}
                                                </p>
                                                <p className="text-sm font-mono bg-primary/10 text-primary p-2 rounded font-bold">
                                                    = ₹{selectedPayroll.amount?.toLocaleString() || 0}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment Status */}
                            <div className="bg-card border border-border rounded-lg p-4">
                                <h3 className="font-semibold text-foreground mb-3">Payment Status</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Status</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedPayroll.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                                selectedPayroll.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {selectedPayroll.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Processed On</span>
                                        <span className="text-sm font-medium text-foreground">
                                            {new Date(selectedPayroll.createdAt).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    <strong>Note:</strong> Your salary is calculated based on actual days worked plus approved paid leaves. Unpaid leaves or absences will reduce the final amount.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <Toaster />
            </motion.div>
        </LayoutWrapper>
    )
}
