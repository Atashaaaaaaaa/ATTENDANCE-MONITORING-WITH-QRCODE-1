"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function TeacherMapping() {
  const { user } = useAuth();
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchMappings = async () => {
      try {
        const q = query(collection(db, "sections"), where("teacherId", "==", user.uid));
        const snap = await getDocs(q);
        const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMappings(fetched);
      } catch (e) {
        // Will populate when database is connected
      } finally {
        setLoading(false);
      }
    };
    fetchMappings();
  }, [user?.uid]);

  return (
    <>
      <div className="page-header">
        <h1>My Section Assignments</h1>
        <p>View the sections and subjects assigned to you by the admin.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Assigned Sections</div>
          <span style={{
            padding: "4px 12px",
            borderRadius: "var(--radius-full)",
            background: "var(--accent-soft)",
            color: "var(--primary)",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}>
            {mappings.length} Section{mappings.length !== 1 ? "s" : ""}
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>Subject</th>
              <th>Schedule</th>
              <th>Room</th>
              <th>Enrolled Students</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  Loading your assignments...
                </td>
              </tr>
            ) : mappings.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  No sections assigned to you yet. Please contact the admin to be assigned to sections.
                </td>
              </tr>
            ) : (
              mappings.map((map) => (
                <tr key={map.id}>
                  <td style={{ fontWeight: 600 }}>{map.section}</td>
                  <td>{map.subject}</td>
                  <td>
                    {map.schedule && typeof map.schedule === "object"
                      ? `${(map.schedule.days || []).join(", ")} • ${map.schedule.time || "TBD"}`
                      : map.schedule || "TBD"}
                  </td>
                  <td>{map.room || "—"}</td>
                  <td>
                    <span style={{
                      padding: "3px 10px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      background: "var(--info-bg)",
                      color: "var(--info)",
                    }}>
                      {(map.students || []).length} student{(map.students || []).length !== 1 ? "s" : ""}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
