"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, firebaseConfig } from "@/lib/firebase";

// Generate a random password (10 chars: uppercase, lowercase, digits, special)
function generatePassword(length = 10) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;

  let password = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  for (let i = password.length; i < length; i++) {
    password.push(all[Math.floor(Math.random() * all.length)]);
  }

  // Shuffle
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join("");
}

/**
 * Create a Firebase Auth account using a SECONDARY app instance.
 * This prevents the admin from being signed out when creating new users.
 */
async function createAuthAccount(email, password) {
  // Create a temporary secondary Firebase app
  const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = userCredential.user.uid;

    // Sign out from the secondary app so it doesn't hold credentials
    await signOut(secondaryAuth);

    return uid;
  } finally {
    // Always clean up the secondary app
    await deleteApp(secondaryApp);
  }
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    section: "",
    department: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");

  // Success modal state
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [copied, setCopied] = useState(false);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: "", section: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetCopied, setResetCopied] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        if (snap.size > 0) {
          const fetched = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setUsers(fetched);
        }
      } catch (e) {
        // Will populate when database is connected
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const defaultPassword = generatePassword();
    // Store role as lowercase to match login routing ("teacher", "student")
    const roleLower = formData.role.toLowerCase();

    try {
      // 1) Create a real Firebase Auth account using a secondary app
      const uid = await createAuthAccount(formData.email, defaultPassword);

      // 2) Save the user profile to Firestore (keyed by the Auth UID)
      const userDocRef = doc(db, "users", uid);
      const userData = {
        uid: uid,
        email: formData.email,
        fullName: formData.name,
        name: formData.name,
        role: roleLower,
        section: formData.section || "",
        department: formData.department || "",
        status: "active",
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, userData);

      // 3) Update the local list
      setUsers([...users, { id: uid, ...userData }]);
      setCreatedUser({ ...userData, password: defaultPassword });
      setShowSuccess(true);
      setCopied(false);
      setFormData({ name: "", email: "", role: "", section: "", department: "" });
    } catch (err) {
      console.error("Error creating user:", err);
      if (err.code === "auth/email-already-in-use") {
        setFormError("This email is already registered.");
      } else if (err.code === "auth/weak-password") {
        setFormError("Password is too weak. Please try again.");
      } else if (err.code === "auth/invalid-email") {
        setFormError("Invalid email address.");
      } else {
        setFormError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
    } catch (e) {
      // Continue with local delete
    }
    setUsers(users.filter((u) => u.id !== userId));
  };

  const handleCopyPassword = () => {
    if (createdUser?.password) {
      navigator.clipboard.writeText(createdUser.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Edit Handlers ──
  const handleEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || user.fullName || "",
      section: user.section || "",
    });
    setEditError("");
    setEditSuccess("");
    setResetSent(false);
    setResetPassword("");
    setResetCopied(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setEditSubmitting(true);
    setEditError("");
    setEditSuccess("");

    try {
      const userDocRef = doc(db, "users", editingUser.id);
      await updateDoc(userDocRef, {
        name: editFormData.name,
        fullName: editFormData.name,
        section: editFormData.section,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, name: editFormData.name, fullName: editFormData.name, section: editFormData.section }
            : u
        )
      );

      setEditSuccess("Changes saved successfully!");
      setTimeout(() => {
        setShowEditModal(false);
        setEditingUser(null);
        setEditSuccess("");
      }, 1200);
    } catch (err) {
      console.error("Error updating user:", err);
      setEditError(err.message || "Failed to save changes. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingUser?.id) return;
    setResetSending(true);
    setEditError("");
    setResetPassword("");
    setResetCopied(false);

    const newPassword = generatePassword();

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: editingUser.id, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setResetPassword(newPassword);
      setResetSent(true);
    } catch (err) {
      console.error("Error resetting password:", err);
      setEditError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setResetSending(false);
    }
  };

  const handleCopyResetPassword = () => {
    if (resetPassword) {
      navigator.clipboard.writeText(resetPassword);
      setResetCopied(true);
      setTimeout(() => setResetCopied(false), 2000);
    }
  };

  // Derive unique sections and roles for filters
  const uniqueRoles = [...new Set(users.map((u) => u.role).filter(Boolean))];
  const uniqueSections = [...new Set(users.map((u) => u.section).filter(Boolean))];

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || u.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.id || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    const matchesSection = sectionFilter === "All" || u.section === sectionFilter;
    return matchesSearch && matchesRole && matchesSection;
  });

  // Helper to display role nicely (capitalize first letter)
  const displayRole = (role) => {
    if (!role) return "—";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <>
      <div className="page-header">
        <h1>User Management</h1>
        <p>Register and manage students, teachers, and staff members.</p>
      </div>

      {/* ── Register Form ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Register New User</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Mica Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="email@dlsu.edu.ph"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="" disabled>Select User Role</option>
                <option value="Teacher">Teacher</option>
                <option value="Student">Student</option>
              </select>
            </div>
            <div className="form-group">
              <label>Section</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. G12-ICT"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. College of Computer Studies"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ display: "flex", alignItems: "flex-end" }}>
              <div
                style={{
                  padding: "10px 16px",
                  background: "var(--accent-soft)",
                  borderRadius: "var(--radius-md)",
                  border: "1px dashed var(--border-green)",
                  fontSize: "0.85rem",
                  color: "var(--primary-dark)",
                  width: "100%",
                }}
              >
                🔑 A random default password will be generated automatically upon registration.
              </div>
            </div>
            <div className="full-width">
              {formError && (
                <div
                  style={{
                    padding: "10px 16px",
                    background: "var(--danger-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--danger)",
                    fontSize: "0.85rem",
                    color: "var(--danger)",
                    marginBottom: "12px",
                    fontWeight: 500,
                  }}
                >
                  ⚠ {formError}
                </div>
              )}
              <button type="submit" className="btn btn-purple" disabled={submitting}>
                {submitting ? "Creating Account..." : "Register User"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Success Modal ── */}
      {showSuccess && createdUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: "fadeIn 0.25s ease",
          }}
          onClick={() => setShowSuccess(false)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "var(--radius-xl)",
              padding: "36px 32px",
              maxWidth: "460px",
              width: "90%",
              boxShadow: "var(--shadow-xl)",
              animation: "fadeInUp 0.35s ease",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "var(--success-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                margin: "0 auto 16px",
              }}
            >
              ✅
            </div>
            <h3
              style={{
                textAlign: "center",
                fontSize: "1.2rem",
                fontWeight: 700,
                marginBottom: "6px",
                color: "var(--text-primary)",
              }}
            >
              User Created Successfully!
            </h3>
            <p
              style={{
                textAlign: "center",
                fontSize: "0.88rem",
                color: "var(--text-secondary)",
                marginBottom: "24px",
              }}
            >
              Please share the default password with the user securely.
            </p>

            <div
              style={{
                background: "var(--bg-body)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Name</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{createdUser.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Email</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{createdUser.email}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Role</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{displayRole(createdUser.role)}</span>
              </div>
              {createdUser.section && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Section</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{createdUser.section}</span>
                </div>
              )}
              {createdUser.department && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Department</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{createdUser.department}</span>
                </div>
              )}
            </div>

            {/* Password display */}
            <div
              style={{
                background: "linear-gradient(135deg, var(--primary-darker), var(--primary-dark))",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                marginBottom: "20px",
                color: "#fff",
              }}
            >
              <div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: "6px" }}>
                🔑 Default Password
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <code
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    letterSpacing: "1.5px",
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {createdUser.password}
                </code>
                <button
                  onClick={handleCopyPassword}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "#fff",
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    transition: "var(--transition-fast)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {copied ? "✓ Copied!" : "📋 Copy"}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSuccess(false)}
              className="btn btn-purple"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Existing Users Table ── */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: "wrap", gap: "12px" }}>
          <div className="card-title">Existing Profiles</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            {/* Role filter */}
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                width: "150px",
                padding: "8px 12px",
                fontSize: "0.85rem",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <option value="All">All Roles</option>
              {uniqueRoles.map((r) => (
                <option key={r} value={r}>
                  {displayRole(r)}
                </option>
              ))}
            </select>

            {/* Section filter */}
            <select
              className="form-select"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              style={{
                width: "160px",
                padding: "8px 12px",
                fontSize: "0.85rem",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <option value="All">All Sections</option>
              {uniqueSections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Search */}
            <input
              type="text"
              className="form-control"
              placeholder="🔍 Search by name, email or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "260px" }}
            />
          </div>
        </div>

        {/* Active filter chips */}
        {(roleFilter !== "All" || sectionFilter !== "All") && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "0 24px 16px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Filters:</span>
            {roleFilter !== "All" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  background: "var(--accent-soft)",
                  color: "var(--primary-dark)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                Role: {displayRole(roleFilter)}
                <button
                  onClick={() => setRoleFilter("All")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    color: "var(--primary-dark)",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </span>
            )}
            {sectionFilter !== "All" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  background: "var(--info-bg)",
                  color: "var(--info)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                Section: {sectionFilter}
                <button
                  onClick={() => setSectionFilter("All")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    color: "var(--info)",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setRoleFilter("All");
                setSectionFilter("All");
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.8rem",
                color: "var(--danger)",
                fontWeight: 600,
                padding: "4px 8px",
              }}
            >
              Clear all
            </button>
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Section</th>
              <th>Department</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  {users.length === 0
                    ? "No users registered yet. Add users using the form above."
                    : "No users match the current filters."}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {user.id.length > 10 ? user.id.slice(0, 10) + "…" : user.id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{user.name || user.fullName}</td>
                  <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{user.email}</td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        background:
                          user.role === "teacher" || user.role === "Teacher"
                            ? "var(--info-bg)"
                            : user.role === "student" || user.role === "Student"
                            ? "var(--accent-soft)"
                            : "var(--warning-bg)",
                        color:
                          user.role === "teacher" || user.role === "Teacher"
                            ? "var(--info)"
                            : user.role === "student" || user.role === "Student"
                            ? "var(--primary)"
                            : "var(--warning)",
                      }}
                    >
                      {displayRole(user.role)}
                    </span>
                  </td>
                  <td>{user.section || "—"}</td>
                  <td>{user.department || "—"}</td>
                  <td>
                    <span className={`status-badge ${user.status || "active"}`}>
                      <span className="status-dot"></span>
                      {(user.status || "active").charAt(0).toUpperCase() + (user.status || "active").slice(1)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="btn btn-green btn-sm" onClick={() => handleEdit(user)}>Edit</button>
                      <button className="btn btn-red btn-sm" onClick={() => handleDelete(user.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Results count */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid var(--border-light)",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? "s" : ""}
          </span>
          {(roleFilter !== "All" || sectionFilter !== "All" || searchQuery) && (
            <span style={{ color: "var(--primary)", fontWeight: 600 }}>Filtered</span>
          )}
        </div>
      </div>

      {/* ── Edit User Modal ── */}
      {showEditModal && editingUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: "fadeIn 0.25s ease",
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "var(--radius-xl)",
              padding: "36px 32px",
              maxWidth: "480px",
              width: "90%",
              boxShadow: "var(--shadow-xl)",
              animation: "fadeInUp 0.35s ease",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowEditModal(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                fontSize: "1.2rem",
                cursor: "pointer",
                color: "var(--text-muted)",
                lineHeight: 1,
                padding: "4px",
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "var(--accent-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                margin: "0 auto 16px",
              }}
            >
              ✏️
            </div>
            <h3
              style={{
                textAlign: "center",
                fontSize: "1.2rem",
                fontWeight: 700,
                marginBottom: "6px",
                color: "var(--text-primary)",
              }}
            >
              Edit User
            </h3>
            <p
              style={{
                textAlign: "center",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "24px",
              }}
            >
              {editingUser.email}
            </p>

            {/* Error / Success messages */}
            {editError && (
              <div
                style={{
                  padding: "10px 16px",
                  background: "var(--danger-bg)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--danger)",
                  fontSize: "0.85rem",
                  color: "var(--danger)",
                  marginBottom: "16px",
                  fontWeight: 500,
                }}
              >
                ⚠ {editError}
              </div>
            )}
            {editSuccess && (
              <div
                style={{
                  padding: "10px 16px",
                  background: "var(--success-bg)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-green)",
                  fontSize: "0.85rem",
                  color: "var(--primary-dark)",
                  marginBottom: "16px",
                  fontWeight: 500,
                }}
              >
                ✅ {editSuccess}
              </div>
            )}

            {/* Reset Password */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                Reset Password
              </label>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetSending}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-light)",
                  background: "linear-gradient(135deg, var(--primary-darker), var(--primary-dark))",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: resetSending ? "default" : "pointer",
                  opacity: resetSending ? 0.7 : 1,
                  transition: "var(--transition-fast)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                {resetSending ? "Generating..." : "🔑 Generate New Password"}
              </button>

              {/* Show generated password */}
              {resetSent && resetPassword && (
                <div
                  style={{
                    background: "linear-gradient(135deg, var(--primary-darker), var(--primary-dark))",
                    borderRadius: "var(--radius-md)",
                    padding: "14px 16px",
                    color: "#fff",
                    marginTop: "8px",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: "6px" }}>
                    🔑 New Password
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <code
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        letterSpacing: "1.5px",
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      {resetPassword}
                    </code>
                    <button
                      onClick={handleCopyResetPassword}
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        color: "#fff",
                        padding: "6px 14px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        transition: "var(--transition-fast)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {resetCopied ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  </div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      opacity: 0.7,
                      marginTop: "8px",
                      marginBottom: 0,
                    }}
                  >
                    Please share this password with the user securely.
                  </p>
                </div>
              )}

              {!resetSent && (
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    marginTop: "4px",
                  }}
                >
                  This will generate a new random password for this user.
                </p>
              )}
            </div>

            {/* Username */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                Username
              </label>
              <input
                type="text"
                className="form-control"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Enter username"
                style={{ width: "100%" }}
              />
            </div>

            {/* Section */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                Section
              </label>
              <input
                type="text"
                className="form-control"
                value={editFormData.section}
                onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                placeholder="e.g. G12-ICT"
                style={{ width: "100%" }}
              />
            </div>

            {/* Save Changes Button */}
            <button
              onClick={handleSaveEdit}
              disabled={editSubmitting}
              className="btn btn-purple"
              style={{
                width: "100%",
                justifyContent: "center",
                opacity: editSubmitting ? 0.7 : 1,
              }}
            >
              {editSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
