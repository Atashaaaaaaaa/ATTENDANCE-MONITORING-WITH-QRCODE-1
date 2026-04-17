"use client";
import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

// Maximum file size: 2MB (Firestore document limit is ~1MB, base64 inflates ~33%)
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

// Convert file to base64 string
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// Format file size for display
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

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

export default function StudentExcuseLetters() {
  const { user, userData } = useAuth();

  // Form state
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [excuseDate, setExcuseDate] = useState("");
  const [excuseType, setExcuseType] = useState("text"); // "text" or "file"
  const [excuseText, setExcuseText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null); // { type, text }
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // Submission history
  const [submissions, setSubmissions] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);

  // Fetch subjects the student is enrolled in
  useEffect(() => {
    if (!user?.uid) return;

    const fetchSubjects = async () => {
      try {
        const sectionsSnap = await getDocs(collection(db, "sections"));
        const fetched = [];
        sectionsSnap.forEach((d) => {
          const data = d.data();
          const studentsList = data.students || [];
          if (studentsList.includes(user.uid)) {
            fetched.push({
              id: d.id,
              sectionId: d.id,
              name: data.subject || "Untitled",
              section: data.section || "—",
              teacherId: data.teacherId || "",
              teacher: data.teacher || "TBD",
            });
          }
        });
        setSubjects(fetched);
      } catch (e) {
        console.error("Error fetching subjects:", e);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [user?.uid]);

  // Listen for this student's excuse letter submissions in real-time
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "excuseLetters"),
      where("studentId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const letters = [];
        snapshot.forEach((docSnap) => {
          letters.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort by submittedAt descending (newest first)
        letters.sort((a, b) => {
          const aTime = a.submittedAt?.toMillis?.() || a.submittedAt?.seconds * 1000 || 0;
          const bTime = b.submittedAt?.toMillis?.() || b.submittedAt?.seconds * 1000 || 0;
          return bTime - aTime;
        });
        setSubmissions(letters);
      },
      () => {
        // silent fail
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Handle file selection
  const handleFileSelect = (file) => {
    setFileError("");
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setFileError("Invalid file type. Please upload a PDF, DOC, DOCX, JPG, or PNG file.");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File is too large (${formatFileSize(file.size)}). Maximum size is 2MB.`);
      return;
    }

    setSelectedFile(file);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage(null);

    // Validation
    if (!selectedSubject) {
      setSubmitMessage({ type: "error", text: "Please select a subject." });
      return;
    }
    if (!excuseDate) {
      setSubmitMessage({ type: "error", text: "Please select the date you need excused." });
      return;
    }
    if (excuseType === "text" && !excuseText.trim()) {
      setSubmitMessage({ type: "error", text: "Please type your excuse letter." });
      return;
    }
    if (excuseType === "file" && !selectedFile) {
      setSubmitMessage({ type: "error", text: "Please upload a file." });
      return;
    }

    setSubmitting(true);

    try {
      const subject = subjects.find((s) => s.id === selectedSubject);

      // Build the document data
      const docData = {
        studentId: user.uid,
        studentName: userData?.fullName || userData?.name || user?.email || "Unknown",
        studentEmail: userData?.email || user?.email || "",
        sectionId: subject?.sectionId || "",
        subjectId: subject?.id || "",
        subjectName: subject?.name || "",
        sectionName: subject?.section || "",
        teacherId: subject?.teacherId || "",
        date: excuseDate,
        type: excuseType,
        status: "Pending",
        submittedAt: serverTimestamp(),
      };

      if (excuseType === "text") {
        docData.content = excuseText.trim();
      } else {
        // Convert file to base64
        const base64Data = await fileToBase64(selectedFile);
        docData.fileName = selectedFile.name;
        docData.fileData = base64Data;
        docData.fileType = selectedFile.type;
      }

      await addDoc(collection(db, "excuseLetters"), docData);

      // Reset form
      setSelectedSubject("");
      setExcuseDate("");
      setExcuseText("");
      setSelectedFile(null);
      setExcuseType("text");
      setSubmitMessage({ type: "success", text: "Excuse letter submitted successfully! Your teacher will review it." });

      // Clear success message after 5 seconds
      setTimeout(() => setSubmitMessage(null), 5000);
    } catch (err) {
      console.error("Error submitting excuse letter:", err);
      setSubmitMessage({ type: "error", text: "Failed to submit. Please try again." });
    } finally {
      setSubmitting(false);
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

  // Open file in new tab (for viewing uploaded files)
  const handleViewFile = (fileData, fileName) => {
    if (!fileData) return;
    const link = document.createElement("a");
    link.href = fileData;
    link.download = fileName || "excuse-letter";
    link.target = "_blank";
    link.click();
  };

  return (
    <>
      <div className="page-header">
        <h1>Excuse Letters</h1>
        <p>Submit an excuse letter for missed classes. Your teacher will review and approve or reject it.</p>
      </div>

      {/* ── Submit Message ── */}
      {submitMessage && (
        <div
          className="card"
          style={{
            background: submitMessage.type === "success" ? "#ECFDF5" : "#FEF2F2",
            border: `1px solid ${submitMessage.type === "success" ? "#A7F3D0" : "#FECACA"}`,
            color: submitMessage.type === "success" ? "#047857" : "#991B1B",
            fontWeight: 600,
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {submitMessage.type === "success" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          )}
          {submitMessage.text}
        </div>
      )}

      {/* ── Submission Form ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Submit New Excuse Letter</div>
            <div className="card-subtitle">Fill out the form below to submit your excuse</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="excuse-form-container">
          {/* Subject + Date Row */}
          <div className="excuse-form-row">
            <div className="excuse-form-group">
              <label>Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={loadingSubjects}
              >
                <option value="">
                  {loadingSubjects ? "Loading subjects..." : "Select a subject"}
                </option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.section}
                  </option>
                ))}
              </select>
            </div>

            <div className="excuse-form-group">
              <label>Date to Excuse</label>
              <input
                type="date"
                value={excuseDate}
                onChange={(e) => setExcuseDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Type Selector */}
          <div className="excuse-form-group">
            <label>Excuse Letter Type</label>
            <div className="excuse-type-tabs">
              <button
                type="button"
                className={`excuse-type-tab ${excuseType === "text" ? "active" : ""}`}
                onClick={() => setExcuseType("text")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="17" y1="10" x2="3" y2="10"></line>
                  <line x1="21" y1="6" x2="3" y2="6"></line>
                  <line x1="21" y1="14" x2="3" y2="14"></line>
                  <line x1="17" y1="18" x2="3" y2="18"></line>
                </svg>
                Type Letter
              </button>
              <button
                type="button"
                className={`excuse-type-tab ${excuseType === "file" ? "active" : ""}`}
                onClick={() => setExcuseType("file")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
                Upload File
              </button>
            </div>
          </div>

          {/* Text Input */}
          {excuseType === "text" && (
            <div className="excuse-form-group">
              <label>Your Excuse Letter</label>
              <textarea
                className="excuse-textarea"
                placeholder="Dear Teacher,&#10;&#10;I am writing to request an excused absence for..."
                value={excuseText}
                onChange={(e) => setExcuseText(e.target.value)}
                maxLength={3000}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right" }}>
                {excuseText.length} / 3000 characters
              </div>
            </div>
          )}

          {/* File Upload */}
          {excuseType === "file" && (
            <div className="excuse-form-group">
              <label>Upload Document or Image</label>
              {!selectedFile ? (
                <div
                  className={`excuse-dropzone ${dragOver ? "drag-over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
                  }}
                >
                  <div className="excuse-dropzone-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                  <div className="excuse-dropzone-text">
                    Drag & drop your file here, or click to browse
                  </div>
                  <div className="excuse-dropzone-hint">
                    PDF, DOC, DOCX, JPG, PNG — Max 2MB
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files[0]) handleFileSelect(e.target.files[0]);
                    }}
                  />
                </div>
              ) : (
                <div className="excuse-file-preview">
                  <div className="excuse-file-preview-icon">
                    <FileIcon type={selectedFile.type} />
                  </div>
                  <div className="excuse-file-preview-info">
                    <div className="excuse-file-preview-name">{selectedFile.name}</div>
                    <div className="excuse-file-preview-size">{formatFileSize(selectedFile.size)}</div>
                  </div>
                  <button
                    type="button"
                    className="excuse-file-remove"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              )}
              {fileError && (
                <div style={{ fontSize: "0.8rem", color: "var(--danger)", marginTop: "6px", fontWeight: 600 }}>
                  {fileError}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-purple"
            disabled={submitting}
            style={{ padding: "12px 24px", fontSize: "0.9rem", justifyContent: "center" }}
          >
            {submitting ? (
              <>
                <span style={{
                  width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "white", borderRadius: "50%",
                  animation: "spin 1s linear infinite", display: "inline-block",
                }}></span>
                Submitting...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                Submit Excuse Letter
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Submission History ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">My Submissions</div>
            <div className="card-subtitle">
              {submissions.length} excuse letter{submissions.length !== 1 ? "s" : ""} submitted
            </div>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="excuse-empty">
            <div className="excuse-empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <h3>No Submissions Yet</h3>
            <p>Your submitted excuse letters will appear here once you&apos;ve sent one.</p>
          </div>
        ) : (
          <div className="excuse-cards-grid">
            {submissions.map((sub) => {
              const isExpanded = expandedCard === sub.id;
              const initials = (sub.subjectName || "?")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

              return (
                <div key={sub.id} className="excuse-card">
                  {/* Card Header (clickable) */}
                  <div
                    className="excuse-card-header"
                    onClick={() => setExpandedCard(isExpanded ? null : sub.id)}
                  >
                    <div className="excuse-card-left">
                      <div className="excuse-card-avatar">{initials}</div>
                      <div className="excuse-card-info">
                        <div className="excuse-card-student">{sub.subjectName}</div>
                        <div className="excuse-card-meta">
                          <span>{sub.sectionName || sub.sectionId}</span>
                          <span className="excuse-card-meta-dot"></span>
                          <span>{sub.date}</span>
                          <span className="excuse-card-meta-dot"></span>
                          <span>{sub.type === "file" ? "File Upload" : "Typed Letter"}</span>
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
                        {/* Submitted timestamp */}
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                          Submitted: {formatTimestamp(sub.submittedAt)}
                          {sub.reviewedAt && (
                            <span> — Reviewed: {formatTimestamp(sub.reviewedAt)}</span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="excuse-content-label">
                          {sub.type === "text" ? "Excuse Letter" : "Uploaded File"}
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

                        {/* Teacher Note */}
                        {sub.teacherNote && (
                          <div className="excuse-teacher-note">
                            <div className="excuse-teacher-note-label">Teacher&apos;s Note:</div>
                            {sub.teacherNote}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
