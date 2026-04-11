"use client";

export default function StudentSchedule() {
  const todayClasses = [];
  const schedule = [];

  return (
    <>
      <div className="page-header">
        <h1>My Schedule</h1>
        <p>Your official class schedule for the current semester.</p>
      </div>

      <div className="card" style={{ borderLeft: "5px solid var(--warning)" }}>
        <div className="card-title" style={{ color: "#D35400", marginBottom: "16px" }}>
          📅 Today&apos;s Classes
        </div>

        <div className="today-classes">
          {todayClasses.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "10px" }}>
              No classes scheduled for today.
            </p>
          ) : (
            todayClasses.map((cls, idx) => (
              <div className={`today-class-card ${cls.type}`} key={idx}>
                <div className="today-class-time">{cls.time}</div>
                <div className="today-class-name">{cls.name}</div>
                <div className="today-class-room">{cls.room}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Weekly Overview</div>
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
                  <td style={{ fontWeight: 600 }}>{row.time}</td>
                  {["mon", "tue", "wed", "thu", "fri"].map((day) => (
                    <td key={day}>
                      {row[day] ? (
                        <div className="schedule-cell">{row[day]}</div>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="info-card">
        <p>
          <strong>📌 Note:</strong> Please arrive 5 minutes before the class starts to ensure successful face scanning.
        </p>
      </div>
    </>
  );
}
