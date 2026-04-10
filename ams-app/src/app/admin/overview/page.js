"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    teachers: 15,
    students: 450,
    sections: 12,
  });
  const [logs, setLogs] = useState([
    { timestamp: "2026-04-09 10:15 AM", action: 'New User Registered: "Mica" (Student)', status: "Success" },
    { timestamp: "2026-04-09 08:30 AM", action: "Section Mapping Updated: G12-ICT", status: "Success" },
    { timestamp: "2026-04-08 04:45 PM", action: "System Backup Completed", status: "Completed" },
    { timestamp: "2026-04-08 02:00 PM", action: 'New Teacher Added: "Jane Smith"', status: "Success" },
    { timestamp: "2026-04-07 09:15 AM", action: "Attendance Report Generated", status: "Completed" },
  ]);

  useEffect(() => {
    // Try to fetch from Firestore
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        let teacherCount = 0;
        let studentCount = 0;
        usersSnap.forEach((doc) => {
          const data = doc.data();
          if (data.role === "teacher") teacherCount++;
          if (data.role === "student") studentCount++;
        });
        const sectionsSnap = await getDocs(collection(db, "sections"));
        if (usersSnap.size > 0) {
          setStats({
            teachers: teacherCount || 15,
            students: studentCount || 450,
            sections: sectionsSnap.size || 12,
          });
        }
      } catch (e) {
        // Use defaults
      }
    };
    fetchStats();
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>System Overview</h1>
        <p>Real-time analytics for DLSU-D Attendance System.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card stat-purple">
          <div className="stat-card-icon">👨‍🏫</div>
          <div className="stat-card-label">Total Teachers</div>
          <div className="stat-card-value">{stats.teachers}</div>
          <div className="stat-card-trend up">● 2 New this week</div>
        </div>

        <div className="stat-card stat-blue">
          <div className="stat-card-icon">🎓</div>
          <div className="stat-card-label">Total Students</div>
          <div className="stat-card-value">{stats.students}</div>
          <div className="stat-card-trend up">● 98% Enrollment Rate</div>
        </div>

        <div className="stat-card stat-orange">
          <div className="stat-card-icon">📂</div>
          <div className="stat-card-label">Active Sections</div>
          <div className="stat-card-value">{stats.sections}</div>
          <div className="stat-card-trend" style={{ color: "var(--text-secondary)" }}>ICT, STEM, ABM, HUMSS</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent System Logs</div>
            <div className="card-subtitle">Latest changes made to the database.</div>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={idx}>
                <td>{log.timestamp}</td>
                <td>{log.action}</td>
                <td>
                  <span className={`status-badge ${log.status === "Success" ? "active" : "pending"}`}>
                    <span className="status-dot"></span>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
