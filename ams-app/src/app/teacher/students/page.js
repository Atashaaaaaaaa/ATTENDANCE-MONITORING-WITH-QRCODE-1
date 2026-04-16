"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function TeacherStudents() {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch teacher's sections and all students
  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      try {
        // Fetch teacher's sections
        const q = query(collection(db, "sections"), where("teacherId", "==", user.uid));
        const sectionsSnap = await getDocs(q);
        const fetchedSections = sectionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSections(fetchedSections);
        if (fetchedSections.length > 0 && !selectedSection) {
          setSelectedSection(fetchedSections[0].id);
        }

        // Fetch all students
        const studentsSnap = await getDocs(collection(db, "students"));
        const fetchedStudents = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllStudents(fetchedStudents);
      } catch (e) {
        // Will populate when database is connected
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.uid]);

  const currentSection = sections.find((s) => s.id === selectedSection);
  const enrolledStudentIds = currentSection?.students || [];
  const enrolledStudents = allStudents.filter((s) => enrolledStudentIds.includes(s.id));

  // Students not yet in this section, filtered by search
  const availableStudents = allStudents
    .filter((s) => !enrolledStudentIds.includes(s.id))
    .filter((s) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (s.name || s.fullName || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.section || "").toLowerCase().includes(q)
      );
    });

  const handleAddStudent = async (studentId) => {
    if (!selectedSection) return;
    try {
      const sectionRef = doc(db, "sections", selectedSection);
      await updateDoc(sectionRef, { students: arrayUnion(studentId) });
      // Update local state
      setSections((prev) =>
        prev.map((s) =>
          s.id === selectedSection
            ? { ...s, students: [...(s.students || []), studentId] }
            : s
        )
      );
    } catch (e) {
      alert("Failed to add student. Please try again.");
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!selectedSection) return;
    if (!confirm("Remove this student from the class?")) return;
    try {
      const sectionRef = doc(db, "sections", selectedSection);
      await updateDoc(sectionRef, { students: arrayRemove(studentId) });
      // Update local state
      setSections((prev) =>
        prev.map((s) =>
          s.id === selectedSection
            ? { ...s, students: (s.students || []).filter((id) => id !== studentId) }
            : s
        )
      );
    } catch (e) {
      alert("Failed to remove student. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading class data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>My Students</h1>
        <p>Manage student enrollment in your assigned sections.</p>
      </div>

      {/* Section Selector */}
      {sections.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg></div>
          <h3 style={{ margin: "0 0 8px", color: "var(--text-primary)" }}>No Sections Assigned</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "400px", margin: "0 auto" }}>
            You don&apos;t have any sections assigned yet. Please contact the admin to be assigned to sections.
          </p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-header" style={{ flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div className="card-title">Select Section</div>
                <div className="card-subtitle">Choose a section to manage its student roster.</div>
              </div>
            </div>
            <div style={{ padding: "0 24px 24px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSection(sec.id)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "var(--radius-md)",
                    border: selectedSection === sec.id ? "2px solid var(--primary)" : "1px solid var(--border-light)",
                    background: selectedSection === sec.id ? "var(--accent-soft)" : "var(--bg-card)",
                    color: selectedSection === sec.id ? "var(--primary)" : "var(--text-primary)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div>{sec.section}</div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)", marginTop: "2px" }}>
                    {sec.subject} • {(sec.students || []).length} students
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Enrolled Students */}
          {currentSection && (
            <div className="card">
              <div className="card-header" style={{ flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div className="card-title">
                    {currentSection.section} — {currentSection.subject}
                  </div>
                  <div className="card-subtitle">
                    {enrolledStudents.length} student{enrolledStudents.length !== 1 ? "s" : ""} enrolled
                  </div>
                </div>
                <button
                  className="btn btn-purple btn-sm"
                  onClick={() => { setShowAddModal(true); setSearchQuery(""); }}
                >
                  + Add Student
                </button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Section</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledStudents.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                        No students in this class yet. Click &quot;Add Student&quot; to enroll students.
                      </td>
                    </tr>
                  ) : (
                    enrolledStudents.map((student) => (
                      <tr key={student.id}>
                        <td style={{ fontWeight: 600 }}>{student.name || student.fullName}</td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{student.email}</td>
                        <td>{student.section || "—"}</td>
                        <td>
                          <button
                            className="btn btn-red btn-sm"
                            onClick={() => handleRemoveStudent(student.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
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
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "var(--radius-xl)",
              padding: "32px",
              maxWidth: "560px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-xl)",
              animation: "fadeInUp 0.35s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Add Student to Class</h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {currentSection?.section} — {currentSection?.subject}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "4px",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              className="form-control"
              placeholder="Search students by name, email, or section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: "16px" }}
            />

            {/* Student list */}
            <div style={{ overflowY: "auto", flex: 1, maxHeight: "400px" }}>
              {availableStudents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                  {searchQuery ? "No students match your search." : "All students are already enrolled in this section."}
                </div>
              ) : (
                availableStudents.map((student) => (
                  <div
                    key={student.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-light)",
                      marginBottom: "8px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {student.name || student.fullName}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {student.email} {student.section ? `• ${student.section}` : ""}
                      </div>
                    </div>
                    <button
                      className="btn btn-green btn-sm"
                      onClick={() => handleAddStudent(student.id)}
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
