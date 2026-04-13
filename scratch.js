const fs = require('fs');
const path = 'ams-app/src/app/page.js';
let lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

let startIdx = -1;
let endIdx = -1;
let statsIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{/* Dashboard Preview */}')) startIdx = i;
    // The hero section's closing tag is the first </section> after startIdx
    if (startIdx !== -1 && endIdx === -1 && lines[i].includes('      </section>')) endIdx = i;
    if (lines[i].includes('===== STATS SECTION =====')) statsIdx = i;
}

if (startIdx !== -1 && endIdx !== -1 && statsIdx !== -1) {
    // extract dashboard lines
    let dashboard = lines.slice(startIdx, endIdx);
    
    // delete from original pos
    lines.splice(startIdx, endIdx - startIdx);
    
    // re-evaluate statsIdx since lines array changed length
    statsIdx = lines.findIndex(l => l.includes('===== STATS SECTION ====='));
    
    // Add some spacing lines before dashboard if needed, or just insert
    // Wait, the dashboard has no surrounding section anymore. It's just a div.
    // Let's insert a <section> wrapper for the dashboard so it has padding like the features section.
    // Or just insert it directly since it has margin already.
    lines.splice(statsIdx, 0, '', ...dashboard, '');
    
    fs.writeFileSync(path, lines.join('\n'));
    console.log('Success');
} else {
    console.log('Failed to find indices', startIdx, endIdx, statsIdx);
}
