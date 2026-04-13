const fs = require('fs');

// 1. Fix Sidebar.js Icons
let sidebar = fs.readFileSync('ams-app/src/components/Sidebar.js', 'utf8');
sidebar = sidebar.replace('/green-clipboard.svg', '/green-time-card.png')
                 .replace('/green-calendar.svg', '/green-calendar.png')
                 .replace('/green-chart.svg', '/green-report.png')
                 .replace('/green-check.svg', '/green-time-card.png') 
                 .replace('/green-calendar.svg', '/green-calendar.png'); // student attendance maybe checkmark -> time-card?
// Let's replace specifically:
// My Attendance: ✅ -> time card? "change the class attendance icon with the green time card asset". So both.
fs.writeFileSync('ams-app/src/components/Sidebar.js', sidebar);

// 2. Fix admin/users/page.js
let adminUsers = fs.readFileSync('ams-app/src/app/admin/users/page.js', 'utf8');
adminUsers = adminUsers.replace(
  '<input\n              type="text"\n              className="form-control"\n              placeholder="🔍 Search by name, email or ID..."\n              value={searchQuery}\n              onChange={(e) => setSearchQuery(e.target.value)}\n              style={{ width: "260px" }}\n            />',
  `<div style={{ position: "relative", display: "inline-block", width: "260px" }}>
              <img src="/green-search.png" alt="search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", pointerEvents: "none" }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", paddingLeft: "34px" }}
              />
            </div>`
);
adminUsers = adminUsers.replace(
  '<input\n                    type="text"\n                    className="form-control"\n                    placeholder="🔍 Search archived accounts..."\n                    value={archivedSearch}\n                    onChange={(e) => setArchivedSearch(e.target.value)}\n                    style={{ width: "260px" }}\n                  />',
  `<div style={{ position: "relative", display: "inline-block", width: "260px" }}>
                    <img src="/green-search.png" alt="search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", pointerEvents: "none" }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search archived accounts..."
                      value={archivedSearch}
                      onChange={(e) => setArchivedSearch(e.target.value)}
                      style={{ width: "100%", paddingLeft: "34px" }}
                    />
                  </div>`
);
fs.writeFileSync('ams-app/src/app/admin/users/page.js', adminUsers);

// 3. Fix teacher/students/page.js
let teacherStudents = fs.readFileSync('ams-app/src/app/teacher/students/page.js', 'utf8');
teacherStudents = teacherStudents.replace(
  '<input\n              type="text"\n              className="form-control"\n              placeholder="🔍 Search by name, email or ID..."\n              value={searchQuery}\n              onChange={(e) => setSearchQuery(e.target.value)}\n              style={{ width: "260px" }}\n            />',
  `<div style={{ position: "relative", display: "inline-block", width: "260px" }}>
              <img src="/green-search.png" alt="search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", pointerEvents: "none" }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", paddingLeft: "34px" }}
              />
            </div>`
);
fs.writeFileSync('ams-app/src/app/teacher/students/page.js', teacherStudents);

console.log('UI Patches Complete');
