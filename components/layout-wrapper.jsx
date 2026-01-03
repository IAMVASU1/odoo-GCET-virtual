"use client"

import { Navbar } from "./navbar"
import { Sidebar } from "./sidebar"
import { useSidebar } from "@/app/context/sidebar-context"
import { motion } from "framer-motion"

/**
 * LayoutWrapper Component
 * Provides consistent layout structure for all authenticated pages
 * Includes navbar, sidebar, and animated main content area
 * @param {Object} children - Page content to display in main area
 */
export function LayoutWrapper({ children }) {
  const { isOpen } = useSidebar() // Get sidebar state to adjust main content margin

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation bar - fixed at top */}
      <Navbar />
      
      <div className="flex pt-16"> {/* pt-16 adds space for fixed navbar */}
        {/* Left sidebar navigation */}
        <Sidebar />
        
        {/* Main content area - animates when sidebar opens/closes */}
        <motion.main
          animate={{ marginLeft: isOpen ? 256 : 0 }} // Shift content when sidebar is open (256px = sidebar width)
          transition={{ duration: 0.3 }} // Smooth 300ms animation
          className="flex-1 p-6 md:p-8" // Flexible width with padding
        >
          {children} {/* Page-specific content rendered here */}
        </motion.main>
      </div>
    </div>
  )
}
