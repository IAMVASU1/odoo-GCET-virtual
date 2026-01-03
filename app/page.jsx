"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/app/context/auth-context"
import { motion } from "framer-motion"

/**
 * Login Component
 * Main login page where users authenticate with email, password, and role selection
 */
export default function Login() {
  const router = useRouter() // Next.js router for navigation
  const { login } = useAuth() // Get login function from auth context
  
  // Form state management
  const [email, setEmail] = useState("") // Stores email input (Login ID)
  const [password, setPassword] = useState("") // Stores password input
  const [errors, setErrors] = useState({}) // Stores validation errors
  const [isSubmitting, setIsSubmitting] = useState(false) // Loading state

  /**
   * validateLoginForm Function
   * Validates all login form fields and returns errors object
   * @returns {Object} errors - Object containing field-specific error messages
   */
  const validateLoginForm = () => {
    const newErrors = {}

    // Validate Login ID/Email
    if (!email.trim()) {
      newErrors.email = "Login ID or Email is required"
    } else if (email.trim().length < 3) {
      newErrors.email = "Login ID must be at least 3 characters"
    }

    // Validate Password
    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    } else if (password.length > 50) {
      newErrors.password = "Password cannot exceed 50 characters"
    }

    return newErrors
  }

  /**
   * handleLogin Function
   * Processes login form submission and redirects to dashboard
   * Role is automatically determined from the database based on email/login ID
   * @param {Event} e - Form submit event
   */
  const handleLogin = async (e) => {
    e.preventDefault()
    setErrors({})
    
    const validationErrors = validateLoginForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    
    try {
      await login({
        email,
        loginId: email,
        password,
      })
      
      await router.push("/dashboard")
    } catch (error) {
      console.error("Login error:", error)
      setErrors({ general: error.message || "Invalid credentials. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">WZ</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-foreground mb-2">WorkZen</h1>
          <p className="text-center text-muted-foreground mb-8">HRMS Dashboard</p>

          {/* General Error Message */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Login ID/Email <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  // Clear all errors when user starts typing
                  setErrors({})
                }}
                onFocus={() => setErrors({})}
                placeholder="your-login-id or email"
                className={`w-full px-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 ${
                  errors.email ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-accent"
                }`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  // Clear all errors when user starts typing
                  setErrors({})
                }}
                onFocus={() => setErrors({})}
                placeholder="••••••••"
                className={`w-full px-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 ${
                  errors.password ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-accent"
                }`}
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold transition-opacity ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
              }`}
            >
              {isSubmitting ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
