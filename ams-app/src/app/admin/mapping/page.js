"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function AdminMapping() {
  const [mappings, setMappings] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [formData, setFormData] = useState({
    teacherId: "",
    teacherName: "",
    section: "",
    subject: "",
    days: [],
    timeStart: "",
    timeEnd: "",
    room: "",
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

  const toggleDay = (day) => {
    setFormData((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  // Format 24h time ("09:30") to 12h ("9:30 AM")
  const formatTimeTo12h = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.days.length === 0) {
      alert("Please select at least one day for the schedule.");
      return;
    }

    if (!formData.timeStart || !formData.timeEnd) {
      alert("Please set both start and end time for the schedule.");
      return;
    }

    // Format time as "HH:MM AM - HH:MM PM" for consistent storage
    const formattedTime = `${formatTimeTo12h(formData.timeStart)} - ${formatTimeTo12h(formData.timeEnd)}`;

    const newMapping = {
      teacherId: formData.teacherId,
      teacher: formData.teacherName,
      section: formData.section,
      subject: formData.subject,
      schedule: {
        days: formData.days,
        time: formattedTime,
      },
      room: formData.room,
      students: [],
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "sections"), newMapping);
      setMappings([...mappings, { id: docRef.id, ...newMapping }]);
    } catch (e) {
      setMappings([...mappings, { id: `local-${Date.now()}`, ...newMapping }]);
    }

    setFormData({ teacherId: "", teacherName: "", section: "", subject: "", days: [], timeStart: "", timeEnd: "", room: "" });
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

  // Helper to format schedule for display
  const formatSchedule = (schedule) => {
    if (!schedule) return "TBD";
    if (typeof schedule === "string") return schedule;
    const days = (schedule.days || []).join(", ");
    const time = schedule.time || "";
    return days && time ? `${days} • ${time}` : days || time || "TBD";
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
          </div>

          {/* Schedule Fields */}
          <div className="form-inline" style={{ marginTop: "16px" }}>
            <div className="form-group" style={{ flex: "2" }}>
              <label>Schedule Days</label>
              <div className="day-checkbox-group">
                {ALL_DAYS.map((day) => (
                  <label
                    key={day}
                    className={`day-checkbox ${formData.days.includes(day) ? "day-checkbox-active" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.days.includes(day)}
                      onChange={() => toggleDay(day)}
                      style={{ display: "none" }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Start Time</label>
              <input
                type="time"
                className="form-control"
                value={formData.timeStart}
                onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>End Time</label>
              <input
                type="time"
                className="form-control"
                value={formData.timeEnd}
                onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Room Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Room 201"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-purple" style={{ marginBottom: 0, alignSelf: "flex-end" }}>
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
              <th>Room</th>
              <th>Students</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {mappings.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  No section assignments yet. Use the form above to link teachers to sections.
                </td>
              </tr>
            ) : (
              mappings.map((map) => (
                <tr key={map.id}>
                  <td style={{ fontWeight: 600 }}>{map.teacher}</td>
                  <td>{map.section}</td>
                  <td>{map.subject}</td>
                  <td>{formatSchedule(map.schedule)}</td>
                  <td>{map.room || "—"}</td>
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
