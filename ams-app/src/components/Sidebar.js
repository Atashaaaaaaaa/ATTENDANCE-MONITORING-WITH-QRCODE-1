"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const navConfigs = {
  admin: {
    title: "AMS",
    role: "Admin Panel",
    icon: "⚡",
    sections: [
      {
        label: "Main",
        links: [
          { href: "/admin/overview", icon: "📊", label: "System Overview" },
          { href: "/admin/users", icon: "👥", label: "User Management" },
          { href: "/admin/mapping", icon: "🔗", label: "Section Mapping" },
        ],
      },
      {
        label: "Account",
        links: [
          { href: "/admin/profile", icon: "👤", label: "Profile" },
        ],
      },
    ],
  },
  teacher: {
    title: "AMS",
    role: "Teacher Portal",
    icon: "📚",
    sections: [
      {
        label: "Attendance",
        links: [
          { href: "/teacher/dashboard", icon: "📋", label: "Class Attendance" },
          { href: "/teacher/schedule", icon: "📅", label: "Class Schedule" },
          { href: "/teacher/reports", icon: "📈", label: "Reports" },
        ],
      },
      {
        label: "Account",
        links: [
          { href: "/teacher/profile", icon: "👤", label: "Profile" },
        ],
      },
    ],
  },
  student: {
    title: "AMS",
    role: "Student Portal",
    icon: "🎓",
    sections: [
      {
        label: "My Classes",
        links: [
          { href: "/student/attendance", icon: "✅", label: "My Attendance" },
          { href: "/student/schedule", icon: "📅", label: "Schedule" },
        ],
      },
      {
        label: "Account",
        links: [
          { href: "/student/profile", icon: "👤", label: "Profile" },
        ],
      },
    ],
  },
};

export default function Sidebar({ role }) {
  const pathname = usePathname();
  const router = useRouter();
  const config = navConfigs[role];
  const [collapsed, setCollapsed] = useState(false);

  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      // Ignore errors
    }
    router.push("/login");
  };

  if (!config) return null;

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Logo Area */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">{config.icon}</div>
          {!collapsed && (
            <div>
              <span className="sidebar-logo-text">{config.title}</span>
              <span className="sidebar-logo-role">{config.role}</span>
            </div>
          )}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {config.sections.map((section, idx) => (
          <div key={idx}>
            {!collapsed && <div className="sidebar-nav-label">{section.label}</div>}
            {section.links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`sidebar-link ${isActive ? "active" : ""}`}
                  title={collapsed ? link.label : undefined}
                >
                  <span className="sidebar-link-icon">{link.icon}</span>
                  {!collapsed && <span className="sidebar-link-text">{link.label}</span>}
                  {isActive && <span className="sidebar-active-indicator"></span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={handleLogout} title={collapsed ? "Logout" : undefined}>
          <span className="sidebar-link-icon">🚪</span>
          {!collapsed && "Logout"}
        </button>
      </div>
    </aside>
  );
}
