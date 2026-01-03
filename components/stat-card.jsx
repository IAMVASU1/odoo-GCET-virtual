"use client"

import { motion } from "framer-motion"

/**
 * StatCard Component
 * Displays a statistics card with an icon, label, and value
 * Used on the dashboard to show key metrics (employees, attendance, etc.)
 * 
 * @param {Component} Icon - Lucide icon component to display
 * @param {string} label - Text label describing the statistic
 * @param {string|number} value - The statistic value to display
 * @param {string} color - Color theme (primary, success, warning, danger)
 */
export function StatCard({ icon: Icon, label, value, color = "primary" }) {
  // Color mapping for different stat types
  const colorClasses = {
    primary: "bg-blue-50 text-blue-600",   // Blue for general stats
    success: "bg-green-50 text-green-600", // Green for positive metrics
    warning: "bg-yellow-50 text-yellow-600", // Yellow for warnings
    danger: "bg-red-50 text-red-600",      // Red for critical metrics
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  )
}
