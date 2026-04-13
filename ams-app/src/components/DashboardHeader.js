"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";

const pageTitles = {
  "/admin/overview": { title: "System Overview", breadcrumb: "Admin" },
  "/admin/users": { title: "User Management", breadcrumb: "Admin" },
  "/admin/mapping": { title: "Section Mapping", breadcrumb: "Admin" },
  "/admin/profile": { title: "Profile", breadcrumb: "Admin" },
  "/teacher/dashboard": { title: "Class Attendance", breadcrumb: "Teacher" },
  "/teacher/schedule": { title: "Class Schedule", breadcrumb: "Teacher" },
  "/teacher/reports": { title: "Reports", breadcrumb: "Teacher" },
  "/teacher/profile": { title: "Profile", breadcrumb: "Teacher" },
  "/student/attendance": { title: "My Attendance", breadcrumb: "Student" },
  "/student/schedule": { title: "Schedule", breadcrumb: "Student" },
  "/student/profile": { title: "Profile", breadcrumb: "Student" },
};

export default function DashboardHeader() {
  const pathname = usePathname();
  const pageInfo = pageTitles[pathname] || { title: "Dashboard", breadcrumb: "" };
  const [searchOpen, setSearchOpen] = useState(false);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good Morning" : now.getHours() < 17 ? "Good Afternoon" : "Good Evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-left">
        <div className="dashboard-breadcrumb">
          <span className="breadcrumb-home"></span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-parent">{pageInfo.breadcrumb}</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{pageInfo.title}</span>
        </div>
        <div className="dashboard-header-greeting">
          {greeting}!
          <span className="header-date">{dateStr}</span>
        </div>
      </div>

      <div className="dashboard-header-right">
        <div className={`header-search ${searchOpen ? "open" : ""}`}>
          <button className="header-icon-btn" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search">

          </button>
          {searchOpen && (
            <input
              type="text"
              className="header-search-input"
              placeholder="Search..."
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          )}
        </div>
        <button className="header-icon-btn" aria-label="Notifications">

          <span className="header-badge">3</span>
        </button>
        <button className="header-icon-btn" aria-label="Messages">
          ✉️
        </button>
        <div className="header-avatar">
          <div className="header-avatar-circle">G</div>
        </div>
      </div>
    </header>
  );
}
