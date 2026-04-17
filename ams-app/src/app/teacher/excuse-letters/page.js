"use client";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

// Get file type icon SVG based on MIME type
function FileIcon({ type }) {
  if (type?.startsWith("image/")) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}

export default function TeacherExcuseLetters() {
  const { user } = useAuth();

  // State
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All"); // "All", "Pending", "Approved", "Rejected"
  const [expandedCard, setExpandedCard] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({}); // { [excuseId]: noteText }
  const [processing, setProcessing] = useState(null); // excuseId being processed
  const [actionMessage, setActionMessage] = useState(null); // { type, text }

  // Listen for excuse letters addressed to this teacher in real-time
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "excuseLetters"),
      where("teacherId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const letters = [];
        snapshot.forEach((docSnap) => {
          letters.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort: Pending first, then by submittedAt descending
        letters.sort((a, b) => {
          // Pending always comes first
          if (a.status === "Pending" && b.status !== "Pending") return -1;
          if (a.status !== "Pending" && b.status === "Pending") return 1;
          // Then sort by time descending
          const aTime = a.submittedAt?.toMillis?.() || a.submittedAt?.seconds * 1000 || 0;
          const bTime = b.submittedAt?.toMillis?.() || b.submittedAt?.seconds * 1000 || 0;
          return bTime - aTime;
        });
        setSubmissions(letters);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Approve an excuse letter
  const handleApprove = async (excuse) => {
    setProcessing(excuse.id);
    setActionMessage(null);

    try {
      // 1. Update excuse letter status to Approved
      await updateDoc(doc(db, "excuseLetters", excuse.id), {
        status: "Approved",
        teacherNote: reviewNotes[excuse.id] || "",
        reviewedAt: serverTimestamp(),
      });

      // 2. Find and update the matching attendance record to "Excused"
      // Look for attendance records matching the student, subject, section, and date
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("studentId", "==", excuse.studentId),
        where("date", "==", excuse.date)
      );
      const attendanceSnap = await getDocs(attendanceQuery);

      let foundMatch = false;
      for (const attendanceDoc of attendanceSnap.docs) {
        const data = attendanceDoc.data();
        // Match by sectionId (and optionally subjectId)
        if (
          data.sectionId === excuse.sectionId ||
          data.subjectId === excuse.subjectId
        ) {
          await updateDoc(doc(db, "attendance", attendanceDoc.id), {
            status: "Excused",
          });
          foundMatch = true;
        }
      }

      // 3. If no attendance record exists for that date, create one marked as Excused
      if (!foundMatch) {
        await addDoc(collection(db, "attendance"), {
          studentId: excuse.studentId,
          studentName: excuse.studentName,
          subjectId: excuse.subjectId || "",
          subjectCode: "",
          subjectName: excuse.subjectName || "",
          sectionId: excuse.sectionId || "",
          sessionId: "excuse_approved",
          date: excuse.date,
          timestamp: new Date().toISOString(),
          timeMarked: "—",
          status: "Excused",
          method: "excuse_letter",
        });
      }

      // Clear the review note
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[excuse.id];
        return next;
      });

      setActionMessage({ type: "success", text: `Approved excuse for ${excuse.studentName}. Attendance marked as Excused.` });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error("Error approving excuse letter:", err);
      setActionMessage({ type: "error", text: "Failed to approve. Please try again." });
    } finally {
      setProcessing(null);
    }
  };

  // Reject an excuse letter
  const handleReject = async (excuse) => {
    setProcessing(excuse.id);
    setActionMessage(null);

    try {
      // 1. Update excuse letter status to Rejected
      await updateDoc(doc(db, "excuseLetters", excuse.id), {
        status: "Rejected",
        teacherNote: reviewNotes[excuse.id] || "",
        reviewedAt: serverTimestamp(),
      });

      // 2. Ensure the attendance record stays as "Absent" (or create one if missing)
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("studentId", "==", excuse.studentId),
        where("date", "==", excuse.date)
      );
      const attendanceSnap = await getDocs(attendanceQuery);

      let foundMatch = false;
      for (const attendanceDoc of attendanceSnap.docs) {
        const data = attendanceDoc.data();
        if (
          data.sectionId === excuse.sectionId ||
          data.subjectId === excuse.subjectId
        ) {
          // If it was somehow marked Excused, revert to Absent
          if (data.status === "Excused") {
            await updateDoc(doc(db, "attendance", attendanceDoc.id), {
              status: "Absent",
            });
          }
          foundMatch = true;
        }
      }

      // Clear review note
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[excuse.id];
        return next;
      });

      setActionMessage({ type: "success", text: `Rejected excuse for ${excuse.studentName}. Attendance remains as Absent.` });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error("Error rejecting excuse letter:", err);
      setActionMessage({ type: "error", text: "Failed to reject. Please try again." });
    } finally {
      setProcessing(null);
    }
  };

  // Format Firestore timestamp for display
  const formatTimestamp = (ts) => {
    if (!ts) return "—";
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  // Download/view uploaded file
  const handleViewFile = (fileData, fileName) => {
    if (!fileData) return;
    const link = document.createElement("a");
    link.href = fileData;
    link.download = fileName || "excuse-letter";
    link.target = "_blank";
    link.click();
  };

  // Filter submissions
  const filteredSubmissions = filter === "All"
    ? submissions
    : submissions.filter((s) => s.status === filter);

  // Count by status for filter badges
  const counts = {
    All: submissions.length,
    Pending: submissions.filter((s) => s.status === "Pending").length,
    Approved: submissions.filter((s) => s.status === "Approved").length,
    Rejected: submissions.filter((s) => s.status === "Rejected").length,
  };

  return (
    <>
      <div className="page-header">
        <h1>Excuse Letters</h1>
        <p>Review and manage excuse letter submissions from your students.</p>
      </div>

      {/* ── Action Message ── */}
      {actionMessage && (
        <div
          className="card"
          style={{
            background: actionMessage.type === "success" ? "#ECFDF5" : "#FEF2F2",
            border: `1px solid ${actionMessage.type === "success" ? "#A7F3D0" : "#FECACA"}`,
            color: actionMessage.type === "success" ? "#047857" : "#991B1B",
            fontWeight: 600,
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {actionMessage.type === "success" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          )}
          {actionMessage.text}
        </div>
      )}

      {/* ── Stats Summary ── */}
      <div className="stats-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <div className="stat-card stat-purple">
          <div className="stat-card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div className="stat-card-label">Total Submissions</div>
          <div className="stat-card-value">{counts.All}</div>
        </div>
        <div className="stat-card stat-orange">
          <div className="stat-card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="stat-card-label">Pending Review</div>
          <div className="stat-card-value">{counts.Pending}</div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div className="stat-card-label">Approved</div>
          <div className="stat-card-value">{counts.Approved}</div>
        </div>
        <div className="stat-card stat-red">
          <div className="stat-card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <div className="stat-card-label">Rejected</div>
          <div className="stat-card-value">{counts.Rejected}</div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="excuse-filter-bar">
        {["All", "Pending", "Approved", "Rejected"].map((f) => (
          <button
            key={f}
            className={`excuse-filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
            <span className="filter-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* ── Submissions List ── */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <p style={{ color: "var(--text-muted)" }}>Loading excuse letters...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="card">
          <div className="excuse-empty">
            <div className="excuse-empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <h3>
              {filter === "All"
                ? "No Excuse Letters"
                : `No ${filter} Excuse Letters`}
            </h3>
            <p>
              {filter === "Pending"
                ? "All excuse letters have been reviewed."
                : "Excuse letter submissions from your students will appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="excuse-cards-grid">
          {filteredSubmissions.map((sub) => {
            const isExpanded = expandedCard === sub.id;
            const isPending = sub.status === "Pending";
            const isProcessing = processing === sub.id;
            const initials = (sub.studentName || "?")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();

            return (
              <div key={sub.id} className="excuse-card" style={{
                border: isPending ? "1.5px solid #FCD34D" : undefined,
              }}>
                {/* Card Header (clickable) */}
                <div
                  className="excuse-card-header"
                  onClick={() => setExpandedCard(isExpanded ? null : sub.id)}
                >
                  <div className="excuse-card-left">
                    <div className="excuse-card-avatar">{initials}</div>
                    <div className="excuse-card-info">
                      <div className="excuse-card-student">{sub.studentName}</div>
                      <div className="excuse-card-meta">
                        <span>{sub.subjectName}</span>
                        <span className="excuse-card-meta-dot"></span>
                        <span>{sub.sectionName || sub.sectionId}</span>
                        <span className="excuse-card-meta-dot"></span>
                        <span>{sub.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="excuse-card-right">
                    <span className={`excuse-status ${sub.status?.toLowerCase()}`}>
                      {sub.status}
                    </span>
                    <div className={`excuse-card-expand ${isExpanded ? "open" : ""}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Card Body (expanded) */}
                {isExpanded && (
                  <div className="excuse-card-body">
                    <div className="excuse-card-body-inner">
                      {/* Timestamps */}
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                        Submitted: {formatTimestamp(sub.submittedAt)}
                        {sub.reviewedAt && (
                          <span> — Reviewed: {formatTimestamp(sub.reviewedAt)}</span>
                        )}
                      </div>

                      {/* Student info */}
                      <div style={{
                        display: "flex", gap: "16px", flexWrap: "wrap",
                        marginBottom: "16px", fontSize: "0.82rem",
                      }}>
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>Email: </span>
                          <span style={{ fontWeight: 600 }}>{sub.studentEmail || "—"}</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>Type: </span>
                          <span style={{ fontWeight: 600 }}>
                            {sub.type === "file" ? "File Upload" : "Typed Letter"}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="excuse-content-label">
                        {sub.type === "text" ? "Excuse Letter Content" : "Uploaded File"}
                      </div>

                      {sub.type === "text" ? (
                        <div className="excuse-content-text">{sub.content}</div>
                      ) : (
                        <>
                          <div className="excuse-content-file">
                            <div className="excuse-content-file-icon">
                              <FileIcon type={sub.fileType} />
                            </div>
                            <div
                              className="excuse-content-file-name"
                              onClick={() => handleViewFile(sub.fileData, sub.fileName)}
                            >
                              {sub.fileName || "excuse-letter"}
                            </div>
                          </div>
                          {/* Show image preview if it's an image */}
                          {sub.fileType?.startsWith("image/") && sub.fileData && (
                            <img
                              src={sub.fileData}
                              alt="Excuse letter"
                              className="excuse-image-preview"
                            />
                          )}
                        </>
                      )}

                      {/* Existing Teacher Note (for reviewed letters) */}
                      {sub.teacherNote && !isPending && (
                        <div className="excuse-teacher-note">
                          <div className="excuse-teacher-note-label">Your Note:</div>
                          {sub.teacherNote}
                        </div>
                      )}

                      {/* Review Actions (for Pending letters) */}
                      {isPending && (
                        <>
                          <div style={{ marginTop: "16px" }}>
                            <div className="excuse-content-label">Add a Note (Optional)</div>
                            <textarea
                              className="excuse-review-note"
                              placeholder="Add a note for the student (e.g., reason for approval/rejection)..."
                              value={reviewNotes[sub.id] || ""}
                              onChange={(e) =>
                                setReviewNotes((prev) => ({
                                  ...prev,
                                  [sub.id]: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div className="excuse-review-actions">
                            <button
                              className="btn btn-green"
                              onClick={() => handleApprove(sub)}
                              disabled={isProcessing}
                              style={{ flex: 1, justifyContent: "center", padding: "10px 20px" }}
                            >
                              {isProcessing ? (
                                <span style={{
                                  width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)",
                                  borderTopColor: "white", borderRadius: "50%",
                                  animation: "spin 1s linear infinite", display: "inline-block",
                                }}></span>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                              Approve — Mark as Excused
                            </button>
                            <button
                              className="btn btn-red"
                              onClick={() => handleReject(sub)}
                              disabled={isProcessing}
                              style={{ flex: 1, justifyContent: "center", padding: "10px 20px" }}
                            >
                              {isProcessing ? (
                                <span style={{
                                  width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)",
                                  borderTopColor: "white", borderRadius: "50%",
                                  animation: "spin 1s linear infinite", display: "inline-block",
                                }}></span>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              )}
                              Reject — Keep as Absent
                            </button>
                          </div>
                        </>
                      )}
                    </div>
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
