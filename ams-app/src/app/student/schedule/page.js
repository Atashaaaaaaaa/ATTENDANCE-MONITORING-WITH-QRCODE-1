"use client";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const DAY_MAP = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri" };
const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StudentSchedule() {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch sections where student is enrolled
  useEffect(() => {
    if (!user?.uid) return;

    const fetchSections = async () => {
      try {
        const sectionsSnap = await getDocs(collection(db, "sections"));
        const fetched = [];
        sectionsSnap.forEach((d) => {
          const data = d.data();
          const studentsList = data.students || [];
          if (studentsList.includes(user.uid)) {
            fetched.push({ id: d.id, ...data });
          }
        });
        setSections(fetched);
      } catch (e) {
        // Will populate when database is connected
      } finally {
        setLoading(false);
      }
    };
    fetchSections();
  }, [user?.uid]);

  // Get today's day abbreviation
  const todayShort = DAY_SHORT[new Date().getDay()]; // e.g. "Mon"

  // Build today's classes from sections
  const todayClasses = sections
    .filter((sec) => {
      if (!sec.schedule || typeof sec.schedule !== "object") return false;
      return (sec.schedule.days || []).includes(todayShort);
    })
    .map((sec) => ({
      time: sec.schedule?.time || "TBD",
      name: sec.subject || "Untitled",
      room: sec.room ? `📍 ${sec.room}` : "📍 TBD",
      teacher: sec.teacher || "TBD",
      section: sec.section || "—",
      type: "upcoming", // Default style
    }));

  // Build the weekly timetable
  const buildSchedule = () => {
    const timeSlots = new Set();
    sections.forEach((sec) => {
      const schedule = sec.schedule;
      if (schedule && typeof schedule === "object" && schedule.time) {
        timeSlots.add(schedule.time);
      }
    });

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
              subject: sec.subject || "Untitled",
              section: sec.section || "—",
              room: sec.room || "—",
              teacher: sec.teacher || "TBD",
            };
          }
        });
      });

      return row;
    });
  };

  const schedule = buildSchedule();

  return (
    <>
      <div className="page-header">
        <h1>My Schedule</h1>
        <p>Your official class schedule for the current semester.</p>
      </div>

      <div className="card" style={{ borderLeft: "5px solid var(--warning)" }}>
        <div className="card-title" style={{ color: "#D35400", marginBottom: "16px" }}>
          📅 Today&apos;s Classes
          <span style={{
            marginLeft: "12px",
            padding: "3px 10px",
            borderRadius: "var(--radius-full)",
            background: "var(--warning-bg)",
            color: "var(--warning)",
            fontSize: "0.72rem",
            fontWeight: 700,
          }}>
            {todayClasses.length} class{todayClasses.length !== 1 ? "es" : ""}
          </span>
        </div>

        <div className="today-classes">
          {loading ? (
            <p style={{ color: "var(--text-muted)", padding: "10px" }}>
              Loading...
            </p>
          ) : todayClasses.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "10px" }}>
              No classes scheduled for today.
            </p>
          ) : (
            todayClasses.map((cls, idx) => (
              <div className={`today-class-card ${cls.type}`} key={idx}>
                <div className="today-class-time">🕐 {cls.time}</div>
                <div className="today-class-name">{cls.name}</div>
                <div className="today-class-room">{cls.room}</div>
                <div className="today-class-teacher">👨‍🏫 {cls.teacher} • {cls.section}</div>
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
                  No schedule data yet. Schedule will appear once you are enrolled in classes.
                </td>
              </tr>
            ) : (
              schedule.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{row.time}</td>
                  {DAY_KEYS.map((day) => (
                    <td key={day}>
                      {row[day] ? (
                        <div className="schedule-cell">
                          <strong>{row[day].subject}</strong>
                          <small>{row[day].section}</small>
                          <div className="schedule-cell-room">📍 {row[day].room}</div>
                        </div>
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
