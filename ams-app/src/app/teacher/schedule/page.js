"use client";

export default function TeacherSchedule() {
  const schedule = [
    {
      time: "08:00 - 10:00 AM",
      mon: { section: "G12-ICT", subject: "Java" },
      tue: null,
      wed: { section: "G12-ICT", subject: "Java" },
      thu: null,
      fri: { section: "G12-ICT", subject: "Java" },
    },
    {
      time: "01:00 - 03:00 PM",
      mon: null,
      tue: { section: "G12-STEM", subject: "Physics" },
      wed: null,
      thu: { section: "G12-STEM", subject: "Physics" },
      fri: null,
    },
  ];

  const sections = [
    { name: "G12 - ICT", subject: "Java Programming", students: 45 },
    { name: "G12 - STEM", subject: "General Physics", students: 40 },
  ];

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
            {schedule.map((row, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 600, fontSize: "0.85rem" }}>{row.time}</td>
                {renderCell(row.mon, false)}
                {renderCell(row.tue, true)}
                {renderCell(row.wed, false)}
                {renderCell(row.thu, true)}
                {renderCell(row.fri, false)}
              </tr>
            ))}
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
          {sections.map((section, idx) => (
            <div className="section-card" key={idx}>
              <h4>{section.name}</h4>
              <p><strong>Subject:</strong> {section.subject}</p>
              <p><strong>Students:</strong> {section.students}</p>
              <button className="btn btn-outline btn-sm">View Student List</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
