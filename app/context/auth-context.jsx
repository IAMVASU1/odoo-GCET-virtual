"use client"

import { createContext, useContext, useState, useEffect } from "react"

// Create the authentication context to share user state across the app
const AuthContext = createContext()

/**
 * AuthProvider Component
 * Manages authentication state and provides auth functions to the entire app
 * @param {Object} children - Child components that need access to auth state
 */
export function AuthProvider({ children }) {
  // State to store current user information (null if not logged in)
  const [user, setUser] = useState(null)
  
  // Loading state to show spinner while checking for existing session
  const [isLoading, setIsLoading] = useState(true)

  /**
   * useEffect Hook - Runs once when component mounts
   * Checks if user was previously logged in by verifying JWT token
   * This restores the user session on page refresh
   */
  useEffect(() => {
    const verifyToken = async () => {
      // Check localStorage for existing token
      const token = localStorage.getItem('authToken')
      const storedUser = localStorage.getItem('user')
      
      if (token) {
        try {
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              setUser(data.user)
              // Update stored user data
              localStorage.setItem('user', JSON.stringify(data.user))
            } else {
              // Invalid token, clear it
              localStorage.removeItem('authToken')
              localStorage.removeItem('user')
            }
          } else {
            // Token expired or invalid
            localStorage.removeItem('authToken')
            localStorage.removeItem('user')
          }
        } catch (error) {
          console.error("Error verifying token:", error)
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
        }
      } else if (storedUser) {
        // If no token but user data exists, try to use it (fallback)
        try {
          setUser(JSON.parse(storedUser))
        } catch (error) {
          console.error("Error parsing stored user:", error)
          localStorage.removeItem('user')
        }
      }
      setIsLoading(false)
    }

    verifyToken()
  }, [])

  /**
   * Login Function
   * Authenticates user with email and password, returns JWT token
   * @param {Object} credentials - Login credentials (email and password)
   * @returns {Promise} Resolves if login successful, rejects with error message
   */
  const login = async (credentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: credentials.email || credentials.loginId, // Support both email and loginId
          password: credentials.password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user) // Update React state
        // Store JWT token in localStorage
        localStorage.setItem('authToken', data.token)
        // Store user data in localStorage for easy access
        localStorage.setItem('user', JSON.stringify(data.user))
        return data.user
      } else {
        throw new Error(data.error || data.message || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  /**
   * SignUp Function (Public)
   * Registers a new user via the public signup API
   * @param {Object} userData - User registration data (name, email, password, companyName, phone)
   * @returns {Promise} Resolves if signup successful, rejects with error message
   */
  const signup = async (userData) => {
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          companyName: userData.companyName,
          phone: userData.phone,
        }),
      })

      const data = await response.json()

      if (data.success) {

        return data.user
      } else {
        throw new Error(data.error || data.message || "Signup failed")
      }
    } catch (error) {
      console.error("Signup error:", error)
      throw error
    }
  }

  /**
   * Create User Function (Admin/Manager only)
   * Creates a new user with specific role - requires authentication
   * @param {Object} userData - User data (name, email, password, role, department)
   * @returns {Promise} Resolves if user created successfully
   */
  const createUser = async (userData) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role || 'Employee',
          department: userData.department,
        }),
      })

      const data = await response.json()

      if (data.success) {

        return data.data
      } else {
        throw new Error(data.error || data.message || "User creation failed")
      }
    } catch (error) {
      console.error("Create user error:", error)
      throw error
    }
  }

  /**
   * Logout Function
   * Clears user data from state and localStorage
   */
  const logout = () => {
    setUser(null) // Clear React state
    // Clear the auth token and user data from localStorage
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  }

  // Provide auth state and functions to all child components
  return <AuthContext.Provider value={{ user, isLoading, login, logout, signup, createUser }}>{children}</AuthContext.Provider>
}

/**
 * useAuth Custom Hook
 * Provides easy access to authentication context in any component
 * @returns {Object} { user, isLoading, login, logout }
 */
export function useAuth() {
  return useContext(AuthContext)
}
