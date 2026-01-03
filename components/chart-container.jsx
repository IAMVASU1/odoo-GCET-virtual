"use client"

import { motion } from "framer-motion"

export function ChartContainer({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-card border border-border rounded-lg p-6 shadow-sm"
    >
      <h2 className="text-lg font-bold text-foreground mb-6">{title}</h2>
      {children}
    </motion.div>
  )
}
