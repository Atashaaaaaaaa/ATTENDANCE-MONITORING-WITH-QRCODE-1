"use client";
import { useState, useCallback, useEffect } from "react";
import { addDoc, collection, query, where, getDocs, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState({});
  const [studentId, setStudentId] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Fetch teacher's assigned sections from Firestore
  useEffect(() => {
    if (!user?.uid) return;

    const fetchSubjects = async () => {
      try {
        const q = query(collection(db, "sections"), where("teacherId", "==", user.uid));
        const snap = await getDocs(q);
        const fetched = snap.docs.map((d) => {
          const data = d.data();
          // Format schedule from object or legacy string
          let scheduleStr = "TBD";
          if (data.schedule && typeof data.schedule === "object") {
            const days = (data.schedule.days || []).join(", ");
            const time = data.schedule.time || "";
            scheduleStr = days && time ? `${days} • ${time}` : days || time || "TBD";
          } else if (typeof data.schedule === "string") {
            scheduleStr = data.schedule;
          }
          return {
            id: d.id,
            code: data.subject?.substring(0, 6)?.toUpperCase() || "SUBJ",
            name: data.subject || "Untitled",
            sectionId: d.id,
            section: data.section || "—",
            schedule: scheduleStr,
            room: data.room || "TBD",
          };
        });
        setSubjects(fetched);
      } catch (e) {
        // Will populate when database is connected
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [user?.uid]);

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
  }, [subjects]);

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
        teacherId: user?.uid || "unknown",
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
  }, [user?.uid]);

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

      {loadingSubjects ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <p style={{ color: "var(--text-muted)" }}>Loading your classes...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg></div>
          <h3 style={{ margin: "0 0 8px", color: "var(--text-primary)" }}>No Subjects Assigned</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "400px", margin: "0 auto" }}>
            Subjects and sections will appear here once the admin assigns them to your account via Section Mapping.
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {subject.schedule} • <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> {subject.room}
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
                    {isActive ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><circle cx="12" cy="12" r="10"></circle></svg> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>}
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> {records.length} student(s) marked present
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> Start Face Scan Session
                    </button>
                  ) : (
                    <button
                      className="btn btn-red"
                      onClick={() => stopSession(subject)}
                      style={{ flex: 1, padding: "12px", fontSize: "0.9rem" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> End Session
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
