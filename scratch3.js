const fs = require('fs');

const svgMap = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>`;

fs.writeFileSync('ams-app/public/green-map.svg', svgMap);

let code = fs.readFileSync('ams-app/src/components/Sidebar.js', 'utf8');

const replacements = [
  ['icon: "📊"', 'icon: <img src="/green-laptop.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />'],
  ['icon: "👥"', 'icon: <img src="/green-people.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />'],
  ['icon: "🔗"', 'icon: <img src="/green-map.svg" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />'],
  ['icon: "👤"', 'icon: <img src="/green-profile.png" alt="icon" style={{width: "18px", height: "18px", objectFit: "contain"}} />']
];

for (const [search, replace] of replacements) {
    code = code.split(search).join(replace);
}

fs.writeFileSync('ams-app/src/components/Sidebar.js', code);
console.log('Sidebar updated');
