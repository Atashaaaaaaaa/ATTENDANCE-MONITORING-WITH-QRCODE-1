"use client";
import { useState } from "react";

export default function TeacherReports() {
  const [filter, setFilter] = useState({
    section: "G12 - ICT",
    dateFrom: "",
    dateTo: "",
  });

  const students = [
    { name: "Student A", present: 18, late: 2, absent: 0, rate: 100 },
    { name: "Student B", present: 15, late: 1, absent: 4, rate: 75 },
    { name: "Student C", present: 17, late: 1, absent: 2, rate: 85 },
    { name: "Student D", present: 19, late: 0, absent: 1, rate: 95 },
    { name: "Student E", present: 14, late: 3, absent: 3, rate: 70 },
  ];

  const handleExport = () => {
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
              <option>G12 - ICT</option>
              <option>G12 - STEM</option>
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
          <div className="stat-card-value" style={{ color: "var(--success)" }}>92%</div>
        </div>
        <div className="stat-card stat-red">
          <div className="stat-card-icon">📉</div>
          <div className="stat-card-label">Total Absences</div>
          <div className="stat-card-value" style={{ color: "var(--danger)" }}>24</div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-card-icon">⏰</div>
          <div className="stat-card-label">Total Late</div>
          <div className="stat-card-value" style={{ color: "var(--info)" }}>18</div>
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
            {students.map((student, idx) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
