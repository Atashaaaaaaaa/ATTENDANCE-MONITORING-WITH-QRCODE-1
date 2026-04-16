"use client";
import { useState, useEffect } from "react";
import { updatePassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function TeacherProfile() {
  const { user, userData } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(true);

  const displayName = userData?.fullName || userData?.name || user?.email || "Teacher";
  const displayEmail = user?.email || userData?.email || "—";
  const displayRole = userData?.role || "teacher";
  const displayDepartment = userData?.department || "—";
  const displaySection = userData?.section || "—";
  const initial = displayName?.charAt(0)?.toUpperCase() || "T";

  // Fetch assigned sections
  useEffect(() => {
    if (!user?.uid) return;

    const fetchSections = async () => {
      try {
        const q = query(collection(db, "sections"), where("teacherId", "==", user.uid));
        const snap = await getDocs(q);
        const fetched = snap.docs.map((d) => {
          const data = d.data();
          let scheduleStr = "TBD";
          if (data.schedule && typeof data.schedule === "object") {
            const days = (data.schedule.days || []).join(", ");
            const time = data.schedule.time || "";
            scheduleStr = days && time ? `${days} • ${time}` : days || time || "TBD";
          }
          return {
            id: d.id,
            section: data.section || "—",
            subject: data.subject || "—",
            schedule: scheduleStr,
            room: data.room || "—",
            studentCount: (data.students || []).length,
          };
        });
        setSections(fetched);
      } catch (e) {
        // silent
      } finally {
        setLoadingSections(false);
      }
    };
    fetchSections();
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
        <h1>Teacher Profile</h1>
      </div>

      <div className="card">
        <div className="profile-card">
          <div className="profile-avatar teacher" style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: "1.5rem", fontWeight: 800,
            flexShrink: 0,
          }}>{initial}</div>
          <div>
            <div className="profile-name">{displayName}</div>
            <div className="profile-role" style={{ textTransform: "capitalize" }}>
              {displayRole === "teacher" ? "Faculty Member" : displayRole}
            </div>
            <div className="profile-id" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {sections.length} Section{sections.length !== 1 ? "s" : ""} Assigned
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
            <label>Official Email</label>
            <p>{displayEmail}</p>
          </div>
          <div className="info-item">
            <label>Department</label>
            <p>{displayDepartment}</p>
          </div>
          <div className="info-item">
            <label>Section</label>
            <p>{displaySection}</p>
          </div>
          {userData?.createdAt && (
            <div className="info-item">
              <label>Account Created</label>
              <p>{new Date(userData.createdAt?.seconds ? userData.createdAt.seconds * 1000 : userData.createdAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Assigned Sections */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Assigned Sections</div>
          <span style={{
            padding: "4px 12px", borderRadius: "var(--radius-full)",
            background: "var(--accent-soft)", color: "var(--primary)",
            fontSize: "0.8rem", fontWeight: 600,
          }}>
            {sections.length} Section{sections.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loadingSections ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>Loading sections...</p>
        ) : sections.length === 0 ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>No sections assigned yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Subject</th>
                <th>Schedule</th>
                <th>Room</th>
                <th>Students</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((sec) => (
                <tr key={sec.id}>
                  <td data-label="Section" style={{ fontWeight: 600 }}>{sec.section}</td>
                  <td data-label="Subject">{sec.subject}</td>
                  <td data-label="Schedule" style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{sec.schedule}</td>
                  <td data-label="Room">{sec.room}</td>
                  <td data-label="Students">
                    <span style={{
                      padding: "3px 8px", borderRadius: "12px",
                      background: "var(--accent-soft)", color: "var(--primary)",
                      fontSize: "0.75rem", fontWeight: 600,
                    }}>{sec.studentCount}</span>
                  </td>
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
            <label>Update Password</label>
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
            {saving ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>
    </>
  );
}
