"use client";
import { useState } from "react";

export default function TeacherReports() {
  const [filter, setFilter] = useState({
    section: "",
    dateFrom: "",
    dateTo: "",
  });

  const [students, setStudents] = useState([]);

  const handleExport = () => {
    if (students.length === 0) {
      alert("No data to export.");
      return;
    }
    const csv = [
      "Student Name,Present,Late,Absent,Rate",
      ...students.map((s) => `${s.name},${s.present},${s.late},${s.absent},${s.rate}%`),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-header">
        <h1>Attendance Reports</h1>
        <p>Analyze attendance trends and export data for school records.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Filter Report</div>
        </div>

        <div className="form-inline">
          <div className="form-group">
            <label>Section</label>
            <select
              className="form-select"
              value={filter.section}
              onChange={(e) => setFilter({ ...filter, section: e.target.value })}
            >
              <option value="" disabled>Select Section...</option>
            </select>
          </div>
          <div className="form-group">
            <label>Date From</label>
            <input
              type="date"
              className="form-control"
              value={filter.dateFrom}
              onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Date To</label>
            <input
              type="date"
              className="form-control"
              value={filter.dateTo}
              onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
            />
          </div>
          <button className="btn btn-green" style={{ marginBottom: 0 }}>Generate Report</button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card stat-green">
          <div className="stat-card-icon">📊</div>
          <div className="stat-card-label">Average Attendance</div>
          <div className="stat-card-value" style={{ color: "var(--success)" }}>—</div>
        </div>
        <div className="stat-card stat-red">
          <div className="stat-card-icon">📉</div>
          <div className="stat-card-label">Total Absences</div>
          <div className="stat-card-value" style={{ color: "var(--danger)" }}>—</div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-card-icon">⏰</div>
          <div className="stat-card-label">Total Late</div>
          <div className="stat-card-value" style={{ color: "var(--info)" }}>—</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Student Consistency</div>
          <button className="btn btn-outline btn-sm" onClick={handleExport}>
            📥 Export to CSV
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Present</th>
              <th>Late</th>
              <th>Absent</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  No report data yet. Select a section and generate a report.
                </td>
              </tr>
            ) : (
              students.map((student, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{student.name}</td>
                  <td>{student.present}</td>
                  <td>{student.late}</td>
                  <td>{student.absent}</td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      color: student.rate >= 90 ? "var(--success)"
                        : student.rate >= 80 ? "var(--primary)"
                          : "var(--danger)",
                    }}>
                      {student.rate}%
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
