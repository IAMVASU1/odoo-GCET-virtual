"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/context/auth-context"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { DataTable } from "@/components/data-table"
import { motion } from "framer-motion"
import { Trash2, Edit2, UserPlus, X, Save, Mail, Phone, User, Briefcase, Building2, Shield, IndianRupee, Eye, EyeOff, Search } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"
import { useRouter } from "next/navigation"

export default function Users() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    role: "Employee",
    salary: "",
    password: "",
  })
  
  const [formErrors, setFormErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showCustomRole, setShowCustomRole] = useState(false)
  const [customRole, setCustomRole] = useState("")
  
  // Department management
  const [departments, setDepartments] = useState([
    "Engineering",
    "Marketing",
    "Sales",
    "HR",
    "Finance",
    "Operations",
    "Customer Support"
  ])
  const [showCustomDepartment, setShowCustomDepartment] = useState(false)
  const [newDepartment, setNewDepartment] = useState("")

  useEffect(() => {
    // Only admins, managers and HR officers can access this page
    if (user && user.role !== "Admin" && user.role !== "Manager" && user.role !== "HR Officer") {
      toast.error("Access denied. Only admins, managers and HR officers can manage users.")
      router.push("/dashboard")
      return
    }
    
    if (user) {
      fetchEmployees()
    }
  }, [user, router])

  const fetchEmployees = async () => {
    try {
      const authToken = localStorage.getItem('authToken')
      const response = await fetch(`/api/users`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (data.success) {
        setEmployees(data.data)
        setFilteredEmployees(data.data)
      } else {
        toast.error(data.error || "Failed to load employees")
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
      toast.error("Failed to load employees")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredEmployees(employees)
      return
    }
    
    const filtered = employees.filter((emp) => {
      const searchLower = query.toLowerCase()
      return (
        emp.name.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower) ||
        emp.department.toLowerCase().includes(searchLower) ||
        emp.position.toLowerCase().includes(searchLower) ||
        emp.id.toLowerCase().includes(searchLower)
      )
    })
    setFilteredEmployees(filtered)
  }

  const generateEmployeeId = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0")
    return `EMP${timestamp}${random}`
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.name.trim()) errors.name = "Name is required"
    
    if (!formData.email.trim()) errors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Invalid email format"
    
    // Phone is optional
    if (formData.phone && !/^\+?[\d\s-]{10,}$/.test(formData.phone)) errors.phone = "Invalid phone number"
    
    if (!formData.department.trim()) errors.department = "Department is required"
    // Position is optional
    
    // Validate custom role if selected
    if (showCustomRole && !customRole.trim()) {
      errors.role = "Custom role name is required"
    }
    
    // Password is only required when creating a new employee
    if (!editingEmployee) {
      if (!formData.password) errors.password = "Password is required"
      else if (formData.password.length < 6) errors.password = "Password must be at least 6 characters"
    }
    
    if (formData.salary && isNaN(formData.salary)) errors.salary = "Salary must be a number"
    
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormErrors({})
    
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    
    setIsSubmitting(true)
    
    try {
      if (editingEmployee) {
        // Update existing employee
        const authToken = localStorage.getItem('authToken')
        const finalRole = showCustomRole && customRole.trim() ? customRole.trim() : formData.role
        const updateData = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          role: finalRole,
          department: formData.department.trim(),
        }
        
        const response = await fetch(`/api/users?id=${editingEmployee.id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(updateData),
        })
        
        const data = await response.json()
        
        if (data.success) {
          toast.success("Employee updated successfully!", {
            duration: 3000,
            icon: "✅",
          })
          setShowForm(false)
          setEditingEmployee(null)
          setFormData({
            name: "",
            email: "",
            phone: "",
            department: "",
            position: "",
            role: "Employee",
            salary: "",
            password: "",
          })
          fetchEmployees()
        } else {
          toast.error(data.message || "Failed to update employee")
        }
      } else {
        // Create new employee
        const authToken = localStorage.getItem('authToken')
        const finalRole = showCustomRole && customRole.trim() ? customRole.trim() : formData.role
        const employeeData = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: finalRole,
          department: formData.department.trim(),
        }
        
        const response = await fetch("/api/users", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(employeeData),
        })
        
        const data = await response.json()
        
        if (data.success) {
          toast.success("Employee created successfully!", {
            duration: 3000,
            icon: "✅",
          })
          setShowForm(false)
          setFormData({
            name: "",
            email: "",
            phone: "",
            department: "",
            position: "",
            role: "Employee",
            salary: "",
            password: "",
          })
          fetchEmployees()
        } else {
          toast.error(data.error || data.message || "Failed to create employee")
        }
      }
    } catch (error) {
      console.error("Error saving employee:", error)
      toast.error(error.message || "Error saving employee")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const handleEdit = (employee) => {
    setEditingEmployee(employee)
    
    // Check if the role is a custom role (not in predefined list)
    const predefinedRoles = ["Employee", "Manager", "Admin", "HR Officer", "Payroll Officer"]
    const isCustomRole = !predefinedRoles.includes(employee.role)
    
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      role: isCustomRole ? "Custom" : employee.role,
      salary: employee.salary?.toString() || "",
      password: "",
    })
    
    if (isCustomRole) {
      setShowCustomRole(true)
      setCustomRole(employee.role)
    } else {
      setShowCustomRole(false)
      setCustomRole("")
    }
    
    setShowForm(true)
  }

  const handleDelete = async (employee) => {
    if (!confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone.`)) {
      return
    }
    
    try {
      const authToken = localStorage.getItem('authToken')
      const response = await fetch(`/api/users?id=${employee.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success("Employee deleted successfully!", {
          duration: 3000,
          icon: "🗑️",
        })
        fetchEmployees()
      } else {
        toast.error(data.error || "Failed to delete employee")
      }
    } catch (error) {
      console.error("Error deleting employee:", error)
      toast.error("Error deleting employee")
    }
  }

  const handleCancelEdit = () => {
    setShowForm(false)
    setEditingEmployee(null)
    setFormData({
      name: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      role: "Employee",
      salary: "",
      password: "",
    })
    setFormErrors({})
    setShowCustomRole(false)
    setCustomRole("")
    setShowCustomDepartment(false)
    setNewDepartment("")
  }

  // Add new department
  const handleAddDepartment = () => {
    if (newDepartment.trim()) {
      if (departments.includes(newDepartment.trim())) {
        toast.error("Department already exists")
        return
      }
      setDepartments([...departments, newDepartment.trim()])
      setFormData({ ...formData, department: newDepartment.trim() })
      setNewDepartment("")
      setShowCustomDepartment(false)
      toast.success("Department added successfully!")
    }
  }

  // Remove department
  const handleRemoveDepartment = (deptToRemove) => {
    if (!confirm(`Are you sure you want to remove "${deptToRemove}" department?`)) {
      return
    }
    
    // Check if any employee is using this department
    const isUsed = employees.some(emp => emp.department === deptToRemove)
    if (isUsed) {
      toast.error("Cannot remove department. It is assigned to one or more employees.")
      return
    }
    
    setDepartments(departments.filter(dept => dept !== deptToRemove))
    toast.success("Department removed successfully!")
  }

  // Debug logging

  // Show loading spinner while checking auth or loading employees
  if (authLoading || loading) {
    return (
      <LayoutWrapper>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </LayoutWrapper>
    )
  }

  // If user is not logged in or not authorized, don't render (useEffect will redirect)
  if (!user || (user.role !== "Admin" && user.role !== "Manager" && user.role !== "HR Officer")) {

    return null
  }

  const headers = ["ID", "Name", "Email", "Department", "Position", "Status", "Actions"]
  const rows = filteredEmployees.map((emp) => [
    emp.id,
    <div key={emp.id} className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
        style={{ backgroundColor: emp.avatarColor || "#8B5CF6" }}
      >
        {emp.avatar}
      </div>
      <span>{emp.name}</span>
    </div>,
    emp.email,
    emp.department,
    emp.position,
    <span
      key={emp.id}
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        emp.status === "present"
          ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
      }`}
    >
      {emp.status}
    </span>,
    <div key={emp.id} className="flex gap-2">
      <button 
        onClick={() => handleEdit(emp)}
        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors text-blue-600 dark:text-blue-400"
        title="Edit employee"
      >
        <Edit2 size={16} />
      </button>
      <button 
        onClick={() => handleDelete(emp)}
        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors text-red-600 dark:text-red-400"
        title="Delete employee"
      >
        <Trash2 size={16} />
      </button>
    </div>,
  ])

  return (
    <LayoutWrapper>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
            <p className="text-muted-foreground">Manage employees and their information</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search employees..."
                className="pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-64"
              />
            </div>
            {/* Add Employee Button */}
            <button
              onClick={() => {
                if (showForm) {
                  handleCancelEdit()
                } else {
                  setShowForm(true)
                }
              }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {showForm ? <X size={18} /> : <UserPlus size={18} />}
              {showForm ? "Close" : "Add Employee"}
            </button>
          </div>
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-foreground">
                {editingEmployee ? "Edit Employee" : "Add New Employee"}
              </h3>
              <p className="text-sm text-muted-foreground">All fields marked with * are required</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <User size={16} />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      formErrors.name ? "border-red-500" : "border-border"
                    }`}
                    placeholder="Enter full name"
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Mail size={16} />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      formErrors.email ? "border-red-500" : "border-border"
                    }`}
                    placeholder="employee@company.com"
                  />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Phone size={16} />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      formErrors.phone ? "border-red-500" : "border-border"
                    }`}
                    placeholder="+91 9876543210"
                  />
                  {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
                </div>

                {/* Department */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Building2 size={16} />
                    Department *
                  </label>
                  
                  {!showCustomDepartment ? (
                    <div className="space-y-2">
                      <select
                        value={formData.department}
                        onChange={(e) => {
                          if (e.target.value === "__add_new__") {
                            setShowCustomDepartment(true)
                          } else {
                            handleInputChange("department", e.target.value)
                          }
                        }}
                        className={`w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                          formErrors.department ? "border-red-500" : "border-border"
                        }`}
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                        <option value="__add_new__">+ Add New Department</option>
                      </select>
                      
                      {/* Show remove button for selected department if admin */}
                      {formData.department && user?.role === "Admin" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDepartment(formData.department)}
                          className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                          <X size={12} />
                          Remove "{formData.department}" from list
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newDepartment}
                          onChange={(e) => setNewDepartment(e.target.value)}
                          className="flex-1 px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Enter new department name"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddDepartment()
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddDepartment}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomDepartment(false)
                            setNewDepartment("")
                          }}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {formErrors.department && <p className="text-red-500 text-xs mt-1">{formErrors.department}</p>}
                </div>

                {/* Position */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Briefcase size={16} />
                    Position *
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => handleInputChange("position", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      formErrors.position ? "border-red-500" : "border-border"
                    }`}
                    placeholder="e.g., Senior Developer"
                  />
                  {formErrors.position && <p className="text-red-500 text-xs mt-1">{formErrors.position}</p>}
                </div>

                {/* Role */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Shield size={16} />
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const selectedRole = e.target.value
                      handleInputChange("role", selectedRole)
                      if (selectedRole === "Custom") {
                        setShowCustomRole(true)
                      } else {
                        setShowCustomRole(false)
                        setCustomRole("")
                      }
                    }}
                    className={`w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      formErrors.role ? "border-red-500" : "border-border"
                    }`}
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="HR Officer">HR Officer</option>
                    <option value="Payroll Officer">Payroll Officer</option>
                    <option value="Custom">+ Add Custom Role</option>
                  </select>
                  {formErrors.role && <p className="text-red-500 text-xs mt-1">{formErrors.role}</p>}
                </div>

                {/* Custom Role Input - Shows when Custom is selected */}
                {showCustomRole && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                      <Shield size={16} />
                      Custom Role Name *
                    </label>
                    <input
                      type="text"
                      value={customRole}
                      onChange={(e) => {
                        setCustomRole(e.target.value)
                        if (formErrors.role) {
                          setFormErrors(prev => ({ ...prev, role: "" }))
                        }
                      }}
                      className={`w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                        formErrors.role ? "border-red-500" : "border-border"
                      }`}
                      placeholder="e.g., Team Lead, Supervisor, Consultant"
                    />
                    {formErrors.role && <p className="text-red-500 text-xs mt-1">{formErrors.role}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter a custom role name for this employee
                    </p>
                  </div>
                )}

                {/* Salary */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <IndianRupee size={16} />
                    Salary (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={(e) => handleInputChange("salary", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      formErrors.salary ? "border-red-500" : "border-border"
                    }`}
                    placeholder="50000"
                  />
                  {formErrors.salary && <p className="text-red-500 text-xs mt-1">{formErrors.salary}</p>}
                </div>

                {/* Password */}
                {!editingEmployee && (
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                      <Shield size={16} />
                      Initial Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className={`w-full px-4 py-3 pr-12 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                          formErrors.password ? "border-red-500" : "border-border"
                        }`}
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Password must be at least 8 characters with uppercase, lowercase, and number
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-3 border border-border rounded-lg font-medium text-foreground hover:bg-muted transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {editingEmployee ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {editingEmployee ? "Update Employee" : "Create Employee"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredEmployees.length}</span> of{" "}
            <span className="font-semibold text-foreground">{employees.length}</span> employees
            {searchQuery && (
              <span className="ml-2">
                matching "<span className="font-semibold text-primary">{searchQuery}</span>"
              </span>
            )}
          </p>
        </div>

        <DataTable headers={headers} rows={rows} />
      </motion.div>
      <Toaster />
    </LayoutWrapper>
  )
}
