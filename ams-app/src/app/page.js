import Navbar from "@/components/Navbar";
import Link from "next/link";

export const metadata = {
  title: "AMS - Smart Attendance Monitoring System",
  description: "Maximize the power of your attendance system with facial recognition technology. Smart, fast, and reliable attendance tracking for educational institutions.",
};

export default function LandingPage() {
  return (
    <>
      <Navbar />

      {/* HERO SECTION */}
      <section className="hero" id="hero">
        {/* Organic blob animation containers */}
        <div className="hero-blob-container left-blobs">
          <div className="hero-blob hero-blob-1"></div>
          <div className="hero-blob hero-blob-2"></div>
        </div>
        <div className="hero-blob-container right-blobs">
          <div className="hero-blob hero-blob-3"></div>
          <div className="hero-blob hero-blob-4"></div>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            Smart Attendance. Bigger Possibilities.
          </div>

          <h1>Maximize the Power of Your Attendance System</h1>

          <p className="hero-subtitle">
            Leverage cutting-edge facial recognition technology to automate, track, and manage
            attendance — no paperwork required.
          </p>

          <div className="hero-buttons">
            <Link href="/login" className="btn-primary">
              Get Started →
            </Link>
            <a href="#features" className="btn-secondary">
              Learn More
            </a>
          </div>
        </div>


      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="section" id="features">
        <div style={{ textAlign: "center" }}>
          <span className="section-badge">Features</span>
          <h2 className="section-title">
            Boost Your School&apos;s Efficiency<br />with AMS
          </h2>
          <p className="section-subtitle">
            Our platform is designed with seamless integration in mind, allowing
            you to connect it with your existing systems effortlessly.
          </p>
        </div>

        <div className="features-grid">
          <div className="features-list">
            <div className="feature-item">
              <h3>Face Scan Attendance</h3>
              <p>
                Our platform uses AI-powered facial recognition for fast,
                contactless attendance marking. No manual paperwork needed.
              </p>
              <ol>
                <li>Start a face scan session in class</li>
                <li>Students scan their face to mark attendance instantly</li>
              </ol>
            </div>

            <div className="feature-item">
              <h3>Secure & Reliable</h3>
              <p>
                Built with Firebase authentication and Firestore for real-time
                data sync. Every scan is timestamped and verified.
              </p>
            </div>

            <div className="feature-item">
              <h3>Real-Time Tracking</h3>
              <p>
                Monitor attendance as it happens. Teachers see live updates,
                admins get instant analytics, and students track their records.
              </p>
            </div>
          </div>

          <div className="feature-preview-card">
            <div className="feature-preview-header">
              <span className="feature-preview-title">Attendance Analytics</span>
              <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>This Semester</span>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Overall Rate</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#10B981" }}>92%</span>
              </div>
              <div className="feature-progress-bar">
                <div className="feature-progress-fill" style={{ width: "92%" }}></div>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>On-time Rate</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#4A7C59" }}>87%</span>
              </div>
              <div className="feature-progress-bar">
                <div className="feature-progress-fill" style={{ width: "87%" }}></div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: "20px" }}>
              <div className="feature-balance">
                <div className="feature-balance-label">Total Sessions</div>
                <div className="feature-balance-value">1,250</div>
              </div>
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "0.8rem", color: "#9CA3AF", marginBottom: "8px" }}>Monthly Trend</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "50px" }}>
                  {[40, 65, 55, 80, 70, 90, 85].map((h, i) => (
                    <div key={i} style={{
                      flex: 1,
                      height: `${h}%`,
                      background: i === 5 ? "#4A7C59" : "#E8F5E9",
                      borderRadius: "3px",
                    }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


        {/* Dashboard Preview */}
        <div className="hero-dashboard" id="dashboard">
          <div className="hero-dashboard-card">
            <div className="hero-dashboard-header">
              <div>
                <div className="hero-dashboard-title">Dashboard</div>
                <div className="hero-dashboard-subtitle">
                  Real-time attendance overview
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button className="btn-secondary btn-sm" style={{padding: "5px 10px", fontSize: "0.8rem", borderRadius:"6px"}}>Share</button>
                <button className="btn-secondary btn-sm" style={{padding: "5px 10px", fontSize: "0.8rem", borderRadius:"6px"}}>Alerts</button>
                <Link href="/login" className="btn btn-purple btn-sm">Report</Link>
              </div>
            </div>

            <div className="hero-dashboard-body">
              <div className="hero-dashboard-sidebar">
                <div className="hero-dash-nav-item active">Dashboard</div>
                <div className="hero-dash-nav-item">Attendance</div>
                <div className="hero-dash-nav-item">Analytics</div>
                <div className="hero-dash-nav-item">Face Scan</div>
                <div className="hero-dash-nav-item">History</div>
                <div className="hero-dash-nav-item">Devices</div>
              </div>

              <div className="hero-dashboard-main">
                <div className="hero-stats-row">
                  <div className="hero-stat-card">
                    <div className="hero-stat-label">Attendance Rate</div>
                    <div className="hero-stat-value">
                      88.91%
                      <span className="hero-stat-badge up">↑ 2.4%</span>
                    </div>
                  </div>
                  <div className="hero-stat-card">
                    <div className="hero-stat-label">Present Today</div>
                    <div className="hero-stat-value">
                      88.91%
                      <span className="hero-stat-badge up">↑ 1.2%</span>
                    </div>
                  </div>
                  <div className="hero-stat-card">
                    <div className="hero-stat-label">Absent Today</div>
                    <div className="hero-stat-value">
                      11.09%
                      <span className="hero-stat-badge down">↓ 0.8%</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap", width: "100%" }}>
                  <div style={{ flex: "1 1 500px", minWidth: "0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Attendance Insight</span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#F3F4F6", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem" }}>◀</span>
                        <span style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#F3F4F6", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem" }}>▶</span>
                      </div>
                    </div>
                    {/* Chart placeholder bars */}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "80px" }}>
                      {[60, 80, 45, 90, 70, 85, 50, 75, 65, 95, 55, 88].map((h, i) => (
                        <div key={i} style={{
                          flex: 1,
                          height: `${h}%`,
                          background: i === 9 ? "linear-gradient(to top, #4A7C59, #6B9E78)" : "#E8F5E9",
                          borderRadius: "4px",
                          transition: "height 0.5s ease",
                        }}></div>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: "0 0 160px", textAlign: "right", paddingRight: "10px", minWidth: "0" }}>
                    <div style={{ fontSize: "0.75rem", color: "#9CA3AF", marginBottom: "4px" }}>Total Students</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.5px" }}>450</div>
                    <div style={{ fontSize: "0.75rem", color: "#9CA3AF", marginTop: "12px", marginBottom: "4px" }}>Active Today</div>
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
                      <div style={{ flex: 1, height: "6px", background: "#E8F5E9", borderRadius: "99px", overflow: "hidden" }}>
                        <div style={{ width: "85%", height: "100%", background: "linear-gradient(90deg, #4A7C59, #6B9E78)", borderRadius: "99px" }}></div>
                      </div>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4A7C59" }}>85%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* ===== STATS SECTION ===== */}
      <section className="stats-section" id="stats">
        <div className="stats-grid">
          <div>
            <div className="stat-item-value">2k+</div>
            <div className="stat-item-label">Scans Processed</div>
          </div>
          <div>
            <div className="stat-item-value">95%</div>
            <div className="stat-item-label">Accuracy Rate</div>
          </div>
          <div>
            <div className="stat-item-value">175+</div>
            <div className="stat-item-label">Sessions Created</div>
          </div>
          <div>
            <div className="stat-item-value">15+</div>
            <div className="stat-item-label">Active Teachers</div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer" id="footer">
        <div className="footer-logo">AMS</div>
        <p>
          Smart facial recognition-based attendance monitoring for DLSU-D. Built with Next.js and
          Firebase for speed, security, and reliability.
        </p>
        <ul className="footer-links">
          <li><a href="#hero">Home</a></li>
          <li><a href="#features">Features</a></li>
        </ul>
        <div className="footer-bottom">
          © 2026 AMS - Attendance Monitoring System. All rights reserved.
        </div>
      </footer>
    </>
  );
}
