"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/app/context/auth-context"
import { motion } from "framer-motion"
import { Upload, Eye, EyeOff } from "lucide-react"

/**
 * SignUp Component
 * Registration page for new users/companies
 * Auto-generates Login ID based on company name and user details
 */
export default function SignUp() {
  const router = useRouter()
  const { signup } = useAuth()
  
  // Form state management
  const [companyName, setCompanyName] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * validateSignUpForm Function
   * Validates all signup form fields with comprehensive constraints
   * @returns {Object} errors - Object containing field-specific error messages
   */
  const validateSignUpForm = () => {
    const newErrors = {}

    // Validate Company Name
    if (!companyName.trim()) {
      newErrors.companyName = "Company name is required"
    } else if (companyName.trim().length < 2) {
      newErrors.companyName = "Company name must be at least 2 characters"
    } else if (companyName.trim().length > 100) {
      newErrors.companyName = "Company name cannot exceed 100 characters"
    } else if (!/^[a-zA-Z0-9\s&.-]+$/.test(companyName)) {
      newErrors.companyName = "Company name can only contain letters, numbers, spaces, and &.-"
    }

    // Validate Name
    if (!name.trim()) {
      newErrors.name = "Name is required"
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    } else if (name.trim().length > 50) {
      newErrors.name = "Name cannot exceed 50 characters"
    } else if (!/^[a-zA-Z\s]+$/.test(name)) {
      newErrors.name = "Name can only contain letters and spaces"
    }

    // Validate Email
    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address"
    } else if (email.length > 100) {
      newErrors.email = "Email cannot exceed 100 characters"
    }

    // Validate Phone
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required"
    } else if (!/^[\d\s\-+()]+$/.test(phone)) {
      newErrors.phone = "Please enter a valid phone number"
    } else if (phone.replace(/[\s\-+()]/g, "").length < 10) {
      newErrors.phone = "Phone number must be at least 10 digits"
    } else if (phone.replace(/[\s\-+()]/g, "").length > 15) {
      newErrors.phone = "Phone number cannot exceed 15 digits"
    }

    // Validate Password
    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    } else if (password.length > 50) {
      newErrors.password = "Password cannot exceed 50 characters"
    } else if (!/(?=.*[a-z])/.test(password)) {
      newErrors.password = "Password must contain at least one lowercase letter"
    } else if (!/(?=.*[A-Z])/.test(password)) {
      newErrors.password = "Password must contain at least one uppercase letter"
    } else if (!/(?=.*\d)/.test(password)) {
      newErrors.password = "Password must contain at least one number"
    }

    // Validate Confirm Password
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    // Validate Logo (optional but check if file is valid image)
    if (logo) {
      const validImageTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/svg+xml"]
      if (!validImageTypes.includes(logo.type)) {
        newErrors.logo = "Logo must be a valid image file (JPEG, PNG, GIF, SVG)"
      } else if (logo.size > 5 * 1024 * 1024) {
        newErrors.logo = "Logo file size cannot exceed 5MB"
      }
    }

    return newErrors
  }

  /**
   * generateLoginId Function
   * Automatically generates Login ID in the format:
   * [CompanyInitials][FirstTwoLettersFirstName][FirstTwoLettersLastName][Year][SerialNumber]
   * Example: OIJODO20220001
   */
  const generateLoginId = () => {
    if (!companyName || !name) return ""
    
    // Get company initials (first two letters of each word)
    const companyInitials = companyName
      .split(" ")
      .map(word => word.slice(0, 2))
      .join("")
      .toUpperCase()
      .slice(0, 4) // Max 4 characters
    
    // Get first and last name initials
    const nameParts = name.trim().split(" ")
    const firstName = nameParts[0] || ""
    const lastName = nameParts[nameParts.length - 1] || ""
    const nameInitials = (firstName.slice(0, 2) + lastName.slice(0, 2)).toUpperCase()
    
    // Get current year
    const year = new Date().getFullYear()
    
    // Generate serial number (in production, this would come from database)
    const serialNumber = "0001"
    
    return `${companyInitials}${nameInitials}${year}${serialNumber}`
  }

  /**
   * handleLogoUpload Function
   * Handles company logo file selection and preview
   */
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogo(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  /**
   * handleSignUp Function
   * Processes registration form submission
   * Creates new user account with auto-generated Login ID
   */
  const handleSignUp = async (e) => {
    e.preventDefault()
    setErrors({})
    
    // Validate all form fields
    const validationErrors = validateSignUpForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    
    setIsSubmitting(true)
    
    // Create user data object matching backend API expectations
    const userData = {
      name,
      email,
      password,
      companyName, // Backend uses this as department
      phone,
    }
    
    try {
      // Call signup function which will create user in database
      const result = await signup(userData)
      
      // Show success message
      alert(`Account successfully ban gaya!\n\nEmail: ${email}\n\nAb aap login kar sakte hain.`)
      await router.push("/")
    } catch (error) {
      console.error("Signup error:", error)
      // Display error message to user
      setErrors({ 
        general: error.message || "Account banane mein problem aa gayi. Kripya phir se try karein." 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          {/* Logo and Header */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">WZ</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-foreground mb-2">Sign Up</h1>
          <p className="text-center text-muted-foreground mb-6">Create your WorkZen account</p>

          {/* General Error Message */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Company Logo Upload */}
            <div className="flex flex-col items-center mb-4">
              <div className="relative">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={(e) => {
                    handleLogoUpload(e)
                    if (errors.logo) setErrors({ ...errors, logo: "" })
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="logo-upload"
                  className={`flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors bg-background ${
                    errors.logo ? "border-red-500" : "border-border"
                  }`}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <>
                      <Upload size={32} className="text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground text-center px-2">Upload Logo</span>
                    </>
                  )}
                </label>
              </div>
              {errors.logo && <p className="mt-2 text-sm text-red-600 text-center">{errors.logo}</p>}
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value)
                  if (errors.companyName) setErrors({ ...errors, companyName: "" })
                }}
                placeholder="Odoo India"
                className={`w-full px-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 ${
                  errors.companyName ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-accent"
                }`}
              />
              {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors({ ...errors, name: "" })
                }}
                placeholder="John Doe"
                className={`w-full px-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 ${
                  errors.name ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-accent"
                }`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors({ ...errors, email: "" })
                }}
                placeholder="john@example.com"
                className={`w-full px-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 ${
                  errors.email ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-accent"
                }`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  if (errors.phone) setErrors({ ...errors, phone: "" })
                }}
                placeholder="+1 234 567 8900"
                className={`w-full px-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 ${
                  errors.phone ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-accent"
                }`}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors({ ...errors, password: "" })
                  }}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2 pr-10 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 ${
                    errors.password ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-accent"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" })
                  }}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2 pr-10 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 ${
                    errors.confirmPassword ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-accent"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>

            {/* Auto-generated Login ID Preview */}
            {companyName && name && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Your Login ID will be:</strong> {generateLoginId()}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Save this ID for future logins. Password can be changed after first login.
                </p>
              </div>
            )}

            {/* Display general errors */}
            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{errors.general}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "SIGNING UP..." : "SIGN UP"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/" className="text-primary font-medium hover:underline">
              Sign In
            </Link>
          </p>

          {/* Note Section */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-2">Note:</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Normal users cannot register. Only HR/Admin can create employee accounts.</li>
              <li>• Password is auto-generated on first creation and can be changed after first login.</li>
              <li>• Login ID format: [Company][Name][Year][Serial] (e.g., OIJODO20220001)</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
