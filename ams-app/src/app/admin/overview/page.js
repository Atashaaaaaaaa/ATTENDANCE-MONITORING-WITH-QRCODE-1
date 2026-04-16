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
  const [loadingLogs, setLoadingLogs] = useState(true);

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

    const fetchLogs = async () => {
      try {
        const logsQuery = query(
          collection(db, "loginLogs"),
          orderBy("timestamp", "desc"),
          limit(20)
        );
        const logsSnap = await getDocs(logsQuery);
        const fetchedLogs = logsSnap.docs.map((d) => {
          const data = d.data();
          // Format the timestamp
          let timestampStr = "—";
          if (data.timestamp) {
            const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
            timestampStr = date.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          }
          return {
            id: d.id,
            timestamp: timestampStr,
            name: data.name || data.email || "Unknown",
            email: data.email || "—",
            role: data.role || "—",
            action: data.action || "Login",
            status: data.status || "Success",
          };
        });
        setLogs(fetchedLogs);
      } catch (e) {
        // loginLogs collection may not exist yet
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchStats();
    fetchLogs();
  }, []);

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case "admin":
        return { background: "#FFF7ED", color: "#C2410C" };
      case "teacher":
        return { background: "var(--info-bg)", color: "var(--info)" };
      case "student":
        return { background: "var(--accent-soft)", color: "var(--primary)" };
      default:
        return { background: "var(--bg-body)", color: "var(--text-muted)" };
    }
  };

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
            <div className="card-title">Recent Logins</div>
            <div className="card-subtitle">User login activity across the system.</div>
          </div>
          <span style={{
            padding: "4px 12px",
            borderRadius: "var(--radius-full)",
            background: "var(--accent-soft)",
            color: "var(--primary)",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}>
            {logs.length} log{logs.length !== 1 ? "s" : ""}
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loadingLogs ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  Loading recent logins...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  No login activity yet. Logs will appear once users sign in.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td data-label="User">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{log.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{log.email}</div>
                    </div>
                  </td>
                  <td data-label="Role">
                    <span style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      textTransform: "capitalize",
                      ...getRoleBadgeStyle(log.role),
                    }}>
                      {log.role}
                    </span>
                  </td>
                  <td data-label="Action" style={{ fontSize: "0.85rem" }}>{log.action}</td>
                  <td data-label="Time" style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {log.timestamp}
                  </td>
                  <td data-label="Status">
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
