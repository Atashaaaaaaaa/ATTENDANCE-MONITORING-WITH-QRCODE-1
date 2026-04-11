"use client";

export default function TeacherSchedule() {
  const schedule = [];
  const sections = [];

  const renderCell = (cell, isGreen) => {
    if (!cell) return <td style={{ textAlign: "center", color: "var(--text-muted)" }}>—</td>;
    return (
      <td>
        <div className={isGreen ? "schedule-cell schedule-cell-green" : "schedule-cell"}>
          <strong>{cell.section}</strong>
          <small>{cell.subject}</small>
        </div>
      </td>
    );
  };

  return (
    <>
      <div className="page-header">
        <h1>Class Schedule</h1>
        <p>Your assigned sections and teaching hours for the current semester.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Weekly Timetable</div>
        </div>

        <table className="schedule-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Monday</th>
              <th>Tuesday</th>
              <th>Wednesday</th>
              <th>Thursday</th>
              <th>Friday</th>
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  No schedule data yet. Schedule will appear once the database is connected.
                </td>
              </tr>
            ) : (
              schedule.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, fontSize: "0.85rem" }}>{row.time}</td>
                  {renderCell(row.mon, false)}
                  {renderCell(row.tue, true)}
                  {renderCell(row.wed, false)}
                  {renderCell(row.thu, true)}
                  {renderCell(row.fri, false)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Section Details</div>
            <div className="card-subtitle">Click &quot;View List&quot; to see the registered students for each section.</div>
          </div>
        </div>

        <div className="section-cards">
          {sections.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
              No sections assigned yet.
            </p>
          ) : (
            sections.map((section, idx) => (
              <div className="section-card" key={idx}>
                <h4>{section.name}</h4>
                <p><strong>Subject:</strong> {section.subject}</p>
                <p><strong>Students:</strong> {section.students}</p>
                <button className="btn btn-outline btn-sm">View Student List</button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
