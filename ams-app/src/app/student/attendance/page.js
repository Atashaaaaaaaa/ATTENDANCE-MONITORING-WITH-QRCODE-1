"use client";
import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function StudentAttendance() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const subjects = [
    { name: "Java Programming (G12-ICT)", rate: 95, sessions: "19/20", level: "high" },
    { name: "Web Development", rate: 85, sessions: "17/20", level: "medium" },
    { name: "3D Animation", rate: 70, sessions: "14/20", level: "low" },
  ];

  const recentScans = [
    { date: "Apr 09, 2026", subject: "Java Programming", time: "08:02 AM", status: "On-Time" },
    { date: "Apr 08, 2026", subject: "Web Development", time: "01:05 PM", status: "On-Time" },
    { date: "Apr 07, 2026", subject: "3D Animation", time: "10:18 AM", status: "Late" },
    { date: "Apr 07, 2026", subject: "Java Programming", time: "08:01 AM", status: "On-Time" },
  ];

  const handleScan = async () => {
    setScannerOpen(true);
    // Simulate a scan after 2 seconds
    setTimeout(async () => {
      const mockCode = "SESSION_" + Math.floor(Math.random() * 999999);
      setScanResult(mockCode);
      setScannerOpen(false);

      try {
        await addDoc(collection(db, "attendance"), {
          studentId: "demo-student",
          sessionId: mockCode,
          timestamp: new Date().toISOString(),
          status: "present",
        });
      } catch (e) {
        // Local mode
      }

      alert("✅ Attendance marked successfully! Session: " + mockCode);
    }, 2000);
  };

  return (
    <>
      <div className="page-header">
        <h1>My Attendance</h1>
        <p>View your attendance stats and scan into your current class.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="scanner-card">
          <div>
            <div className="card-title" style={{ marginBottom: "4px" }}>Attendance Scanner</div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
              Scan the QR code displayed by your teacher to mark your presence.
            </p>
          </div>
          <button className="scanner-btn" onClick={handleScan} disabled={scannerOpen}>
            {scannerOpen ? "📡 Scanning..." : "📷 OPEN SCANNER"}
          </button>
        </div>
      </div>

      {scanResult && (
        <div className="card" style={{ background: "var(--success-bg)", border: "1px solid #A7F3D0" }}>
          <p style={{ margin: 0, color: "var(--success)", fontWeight: 600 }}>
            ✅ Last scan successful — Session: {scanResult}
          </p>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Attendance by Subject</div>
            <div className="card-subtitle">Percentage of classes attended this semester.</div>
          </div>
        </div>

        {subjects.map((subject, idx) => (
          <div className="progress-section" key={idx}>
            <div className="progress-header">
              <span className="progress-label">{subject.name}</span>
              <span className={`progress-value ${subject.level}`}>{subject.rate}%</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${subject.level}`}
                style={{ width: `${subject.rate}%` }}
              ></div>
            </div>
            <div className="progress-detail">{subject.sessions} Sessions Attended</div>
            {subject.rate < 80 && (
              <div className="progress-warning">
                ⚠️ Warning: You have missed {20 - parseInt(subject.sessions)} sessions. Minimum 80% required.
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent Scans</div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentScans.map((scan, idx) => (
              <tr key={idx}>
                <td>{scan.date}</td>
                <td style={{ fontWeight: 600 }}>{scan.subject}</td>
                <td>{scan.time}</td>
                <td>
                  <span className={`status-badge ${scan.status === "On-Time" ? "on-time" : "late"}`}>
                    <span className="status-dot"></span>
                    {scan.status}
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
