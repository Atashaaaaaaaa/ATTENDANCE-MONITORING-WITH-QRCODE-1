"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function TeacherReports() {
  const { user } = useAuth();
  const [filter, setFilter] = useState({
    section: "",
    dateFrom: "",
    dateTo: "",
  });

  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Summary stats
  const [stats, setStats] = useState({ avgRate: 0, totalAbsent: 0, totalLate: 0 });

  // PDF export loading state
  const [pdfLoading, setPdfLoading] = useState(false);

  // Fetch teacher's assigned sections on mount
  useEffect(() => {
    if (!user?.uid) return;

    const fetchSections = async () => {
      try {
        const sectionsSnap = await getDocs(collection(db, "sections"));
        const teacherSections = [];
        sectionsSnap.forEach((d) => {
          const data = d.data();
          if (data.teacherId === user.uid) {
            teacherSections.push({
              id: d.id,
              label: `${data.subject || "Subject"} — ${data.section || d.id}`,
              section: data.section || d.id,
              subject: data.subject || "",
              students: data.students || [],
            });
          }
        });
        setSections(teacherSections);
      } catch (e) {
        // silent
      }
    };
    fetchSections();
  }, [user?.uid]);

  // Generate report
  const handleGenerate = async () => {
    if (!filter.section) {
      alert("Please select a section.");
      return;
    }

    setLoading(true);
    setGenerated(false);

    try {
      const selectedSection = sections.find((s) => s.id === filter.section);
      if (!selectedSection) {
        setLoading(false);
        return;
      }

      // Build attendance query
      let q;
      if (filter.dateFrom && filter.dateTo) {
        q = query(
          collection(db, "attendance"),
          where("sectionId", "==", filter.section)
        );
      } else {
        q = query(
          collection(db, "attendance"),
          where("sectionId", "==", filter.section)
        );
      }

      const snap = await getDocs(q);
      const allRecords = [];
      snap.forEach((d) => {
        const data = d.data();
        // Apply date filter client-side if set
        if (filter.dateFrom && data.date < filter.dateFrom) return;
        if (filter.dateTo && data.date > filter.dateTo) return;
        allRecords.push(data);
      });

      // Fetch student names
      const studentIds = selectedSection.students || [];
      const studentNames = {};

      if (studentIds.length > 0) {
        // Try users collection
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.forEach((d) => {
          if (studentIds.includes(d.id)) {
            const data = d.data();
            studentNames[d.id] = data.fullName || data.name || data.email || d.id;
          }
        });
        // Fallback: students collection
        const studentsSnap = await getDocs(collection(db, "students"));
        studentsSnap.forEach((d) => {
          if (studentIds.includes(d.id) && !studentNames[d.id]) {
            const data = d.data();
            studentNames[d.id] = data.fullName || data.name || data.email || d.id;
          }
        });
      }

      // Group records by student, deduplicate by sessionId
      const studentStats = {};
      for (const sid of studentIds) {
        studentStats[sid] = { present: 0, late: 0, absent: 0, sessions: new Set() };
      }

      for (const record of allRecords) {
        const sid = record.studentId;
        if (!studentStats[sid]) {
          studentStats[sid] = { present: 0, late: 0, absent: 0, sessions: new Set() };
        }
        // Deduplicate: only count one record per session per student
        const sessionKey = record.sessionId || record.date;
        if (studentStats[sid].sessions.has(sessionKey)) continue;
        studentStats[sid].sessions.add(sessionKey);

        if (record.status === "Present") studentStats[sid].present++;
        else if (record.status === "Late") studentStats[sid].late++;
        else if (record.status === "Absent") studentStats[sid].absent++;
      }

      // Build display data
      const result = studentIds.map((sid) => {
        const s = studentStats[sid] || { present: 0, late: 0, absent: 0 };
        const total = s.present + s.late + s.absent;
        const rate = total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0;
        return {
          id: sid,
          name: studentNames[sid] || sid,
          present: s.present,
          late: s.late,
          absent: s.absent,
          total,
          rate,
        };
      });

      // Sort by name
      result.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(result);

      // Compute summary stats
      const totalStudents = result.length;
      const avgRate = totalStudents > 0
        ? Math.round(result.reduce((sum, s) => sum + s.rate, 0) / totalStudents)
        : 0;
      const totalAbsent = result.reduce((sum, s) => sum + s.absent, 0);
      const totalLate = result.reduce((sum, s) => sum + s.late, 0);
      setStats({ avgRate, totalAbsent, totalLate });

      setGenerated(true);
    } catch (e) {
      console.error("Error generating report:", e);
      alert("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (students.length === 0) {
      alert("No data to export.");
      return;
    }
    const selectedSection = sections.find((s) => s.id === filter.section);
    const csv = [
      `Attendance Report — ${selectedSection?.label || ""}`,
      `Date Range: ${filter.dateFrom || "All"} to ${filter.dateTo || "All"}`,
      "",
      "Student Name,Present,Late,Absent,Total Sessions,Rate",
      ...students.map((s) => `${s.name},${s.present},${s.late},${s.absent},${s.total},${s.rate}%`),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${filter.section}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (students.length === 0) {
      alert("No data to export. Generate a report first.");
      return;
    }

    setPdfLoading(true);

    try {
      // Robust dynamic import — use named export from jspdf
      const { jsPDF } = await import('jspdf');
      // jspdf-autotable v5: import autoTable as a standalone function
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = autoTableModule.default || autoTableModule.autoTable;

      const doc = new jsPDF();
      const selectedSection = sections.find((s) => s.id === filter.section);
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header bar
      doc.setFillColor(74, 124, 89); // green
      doc.rect(0, 0, pageWidth, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Attendance Report', 14, 18);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 26);

      // Section info
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(selectedSection?.label || 'Section Report', 14, 44);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date Range: ${filter.dateFrom || 'All dates'} to ${filter.dateTo || 'All dates'}`, 14, 52);

      // Summary stats
      const statsY = 60;
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(14, statsY, 55, 22, 3, 3, 'F');
      doc.roundedRect(74, statsY, 55, 22, 3, 3, 'F');
      doc.roundedRect(134, statsY, 55, 22, 3, 3, 'F');

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Avg Attendance', 18, statsY + 8);
      doc.text('Total Absences', 78, statsY + 8);
      doc.text('Total Late', 138, statsY + 8);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`${stats.avgRate}%`, 18, statsY + 18);
      doc.setTextColor(239, 68, 68);
      doc.text(`${stats.totalAbsent}`, 78, statsY + 18);
      doc.setTextColor(59, 130, 246);
      doc.text(`${stats.totalLate}`, 138, statsY + 18);

      // Table
      const tableData = students.map((s, i) => [
        i + 1,
        s.name,
        s.present,
        s.late,
        s.absent,
        s.total,
        `${s.rate}%`,
      ]);

      // Use autoTable as standalone function (v5 API)
      autoTable(doc, {
        startY: statsY + 30,
        head: [['#', 'Student Name', 'Present', 'Late', 'Absent', 'Total', 'Rate']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 4,
          lineColor: [200, 200, 200],
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [74, 124, 89],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [245, 250, 247],
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          // Color-code the rate column
          if (data.column.index === 6 && data.section === 'body') {
            const rate = parseInt(data.cell.raw);
            if (rate >= 90) data.cell.styles.textColor = [16, 185, 129];
            else if (rate >= 80) data.cell.styles.textColor = [74, 124, 89];
            else data.cell.styles.textColor = [239, 68, 68];
          }
        },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `AMS – Attendance Monitoring System | Page ${i} of ${pageCount}`,
          pageWidth / 2, doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Mobile-safe download: use Blob approach for broader compatibility
      const fileName = `attendance_report_${filter.section}_${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Cleanup after a short delay to ensure download initiates
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 250);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Please try again. Error: ' + (err.message || 'Unknown error'));
    } finally {
      setPdfLoading(false);
    }
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
              <option value="" disabled hidden>Select Section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
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
          <button
            className="btn btn-green"
            style={{ marginBottom: 0 }}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card stat-green">
          <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div>
          <div className="stat-card-label">Average Attendance</div>
          <div className="stat-card-value" style={{ color: "var(--success)" }}>{generated ? `${stats.avgRate}%` : "—"}</div>
        </div>
        <div className="stat-card stat-red">
          <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg></div>
          <div className="stat-card-label">Total Absences</div>
          <div className="stat-card-value" style={{ color: "var(--danger)" }}>{generated ? stats.totalAbsent : "—"}</div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
          <div className="stat-card-label">Total Late</div>
          <div className="stat-card-value" style={{ color: "var(--info)" }}>{generated ? stats.totalLate : "—"}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Student Consistency</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" onClick={handleExport}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', display: 'inline-block', verticalAlign: 'middle'}}><polyline points="8 17 12 21 16 17"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path></svg>CSV
            </button>
            <button className="btn btn-green btn-sm" onClick={handleExportPDF} disabled={pdfLoading}>
              {pdfLoading ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginRight: '6px',
                    verticalAlign: 'middle',
                  }}></span>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', display: 'inline-block', verticalAlign: 'middle'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>PDF
                </>
              )}
            </button>
          </div>
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
                  {generated
                    ? "No attendance data found for the selected filters."
                    : "No report data yet. Select a section and generate a report."}
                </td>
              </tr>
            ) : (
              students.map((student, idx) => (
                <tr key={student.id || idx}>
                  <td data-label="Student Name" style={{ fontWeight: 600 }}>{student.name}</td>
                  <td data-label="Present">{student.present}</td>
                  <td data-label="Late">{student.late}</td>
                  <td data-label="Absent">{student.absent}</td>
                  <td data-label="Rate">
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
