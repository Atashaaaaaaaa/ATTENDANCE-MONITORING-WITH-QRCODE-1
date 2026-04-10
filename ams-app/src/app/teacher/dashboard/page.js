"use client";
import { useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TeacherDashboard() {
  const [qrData, setQrData] = useState(null);
  const [studentId, setStudentId] = useState("");
  const [attendanceList, setAttendanceList] = useState([
    { name: "Student A", time: "08:05 AM", status: "Present" },
    { name: "Student B", time: "08:07 AM", status: "Present" },
    { name: "Student C", time: "08:15 AM", status: "Late" },
  ]);

  const generateQR = useCallback(async () => {
    const sessionCode = "SESSION_" + Math.floor(Math.random() * 1000000) + "_" + Date.now();
    setQrData(sessionCode);

    try {
      await addDoc(collection(db, "sessions"), {
        qrCode: sessionCode,
        teacherId: "demo-teacher",
        sectionId: "G12-ICT",
        subject: "Java Programming",
        date: new Date().toISOString().split("T")[0],
        startTime: new Date().toLocaleTimeString(),
        active: true,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      // Local mode
    }
  }, []);

  const manualMark = async () => {
    if (!studentId.trim()) return;
    const newEntry = {
      name: studentId,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "Present",
    };
    setAttendanceList([...attendanceList, newEntry]);

    try {
      await addDoc(collection(db, "attendance"), {
        studentId: studentId,
        sessionId: qrData || "manual",
        timestamp: new Date().toISOString(),
        status: "present",
      });
    } catch (e) {
      // Local mode
    }

    setStudentId("");
    alert(`Student ${newEntry.name} marked as present.`);
  };

  return (
    <>
      <div className="page-header">
        <h1>Class Attendance</h1>
        <p>Generate a QR code for your students to scan.</p>
      </div>

      <div className="card">
        <div className="qr-section">
          <div className="card-title" style={{ marginBottom: "8px" }}>Generate Attendance QR</div>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
            <strong>Subject:</strong> Java Programming (G12-ICT)
          </p>

          {qrData ? (
            <div className="qr-wrapper">
              <QRCodeSVG
                value={qrData}
                size={200}
                bgColor="#ffffff"
                fgColor="#1E1B4B"
                level="H"
                includeMargin={false}
              />
            </div>
          ) : (
            <div style={{
              width: "240px",
              height: "240px",
              margin: "20px auto",
              border: "2px dashed var(--border-purple)",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "0.9rem",
            }}>
              Click below to generate
            </div>
          )}

          <div style={{ marginTop: "16px" }}>
            <button className="btn btn-green" onClick={generateQR} style={{ padding: "14px 32px", fontSize: "0.95rem" }}>
              🔄 Generate New Code
            </button>
          </div>
          <p className="qr-info">The code will expire after the session ends.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Manual Attendance Entry</div>
            <div className="card-subtitle">Use this if a student&apos;s camera is not working.</div>
          </div>
        </div>

        <div className="manual-entry">
          <input
            type="text"
            className="form-control"
            placeholder="Enter Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && manualMark()}
          />
          <button className="btn btn-purple" onClick={manualMark}>
            Mark Present
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Live Attendance List (Today)</div>
          <span className="status-badge active">
            <span className="status-dot"></span>
            {attendanceList.length} Students
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Time Scanned</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceList.map((entry, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 600 }}>{entry.name}</td>
                <td>{entry.time}</td>
                <td>
                  <span className={`status-badge ${entry.status.toLowerCase() === "present" ? "present" : "late"}`}>
                    <span className="status-dot"></span>
                    {entry.status}
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
