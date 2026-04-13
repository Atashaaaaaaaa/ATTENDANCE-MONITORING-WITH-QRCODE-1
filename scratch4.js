const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'ams-app/public');

const svgs = {
  'green-clipboard.svg': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
  'green-calendar.svg': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  'green-chart.svg': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
  'green-cap.svg': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>`,
  'green-check.svg': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  'green-logout.svg': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`
};

for (const [filename, content] of Object.entries(svgs)) {
    fs.writeFileSync(path.join(publicDir, filename), content);
}

fs.copyFileSync("C:\\Users\\Gjhelian\\.gemini\\antigravity\\brain\\a063c7ff-0a58-40c4-9630-402538b64a3c\\media__1776057202057.png", path.join(publicDir, "green-squares.png"));

let code = fs.readFileSync('ams-app/src/components/Sidebar.js', 'utf8');

const replacements = [
  ['icon: "⚡"', 'icon: <img src="/green-squares.png" alt="icon" style={{width: "24px", height: "24px", objectFit: "contain"}} />'],
  ['icon: "📚"', 'icon: <img src="/green-squares.png" alt="icon" style={{width: "24px", height: "24px", objectFit: "contain"}} />'],
  ['icon: "🎓"', 'icon: <img src="/green-squares.png" alt="icon" style={{width: "24px", height: "24px", objectFit: "contain"}} />'],
  
  ['icon: "📋"', 'icon: <img src="/green-clipboard.svg" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />'],
  ['icon: "📅"', 'icon: <img src="/green-calendar.svg" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />'],
  ['icon: "📈"', 'icon: <img src="/green-chart.svg" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />'],
  
  ['icon: "✅"', 'icon: <img src="/green-check.svg" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />'],
  ['<span className="sidebar-link-icon">🚪</span>', '<span className="sidebar-link-icon"><img src="/green-logout.svg" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} /></span>']
];

for (const [search, replace] of replacements) {
    code = code.split(search).join(replace);
}

// Student cap inside config (not the main logo student cap)
code = code.replace(
  '{ href: "/teacher/students", icon: "🎓", label: "My Students" }',
  '{ href: "/teacher/students", icon: <img src="/green-cap.svg" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />, label: "My Students" }'
);

fs.writeFileSync('ams-app/src/components/Sidebar.js', code);
console.log('Sidebar full replacement complete.');
