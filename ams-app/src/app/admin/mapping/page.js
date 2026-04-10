"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminMapping() {
  const [mappings, setMappings] = useState([
    { id: "m1", teacher: "John Doe", section: "G12 - ICT", subject: "Java Programming", schedule: "MWF 8:00 AM" },
    { id: "m2", teacher: "Jane Smith", section: "G12 - STEM", subject: "General Physics", schedule: "TTH 1:00 PM" },
  ]);

  const [formData, setFormData] = useState({
    teacher: "",
    section: "",
    subject: "",
  });

  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const snap = await getDocs(collection(db, "sections"));
        if (snap.size > 0) {
          const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setMappings(fetched);
        }
      } catch (e) {
        // Use defaults
      }
    };
    fetchMappings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newMapping = {
      ...formData,
      schedule: "TBD",
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "sections"), newMapping);
      setMappings([...mappings, { id: docRef.id, ...newMapping }]);
    } catch (e) {
      setMappings([...mappings, { id: `local-${Date.now()}`, ...newMapping }]);
    }

    setFormData({ teacher: "", section: "", subject: "" });
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
        <p>Link teachers to specific sections and subjects for QR generation.</p>
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
                value={formData.teacher}
                onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                required
              >
                <option value="" disabled>Choose Teacher...</option>
                <option>John Doe</option>
                <option>Jane Smith</option>
              </select>
            </div>

            <div className="form-group">
              <label>Select Section</label>
              <select
                className="form-select"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                required
              >
                <option value="" disabled>Choose Section...</option>
                <option>G12 - ICT</option>
                <option>G12 - STEM</option>
                <option>G11 - HUMSS</option>
              </select>
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((map) => (
              <tr key={map.id}>
                <td style={{ fontWeight: 600 }}>{map.teacher}</td>
                <td>{map.section}</td>
                <td>{map.subject}</td>
                <td>{map.schedule}</td>
                <td>
                  <button className="btn btn-red btn-sm" onClick={() => handleUnassign(map.id)}>
                    Unassign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
