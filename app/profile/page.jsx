"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/context/auth-context"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { motion } from "framer-motion"
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  IdCard,
  Shield,
  DollarSign,
  Award,
  Target,
  Eye,
  EyeOff,
  Lock,
  Edit2,
  Save,
  X,
} from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

export default function Profile() {
  const { user } = useAuth()
  const [employeeData, setEmployeeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("profile")

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedData, setEditedData] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  // Password change state
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState({})
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    fetchEmployeeProfile()
  }, [user])

  const fetchEmployeeProfile = async () => {
    try {
      if (!user) return

      const authToken = localStorage.getItem('authToken')
      
      // Fetch user data from /api/users
      const response = await fetch(`/api/users`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        // Find the current user's data
        const currentUser = data.data.find(u => u.id === user.id || u.email === user.email)
        
        if (currentUser) {
          setEmployeeData({
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone || '',
            department: currentUser.department,
            role: currentUser.role,
            salary: currentUser.salary,
            createdAt: currentUser.createdAt,
            skills: [],
            certifications: [],
            about: "",
          })
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error("Failed to load profile data")
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = () => {
    setEditedData({
      name: employeeData?.name || "",
      email: employeeData?.email || "",
      phone: employeeData?.phone || "",
      about: employeeData?.about || "",
    })
    setIsEditMode(true)
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setEditedData({})
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    
    try {
      const response = await fetch("/api/auth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: user.loginId,
          ...editedData,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success("Profile updated successfully!", {
          duration: 3000,
          icon: "✅",
        })
        // Refresh profile data
        fetchEmployeeProfile()
        setIsEditMode(false)
      } else {
        toast.error(data.message || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Error updating profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordErrors({})

    const errors = {}
    if (!oldPassword) errors.oldPassword = "Old password is required"
    if (!newPassword) errors.newPassword = "New password is required"
    else if (newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters"
    else if (!/(?=.*[a-z])/.test(newPassword)) errors.newPassword = "Must contain lowercase letter"
    else if (!/(?=.*[A-Z])/.test(newPassword)) errors.newPassword = "Must contain uppercase letter"
    else if (!/(?=.*\\d)/.test(newPassword)) errors.newPassword = "Must contain a number"

    if (!confirmPassword) errors.confirmPassword = "Please confirm your password"
    else if (newPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match"

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: user.loginId,
          oldPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Password changed successfully!", {
          duration: 3000,
          icon: "✅",
        })
        setOldPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast.error(data.message || "Failed to change password")
        if (data.message?.includes("incorrect")) {
          setPasswordErrors({ oldPassword: data.message })
        }
      }
    } catch (error) {
      console.error("Error changing password:", error)
      toast.error("Error changing password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </LayoutWrapper>
    )
  }

  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
  ]

  return (
    <LayoutWrapper>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and security settings
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "profile" && (
            <div className="bg-card border border-border rounded-lg p-8">
              {/* Header with Edit Button */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">Profile Information</h2>
                {!isEditMode ? (
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Edit2 size={18} />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <Save size={18} />
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <X size={18} />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Profile Avatar and Header */}
              <div className="flex items-center gap-6 mb-8 pb-8 border-b border-border">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg"
                  style={{ backgroundColor: employeeData?.avatarColor || "#8B5CF6" }}
                >
                  {employeeData?.avatar || user?.avatar || "U"}
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-foreground">{employeeData?.name || user?.name}</h3>
                  <p className="text-lg text-muted-foreground">{employeeData?.position || user?.role}</p>
                  {employeeData?.department && (
                    <p className="text-sm text-muted-foreground">{employeeData.department} Department</p>
                  )}
                </div>
              </div>

              {/* Profile Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee/Login ID - Not Editable */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <IdCard size={16} />
                    {user?.role === "Admin" ? "Login ID" : "Employee ID"}
                  </label>
                  <div className="px-4 py-3 bg-muted rounded-lg">
                    <p className="font-medium text-foreground">{employeeData?.id || user?.loginId}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">This field cannot be edited</p>
                </div>

                {/* Name - Editable */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <User size={16} />
                    Full Name
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editedData.name}
                      onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter your name"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-muted rounded-lg">
                      <p className="font-medium text-foreground">{employeeData?.name || user?.name}</p>
                    </div>
                  )}
                </div>

                {/* Email - Editable */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <Mail size={16} />
                    Email Address
                  </label>
                  {isEditMode ? (
                    <input
                      type="email"
                      value={editedData.email}
                      onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter your email"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-muted rounded-lg">
                      <p className="font-medium text-foreground">{employeeData?.email || user?.email}</p>
                    </div>
                  )}
                </div>

                {/* Phone - Editable */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <Phone size={16} />
                    Phone Number
                  </label>
                  {isEditMode ? (
                    <input
                      type="tel"
                      value={editedData.phone}
                      onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-muted rounded-lg">
                      <p className="font-medium text-foreground">{employeeData?.phone || user?.phone || "Not provided"}</p>
                    </div>
                  )}
                </div>

                {/* Department - Not Editable (for employees) */}
                {employeeData?.department && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <Briefcase size={16} />
                      Department
                    </label>
                    <div className="px-4 py-3 bg-muted rounded-lg">
                      <p className="font-medium text-foreground">{employeeData.department}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Contact admin to change department</p>
                  </div>
                )}

                {/* Position - Not Editable (for employees) */}
                {employeeData?.position && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <Briefcase size={16} />
                      Position
                    </label>
                    <div className="px-4 py-3 bg-muted rounded-lg">
                      <p className="font-medium text-foreground">{employeeData.position}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Contact admin to change position</p>
                  </div>
                )}

                {/* Company Name - Not Editable (for admin) */}
                {user?.role === "Admin" && user?.companyName && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <Building2 size={16} />
                      Company Name
                    </label>
                    <div className="px-4 py-3 bg-muted rounded-lg">
                      <p className="font-medium text-foreground">{user.companyName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">This field cannot be edited</p>
                  </div>
                )}

                {/* Role - Not Editable */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <Shield size={16} />
                    Role
                  </label>
                  <div className="px-4 py-3 bg-muted rounded-lg border-2 border-amber-500/50">
                    <p className="font-semibold text-foreground">{employeeData?.role || user?.role}</p>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                    🔒 Role is system-assigned and cannot be self-modified
                  </p>
                </div>

                {/* Join/Created Date - Not Editable */}
                {(employeeData?.createdAt || user?.createdAt) && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <Calendar size={16} />
                      {user?.role === "Admin" ? "Account Created" : "Join Date"}
                    </label>
                    <div className="px-4 py-3 bg-muted rounded-lg">
                      <p className="font-medium text-foreground">
                        {new Date(employeeData?.createdAt || user?.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">This field cannot be edited</p>
                  </div>
                )}
              </div>

              {/* About Section - Editable */}
              <div className="mt-6 pt-6 border-t border-border">
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <User size={16} />
                  About
                </label>
                {isEditMode ? (
                  <textarea
                    value={editedData.about}
                    onChange={(e) => setEditedData({ ...editedData, about: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <div className="px-4 py-3 bg-muted rounded-lg">
                    <p className="text-foreground">
                      {employeeData?.about || "No information provided yet."}
                    </p>
                  </div>
                )}
              </div>

              {/* Info Note */}
              {!isEditMode && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> You can edit your personal information like name, email, phone, and about section. 
                    Fields like Employee ID, Role, Department, and Position require administrator access to modify.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-card border border-border rounded-lg p-8 max-w-md">
              <h2 className="text-xl font-semibold mb-4">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Old Password</label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full border rounded-md px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-2 top-2"
                    >
                      {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordErrors.oldPassword && (
                    <p className="text-red-500 text-sm mt-1">{passwordErrors.oldPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border rounded-md px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-2"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border rounded-md px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-2"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full bg-primary text-white rounded-md py-2 mt-4"
                >
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
      <Toaster />
    </LayoutWrapper>
  )
}