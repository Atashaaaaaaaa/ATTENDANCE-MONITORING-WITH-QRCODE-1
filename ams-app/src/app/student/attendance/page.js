"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { addDoc, collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function StudentAttendance() {
  const { user } = useAuth();
  // Camera state
  const [activeSubject, setActiveSubject] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanResults, setScanResults] = useState({});
  const [activeSessions, setActiveSessions] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

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
            if (data.schedule && typeof data.schedule === "object") {
              const days = (data.schedule.days || []).join(", ");
              const time = data.schedule.time || "";
              scheduleStr = days && time ? `${days} • ${time}` : days || time || "TBD";
            } else if (typeof data.schedule === "string") {
              scheduleStr = data.schedule;
            }
            fetched.push({
              id: d.id,
              code: data.subject?.substring(0, 6)?.toUpperCase() || "SUBJ",
              name: data.subject || "Untitled",
              sectionId: d.id,
              section: data.section || "—",
              teacher: data.teacher || "TBD",
              schedule: scheduleStr,
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

  // Capture face & mark attendance
  const captureFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !activeSubject) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const faceImageData = canvas.toDataURL("image/jpeg", 0.8);
    const sessionId = "FACE_" + Date.now();
    const subject = subjects.find((s) => s.id === activeSubject);

    setScanResults((prev) => ({
      ...prev,
      [activeSubject]: {
        id: sessionId,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date: new Date().toLocaleDateString(),
        image: faceImageData,
        subjectName: subject?.name || "",
      },
    }));

    stopCamera();
    setActiveSubject(null);
    setScanning(false);

    try {
      await addDoc(collection(db, "attendance"), {
        studentId: user?.uid || "unknown",
        sessionId: sessionId,
        subjectId: activeSubject,
        subjectCode: subject?.code || "",
        sectionId: subject?.sectionId || "",
        timestamp: new Date().toISOString(),
        status: "present",
        method: "facial_recognition",
      });
    } catch (e) {
      // Local mode
    }
  }, [activeSubject, subjects, stopCamera, user?.uid]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <>
      <div className="page-header">
        <h1>My Attendance</h1>
        <p>Scan your face per subject to mark attendance. Scanning is only available when your teacher starts a session.</p>
      </div>

      {/* Camera Error */}
      {cameraError && (
        <div className="card" style={{
          background: "#FEF2F2", border: "1px solid #FECACA",
          color: "#991B1B", fontWeight: 600, fontSize: "0.9rem",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> {cameraError}
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
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg></div>
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
              const hasResult = scanResults[subject.id];
              const isActive = activeSubject === subject.id;

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
                      {hasResult && (
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%",
                          background: "#ECFDF5", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: "1rem",
                        }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
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
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {subject.schedule}</span>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> {subject.room}</span>
                  </div>

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
                        }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancel</button>
                        <button onClick={captureFace} disabled={!scanning} style={{
                          padding: "10px 24px", borderRadius: "10px", border: "none",
                          background: scanning ? "linear-gradient(135deg, #4A7C59, #6B9E78)" : "#666",
                          color: "white", fontWeight: 700, fontSize: "0.85rem",
                          cursor: scanning ? "pointer" : "not-allowed",
                          boxShadow: scanning ? "0 4px 15px rgba(74, 124, 89, 0.4)" : "none",
                        }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Capture & Mark</button>
                      </div>
                    </div>
                  )}

                  {/* Scan result */}
                  {hasResult && !isActive && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "12px", borderRadius: "10px",
                      background: "rgba(236, 253, 245, 0.8)", marginBottom: "12px",
                    }}>
                      <img src={hasResult.image} alt="Face" style={{
                        width: "40px", height: "40px", borderRadius: "50%",
                        objectFit: "cover", border: "2px solid #4A7C59",
                        transform: "scaleX(-1)",
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#065F46" }}>
                          Attendance Marked <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginLeft: '5px'}}><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#047857" }}>
                          {hasResult.date} at {hasResult.time}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {!isActive && (
                    <button
                      onClick={() => isSessionActive && startCamera(subject.id)}
                      disabled={!!activeSubject || !isSessionActive}
                      title={!isSessionActive ? "Your teacher hasn't started a session yet" : ""}
                      style={{
                        width: "100%", padding: "12px", borderRadius: "10px",
                        border: hasResult ? "1.5px solid #A7F3D0" : !isSessionActive ? "1.5px solid #E5E7EB" : "none",
                        background: !isSessionActive
                          ? "#F9FAFB"
                          : hasResult
                          ? "transparent"
                          : "linear-gradient(135deg, #4A7C59, #6B9E78)",
                        color: !isSessionActive ? "#9CA3AF" : hasResult ? "#047857" : "white",
                        fontWeight: 700, fontSize: "0.85rem",
                        cursor: !isSessionActive || activeSubject ? "not-allowed" : "pointer",
                        opacity: activeSubject && !isActive ? 0.5 : 1,
                        transition: "all 0.2s ease",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      }}
                    >
                      {!isSessionActive
                        ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Waiting for Teacher to Start Session</>
                        : hasResult
                        ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg> Retake Attendance</>
                        : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> Take Attendance</>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Table */}
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
                  const result = scanResults[subject.id];
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
                          <span className="status-badge present">
                            <span className="status-dot"></span>Present
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
