import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "./context/auth-context"
import { SidebarProvider } from "./context/sidebar-context"
import "./globals.css"

// Load Google Fonts for the application
const _geist = Geist({ subsets: ["latin"] }) // Primary font
const _geistMono = Geist_Mono({ subsets: ["latin"] }) // Monospace font for code

/**
 * Metadata Configuration
 * Sets page title, description, and favicon for the application
 * Used by Next.js for SEO and browser tab display
 */
export const metadata = {
  title: "WorkZen - HRMS",
  description: "Smart Human Resource Management System",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)", // Light mode icon
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)", // Dark mode icon
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml", // SVG fallback
      },
    ],
    apple: "/apple-icon.png", // iOS home screen icon
  },
}

/**
 * RootLayout Component
 * Top-level layout that wraps the entire application
 * Sets up global context providers for authentication and sidebar state
 * 
 * @param {Object} children - All page components render as children
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {/* AuthProvider: Makes user authentication state available everywhere */}
        <AuthProvider>
          {/* SidebarProvider: Makes sidebar open/close state available everywhere */}
          <SidebarProvider>
            {children} {/* Renders the current page component */}
            <Analytics /> {/* Vercel Analytics for tracking page views */}
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
