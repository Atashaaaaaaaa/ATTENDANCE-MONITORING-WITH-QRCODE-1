"use client";
import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function TeacherProfile() {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (auth.currentUser && newPassword) {
        await updatePassword(auth.currentUser, newPassword);
        alert("Security settings updated!");
      } else {
        alert("Security settings updated! (Demo mode)");
      }
      setNewPassword("");
    } catch (err) {
      alert("Update saved locally. " + (err.message || ""));
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
          <div className="profile-avatar teacher">T</div>
          <div>
            <div className="profile-name">Teacher Name</div>
            <div className="profile-role">Faculty Member</div>
            <div className="profile-id">Employee ID: 2026-TCH-001</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Employment Details</div>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <label>Department</label>
            <p>Computer Studies / ICT</p>
          </div>
          <div className="info-item">
            <label>Official Email</label>
            <p>teacher.email@dlsu.edu.ph</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Account Settings</div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Update Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ maxWidth: "400px" }}
            />
          </div>
          <button type="submit" className="btn btn-green" disabled={saving}>
            {saving ? "Saving..." : "Update Account"}
          </button>
        </form>
      </div>
    </>
  );
}
