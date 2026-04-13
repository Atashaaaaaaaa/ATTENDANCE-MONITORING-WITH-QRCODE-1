"use client";
import { useState, useCallback, useEffect } from "react";
import { addDoc, collection, query, where, getDocs, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TeacherDashboard() {
  const [activeSessions, setActiveSessions] = useState({});
  const [studentId, setStudentId] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState({});

  // Teacher's assigned subjects/sections — replace with Firestore data later
  const subjects = [
    { id: "cs211", code: "CS 211", name: "Data Structures", sectionId: "secA", section: "Section A", schedule: "MWF 9:00 - 10:00 AM", room: "Room 301" },
    { id: "cs312", code: "CS 312", name: "Web Development", sectionId: "secB", section: "Section B", schedule: "TTh 1:00 - 2:30 PM", room: "Room 205" },
    { id: "cs321", code: "CS 321", name: "Database Systems", sectionId: "secA", section: "Section A", schedule: "MWF 11:00 AM - 12:00 PM", room: "Room 402" },
  ];

  // Listen for active sessions in real-time
  useEffect(() => {
    if (subjects.length === 0) return;

    const q = query(collection(db, "sessions"), where("active", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const key = data.subjectId + "_" + data.sectionId;
        sessions[key] = { ...data, docId: docSnap.id };
      });
      setActiveSessions(sessions);
    }, () => {
      // Firestore not connected — silent fail
    });

    return () => unsubscribe();
  }, []);

  // Start session for a subject + section
  const startSession = useCallback(async (subject) => {
    const sessionKey = subject.id + "_" + subject.sectionId;
    try {
      const docRef = await addDoc(collection(db, "sessions"), {
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.name,
        sectionId: subject.sectionId,
        sectionName: subject.section,
        teacherId: "current-teacher",
        date: new Date().toISOString().split("T")[0],
        startTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        active: true,
        createdAt: new Date().toISOString(),
      });
      // Local fallback
      setActiveSessions((prev) => ({
        ...prev,
        [sessionKey]: {
          docId: docRef?.id || sessionKey,
          subjectId: subject.id,
          sectionId: subject.sectionId,
          active: true,
          startTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      }));
    } catch (e) {
      // Local mode fallback
      setActiveSessions((prev) => ({
        ...prev,
        [sessionKey]: {
          docId: sessionKey,
          subjectId: subject.id,
          sectionId: subject.sectionId,
          active: true,
          startTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      }));
    }
  }, []);

  // Stop session
  const stopSession = useCallback(async (subject) => {
    const sessionKey = subject.id + "_" + subject.sectionId;
    const session = activeSessions[sessionKey];

    if (session?.docId) {
      try {
        await deleteDoc(doc(db, "sessions", session.docId));
      } catch (e) {
        // Local mode
      }
    }

    setActiveSessions((prev) => {
      const next = { ...prev };
      delete next[sessionKey];
      return next;
    });
  }, [activeSessions]);

  // Manual attendance
  const manualMark = async (subject) => {
    if (!studentId.trim()) return;
    const entry = {
      name: studentId,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "Present",
    };

    setAttendanceRecords((prev) => ({
      ...prev,
      [subject.id]: [...(prev[subject.id] || []), entry],
    }));

    try {
      await addDoc(collection(db, "attendance"), {
        studentId: studentId,
        subjectId: subject.id,
        subjectCode: subject.code,
        sectionId: subject.sectionId,
        sessionId: "manual",
        timestamp: new Date().toISOString(),
        status: "present",
        method: "manual",
      });
    } catch (e) {
      // Local mode
    }

    setStudentId("");
    alert(`Student ${entry.name} marked present for ${subject.name}.`);
  };

  return (
    <>
      <div className="page-header">
        <h1>Class Attendance</h1>
        <p>Start a facial recognition session per subject and section.</p>
      </div>

      {subjects.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}></div>
          <h3 style={{ margin: "0 0 8px", color: "var(--text-primary)" }}>No Subjects Assigned</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "400px", margin: "0 auto" }}>
            Subjects and sections will appear here once the admin assigns them to your account via the database.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "20px" }}>
          {subjects.map((subject) => {
            const sessionKey = subject.id + "_" + subject.sectionId;
            const isActive = !!activeSessions[sessionKey];
            const records = attendanceRecords[subject.id] || [];

            return (
              <div key={sessionKey} className="card" style={{
                marginBottom: 0,
                border: isActive ? "2px solid var(--primary)" : undefined,
              }}>
                {/* Subject Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                      <span style={{
                        padding: "4px 10px", borderRadius: "6px",
                        background: "var(--accent-soft)", color: "var(--primary)",
                        fontSize: "0.7rem", fontWeight: 700,
                      }}>{subject.code}</span>
                      <span style={{
                        padding: "4px 10px", borderRadius: "6px",
                        background: "#EFF6FF", color: "#2563EB",
                        fontSize: "0.7rem", fontWeight: 700,
                      }}>{subject.section}</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>{subject.name}</h3>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {subject.schedule} • {subject.room}
                    </p>
                  </div>
                  {isActive && (
                    <div style={{
                      padding: "6px 12px", borderRadius: "20px",
                      background: "#ECFDF5", color: "#047857",
                      fontSize: "0.7rem", fontWeight: 700,
                      display: "flex", alignItems: "center", gap: "6px",
                      animation: "pulse 2s infinite",
                    }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981", display: "inline-block" }}></span>
                      LIVE
                    </div>
                  )}
                </div>

                {/* Session Status Display */}
                <div style={{
                  padding: "20px",
                  borderRadius: "12px",
                  background: isActive ? "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)" : "#F9FAFB",
                  textAlign: "center",
                  marginBottom: "16px",
                  color: isActive ? "white" : "var(--text-muted)",
                  transition: "all 0.3s ease",
                }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>
                    {isActive ? "Session Active" : "Session Inactive"}
                  </div>
                  <div style={{ fontSize: "0.78rem", marginTop: "4px", opacity: 0.8 }}>
                    {isActive
                      ? `Started at ${activeSessions[sessionKey]?.startTime} • Students can now scan`
                      : "Start a session to allow students to take attendance"}
                  </div>
                  {isActive && (
                    <div style={{ fontSize: "0.75rem", marginTop: "8px", opacity: 0.7 }}>
                      {records.length} student(s) marked present
                    </div>
                  )}
                </div>

                {/* Start/Stop Button */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  {!isActive ? (
                    <button
                      className="btn btn-green"
                      onClick={() => startSession(subject)}
                      style={{ flex: 1, padding: "12px", fontSize: "0.9rem" }}
                    >
                      Start Face Scan Session
                    </button>
                  ) : (
                    <button
                      className="btn btn-red"
                      onClick={() => stopSession(subject)}
                      style={{ flex: 1, padding: "12px", fontSize: "0.9rem" }}
                    >
                      End Session
                    </button>
                  )}
                </div>

                {/* Manual Entry */}
                {isActive && (
                  <div style={{
                    padding: "12px", borderRadius: "10px",
                    background: "#F9FAFB", border: "1px solid var(--border-light)",
                  }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "8px", color: "var(--text-secondary)" }}>
                      Manual Entry
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter Student ID"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && manualMark(subject)}
                        style={{ flex: 1, padding: "8px 12px", fontSize: "0.85rem" }}
                      />
                      <button className="btn btn-purple" onClick={() => manualMark(subject)} style={{ padding: "8px 16px", fontSize: "0.8rem" }}>
                        Mark
                      </button>
                    </div>
                  </div>
                )}

                {/* Attendance list for this subject */}
                {records.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>
                      Attendance ({records.length})
                    </div>
                    {records.map((r, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", borderRadius: "8px",
                        background: i % 2 === 0 ? "#F9FAFB" : "transparent",
                        fontSize: "0.82rem",
                      }}>
                        <span style={{ fontWeight: 600 }}>{r.name}</span>
                        <span style={{ color: "var(--text-muted)" }}>{r.time}</span>
                        <span className="status-badge present" style={{ fontSize: "0.7rem" }}>
                          <span className="status-dot"></span>{r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
