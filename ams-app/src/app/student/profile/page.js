"use client";
import { useState, useEffect } from "react";
import { updatePassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import FaceRegistration from "@/components/FaceRegistration";

export default function StudentProfile() {
  const { user, userData } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const displayName = userData?.fullName || userData?.name || user?.email || "Student";
  const displayEmail = user?.email || userData?.email || "—";
  const displayRole = userData?.role || "student";
  const displaySection = userData?.section || "—";
  const displayDepartment = userData?.department || "—";
  const initial = displayName?.charAt(0)?.toUpperCase() || "S";

  // Fetch enrolled subjects
  useEffect(() => {
    if (!user?.uid) return;

    const fetchEnrolled = async () => {
      try {
        const sectionsSnap = await getDocs(collection(db, "sections"));
        const enrolled = [];
        sectionsSnap.forEach((d) => {
          const data = d.data();
          if ((data.students || []).includes(user.uid)) {
            let scheduleStr = "TBD";
            if (data.schedule && typeof data.schedule === "object") {
              const days = (data.schedule.days || []).join(", ");
              const time = data.schedule.time || "";
              scheduleStr = days && time ? `${days} • ${time}` : days || time || "TBD";
            }
            enrolled.push({
              id: d.id,
              section: data.section || "—",
              subject: data.subject || "—",
              teacher: data.teacher || "—",
              schedule: scheduleStr,
              room: data.room || "—",
            });
          }
        });
        setEnrolledSubjects(enrolled);
      } catch (e) {
        // silent
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchEnrolled();
  }, [user?.uid]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      if (auth.currentUser && newPassword) {
        await updatePassword(auth.currentUser, newPassword);
        alert("Password updated successfully!");
      } else {
        alert("Password updated! (Demo mode)");
      }
      setNewPassword("");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        alert("For security, please log out and log in again before changing your password.");
      } else {
        alert("Error updating password: " + (err.message || ""));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Student Profile</h1>
      </div>

      <div className="card">
        <div className="profile-card">
          <div className="profile-avatar student" style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "linear-gradient(135deg, #10B981, #047857)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: "1.5rem", fontWeight: 800,
            flexShrink: 0,
          }}>{initial}</div>
          <div>
            <div className="profile-name">{displayName}</div>
            <div className="profile-role" style={{ textTransform: "capitalize" }}>
              {displaySection !== "—" ? displaySection : displayRole}
            </div>
            <div className="profile-id" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {enrolledSubjects.length} Subject{enrolledSubjects.length !== 1 ? "s" : ""} Enrolled
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Personal Information</div>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <label>Full Name</label>
            <p>{displayName}</p>
          </div>
          <div className="info-item">
            <label>School Email</label>
            <p>{displayEmail}</p>
          </div>
          <div className="info-item">
            <label>Section</label>
            <p>{displaySection}</p>
          </div>
          <div className="info-item">
            <label>Department</label>
            <p>{displayDepartment}</p>
          </div>
          <div className="info-item">
            <label>Enrollment Status</label>
            <p style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: "#10B981", display: "inline-block",
              }}></span>
              {userData?.status === "archived" ? "Archived" : "Active"}
            </p>
          </div>
          {userData?.createdAt && (
            <div className="info-item">
              <label>Account Created</label>
              <p>{new Date(userData.createdAt?.seconds ? userData.createdAt.seconds * 1000 : userData.createdAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Face Registration */}
      <FaceRegistration />

      {/* Enrolled Subjects */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Enrolled Subjects</div>
          <span style={{
            padding: "4px 12px", borderRadius: "var(--radius-full)",
            background: "var(--accent-soft)", color: "var(--primary)",
            fontSize: "0.8rem", fontWeight: 600,
          }}>
            {enrolledSubjects.length} Subject{enrolledSubjects.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loadingSubjects ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>Loading subjects...</p>
        ) : enrolledSubjects.length === 0 ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
            No subjects enrolled yet. Your teacher will add you to their class.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Section</th>
                <th>Teacher</th>
                <th>Schedule</th>
                <th>Room</th>
              </tr>
            </thead>
            <tbody>
              {enrolledSubjects.map((subj) => (
                <tr key={subj.id}>
                  <td style={{ fontWeight: 600 }}>{subj.subject}</td>
                  <td>{subj.section}</td>
                  <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{subj.teacher}</td>
                  <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{subj.schedule}</td>
                  <td>{subj.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Security Settings</div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Change Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter new password (min. 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ maxWidth: "400px" }}
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-green" disabled={saving || !newPassword}>
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </>
  );
}
