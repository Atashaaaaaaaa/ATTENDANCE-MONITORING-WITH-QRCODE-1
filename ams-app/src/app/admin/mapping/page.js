"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminMapping() {
  const [mappings, setMappings] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [formData, setFormData] = useState({
    teacherId: "",
    teacherName: "",
    section: "",
    subject: "",
  });

  // Fetch existing mappings and teachers list
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch section mappings
        const sectionsSnap = await getDocs(collection(db, "sections"));
        if (sectionsSnap.size > 0) {
          const fetched = sectionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setMappings(fetched);
        }

        // Fetch teachers for the dropdown
        const teachersSnap = await getDocs(collection(db, "teachers"));
        const teachersList = teachersSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.data().fullName || d.data().email,
          ...d.data(),
        }));
        setTeachers(teachersList);
      } catch (e) {
        // Will populate when database is connected
      }
    };
    fetchData();
  }, []);

  const handleTeacherSelect = (e) => {
    const selectedId = e.target.value;
    const selectedTeacher = teachers.find((t) => t.id === selectedId);
    setFormData({
      ...formData,
      teacherId: selectedId,
      teacherName: selectedTeacher?.name || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newMapping = {
      teacherId: formData.teacherId,
      teacher: formData.teacherName,
      section: formData.section,
      subject: formData.subject,
      schedule: "TBD",
      students: [],
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "sections"), newMapping);
      setMappings([...mappings, { id: docRef.id, ...newMapping }]);
    } catch (e) {
      setMappings([...mappings, { id: `local-${Date.now()}`, ...newMapping }]);
    }

    setFormData({ teacherId: "", teacherName: "", section: "", subject: "" });
    alert("Mapping Successful: Teacher has been assigned to the section!");
  };

  const handleUnassign = async (mappingId) => {
    if (!confirm("Unassign this teacher from the section?")) return;
    try {
      await deleteDoc(doc(db, "sections", mappingId));
    } catch (e) {
      // Continue
    }
    setMappings(mappings.filter((m) => m.id !== mappingId));
  };

  return (
    <>
      <div className="page-header">
        <h1>Section Mapping</h1>
        <p>Link teachers to specific sections and subjects for face scan sessions.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Assign Teacher to Section</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-inline">
            <div className="form-group">
              <label>Select Teacher</label>
              <select
                className="form-select"
                value={formData.teacherId}
                onChange={handleTeacherSelect}
                required
              >
                <option value="" disabled>Choose Teacher...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Section Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. G12-ICT"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Subject Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Object Oriented Programming"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-purple" style={{ marginBottom: 0 }}>
              Create Link
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Active Section Assignments</div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Teacher</th>
              <th>Section</th>
              <th>Subject</th>
              <th>Schedule</th>
              <th>Students</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {mappings.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  No section assignments yet. Use the form above to link teachers to sections.
                </td>
              </tr>
            ) : (
              mappings.map((map) => (
                <tr key={map.id}>
                  <td style={{ fontWeight: 600 }}>{map.teacher}</td>
                  <td>{map.section}</td>
                  <td>{map.subject}</td>
                  <td>{map.schedule}</td>
                  <td>{(map.students || []).length}</td>
                  <td>
                    <button className="btn btn-red btn-sm" onClick={() => handleUnassign(map.id)}>
                      Unassign
                    </button>
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
