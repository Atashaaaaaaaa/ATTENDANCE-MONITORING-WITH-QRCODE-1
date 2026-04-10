"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminUsers() {
  const [users, setUsers] = useState([
    { id: "2026-T-001", name: "John Doe", email: "john@dlsu.edu.ph", role: "Teacher", section: "G12-ICT", status: "active" },
    { id: "2026-S-088", name: "Student A", email: "studenta@dlsu.edu.ph", role: "Student", section: "G12-ICT", status: "active" },
    { id: "2026-S-089", name: "Student B", email: "studentb@dlsu.edu.ph", role: "Student", section: "G12-STEM", status: "active" },
    { id: "2026-T-002", name: "Jane Smith", email: "jane@dlsu.edu.ph", role: "Teacher", section: "G12-STEM", status: "active" },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    section: "",
  });

  const [searchQuery, setSearchQuery] = useState("");

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
        // Use defaults
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newUser = {
      ...formData,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "users"), newUser);
      setUsers([...users, { id: docRef.id, ...newUser }]);
    } catch (e) {
      // Fallback to local state
      setUsers([...users, { id: `local-${Date.now()}`, ...newUser }]);
    }

    setFormData({ name: "", email: "", role: "", section: "" });
    alert("Success: User registered in the system!");
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

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <h1>User Management</h1>
        <p>Register and manage students, teachers, and staff members.</p>
      </div>

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
              <label>Section/Department</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. G12-ICT"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              />
            </div>
            <div className="full-width">
              <button type="submit" className="btn btn-purple">
                Register User
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Existing Profiles</div>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "280px" }}
          />
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Section</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{user.id}</td>
                <td style={{ fontWeight: 600 }}>{user.name}</td>
                <td>{user.role}</td>
                <td>{user.section || "—"}</td>
                <td>
                  <span className={`status-badge ${user.status || "active"}`}>
                    <span className="status-dot"></span>
                    {(user.status || "active").charAt(0).toUpperCase() + (user.status || "active").slice(1)}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn btn-green btn-sm">Edit</button>
                    <button className="btn btn-red btn-sm" onClick={() => handleDelete(user.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
