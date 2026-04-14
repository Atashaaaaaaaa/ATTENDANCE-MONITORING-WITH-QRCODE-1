const fs = require('fs');
const path = require('path');

const emojiMap = {
  // SVG Strings colored #00FF00
  '📊': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
  '📉': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>`,
  '⏰': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  '📥': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', display: 'inline-block', verticalAlign: 'middle'}}><polyline points="8 17 12 21 16 17"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path></svg>`,
  '👨‍🏫': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>`,
  '🎓': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>`,
  '📂': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
  '📚': `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>`,
  '🔍': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  '📍': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
  '🕐': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  '🟢': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><circle cx="12" cy="12" r="10"></circle></svg>`,
  '🔴': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
  '⏸️': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`,
  '👥': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  '🎥': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
  '⏹️': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`,
  '📅': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  '📌': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`,
  '⚠️': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '5px'}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  '✕': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle'}}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
};

function processDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      Object.keys(emojiMap).forEach(emoji => {
        if (content.includes(emoji)) {
          // Replace using string replacement
          // Need to handle JSX appropriately if it's deeply nested, but simple replace works for most.
          content = content.replace(new RegExp(emoji, 'g'), emojiMap[emoji]);
          changed = true;
        }
      });
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated ' + fullPath);
      }
    }
  });
}

const targetDirs = [
  path.join(__dirname, 'ams-app', 'src', 'app', 'teacher'),
  path.join(__dirname, 'ams-app', 'src', 'app', 'admin'),
  path.join(__dirname, 'ams-app', 'src', 'app', 'student')
];

targetDirs.forEach(processDir);
