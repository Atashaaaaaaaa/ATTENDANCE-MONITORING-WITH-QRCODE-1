const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'ams-app/public');
const files = fs.readdirSync(publicDir);

for (const file of files) {
  if (file.endsWith('.svg') && file.startsWith('green-')) {
    let content = fs.readFileSync(path.join(publicDir, file), 'utf8');
    if (!content.includes('xmlns=')) {
      content = content.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      fs.writeFileSync(path.join(publicDir, file), content);
    }
  }
}
console.log('Fixed SVGs');
