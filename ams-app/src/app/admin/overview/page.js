"use client";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
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
        const teachersSnap = await getDocs(collection(db, "teachers"));
        const studentsSnap = await getDocs(collection(db, "students"));
        const sectionsSnap = await getDocs(collection(db, "sections"));
        setStats({
          teachers: teachersSnap.size,
          students: studentsSnap.size,
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
          <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg></div>
          <div className="stat-card-label">Total Teachers</div>
          <div className="stat-card-value">{stats.teachers}</div>
        </div>

        <div className="stat-card stat-blue">
          <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg></div>
          <div className="stat-card-label">Total Students</div>
          <div className="stat-card-value">{stats.students}</div>
        </div>

        <div className="stat-card stat-orange">
          <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>
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
