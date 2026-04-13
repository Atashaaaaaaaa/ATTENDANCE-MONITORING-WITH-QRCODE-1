const fs = require('fs');
let code = fs.readFileSync('ams-app/src/app/page.js', 'utf8');

const replacements = [
  ['📊 Dashboard', 'Dashboard'],
  ['>📤<', '>Share<'],
  ['>🔔<', '>Alerts<'],
  ['📋 Report', 'Report'],
  ['💳 Attendance', 'Attendance'],
  ['📈 Analytics', 'Analytics'],
  ['🤳 Face Scan', 'Face Scan'],
  ['📜 History', 'History'],
  ['📱 Devices', 'Devices'],
  ['🤳 Face Scan Attendance', 'Face Scan Attendance'],
  ['🔒 Secure & Reliable', 'Secure & Reliable'],
  ['⚡ Real-Time Tracking', 'Real-Time Tracking'],
  ['📊 Attendance Analytics', 'Attendance Analytics'],
  ['⚡ AMS', 'AMS']
];

for (const [search, replace] of replacements) {
    code = code.split(search).join(replace);
}

// Remove btn-icon class if we inserted text since those are styled for icons only
code = code.split('className="btn-icon" aria-label="Share">Share<').join('className="btn-secondary btn-sm" style={{padding: "5px 10px", fontSize: "0.8rem", borderRadius:"6px"}}>Share<');
code = code.split('className="btn-icon" aria-label="Notifications">Alerts<').join('className="btn-secondary btn-sm" style={{padding: "5px 10px", fontSize: "0.8rem", borderRadius:"6px"}}>Alerts<');

fs.writeFileSync('ams-app/src/app/page.js', code);
console.log('Emojis removed successfully');
