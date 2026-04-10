"use client";

export default function StudentSchedule() {
  const todayClasses = [
    { time: "08:00 AM - 10:00 AM", name: "Java Programming", room: "Room: Lab 402", type: "morning" },
    { time: "01:00 PM - 03:00 PM", name: "Web Development", room: "Room: CL 105", type: "afternoon" },
  ];

  const schedule = [
    {
      time: "08:00 - 10:00",
      mon: "Java (Lab 402)",
      tue: null,
      wed: "Java (Lab 402)",
      thu: null,
      fri: "Java (Lab 402)",
    },
    {
      time: "10:00 - 12:00",
      mon: null,
      tue: "3D Animation",
      wed: null,
      thu: "3D Animation",
      fri: null,
    },
    {
      time: "01:00 - 03:00",
      mon: "Web Dev",
      tue: null,
      wed: "Web Dev",
      thu: null,
      fri: "Web Dev",
    },
  ];

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
          {todayClasses.map((cls, idx) => (
            <div className={`today-class-card ${cls.type}`} key={idx}>
              <div className="today-class-time">{cls.time}</div>
              <div className="today-class-name">{cls.name}</div>
              <div className="today-class-room">{cls.room}</div>
            </div>
          ))}
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
            {schedule.map((row, idx) => (
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
            ))}
          </tbody>
        </table>
      </div>

      <div className="info-card">
        <p>
          <strong>📌 Note:</strong> Please arrive 5 minutes before the class starts to ensure successful QR scanning.
        </p>
      </div>
    </>
  );
}
