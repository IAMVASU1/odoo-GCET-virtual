"use client"

import { createContext, useContext, useState } from "react"

// Create the sidebar context to manage sidebar open/close state
const SidebarContext = createContext()

/**
 * SidebarProvider Component
 * Manages sidebar visibility state across the app
 * @param {Object} children - Child components that need sidebar state
 */
export function SidebarProvider({ children }) {
  // State to track if sidebar is open (true) or closed (false)
  const [isOpen, setIsOpen] = useState(true) // Default: sidebar is open

  /**
   * Toggle Function
   * Switches sidebar between open and closed states
   */
  const toggle = () => setIsOpen(!isOpen)

  // Provide sidebar state and toggle function to all child components
  return <SidebarContext.Provider value={{ isOpen, toggle }}>{children}</SidebarContext.Provider>
}

/**
 * useSidebar Custom Hook
 * Provides easy access to sidebar context in any component
 * @returns {Object} { isOpen, toggle }
 */
export function useSidebar() {
  return useContext(SidebarContext)
}
