"use client"

import { motion } from "framer-motion"
import { useAuth } from "@/app/context/auth-context"
import { useSidebar } from "@/app/context/sidebar-context"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, Users, Clock, Calendar, Banknote, BarChart3, Settings, UserCog, Wallet } from "lucide-react"

// Main navigation menu items visible to all users
const menuItems = [
  { icon: Users, label: "Dashboard", href: "/dashboard", roles: ['Admin', 'Manager', 'Employee', 'HR Officer', 'Payroll Officer'] },
  { icon: Clock, label: "Attendance", href: "/attendance", roles: ['Admin', 'Manager', 'Employee', 'HR Officer', 'Payroll Officer'] },
  { icon: Calendar, label: "Time Off", href: "/leave", roles: ['Admin', 'Manager', 'Employee', 'HR Officer', 'Payroll Officer'] },
  { icon: Wallet, label: "My Payroll", href: "/my-payroll", roles: ['Employee'] },
  { icon: Banknote, label: "Payroll", href: "/payroll", roles: ['Admin', 'Manager', 'Payroll Officer'] },
  { icon: BarChart3, label: "Reports", href: "/reports", roles: ['Admin', 'Manager', 'HR Officer'] },
]

// Admin/Manager/HR Officer menu items
const adminMenuItems = [
  { icon: UserCog, label: "Manage Users", href: "/users", roles: ['Admin', 'Manager', 'HR Officer'] },
  { icon: Settings, label: "Settings", href: "/settings", roles: ['Admin', 'Manager'] },
]

/**
 * Sidebar Component
 * Left navigation sidebar with company branding and menu items
 * Shows/hides based on sidebar state and animates smoothly
 */
export function Sidebar() {
  const { user } = useAuth() // Get current user info to check role
  const { isOpen } = useSidebar() // Get sidebar open/closed state
  const pathname = usePathname() // Get current route to highlight active menu item

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: isOpen ? 0 : -300 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-16 bottom-0 w-64 bg-card border-r border-border shadow-sm overflow-y-auto z-30"
    >
      {/* Company Logo and Name */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          {user?.logo ? (
            <img src={user.logo} alt="Company Logo" className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
          )}
          <div>
            <h2 className="font-bold text-foreground">{user?.companyName || "DayFlow"}</h2>
            <p className="text-xs text-muted-foreground">{user?.role || "User"}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 space-y-2">
        {menuItems
          .filter(item => !item.roles || item.roles.includes(user?.role))
          .map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                  }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}

        {/* Admin-only section */}
        {(user?.role === "Admin" || user?.role === "Manager" || user?.role === "HR Officer") && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {user?.role === "HR Officer" ? "HR Tools" : "Admin Tools"}
              </p>
            </div>
            {adminMenuItems
              .filter(item => !item.roles || item.roles.includes(user?.role))
              .map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
          </>
        )}
      </nav>
    </motion.aside>
  )
}
