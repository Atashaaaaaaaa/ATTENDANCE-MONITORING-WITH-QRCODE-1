"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const navConfigs = {
  admin: {
    title: "AMS",
    role: "Admin Panel",
    icon: <img src="/green-squares.png" alt="icon" style={{width: "24px", height: "24px", objectFit: "contain"}} />,
    sections: [
      {
        label: "Main",
        links: [
          { href: "/admin/overview", icon: <img src="/green-laptop.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "System Overview" },
          { href: "/admin/users", icon: <img src="/green-people.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "User Management" },
          { href: "/admin/mapping", icon: <img src="/green-map.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "Section Mapping" },
        ],
      },
      {
        label: "Account",
        links: [
          { href: "/admin/profile", icon: <img src="/green-profile.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "Profile" },
        ],
      },
    ],
  },
  teacher: {
    title: "AMS",
    role: "Teacher Portal",
    icon: <img src="/green-squares.png" alt="icon" style={{width: "24px", height: "24px", objectFit: "contain"}} />,
    sections: [
      {
        label: "Attendance",
        links: [
          { href: "/teacher/dashboard", icon: <img src="/green-time-card.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "Class Attendance" },
          { href: "/teacher/schedule", icon: <img src="/green-calendar.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "Class Schedule" },
          { href: "/teacher/reports", icon: <img src="/green-report.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "Reports" },
        ],
      },
      {
        label: "Management",
        links: [
          { href: "/teacher/mapping", icon: <img src="/green-map.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "Section Mapping" },
          { href: "/teacher/students", icon: <img src="/green-squares.png" alt="icon" style={{width: "24px", height: "24px", objectFit: "contain"}} />, label: "My Students" },
        ],
      },
      {
        label: "Account",
        links: [
          { href: "/teacher/profile", icon: <img src="/green-profile.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "Profile" },
        ],
      },
    ],
  },
  student: {
    title: "AMS",
    role: "Student Portal",
    icon: <img src="/green-squares.png" alt="icon" style={{width: "24px", height: "24px", objectFit: "contain"}} />,
    sections: [
      {
        label: "My Classes",
        links: [
          { href: "/student/attendance", icon: <img src="/green-time-card.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "My Attendance" },
          { href: "/student/schedule", icon: <img src="/green-calendar.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "Schedule" },
        ],
      },
      {
        label: "Account",
        links: [
          { href: "/student/profile", icon: <img src="/green-profile.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "Profile" },
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
          <span className="sidebar-link-icon"><img src="/green-logout.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} /></span>
          {!collapsed && "Logout"}
        </button>
      </div>
    </aside>
  );
}
