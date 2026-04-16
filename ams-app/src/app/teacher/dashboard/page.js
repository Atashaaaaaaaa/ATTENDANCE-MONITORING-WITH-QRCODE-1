"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { addDoc, collection, query, where, getDocs, updateDoc, doc, onSnapshot, Timestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

// Parse schedule time string like "7:30 AM - 9:00 AM" into { startMinutes, endMinutes }
function parseScheduleTime(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split("-").map((s) => s.trim());
  if (parts.length < 2) return null;

  const parseTime = (t) => {
    const match = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  const start = parseTime(parts[0]);
  const end = parseTime(parts[1]);
  if (start === null || end === null) return null;
  return { startMinutes: start, endMinutes: end };
}

// Determine attendance status based on scan time and schedule
// Present: on or before the scheduled start time
// Late: 1–15 minutes after the scheduled start time
// Absent: after 30 minutes past the scheduled start time
function determineStatus(scanDate, scheduleTime) {
  if (!scheduleTime) return "Present";
  const parsed = parseScheduleTime(scheduleTime);
  if (!parsed) return "Present";

  const scanMinutes = scanDate.getHours() * 60 + scanDate.getMinutes();
  const diff = scanMinutes - parsed.startMinutes;

  if (diff <= 0) return "Present"; // On or before scheduled time
  if (diff <= 15) return "Late";   // 1–15 minutes after
  if (diff <= 30) return "Late";   // 16–30 minutes after (still considered late)
  return "Absent";                 // After 30 minutes
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState({});
  const [studentId, setStudentId] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [enrolledStudents, setEnrolledStudents] = useState({});
  const [classListModal, setClassListModal] = useState(null); // { subject, tab: 'current'|'previous' }
  // Tab state per subject: "current" or "previous"
  const [sessionTab, setSessionTab] = useState({});
  // Track which student's status dropdown is open in class list modal
  const [editingStatus, setEditingStatus] = useState(null);
  // Accordion: which previous session is expanded (sessionId or null)
  const [expandedSession, setExpandedSession] = useState(null);
  // Session metadata cache: { sessionId: { date, startTime, createdAt, ... } }
  const [sessionMeta, setSessionMeta] = useState({});
  // Face preview modal state: { studentId, name, hasFace, status, email }
  const [facePreviewStudent, setFacePreviewStudent] = useState(null);

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
          let scheduleTime = "";
          if (data.schedule && typeof data.schedule === "object") {
            const days = (data.schedule.days || []).join(", ");
            const time = data.schedule.time || "";
            scheduleStr = days && time ? `${days} • ${time}` : days || time || "TBD";
            scheduleTime = time;
          } else if (typeof data.schedule === "string") {
            scheduleStr = data.schedule;
            scheduleTime = data.schedule;
          }
          return {
            id: d.id,
            code: data.subject?.substring(0, 6)?.toUpperCase() || "SUBJ",
            name: data.subject || "Untitled",
            sectionId: d.id,
            section: data.section || "—",
            schedule: scheduleStr,
            scheduleTime: scheduleTime,
            room: data.room || "TBD",
            studentIds: data.students || [],
          };
        });
        setSubjects(fetched);

        // Fetch enrolled student details for all sections
        const allStudentIds = new Set();
        fetched.forEach((s) => s.studentIds.forEach((id) => allStudentIds.add(id)));

        if (allStudentIds.size > 0) {
          const studentsMap = {};
          // Fetch from users collection
          const usersSnap = await getDocs(collection(db, "users"));
          usersSnap.forEach((d) => {
            if (allStudentIds.has(d.id)) {
              const data = d.data();
              studentsMap[d.id] = {
                id: d.id,
                name: data.fullName || data.name || data.email || "Unknown",
                email: data.email || "",
                section: data.section || "",
                hasFace: !!(data.faceDescriptor && data.faceDescriptor.length > 0),
              };
            }
          });
          // Also check students collection as fallback
          const studentsSnap = await getDocs(collection(db, "students"));
          studentsSnap.forEach((d) => {
            if (allStudentIds.has(d.id) && !studentsMap[d.id]) {
              const data = d.data();
              studentsMap[d.id] = {
                id: d.id,
                name: data.fullName || data.name || data.email || "Unknown",
                email: data.email || "",
                section: data.section || "",
                hasFace: !!(data.faceDescriptor && data.faceDescriptor.length > 0),
              };
            }
          });
          setEnrolledStudents(studentsMap);
        }
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

    const q = query(collection(db, "sessions"), where("teacherId", "==", user?.uid || ""));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.active) {
          const key = data.subjectId + "_" + data.sectionId;
          sessions[key] = { ...data, docId: docSnap.id };
        }
      });
      setActiveSessions(sessions);
    }, () => {
      // Firestore not connected — silent fail
    });

    return () => unsubscribe();
  }, [subjects, user?.uid]);

  // Listen for today's attendance records in real-time
  useEffect(() => {
    if (subjects.length === 0) return;

    const today = new Date().toISOString().split("T")[0];
    const sectionIds = subjects.map((s) => s.sectionId);

    // Listen for attendance records for teacher's sections for today
    const q = query(
      collection(db, "attendance"),
      where("date", "==", today)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only include records from teacher's sections
        if (sectionIds.includes(data.sectionId)) {
          const key = data.sectionId;
          if (!records[key]) records[key] = [];
          records[key].push({
            id: docSnap.id,
            studentId: data.studentId,
            name: data.studentName || data.studentId,
            time: data.timeMarked || "",
            status: data.status || "Present",
            method: data.method || "manual",
            sessionId: data.sessionId || null,
          });
        }
      });
      setAttendanceRecords(records);
    }, () => {
      // silent fail
    });

    return () => unsubscribe();
  }, [subjects]);

  // Start session for a subject + section
  const startSession = useCallback(async (subject) => {
    const sessionKey = subject.id + "_" + subject.sectionId;
    const now = new Date();
    const sessionData = {
      subjectId: subject.id,
      subjectCode: subject.code,
      subjectName: subject.name,
      sectionId: subject.sectionId,
      sectionName: subject.section,
      teacherId: user?.uid || "unknown",
      date: now.toISOString().split("T")[0],
      startTime: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scheduleTime: subject.scheduleTime || "",
      active: true,
      createdAt: now.toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "sessions"), sessionData);
      setActiveSessions((prev) => ({
        ...prev,
        [sessionKey]: { ...sessionData, docId: docRef.id },
      }));
      // Auto-switch to current session tab
      setSessionTab((prev) => ({ ...prev, [subject.id]: "current" }));
    } catch (e) {
      // Local mode fallback
      setActiveSessions((prev) => ({
        ...prev,
        [sessionKey]: { ...sessionData, docId: sessionKey },
      }));
      setSessionTab((prev) => ({ ...prev, [subject.id]: "current" }));
    }
  }, [user?.uid]);

  // Stop session — save it (mark inactive) instead of deleting
  const stopSession = useCallback(async (subject) => {
    const sessionKey = subject.id + "_" + subject.sectionId;
    const session = activeSessions[sessionKey];
    const now = new Date();

    if (session?.docId) {
      try {
        await updateDoc(doc(db, "sessions", session.docId), {
          active: false,
          endTime: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          endedAt: now.toISOString(),
        });
      } catch (e) {
        // Local mode
      }
    }

    // Mark absent students — those enrolled but not in attendance for this session
    const sectionRecords = attendanceRecords[subject.sectionId] || [];
    const currentSessionRecords = sectionRecords.filter((r) => r.sessionId === session?.docId);
    const presentStudentIds = new Set(currentSessionRecords.map((r) => r.studentId));
    const today = new Date().toISOString().split("T")[0];

    for (const studentId of subject.studentIds) {
      if (!presentStudentIds.has(studentId)) {
        const studentInfo = enrolledStudents[studentId];
        try {
          await addDoc(collection(db, "attendance"), {
            studentId: studentId,
            studentName: studentInfo?.name || studentId,
            subjectId: subject.id,
            subjectCode: subject.code,
            sectionId: subject.sectionId,
            sessionId: session?.docId || "manual",
            date: today,
            timestamp: now.toISOString(),
            timeMarked: "—",
            status: "Absent",
            method: "auto",
          });
        } catch (e) {
          // silent
        }
      }
    }

    setActiveSessions((prev) => {
      const next = { ...prev };
      delete next[sessionKey];
      return next;
    });
    // Switch to previous sessions tab after stopping
    setSessionTab((prev) => ({ ...prev, [subject.id]: "previous" }));
  }, [activeSessions, attendanceRecords, enrolledStudents]);

  // Manual attendance
  const manualMark = async (subject) => {
    if (!studentId.trim()) return;
    const now = new Date();
    const status = determineStatus(now, subject.scheduleTime);
    const today = now.toISOString().split("T")[0];
    const sessionKey = subject.id + "_" + subject.sectionId;
    const session = activeSessions[sessionKey];

    // Try to find the student name from enrolled students
    let studentName = studentId;
    const matchedStudent = Object.values(enrolledStudents).find(
      (s) => s.name?.toLowerCase() === studentId.toLowerCase() ||
        s.email?.toLowerCase() === studentId.toLowerCase() ||
        s.id === studentId
    );
    if (matchedStudent) {
      studentName = matchedStudent.name;
    }

    try {
      await addDoc(collection(db, "attendance"), {
        studentId: matchedStudent?.id || studentId,
        studentName: studentName,
        subjectId: subject.id,
        subjectCode: subject.code,
        sectionId: subject.sectionId,
        sessionId: session?.docId || "manual",
        date: today,
        timestamp: now.toISOString(),
        timeMarked: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: status,
        method: "manual",
      });
    } catch (e) {
      // Local mode
    }

    setStudentId("");
  };

  // Open class list modal for a subject
  const openClassListModal = (subject) => {
    const sessionKey = subject.id + "_" + subject.sectionId;
    const currentSessionDocId = activeSessions[sessionKey]?.docId;
    const isActive = !!activeSessions[sessionKey];
    setClassListModal({
      subject,
      tab: isActive ? "current" : "previous",
      currentSessionDocId,
    });
  };

  // Get class list with attendance status for a subject, filtered by session
  const getClassList = (subject, filterSessionId) => {
    const records = attendanceRecords[subject.sectionId] || [];
    const filteredRecords = filterSessionId
      ? records.filter((r) => r.sessionId === filterSessionId)
      : records;

    const attendanceMap = {};
    filteredRecords.forEach((r) => {
      // Keep the first record per student (in case of duplicates)
      if (!attendanceMap[r.studentId]) {
        attendanceMap[r.studentId] = r;
      }
    });

    return subject.studentIds.map((sid) => {
      const student = enrolledStudents[sid];
      const record = attendanceMap[sid];
      return {
        id: sid,
        name: student?.name || sid,
        email: student?.email || "",
        hasFace: student?.hasFace || false,
        status: record?.status || "No Record",
        time: record?.time || "—",
      };
    });
  };

  // Get previous sessions' records (grouped by sessionId)
  const getPreviousSessionRecords = (subject, currentSessionId) => {
    const records = attendanceRecords[subject.sectionId] || [];
    // Get all records NOT belonging to the current session
    const previousRecords = records.filter((r) => r.sessionId && r.sessionId !== currentSessionId);

    // Group by sessionId
    const grouped = {};
    previousRecords.forEach((r) => {
      if (!grouped[r.sessionId]) grouped[r.sessionId] = [];
      grouped[r.sessionId].push(r);
    });

    return grouped;
  };

  // Fetch session metadata for previous sessions
  const fetchSessionMeta = useCallback(async (sessionIds) => {
    const newMeta = {};
    const toFetch = sessionIds.filter((id) => !sessionMeta[id]);
    if (toFetch.length === 0) return;

    for (const sid of toFetch) {
      try {
        const snap = await getDoc(doc(db, "sessions", sid));
        if (snap.exists()) {
          newMeta[sid] = snap.data();
        }
      } catch (e) {
        // silent
      }
    }
    if (Object.keys(newMeta).length > 0) {
      setSessionMeta((prev) => ({ ...prev, ...newMeta }));
    }
  }, [sessionMeta]);

  // Format session date/time for display
  const formatSessionHeader = (sessId) => {
    const meta = sessionMeta[sessId];
    if (!meta) return { label: "Loading...", sub: "" };

    try {
      const dateStr = meta.createdAt || meta.date;
      const d = dateStr ? new Date(dateStr) : null;
      if (d && !isNaN(d.getTime())) {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const monthNames = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"];
        const dayName = dayNames[d.getDay()];
        const monthName = monthNames[d.getMonth()];
        const dayNum = d.getDate();
        const year = d.getFullYear();
        const time = meta.startTime || d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        return {
          label: `${monthName} ${dayNum}, ${dayName}, ${time}`,
          sub: `${year}`,
        };
      }
    } catch (e) { /* fallback */ }

    return { label: meta.startTime ? `Session — ${meta.startTime}` : "Session", sub: meta.date || "" };
  };

  // Format a timestamp into full date+time display
  const formatFullDateTime = (timeStr, dateStr) => {
    if (!timeStr || timeStr === "—") return "—";
    // Try to build a full date+time string
    if (dateStr) {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
          return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} – ${timeStr}`;
        }
      } catch (e) { /* fallback */ }
    }
    return timeStr;
  };

  // Count statuses for a subject
  const getStatusCounts = (subject, filterSessionId) => {
    const classList = getClassList(subject, filterSessionId);
    return {
      total: classList.length,
      present: classList.filter((s) => s.status === "Present").length,
      late: classList.filter((s) => s.status === "Late").length,
      absent: classList.filter((s) => s.status === "Absent").length,
    };
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
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg></div>
          <h3 style={{ margin: "0 0 8px", color: "var(--text-primary)" }}>No Subjects Assigned</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "400px", margin: "0 auto" }}>
            Subjects and sections will appear here once the admin assigns them to your account via Section Mapping.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "20px" }}>
          {subjects.map((subject) => {
            const sessionKey = subject.id + "_" + subject.sectionId;
            const isActive = !!activeSessions[sessionKey];
            const currentSessionDocId = activeSessions[sessionKey]?.docId;
            const activeTab = sessionTab[subject.id] || (isActive ? "current" : "previous");
            const records = attendanceRecords[subject.sectionId] || [];
            const currentRecords = currentSessionDocId
              ? records.filter((r) => r.sessionId === currentSessionDocId)
              : [];
            const counts = getStatusCounts(subject, activeTab === "current" ? currentSessionDocId : null);
            const previousGroups = getPreviousSessionRecords(subject, currentSessionDocId);
            const hasPreviousSessions = Object.keys(previousGroups).length > 0;

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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {subject.schedule} • <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> {subject.room}
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

                {/* Session Tabs */}
                {(isActive || hasPreviousSessions) && (
                  <div style={{
                    display: "flex", gap: "4px", marginBottom: "16px",
                    background: "var(--bg-body)", borderRadius: "10px", padding: "4px",
                    border: "1px solid var(--border-light)",
                  }}>
                    <button
                      onClick={() => setSessionTab((prev) => ({ ...prev, [subject.id]: "current" }))}
                      style={{
                        flex: 1, padding: "8px 12px", borderRadius: "8px", border: "none",
                        background: activeTab === "current" ? "var(--primary)" : "transparent",
                        color: activeTab === "current" ? "white" : "var(--text-secondary)",
                        fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '4px'}}><circle cx="12" cy="12" r="10"></circle></svg>
                      Current Session
                    </button>
                    <button
                      onClick={() => setSessionTab((prev) => ({ ...prev, [subject.id]: "previous" }))}
                      style={{
                        flex: 1, padding: "8px 12px", borderRadius: "8px", border: "none",
                        background: activeTab === "previous" ? "var(--primary)" : "transparent",
                        color: activeTab === "previous" ? "white" : "var(--text-secondary)",
                        fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '4px'}}><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                      Previous Sessions
                    </button>
                  </div>
                )}

                {/* Attendance Summary Bar */}
                {subject.studentIds.length > 0 && (
                  <div style={{
                    display: "flex", gap: "12px", marginBottom: "16px",
                    padding: "12px", borderRadius: "10px",
                    background: "var(--bg-body)", border: "1px solid var(--border-light)",
                  }}>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)" }}>{counts.total}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Enrolled</div>
                    </div>
                    <div style={{ width: "1px", background: "var(--border-color)" }}></div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#10B981" }}>{counts.present}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Present</div>
                    </div>
                    <div style={{ width: "1px", background: "var(--border-color)" }}></div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#F59E0B" }}>{counts.late}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Late</div>
                    </div>
                    <div style={{ width: "1px", background: "var(--border-color)" }}></div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#EF4444" }}>{counts.absent}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Absent</div>
                    </div>
                  </div>
                )}

                {/* Attendance Progress Bar */}
                {subject.studentIds.length > 0 && (counts.present + counts.late + counts.absent) > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", background: "#F3F4F6" }}>
                      {counts.present > 0 && (
                        <div style={{ width: `${(counts.present / counts.total) * 100}%`, background: "#10B981", transition: "width 0.5s ease" }}></div>
                      )}
                      {counts.late > 0 && (
                        <div style={{ width: `${(counts.late / counts.total) * 100}%`, background: "#F59E0B", transition: "width 0.5s ease" }}></div>
                      )}
                      {counts.absent > 0 && (
                        <div style={{ width: `${(counts.absent / counts.total) * 100}%`, background: "#EF4444", transition: "width 0.5s ease" }}></div>
                      )}
                    </div>
                  </div>
                )}

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
                    {isActive ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><circle cx="12" cy="12" r="10"></circle></svg> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>}
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> {currentRecords.length} student(s) marked
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> Start Face Scan Session
                    </button>
                  ) : (
                    <button
                      className="btn btn-red"
                      onClick={() => stopSession(subject)}
                      style={{ flex: 1, padding: "12px", fontSize: "0.9rem" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> End Session
                    </button>
                  )}
                </div>

                {/* Manual Entry */}
                {isActive && (
                  <div style={{
                    padding: "12px", borderRadius: "10px",
                    background: "#F9FAFB", border: "1px solid var(--border-light)",
                    marginBottom: "16px",
                  }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "8px", color: "var(--text-secondary)" }}>
                      Manual Entry
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter Student Name or ID"
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

                {/* View Class List Button — opens modal */}
                {subject.studentIds.length > 0 && (
                  <button
                    onClick={() => openClassListModal(subject)}
                    style={{
                      width: "100%", padding: "10px", borderRadius: "10px",
                      border: "1px solid var(--border-light)", background: "var(--bg-card)",
                      color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.82rem",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: "8px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    View Class List ({subject.studentIds.length})
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Class List Modal (Spreadsheet) ── */}
      {classListModal && (() => {
        const { subject, tab, currentSessionDocId } = classListModal;
        const sessionKey = subject.id + "_" + subject.sectionId;
        const isActive = !!activeSessions[sessionKey];
        const liveSessionDocId = activeSessions[sessionKey]?.docId || currentSessionDocId;
        const modalClassList = getClassList(subject, tab === "current" ? liveSessionDocId : null);
        const previousGroups = getPreviousSessionRecords(subject, liveSessionDocId);
        const hasPreviousSessions = Object.keys(previousGroups).length > 0;
        const modalCounts = getStatusCounts(subject, tab === "current" ? liveSessionDocId : null);

        // Fetch metadata for previous sessions if not already cached
        const prevSessionIds = Object.keys(previousGroups);
        if (prevSessionIds.length > 0) {
          const uncached = prevSessionIds.filter((id) => !sessionMeta[id]);
          if (uncached.length > 0) {
            fetchSessionMeta(uncached);
          }
        }

        // Get current session date for Time In formatting
        const currentSessionDate = activeSessions[sessionKey]?.date || new Date().toISOString().split("T")[0];

        // Inline status update handler
        const handleStatusChange = async (studentRecordId, newStatus) => {
          if (!studentRecordId) return;
          try {
            await updateDoc(doc(db, "attendance", studentRecordId), { status: newStatus });
          } catch (e) {
            // silent
          }
          setClassListModal((prev) => ({ ...prev, _refresh: Date.now() }));
        };

        // Inline time update handler
        const handleTimeChange = async (studentRecordId, newTime) => {
          if (!studentRecordId) return;
          try {
            await updateDoc(doc(db, "attendance", studentRecordId), { timeMarked: newTime });
          } catch (e) {
            // silent
          }
        };

        // Find attendance record id for a student
        const getRecordId = (studentId) => {
          const records = attendanceRecords[subject.sectionId] || [];
          const filtered = tab === "current" && liveSessionDocId
            ? records.filter((r) => r.sessionId === liveSessionDocId)
            : records;
          const match = filtered.find((r) => r.studentId === studentId);
          return match?.id || null;
        };

        // Status pill component
        const StatusPill = ({ status, studentId, recordId, editable = true }) => {
          const pillClass = status === "Present" ? "present"
            : status === "Late" ? "late"
            : status === "Absent" ? "absent"
            : "no-record";
          const isOpen = editingStatus === studentId;

          return (
            <div className="spreadsheet-status-cell">
              <button
                className={`spreadsheet-status-pill ${pillClass}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (editable && recordId) {
                    setEditingStatus(isOpen ? null : studentId);
                  }
                }}
                title={editable && recordId ? "Click to change status" : ""}
              >
                <span className="dot"></span>
                {status}
                {editable && recordId && <span className="chevron">▼</span>}
              </button>

              {isOpen && recordId && (
                <div className="spreadsheet-status-dropdown" onClick={(e) => e.stopPropagation()}>
                  {["Present", "Late", "Absent"].map((opt) => (
                    <button
                      key={opt}
                      className={`spreadsheet-status-option ${opt === status ? "selected" : ""}`}
                      onClick={() => {
                        handleStatusChange(recordId, opt);
                        setEditingStatus(null);
                      }}
                    >
                      <span
                        className="dot"
                        style={{
                          background: opt === "Present" ? "#10B981"
                            : opt === "Late" ? "#F59E0B" : "#EF4444",
                        }}
                      ></span>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        };

        // Spreadsheet table renderer
        const renderTable = (rows, editable = true, sessionDate = null) => (
          <div className="spreadsheet-table-wrap">
            <table className="spreadsheet-table">
              <colgroup>
                <col className="col-face" />
                <col className="col-num" />
                <col className="col-name" />
                <col className="col-time" />
                <col className="col-status" />
              </colgroup>
              <thead>
                <tr>
                  <th className="face-col-header">Face</th>
                  <th>#</th>
                  <th>Name</th>
                  <th>Time In</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                      No students enrolled yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((student, idx) => {
                    const recordId = editable ? getRecordId(student.id || student.studentId) : student.id;
                    const name = student.name;
                    const rawTime = student.time || "—";
                    const displayTime = formatFullDateTime(rawTime, sessionDate);
                    const status = student.status || "No Record";
                    const sid = student.id || student.studentId || idx;
                    const hasFace = student.hasFace || (enrolledStudents[sid]?.hasFace) || false;

                    return (
                      <tr key={sid}>
                        <td className="face-col-cell">
                          <button
                            className="face-avatar-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFacePreviewStudent({
                                studentId: sid,
                                name: name,
                                hasFace: hasFace,
                                status: status,
                                email: student.email || enrolledStudents[sid]?.email || "",
                              });
                            }}
                            title={hasFace ? "Face registered — Click to view" : "No face registered"}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span className={`face-registered-dot ${hasFace ? "registered" : "not-registered"}`}></span>
                          </button>
                        </td>
                        <td>{idx + 1}</td>
                        <td>
                          <span className="spreadsheet-name">{name}</span>
                        </td>
                        <td>
                          {editable && recordId && rawTime !== "—" ? (
                            <input
                              className="spreadsheet-time-value"
                              defaultValue={displayTime}
                              onBlur={(e) => handleTimeChange(recordId, e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                            />
                          ) : (
                            <span className={rawTime === "—" ? "spreadsheet-time-dash" : "spreadsheet-time-display"}>
                              {displayTime}
                            </span>
                          )}
                        </td>
                        <td>
                          <StatusPill
                            status={status}
                            studentId={sid}
                            recordId={recordId}
                            editable={editable}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );

        return (
          <div
            className="spreadsheet-modal-overlay"
            onClick={() => { setClassListModal(null); setEditingStatus(null); }}
          >
            <div className="spreadsheet-modal" onClick={(e) => { e.stopPropagation(); setEditingStatus(null); }}>
              {/* Close */}
              <button className="spreadsheet-modal-close" onClick={() => setClassListModal(null)}>
                ✕
              </button>

              {/* Header */}
              <div className="spreadsheet-header">
                <div className="spreadsheet-header-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <h3>Class List</h3>
                <div className="spreadsheet-header-sub">{subject.name} — {subject.section}</div>
                <div className="spreadsheet-header-meta">{subject.schedule} • {subject.room}</div>
              </div>

              {/* Summary Bar */}
              <div className="spreadsheet-summary">
                <div className="spreadsheet-stat">
                  <div className="spreadsheet-stat-value" style={{ color: "var(--primary)" }}>{modalCounts.total}</div>
                  <div className="spreadsheet-stat-label">Enrolled</div>
                </div>
                <div className="spreadsheet-stat">
                  <div className="spreadsheet-stat-value" style={{ color: "#10B981" }}>{modalCounts.present}</div>
                  <div className="spreadsheet-stat-label">Present</div>
                </div>
                <div className="spreadsheet-stat">
                  <div className="spreadsheet-stat-value" style={{ color: "#F59E0B" }}>{modalCounts.late}</div>
                  <div className="spreadsheet-stat-label">Late</div>
                </div>
                <div className="spreadsheet-stat">
                  <div className="spreadsheet-stat-value" style={{ color: "#EF4444" }}>{modalCounts.absent}</div>
                  <div className="spreadsheet-stat-label">Absent</div>
                </div>
              </div>

              {/* Rules */}
              <div className="spreadsheet-rules">
                <strong>Rules:</strong>
                <span>✅ Present = on time</span>
                <span>•</span>
                <span>Late = 1–15 min</span>
                <span>•</span>
                <span>Absent = after 30 min</span>
              </div>

              {/* Tabs */}
              {(isActive || hasPreviousSessions) && (
                <div className="spreadsheet-tabs">
                  <button
                    className={`spreadsheet-tab ${tab === "current" ? "active" : ""}`}
                    onClick={() => setClassListModal((prev) => ({ ...prev, tab: "current" }))}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "5px" }}>
                      <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    Current Session
                  </button>
                  <button
                    className={`spreadsheet-tab ${tab === "previous" ? "active" : ""}`}
                    onClick={() => setClassListModal((prev) => ({ ...prev, tab: "previous" }))}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "5px" }}>
                      <polyline points="1 4 1 10 7 10"></polyline>
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                    </svg>
                    Previous Sessions
                  </button>
                </div>
              )}

              {/* Scrollable body */}
              <div className="spreadsheet-body">
                {/* Current Session */}
                {tab === "current" && (
                  <>
                    {!isActive && !liveSessionDocId ? (
                      <div className="spreadsheet-empty">
                        <div className="spreadsheet-empty-icon">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                        </div>
                        No active session. Start a session to see the current class list.
                      </div>
                    ) : (
                      renderTable(modalClassList, true, currentSessionDate)
                    )}
                  </>
                )}

                {/* Previous Sessions — Accordion */}
                {tab === "previous" && (
                  <>
                    {!hasPreviousSessions ? (
                      <div className="spreadsheet-empty">
                        <div className="spreadsheet-empty-icon">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 1 10 7 10"></polyline>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                          </svg>
                        </div>
                        No previous sessions found.
                      </div>
                    ) : (
                      <div className="session-accordion">
                        {Object.entries(previousGroups).map(([sessId, sessRecords], idx) => {
                          const isExpanded = expandedSession === sessId;
                          const headerInfo = formatSessionHeader(sessId);
                          const sessMeta = sessionMeta[sessId];
                          const sessDate = sessMeta?.date || sessMeta?.createdAt || null;
                          // Count statuses for this session
                          const pCount = sessRecords.filter((r) => r.status === "Present").length;
                          const lCount = sessRecords.filter((r) => r.status === "Late").length;
                          const aCount = sessRecords.filter((r) => r.status === "Absent").length;

                          return (
                            <div key={sessId} className={`session-accordion-item ${isExpanded ? "expanded" : ""}`}>
                              <button
                                className="session-accordion-trigger"
                                onClick={() => setExpandedSession(isExpanded ? null : sessId)}
                              >
                                <div className="session-accordion-left">
                                  <svg className="session-accordion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                  </svg>
                                  <div className="session-accordion-info">
                                    <span className="session-accordion-label">{headerInfo.label}</span>
                                    {headerInfo.sub && <span className="session-accordion-sub">{headerInfo.sub}</span>}
                                  </div>
                                </div>
                                <div className="session-accordion-right">
                                  <div className="session-accordion-badges">
                                    {pCount > 0 && <span className="session-mini-badge present">{pCount}</span>}
                                    {lCount > 0 && <span className="session-mini-badge late">{lCount}</span>}
                                    {aCount > 0 && <span className="session-mini-badge absent">{aCount}</span>}
                                  </div>
                                  <span className="session-accordion-count">{sessRecords.length} student{sessRecords.length !== 1 ? "s" : ""}</span>
                                  <svg className={`session-accordion-chevron ${isExpanded ? "rotated" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                  </svg>
                                </div>
                              </button>
                              <div className={`session-accordion-content ${isExpanded ? "open" : ""}`}>
                                <div className="session-accordion-body">
                                  {renderTable(sessRecords, false, sessDate)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Close button */}
              <button className="spreadsheet-close-btn" onClick={() => setClassListModal(null)}>
                Close
              </button>
            </div>
          </div>
        );
      })()}
      {/* ── Face Preview Modal ── */}
      {facePreviewStudent && (
        <div
          className="face-preview-overlay"
          onClick={() => setFacePreviewStudent(null)}
        >
          <div className="face-preview-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button className="face-preview-close" onClick={() => setFacePreviewStudent(null)}>
              ✕
            </button>

            {/* Avatar area */}
            <div className={`face-preview-avatar ${facePreviewStudent.hasFace ? "registered" : "not-registered"}`}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke={facePreviewStudent.hasFace ? "#4A7C59" : "#EF4444"}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>

            {/* Student name */}
            <div className="face-preview-name">{facePreviewStudent.name}</div>

            {/* Registration status badge */}
            <div className={`face-preview-status ${facePreviewStudent.hasFace ? "registered" : "not-registered"}`}>
              <span style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: facePreviewStudent.hasFace ? "#10B981" : "#EF4444",
                display: "inline-block",
              }}></span>
              {facePreviewStudent.hasFace ? "Face Registered" : "Not Registered"}
            </div>

            {/* Info rows */}
            <div className="face-preview-info">
              {facePreviewStudent.email && (
                <div className="face-preview-info-row">
                  <span className="label">Email</span>
                  <span className="value">{facePreviewStudent.email}</span>
                </div>
              )}
              <div className="face-preview-info-row">
                <span className="label">Attendance</span>
                <span className="value" style={{
                  color: facePreviewStudent.status === "Present" ? "#047857"
                    : facePreviewStudent.status === "Late" ? "#B45309"
                    : facePreviewStudent.status === "Absent" ? "#991B1B"
                    : "var(--text-muted)",
                }}>
                  {facePreviewStudent.status}
                </span>
              </div>
              <div className="face-preview-info-row">
                <span className="label">Face Recognition</span>
                <span className="value" style={{
                  color: facePreviewStudent.hasFace ? "#047857" : "#991B1B",
                }}>
                  {facePreviewStudent.hasFace ? "✓ Active" : "✗ Inactive"}
                </span>
              </div>
            </div>

            {/* Action button */}
            <button className="face-preview-action-btn" onClick={() => setFacePreviewStudent(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
