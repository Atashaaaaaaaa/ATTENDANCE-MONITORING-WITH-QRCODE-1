"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    sections: 0,
  });
  const [logs, setLogs] = useState([]);

  useEffect(() => {
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
        setStats({
          teachers: teacherCount,
          students: studentCount,
          sections: sectionsSnap.size,
        });
      } catch (e) {
        // Will populate when database is connected
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
        </div>

        <div className="stat-card stat-blue">
          <div className="stat-card-icon">🎓</div>
          <div className="stat-card-label">Total Students</div>
          <div className="stat-card-value">{stats.students}</div>
        </div>

        <div className="stat-card stat-orange">
          <div className="stat-card-icon">📂</div>
          <div className="stat-card-label">Active Sections</div>
          <div className="stat-card-value">{stats.sections}</div>
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
            {logs.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  No logs yet. Data will appear once the database is connected.
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
