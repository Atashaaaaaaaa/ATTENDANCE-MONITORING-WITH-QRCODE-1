"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { addDoc, collection, query, where, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { loadModels, getDescriptor, compareDescriptors, areModelsLoaded } from "@/lib/faceService";

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
function determineStatus(scanDate, scheduleTime) {
  if (!scheduleTime) return "Present";
  const parsed = parseScheduleTime(scheduleTime);
  if (!parsed) return "Present";

  const scanMinutes = scanDate.getHours() * 60 + scanDate.getMinutes();
  const lateThreshold = parsed.startMinutes + 15; // 15 min grace period

  if (scanMinutes <= lateThreshold) return "Present";
  if (scanMinutes <= parsed.endMinutes) return "Late";
  return "Absent"; // If scanned after class end time, mark as Absent
}

export default function StudentAttendance() {
  const { user, userData } = useAuth();
  // Camera state
  const [activeSubject, setActiveSubject] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanResults, setScanResults] = useState({});
  const [activeSessions, setActiveSessions] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [allTodayRecords, setAllTodayRecords] = useState([]);
  // Session tab state per subject: "current" or "previous"
  const [sessionTab, setSessionTab] = useState({});
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  // Track previous session IDs to detect session changes
  const prevSessionIdsRef = useRef({});

  // Face recognition state
  const [modelsReady, setModelsReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState(null); // { type: 'success'|'error'|'warning', text: string }
  const [registeredDescriptor, setRegisteredDescriptor] = useState(null);

  // Load face-api models on mount
  useEffect(() => {
    if (areModelsLoaded()) {
      setModelsReady(true);
      return;
    }
    loadModels()
      .then(() => setModelsReady(true))
      .catch((err) => console.error('Failed to load face models:', err));
  }, []);

  // Fetch this student's registered face descriptor
  useEffect(() => {
    if (!user?.uid) return;
    const fetchDescriptor = async () => {
      try {
        // Try users collection first, then students
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().faceDescriptor) {
          setRegisteredDescriptor(userDoc.data().faceDescriptor);
          return;
        }
        const studentDoc = await getDoc(doc(db, 'students', user.uid));
        if (studentDoc.exists() && studentDoc.data().faceDescriptor) {
          setRegisteredDescriptor(studentDoc.data().faceDescriptor);
        }
      } catch (e) {
        console.error('Error fetching face descriptor:', e);
      }
    };
    fetchDescriptor();
  }, [user?.uid]);

  // Fetch sections where student is enrolled
  useEffect(() => {
    if (!user?.uid) return;

    const fetchSubjects = async () => {
      try {
        // Get all sections and filter for ones containing this student
        const sectionsSnap = await getDocs(collection(db, "sections"));
        const fetched = [];
        sectionsSnap.forEach((d) => {
          const data = d.data();
          const studentsList = data.students || [];
          if (studentsList.includes(user.uid)) {
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
            fetched.push({
              id: d.id,
              code: data.subject?.substring(0, 6)?.toUpperCase() || "SUBJ",
              name: data.subject || "Untitled",
              sectionId: d.id,
              section: data.section || "—",
              teacher: data.teacher || "TBD",
              schedule: scheduleStr,
              scheduleTime: scheduleTime,
              room: data.room || "TBD",
            });
          }
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

  // Listen for active sessions from teachers in real-time
  useEffect(() => {
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

  // Listen for today's attendance records for this student
  useEffect(() => {
    if (!user?.uid) return;

    const today = new Date().toISOString().split("T")[0];
    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", user.uid),
      where("date", "==", today)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = {};
      const allRecords = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const record = {
          id: docSnap.id,
          time: data.timeMarked || "",
          date: today,
          status: data.status || "Present",
          subjectName: data.subjectName || "",
          subjectId: data.subjectId || "",
          method: data.method || "",
          sessionId: data.sessionId || null,
        };
        allRecords.push(record);
        if (data.subjectId) {
          // Only populate scanResults with records from the CURRENT active session
          // This prevents old session data from showing as "present" in the new session
          const sessionKey = data.subjectId + "_" + (data.sectionId || data.subjectId);
          const activeSession = activeSessions[sessionKey];
          if (activeSession?.docId && data.sessionId === activeSession.docId) {
            results[data.subjectId] = record;
          }
        }
      });
      setScanResults(results);
      setAllTodayRecords(allRecords);
    }, () => {
      // silent fail
    });

    return () => unsubscribe();
  }, [user?.uid, activeSessions]);

  // Clear stale scanResults when active sessions change (new session started)
  useEffect(() => {
    const currentIds = {};
    for (const key in activeSessions) {
      currentIds[key] = activeSessions[key]?.docId || null;
    }

    const prevIds = prevSessionIdsRef.current;
    let sessionChanged = false;

    for (const key in currentIds) {
      if (prevIds[key] && prevIds[key] !== currentIds[key]) {
        sessionChanged = true;
        break;
      }
    }
    // Also check if a session was removed (ended)
    for (const key in prevIds) {
      if (prevIds[key] && !currentIds[key]) {
        sessionChanged = true;
        break;
      }
    }

    if (sessionChanged) {
      // Clear scanResults so old session data doesn't persist
      setScanResults({});
    }

    prevSessionIdsRef.current = currentIds;
  }, [activeSessions]);

  // Load attendance history for summary chart
  useEffect(() => {
    if (!user?.uid || subjects.length === 0) return;

    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = [];
      snapshot.forEach((docSnap) => {
        history.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAttendanceHistory(history);
    }, () => {});

    return () => unsubscribe();
  }, [user?.uid, subjects]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera for a specific subject
  const startCamera = useCallback(async (subjectId) => {
    setCameraError(null);
    setActiveSubject(subjectId);
    setScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permission."
          : err.name === "NotFoundError"
          ? "No camera found on this device."
          : "Could not access camera: " + err.message
      );
      setScanning(false);
    }
  }, []);

  // Close camera
  const closeCamera = useCallback(() => {
    stopCamera();
    setActiveSubject(null);
    setScanning(false);
    setCameraError(null);
  }, [stopCamera]);

  // Capture face, verify identity, & mark attendance
  const captureFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !activeSubject) return;

    setVerifying(true);
    setVerificationMessage(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Step 1: Check if student has registered their face
    if (!registeredDescriptor || registeredDescriptor.length === 0) {
      setVerifying(false);
      setVerificationMessage({ type: 'warning', text: 'You have not registered your face yet. Please go to your Profile page to register.' });
      return;
    }

    // Step 2: Check if face-api models are loaded
    if (!modelsReady) {
      setVerifying(false);
      setVerificationMessage({ type: 'error', text: 'Face recognition models are still loading. Please wait a moment.' });
      return;
    }

    // Step 3: Detect face and extract descriptor from the captured frame
    let capturedDescriptor;
    try {
      capturedDescriptor = await getDescriptor(canvas);
    } catch (err) {
      console.error('Face detection error:', err);
      setVerifying(false);
      setVerificationMessage({ type: 'error', text: 'Face detection failed. Please try again.' });
      return;
    }

    if (!capturedDescriptor) {
      setVerifying(false);
      setVerificationMessage({ type: 'error', text: 'No face detected in the frame. Please position your face clearly and try again.' });
      return;
    }

    // Step 4: Compare captured descriptor with registered descriptor
    const distance = compareDescriptors(capturedDescriptor, registeredDescriptor);
    const MATCH_THRESHOLD = 0.6; // lower = stricter

    if (distance > MATCH_THRESHOLD) {
      setVerifying(false);
      setVerificationMessage({ type: 'error', text: `Face does not match your registered profile (confidence: ${Math.round((1 - distance) * 100)}%). Please try again or re-register your face.` });
      return;
    }

    // Step 5: Face verified! Capture snapshot and mark attendance
    const subject = subjects.find((s) => s.id === activeSubject);
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const sessionKey = subject?.id + "_" + subject?.sectionId;
    const session = activeSessions[sessionKey];
    const scheduleTime = session?.scheduleTime || subject?.scheduleTime;
    const status = determineStatus(now, scheduleTime);

    // Capture face snapshot from canvas as compressed JPEG data URL
    let faceSnapshot = "";
    try {
      faceSnapshot = canvas.toDataURL("image/jpeg", 0.6);
    } catch (e) {
      // snapshot capture failed — continue without it
    }

    stopCamera();
    setActiveSubject(null);
    setScanning(false);
    setVerifying(false);
    setVerificationMessage({ type: 'success', text: `Face verified! (confidence: ${Math.round((1 - distance) * 100)}%) — Marked as ${status}` });

    // Clear the message after a few seconds
    setTimeout(() => setVerificationMessage(null), 5000);

    try {
      await addDoc(collection(db, "attendance"), {
        studentId: user?.uid || "unknown",
        studentName: userData?.fullName || userData?.name || user?.email || "Unknown",
        sessionId: session?.docId || "face_scan",
        subjectId: activeSubject,
        subjectCode: subject?.code || "",
        subjectName: subject?.name || "",
        sectionId: subject?.sectionId || "",
        date: today,
        timestamp: now.toISOString(),
        timeMarked: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: status,
        method: "facial_recognition",
        faceMatchDistance: distance,
        faceSnapshot: faceSnapshot,
      });
    } catch (e) {
      // Local mode — save result locally
      setScanResults((prev) => ({
        ...prev,
        [activeSubject]: {
          time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          date: now.toLocaleDateString(),
          status: status,
          subjectName: subject?.name || "",
        },
      }));
    }
  }, [activeSubject, subjects, stopCamera, user?.uid, userData, activeSessions, registeredDescriptor, modelsReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Calculate attendance summary per subject
  const getSubjectSummary = (subjectId) => {
    const subjectRecords = attendanceHistory.filter((r) => r.subjectId === subjectId);
    const present = subjectRecords.filter((r) => r.status === "Present").length;
    const late = subjectRecords.filter((r) => r.status === "Late").length;
    const absent = subjectRecords.filter((r) => r.status === "Absent").length;
    const total = present + late + absent;
    return { present, late, absent, total };
  };

  // Get current session result for a subject
  const getCurrentSessionResult = (subject) => {
    const sessionKey = subject.id + "_" + subject.sectionId;
    const session = activeSessions[sessionKey];
    if (!session?.docId) return null;
    return allTodayRecords.find(
      (r) => r.subjectId === subject.id && r.sessionId === session.docId
    );
  };

  // Get previous session results for a subject
  const getPreviousSessionResults = (subject) => {
    const sessionKey = subject.id + "_" + subject.sectionId;
    const currentSessionId = activeSessions[sessionKey]?.docId;
    return allTodayRecords.filter(
      (r) => r.subjectId === subject.id && r.sessionId && r.sessionId !== currentSessionId
    );
  };

  // Draw donut chart
  const drawDonutChart = (canvasEl, present, late, absent) => {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    const total = present + late + absent;
    const centerX = canvasEl.width / 2;
    const centerY = canvasEl.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const innerRadius = radius * 0.6;

    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    if (total === 0) {
      // Draw empty state
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
      ctx.fillStyle = "#F3F4F6";
      ctx.fill();

      ctx.font = "600 12px Inter, sans-serif";
      ctx.fillStyle = "#9CA3AF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No Data", centerX, centerY);
      return;
    }

    const segments = [
      { value: present, color: "#10B981" },
      { value: late, color: "#F59E0B" },
      { value: absent, color: "#EF4444" },
    ];

    let startAngle = -Math.PI / 2;
    segments.forEach((seg) => {
      if (seg.value === 0) return;
      const sliceAngle = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Center text
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    ctx.font = "800 18px Inter, sans-serif";
    ctx.fillStyle = "#1A3A28";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${rate}%`, centerX, centerY - 6);
    ctx.font = "500 9px Inter, sans-serif";
    ctx.fillStyle = "#9CA3AF";
    ctx.fillText("Attendance", centerX, centerY + 10);
  };

  return (
    <>
      <div className="page-header">
        <h1>My Attendance</h1>
        <p>Scan your face per subject to mark attendance. Scanning is only available when your teacher starts a session.</p>
      </div>

      {/* Face Recognition Model Loading */}
      {!modelsReady && (
        <div className="card" style={{
          background: "#F0FDF4", border: "1px solid #BBF7D0",
          color: "#15803D", fontWeight: 600, fontSize: "0.85rem",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <div style={{
            width: "18px", height: "18px", border: "2.5px solid #BBF7D0",
            borderTopColor: "#15803D", borderRadius: "50%",
            animation: "spin 1s linear infinite", flexShrink: 0,
          }}></div>
          Loading face recognition models...
        </div>
      )}

      {/* Face not registered warning */}
      {modelsReady && !registeredDescriptor && (
        <div className="card" style={{
          background: "#FFF7ED", border: "1px solid #FED7AA",
          color: "#C2410C", fontWeight: 600, fontSize: "0.85rem",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          Face not registered. Go to your Profile to register your face before taking attendance.
        </div>
      )}

      {/* Verification feedback */}
      {verificationMessage && (
        <div className="card" style={{
          background: verificationMessage.type === 'success' ? '#ECFDF5' : verificationMessage.type === 'warning' ? '#FFF7ED' : '#FEF2F2',
          border: `1px solid ${verificationMessage.type === 'success' ? '#A7F3D0' : verificationMessage.type === 'warning' ? '#FED7AA' : '#FECACA'}`,
          color: verificationMessage.type === 'success' ? '#047857' : verificationMessage.type === 'warning' ? '#C2410C' : '#991B1B',
          fontWeight: 600, fontSize: "0.85rem",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          {verificationMessage.type === 'success' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          )}
          {verificationMessage.text}
        </div>
      )}

      {/* Camera Error */}
      {cameraError && (
        <div className="card" style={{
          background: "#FEF2F2", border: "1px solid #FECACA",
          color: "#991B1B", fontWeight: 600, fontSize: "0.9rem",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> {cameraError}
          <button onClick={closeCamera} style={{
            marginLeft: "12px", background: "none", border: "none",
            color: "#991B1B", cursor: "pointer", textDecoration: "underline",
          }}>Dismiss</button>
        </div>
      )}

      {loadingSubjects ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <p style={{ color: "var(--text-muted)" }}>Loading your classes...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg></div>
          <h3 style={{ margin: "0 0 8px", color: "var(--text-primary)" }}>No Subjects Enrolled</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "400px", margin: "0 auto" }}>
            Your enrolled subjects will appear here once your teacher adds you to their class.
          </p>
        </div>
      ) : (
        <>
          {/* Subject Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px", marginBottom: "24px" }}>
            {subjects.map((subject) => {
              const sessionKey = subject.id + "_" + subject.sectionId;
              const isSessionActive = !!activeSessions[sessionKey];
              const currentSessionId = activeSessions[sessionKey]?.docId;
              const currentResult = getCurrentSessionResult(subject);
              const previousResults = getPreviousSessionResults(subject);
              const hasResult = currentResult || scanResults[subject.id];
              const displayResult = currentResult || scanResults[subject.id];
              const isActive = activeSubject === subject.id;
              const activeTab = sessionTab[subject.id] || (isSessionActive ? "current" : (previousResults.length > 0 ? "previous" : "current"));
              const hasPreviousSessions = previousResults.length > 0;

              return (
                <div key={subject.id} className="card" style={{
                  marginBottom: 0,
                  border: isActive ? "2px solid var(--primary)" : hasResult ? "2px solid #A7F3D0" : undefined,
                  opacity: !isSessionActive && !hasResult ? 0.7 : 1,
                  transition: "all 0.3s ease",
                }}>
                  {/* Subject Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
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
                      <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {subject.name}
                      </h3>
                      <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {subject.teacher}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                      {displayResult && (
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%",
                          background: displayResult.status === "Present" ? "#ECFDF5" : displayResult.status === "Late" ? "#FFFBEB" : "#FEF2F2",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {displayResult.status === "Present" ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          ) : displayResult.status === "Late" ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          )}
                        </div>
                      )}
                      {/* Session status badge */}
                      <div style={{
                        padding: "4px 10px", borderRadius: "20px",
                        background: isSessionActive ? "#ECFDF5" : "#FEF2F2",
                        color: isSessionActive ? "#047857" : "#991B1B",
                        fontSize: "0.65rem", fontWeight: 700,
                        display: "flex", alignItems: "center", gap: "5px",
                      }}>
                        <span style={{
                          width: "6px", height: "6px", borderRadius: "50%",
                          background: isSessionActive ? "#10B981" : "#EF4444",
                          display: "inline-block",
                          animation: isSessionActive ? "pulse 2s infinite" : "none",
                        }}></span>
                        {isSessionActive ? "Session Active" : "No Active Session"}
                      </div>
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div style={{
                    display: "flex", gap: "16px", fontSize: "0.78rem",
                    color: "var(--text-secondary)", marginBottom: "16px",
                  }}>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {subject.schedule}</span>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> {subject.room}</span>
                  </div>

                  {/* Session Tabs */}
                  {(isSessionActive || hasPreviousSessions) && (
                    <div style={{
                      display: "flex", gap: "4px", marginBottom: "16px",
                      background: "var(--bg-body)", borderRadius: "10px", padding: "4px",
                      border: "1px solid var(--border-light)",
                    }}>
                      <button
                        onClick={() => setSessionTab((prev) => ({ ...prev, [subject.id]: "current" }))}
                        style={{
                          flex: 1, padding: "7px 10px", borderRadius: "8px", border: "none",
                          background: activeTab === "current" ? "var(--primary)" : "transparent",
                          color: activeTab === "current" ? "white" : "var(--text-secondary)",
                          fontWeight: 600, fontSize: "0.72rem", cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        Current
                      </button>
                      <button
                        onClick={() => setSessionTab((prev) => ({ ...prev, [subject.id]: "previous" }))}
                        style={{
                          flex: 1, padding: "7px 10px", borderRadius: "8px", border: "none",
                          background: activeTab === "previous" ? "var(--primary)" : "transparent",
                          color: activeTab === "previous" ? "white" : "var(--text-secondary)",
                          fontWeight: 600, fontSize: "0.72rem", cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        Previous
                      </button>
                    </div>
                  )}

                  {/* Camera feed — only for active scan */}
                  {isActive && (
                    <div style={{
                      position: "relative", background: "#000", borderRadius: "12px",
                      overflow: "hidden", marginBottom: "16px",
                    }}>
                      <video
                        ref={videoRef}
                        autoPlay playsInline muted
                        style={{
                          width: "100%", maxHeight: "300px", objectFit: "cover",
                          display: "block", transform: "scaleX(-1)",
                        }}
                      />
                      <div style={{
                        position: "absolute", top: "50%", left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "160px", height: "200px",
                        border: "3px solid rgba(74, 124, 89, 0.8)",
                        borderRadius: "50%",
                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.3)",
                        animation: "faceScanPulse 2s ease-in-out infinite",
                      }} />
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        padding: "14px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                        display: "flex", justifyContent: "center", gap: "10px",
                      }}>
                        <button onClick={closeCamera} style={{
                          padding: "10px 20px", borderRadius: "10px", border: "none",
                          background: "rgba(255,255,255,0.2)", color: "white",
                          fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                          backdropFilter: "blur(4px)",
                        }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancel</button>
                        <button onClick={captureFace} disabled={!scanning || verifying} style={{
                          padding: "10px 24px", borderRadius: "10px", border: "none",
                          background: (scanning && !verifying) ? "linear-gradient(135deg, #4A7C59, #6B9E78)" : "#666",
                          color: "white", fontWeight: 700, fontSize: "0.85rem",
                          cursor: (scanning && !verifying) ? "pointer" : "not-allowed",
                          boxShadow: (scanning && !verifying) ? "0 4px 15px rgba(74, 124, 89, 0.4)" : "none",
                          display: "flex", alignItems: "center", gap: "6px",
                        }}>
                          {verifying ? (
                            <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div> Verifying...</>
                          ) : (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Verify &amp; Mark</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Scan result — Current Tab */}
                  {displayResult && !isActive && activeTab === "current" && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "12px", borderRadius: "10px",
                      background: displayResult.status === "Present" ? "rgba(236, 253, 245, 0.8)"
                        : displayResult.status === "Late" ? "rgba(255, 251, 235, 0.8)"
                          : "rgba(254, 242, 242, 0.8)",
                      marginBottom: "12px",
                    }}>
                      <div style={{
                        width: "40px", height: "40px", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: displayResult.status === "Present" ? "#ECFDF5"
                          : displayResult.status === "Late" ? "#FFFBEB" : "#FEF2F2",
                        border: `2px solid ${displayResult.status === "Present" ? "#4A7C59"
                          : displayResult.status === "Late" ? "#F59E0B" : "#EF4444"}`,
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                          stroke={displayResult.status === "Present" ? "#047857" : displayResult.status === "Late" ? "#B45309" : "#991B1B"}
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: "0.8rem", fontWeight: 700,
                          color: displayResult.status === "Present" ? "#065F46"
                            : displayResult.status === "Late" ? "#92400E" : "#991B1B",
                        }}>
                          Marked as {displayResult.status}
                        </div>
                        <div style={{
                          fontSize: "0.72rem",
                          color: displayResult.status === "Present" ? "#047857"
                            : displayResult.status === "Late" ? "#B45309" : "#991B1B",
                        }}>
                          {displayResult.date} at {displayResult.time}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Previous Session Results */}
                  {activeTab === "previous" && !isActive && (
                    <div style={{ marginBottom: "12px" }}>
                      {previousResults.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                          No previous sessions today.
                        </div>
                      ) : (
                        previousResults.map((r, idx) => (
                          <div key={r.id || idx} style={{
                            display: "flex", alignItems: "center", gap: "12px",
                            padding: "10px 12px", borderRadius: "8px",
                            background: r.status === "Present" ? "rgba(236, 253, 245, 0.5)"
                              : r.status === "Late" ? "rgba(255, 251, 235, 0.5)"
                                : "rgba(254, 242, 242, 0.5)",
                            marginBottom: "8px",
                            border: "1px solid var(--border-light)",
                          }}>
                            <div style={{
                              width: "28px", height: "28px", borderRadius: "50%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: r.status === "Present" ? "#ECFDF5"
                                : r.status === "Late" ? "#FFFBEB" : "#FEF2F2",
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke={r.status === "Present" ? "#10B981" : r.status === "Late" ? "#F59E0B" : "#EF4444"}
                                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                {r.status} — {r.time || "—"}
                              </div>
                            </div>
                            <span style={{
                              fontSize: "0.65rem", padding: "2px 8px", borderRadius: "10px",
                              background: "#F3F4F6", color: "#9CA3AF", fontWeight: 600,
                            }}>Past</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  {!isActive && activeTab === "current" && (
                    <button
                      onClick={() => isSessionActive && startCamera(subject.id)}
                      disabled={!!activeSubject || !isSessionActive}
                      title={!isSessionActive ? "Your teacher hasn't started a session yet" : ""}
                      style={{
                        width: "100%", padding: "12px", borderRadius: "10px",
                        border: displayResult ? `1.5px solid ${displayResult.status === "Present" ? "#A7F3D0" : displayResult.status === "Late" ? "#FDE68A" : "#FECACA"}` : !isSessionActive ? "1.5px solid #E5E7EB" : "none",
                        background: !isSessionActive
                          ? "#F9FAFB"
                          : displayResult
                          ? "transparent"
                          : "linear-gradient(135deg, #4A7C59, #6B9E78)",
                        color: !isSessionActive ? "#9CA3AF" : displayResult ? (displayResult.status === "Present" ? "#047857" : "#B45309") : "white",
                        fontWeight: 700, fontSize: "0.85rem",
                        cursor: !isSessionActive || activeSubject ? "not-allowed" : "pointer",
                        opacity: activeSubject && !isActive ? 0.5 : 1,
                        transition: "all 0.2s ease",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      }}
                    >
                      {!isSessionActive
                        ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Waiting for Teacher to Start Session</>
                        : displayResult
                        ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg> Retake Attendance</>
                        : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> Take Attendance</>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Attendance Summary Section */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Today&apos;s Attendance Summary</div>
              <span className="status-badge active">
                <span className="status-dot"></span>
                {Object.keys(scanResults).length} / {subjects.length} Subjects
              </span>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Section</th>
                  <th>Session</th>
                  <th>Time Marked</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => {
                  const sessionKey = subject.id + "_" + subject.sectionId;
                  const currentResult = getCurrentSessionResult(subject);
                  const result = currentResult || scanResults[subject.id];
                  const isSessionActive = !!activeSessions[sessionKey];
                  return (
                    <tr key={subject.id}>
                      <td style={{ fontWeight: 600 }}>{subject.name}</td>
                      <td>{subject.section}</td>
                      <td>
                        <span style={{
                          padding: "3px 8px", borderRadius: "12px",
                          background: isSessionActive ? "#ECFDF5" : "#F3F4F6",
                          color: isSessionActive ? "#047857" : "#9CA3AF",
                          fontSize: "0.72rem", fontWeight: 600,
                        }}>
                          {isSessionActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{result ? result.time : "—"}</td>
                      <td>
                        {result ? (
                          <span style={{
                            padding: "3px 10px", borderRadius: "12px", fontWeight: 600, fontSize: "0.72rem",
                            background: result.status === "Present" ? "#ECFDF5"
                              : result.status === "Late" ? "#FFFBEB" : "#FEF2F2",
                            color: result.status === "Present" ? "#047857"
                              : result.status === "Late" ? "#B45309" : "#991B1B",
                          }}>
                            <span style={{
                              width: "6px", height: "6px", borderRadius: "50%", display: "inline-block", marginRight: "4px",
                              background: result.status === "Present" ? "#10B981"
                                : result.status === "Late" ? "#F59E0B" : "#EF4444",
                            }}></span>
                            {result.status}
                          </span>
                        ) : (
                          <span className="status-badge" style={{ background: "#F3F4F6", color: "#9CA3AF" }}>
                            Not Scanned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Attendance Overview Chart */}
          {subjects.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Attendance Overview</div>
                <div style={{ display: "flex", gap: "16px", fontSize: "0.75rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981", display: "inline-block" }}></span> Present
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F59E0B", display: "inline-block" }}></span> Late
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444", display: "inline-block" }}></span> Absent
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px", padding: "8px 0" }}>
                {subjects.map((subject) => {
                  const summary = getSubjectSummary(subject.id);
                  return (
                    <div key={subject.id} style={{
                      textAlign: "center", padding: "16px",
                      borderRadius: "12px", border: "1px solid var(--border-light)",
                      background: "var(--bg-body)",
                    }}>
                      <canvas
                        ref={(el) => {
                          if (el) {
                            el.width = 120;
                            el.height = 120;
                            drawDonutChart(el, summary.present, summary.late, summary.absent);
                          }
                        }}
                        width="120" height="120"
                        style={{ margin: "0 auto 8px", display: "block" }}
                      />
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "2px" }}>
                        {subject.code}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {subject.section}
                      </div>
                      {summary.total > 0 && (
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "6px" }}>
                          P:{summary.present} L:{summary.late} A:{summary.absent}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Hidden canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        @keyframes faceScanPulse {
          0%, 100% { border-color: rgba(74, 124, 89, 0.8); box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3), 0 0 20px rgba(74, 124, 89, 0.3); }
          50% { border-color: rgba(107, 158, 120, 1); box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3), 0 0 40px rgba(74, 124, 89, 0.6); }
        }
      `}</style>
    </>
  );
}
