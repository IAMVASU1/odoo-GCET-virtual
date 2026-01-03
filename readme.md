# WorkZen - Smart Human Resource Management System 💡

<p align="center">
  <img src="https.raw.githubusercontent.com/pavan-devmurari/workzen---smart-human-resource-management-system/Workzen---Smart-Human-Resource-Management-System-adb3a93c315a2088df20cda5cef096bb7e0addb9/public/apple-icon.png" alt="WorkZen Logo" width="150">
</p>

<p align="center">
  Simplifying HR operations for smarter workplaces.
  <br />
  <br />
  <img src="https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=nextdotjs" alt="Next.js">
  <img src="https://img.shields.io/badge/Prisma-6.19-blueviolet?style=for-the-badge&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.1-cyan?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS">
</p>

---

## 🚀 Vision

WorkZen aims to modernize and simplify how organizations manage people, processes, and payroll through a comprehensive, all-in-one Human Resource Management System (HRMS). The platform is designed to provide a clean, reliable, and user-friendly experience for both employees and administrators, reducing manual dependency and empowering data-driven workforce decisions.

This project was built for a hackathon based on the **[WorkZen HRMS Problem Statement](https://github.com/pavan-devmurari/workzen---smart-human-resource-management-system/blob/Workzen---Smart-Human-Resource-Management-System-adb3a93c315a2088df20cda5cef096bb7e0addb9/02%20_WorkZen_HRMS_Problem_Statement.pdf)**.

## ✨ Key Features

The system is built with a modular approach, focusing on the core pillars of HR management:

* 👤 **User & Role Management:** Secure JWT authentication with role-based access control. Admins can create, update, and manage all user accounts, assigning specific roles and permissions.
* 🕒 **Attendance Management:** A real-time system for employees to check-in and check-out. Attendance is automatically tracked, and managers/admins can monitor daily and monthly logs for all employees.
* ✈️ **Leave Management:** A complete workflow for leave applications. Employees can request time-off, and managers or HR officers can approve or reject requests, with statuses updated in real-time.
* 💸 **Payroll Management:** A module for admins and payroll officers to create and manage monthly payroll records. It includes status tracking (Pending, Processing, Paid) and is tied to user data.
* 📊 **Dashboard & Analytics:** A central dashboard providing a high-level overview of key HR metrics. (Includes placeholders for charts on attendance, leave, and payroll).
* 🔐 **Secure API:** A backend built with Next.js API routes, using Prisma for database operations and `bcrypt` for password hashing to ensure data integrity and security.

## 📸 Screenshots

*(Add your screenshots here! This is the most important part for judges.)*

| Login Page | Employee Dashboard |
| :---: | :---: |
| *(Your Screenshot)* | *(Your Screenshot)* |
| **Manage Users (Admin)** | **Payroll Management** |
| *(Your Screenshot)* | *(Your Screenshot)* |
| **Leave Management** | **Attendance Page** |
| *(Your Screenshot)* | *(Your Screenshot)* |

## 💻 Tech Stack

WorkZen is built with a modern, scalable, and type-safe stack:

| Category | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router) |
| **Language** | JavaScript (ESM) & TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Authentication** | JWT (jsonwebtoken) & `bcryptjs` for hashing |
| **Styling** | Tailwind CSS 4.0 |
| **UI Components** | shadcn/ui (using Radix UI) |
| **Animations** | Framer Motion |
| **Data Visualization** | Recharts |
| **Form Handling** | React Hook Form & Zod |
| **State Management** | React Context (for Auth & Sidebar) |
| **Package Manager** | pnpm |

## 🕹️ Roles & Permissions

The system enforces strict role-based access control as per the problem statement:

| Role | Responsibilities |
| :--- | :--- |
| 👑 **Admin** | Full system access. Manages user accounts, roles, and all modules. |
| 👤 **Employee** | Can mark attendance, apply for leave, and view personal records. No access to settings or others' payroll. |
| 📋 **HR Officer** | Manages employee profiles, monitors attendance, and manages/approves leaves. No access to payroll data. |
| 💰 **Payroll Officer** | Manages payroll, generates payslips, and approves time-off requests. Can view attendance but cannot modify user data. |

## ⚙️ Getting Started

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/pavan-devmurari/workzen---smart-human-resource-management-system.git](https://github.com/pavan-devmurari/workzen---smart-human-resource-management-system.git)
    cd workzen---smart-human-resource-management-system
    ```

2.  **Install dependencies:**
    *(This project uses `pnpm`. Install it with `npm install -g pnpm` if you don't have it.)*
    ```bash
    pnpm install
    ```

3.  **Set up environment variables:**
    Copy the example `.env` file and fill in your details.
    ```bash
    cp .env.example .env
    ```
    You **must** update the `DATABASE_URL` for your PostgreSQL database and set a `JWT_SECRET`.

    ```env
    # .env
    DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/workzen_db"
    JWT_SECRET="your-super-secret-key-that-is-at-least-32-chars-long"
    ```

4.  **Run database migrations:**
    This will set up all the tables in your database as defined in `prisma/schema.prisma`.
    ```bash
    pnpm exec prisma migrate dev
    ```

5.  **Run the development server:**
    ```bash
    pnpm run dev
    ```
    The application will be available at `http://localhost:3000`.

6.  **(Optional) Seed the database:**
    To create default test users, visit the following URL in your browser *after* starting the server:
    **[http://localhost:3000/api/seed](http://localhost:3000/api/seed)**

    This will create three initial users: an Admin, a Manager, and an Employee.

## 🧑‍💻 Demo Credentials

You can use the following accounts (created by the seed script) to test the different roles:

| Role | Email | Password |
| :--- | :--- | :--- |
| 👑 **Admin** | `admin@workzen.com` | `admin123` |
| 👔 **Manager** | `ananya@workzen.com` | `password123` |
| 👤 **Employee** | `rohit@workzen.com` | `password123` |

---

