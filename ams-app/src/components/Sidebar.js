"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";

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
          { href: "/teacher/excuse-letters", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>, label: "Excuse Letters" },
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
          { href: "/student/excuse-letters", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>, label: "Excuse Letters" },
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

export default function Sidebar({ role, isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const config = navConfigs[role];
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { logout, user, userRole } = useAuth();

  // Track screen size for mobile behavior
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      // If teacher, end all active sessions before logout
      if (userRole === 'teacher' && user?.uid) {
        try {
          const sessionsQuery = query(
            collection(db, 'sessions'),
            where('teacherId', '==', user.uid),
            where('active', '==', true)
          );
          const sessionsSnap = await getDocs(sessionsQuery);
          const now = new Date();
          const today = now.toISOString().split('T')[0];

          for (const sessionDoc of sessionsSnap.docs) {
            const sessionData = sessionDoc.data();

            // Mark session as inactive
            await updateDoc(doc(db, 'sessions', sessionDoc.id), {
              active: false,
              endTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              endedAt: now.toISOString(),
            });

            // Mark absent students who didn't attend this session
            const sectionId = sessionData.sectionId;
            if (sectionId) {
              // Get attendance records for this session
              const attendanceQuery = query(
                collection(db, 'attendance'),
                where('sessionId', '==', sessionDoc.id),
                where('date', '==', today)
              );
              const attendanceSnap = await getDocs(attendanceQuery);
              const presentStudentIds = new Set();
              attendanceSnap.forEach((d) => presentStudentIds.add(d.data().studentId));

              // Get enrolled students for this section
              const sectionDocSnap = await getDocs(query(
                collection(db, 'sections'),
                where('__name__', '==', sectionId)
              ));
              // Fallback: try direct doc get
              let enrolledStudents = [];
              if (!sectionDocSnap.empty) {
                enrolledStudents = sectionDocSnap.docs[0].data().students || [];
              }

              for (const studentId of enrolledStudents) {
                if (!presentStudentIds.has(studentId)) {
                  await addDoc(collection(db, 'attendance'), {
                    studentId: studentId,
                    studentName: studentId,
                    subjectId: sessionData.subjectId || '',
                    subjectCode: sessionData.subjectCode || '',
                    sectionId: sectionId,
                    sessionId: sessionDoc.id,
                    date: today,
                    timestamp: now.toISOString(),
                    timeMarked: '—',
                    status: 'Absent',
                    method: 'auto',
                  });
                }
              }
            }
          }
        } catch (sessionErr) {
          console.error('Error ending sessions on logout:', sessionErr);
          // Continue with logout even if session cleanup fails
        }
      }

      await logout();
    } catch (e) {
      // Ignore errors
    }
    router.push("/login");
  };

  // Close sidebar on mobile when a link is clicked
  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  if (!config) return null;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div className="sidebar-overlay" onClick={onClose}></div>
      )}

      <aside className={`sidebar ${collapsed && !isMobile ? "sidebar-collapsed" : ""} ${isMobile && isOpen ? "sidebar-mobile-open" : ""}`}>
        {/* Logo Area */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">{config.icon}</div>
            {(!collapsed || isMobile) && (
              <div>
                <span className="sidebar-logo-text">{config.title}</span>
                <span className="sidebar-logo-role">{config.role}</span>
              </div>
            )}
          </div>
          {/* Collapse button (desktop only) */}
          {!isMobile && (
            <button
              className="sidebar-collapse-btn"
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Toggle sidebar"
            >
              {collapsed ? "›" : "‹"}
            </button>
          )}
          {/* Close button (mobile only) */}
          {isMobile && (
            <button
              className="sidebar-close-btn"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {config.sections.map((section, idx) => (
            <div key={idx}>
              {(!collapsed || isMobile) && <div className="sidebar-nav-label">{section.label}</div>}
              {section.links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`sidebar-link ${isActive ? "active" : ""}`}
                    title={collapsed && !isMobile ? link.label : undefined}
                    onClick={handleLinkClick}
                  >
                    <span className="sidebar-link-icon">{link.icon}</span>
                    {(!collapsed || isMobile) && <span className="sidebar-link-text">{link.label}</span>}
                    {isActive && <span className="sidebar-active-indicator"></span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-logout sidebar-link" onClick={handleLogout} title={collapsed && !isMobile ? "Logout" : undefined}>
            <span className="sidebar-link-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#4A7C59" }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </span>
            {(!collapsed || isMobile) && <span className="sidebar-link-text">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
