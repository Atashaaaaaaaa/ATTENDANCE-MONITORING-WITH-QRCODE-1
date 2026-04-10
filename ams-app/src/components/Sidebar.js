"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // Ignore errors
    }
    router.push("/login");
  };

  if (!config) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">{config.icon}</div>
          <div>
            <span className="sidebar-logo-text">{config.title}</span>
            <span className="sidebar-logo-role">{config.role}</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {config.sections.map((section, idx) => (
          <div key={idx}>
            <div className="sidebar-nav-label">{section.label}</div>
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`sidebar-link ${pathname === link.href ? "active" : ""}`}
              >
                <span className="sidebar-link-icon">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={handleLogout}>
          <span className="sidebar-link-icon">🚪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
