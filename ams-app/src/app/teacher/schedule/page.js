"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const DAY_MAP = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri" };
const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];

export default function TeacherSchedule() {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch teacher's assigned sections
  useEffect(() => {
    if (!user?.uid) return;

    const fetchSections = async () => {
      try {
        const q = query(collection(db, "sections"), where("teacherId", "==", user.uid));
        const snap = await getDocs(q);
        const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSections(fetched);
      } catch (e) {
        // Will populate when database is connected
      } finally {
        setLoading(false);
      }
    };
    fetchSections();
  }, [user?.uid]);

  // Build the timetable from sections data
  const buildSchedule = () => {
    // Collect all unique time slots
    const timeSlots = new Set();
    sections.forEach((sec) => {
      const schedule = sec.schedule;
      if (schedule && typeof schedule === "object" && schedule.time) {
        timeSlots.add(schedule.time);
      }
    });

    // Sort time slots by parsing the start time
    const sortedTimes = Array.from(timeSlots).sort((a, b) => {
      const parseTime = (t) => {
        const match = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return 0;
        let h = parseInt(match[1]);
        const m = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && h !== 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        return h * 60 + m;
      };
      return parseTime(a) - parseTime(b);
    });

    // Build rows
    return sortedTimes.map((time) => {
      const row = { time };
      DAY_KEYS.forEach((key) => (row[key] = null));

      sections.forEach((sec) => {
        const schedule = sec.schedule;
        if (!schedule || typeof schedule !== "object") return;
        if (schedule.time !== time) return;

        const days = schedule.days || [];
        days.forEach((day) => {
          const key = DAY_MAP[day];
          if (key) {
            row[key] = {
              section: sec.section || "—",
              subject: sec.subject || "Untitled",
              room: sec.room || "—",
            };
          }
        });
      });

      return row;
    });
  };

  const schedule = buildSchedule();

  // Cycle colors for schedule cells
  const cellColors = ["", "schedule-cell-green", "schedule-cell-blue"];

  const renderCell = (cell, colorIdx) => {
    if (!cell) return <td style={{ textAlign: "center", color: "var(--text-muted)" }}>—</td>;
    const colorClass = cellColors[colorIdx % cellColors.length];
    return (
      <td>
        <div className={`schedule-cell ${colorClass}`}>
          <strong>{cell.section}</strong>
          <small>{cell.subject}</small>
          <div className="schedule-cell-room"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> {cell.room}</div>
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
          <span style={{
            padding: "4px 12px",
            borderRadius: "var(--radius-full)",
            background: "var(--accent-soft)",
            color: "var(--primary)",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}>
            {sections.length} Section{sections.length !== 1 ? "s" : ""}
          </span>
        </div>

        <table className="schedule-table">
          <thead>
            <tr>
              <th>Time</th>
              {DAY_LABELS.map((day) => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  Loading your schedule...
                </td>
              </tr>
            ) : schedule.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  No schedule data yet. Schedule will appear once sections with schedule info are assigned to you.
                </td>
              </tr>
            ) : (
              schedule.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap" }}>{row.time}</td>
                  {DAY_KEYS.map((day, dayIdx) => {
                    const cell = row[day];
                    if (!cell) return <td key={day} data-label={DAY_LABELS[dayIdx]} style={{ textAlign: "center", color: "var(--text-muted)" }}>—</td>;
                    const colorClass = cellColors[dayIdx % cellColors.length];
                    return (
                      <td key={day} data-label={DAY_LABELS[dayIdx]}>
                        <div className={`schedule-cell ${colorClass}`}>
                          <strong>{cell.section}</strong>
                          <small>{cell.subject}</small>
                          <div className="schedule-cell-room"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> {cell.room}</div>
                        </div>
                      </td>
                    );
                  })}
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
            <div className="card-subtitle">Overview of all your assigned sections.</div>
          </div>
        </div>

        <div className="section-cards">
          {loading ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
              Loading...
            </p>
          ) : sections.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
              No sections assigned yet.
            </p>
          ) : (
            sections.map((sec) => {
              const scheduleStr = sec.schedule && typeof sec.schedule === "object"
                ? `${(sec.schedule.days || []).join(", ")} • ${sec.schedule.time || "TBD"}`
                : sec.schedule || "TBD";

              return (
                <div className="section-card" key={sec.id}>
                  <h4>{sec.section || "—"}</h4>
                  <p><strong>Subject:</strong> {sec.subject || "—"}</p>
                  <p><strong>Schedule:</strong> {scheduleStr}</p>
                  <p><strong>Room:</strong> {sec.room || "—"}</p>
                  <p><strong>Students:</strong> {(sec.students || []).length}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
