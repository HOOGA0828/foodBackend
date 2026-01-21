import fs from 'fs';
const filename = 'scraper_inclusive.log';
try {
    if (!fs.existsSync(filename)) { process.exit(0); }
    const content = fs.readFileSync(filename);
    const text = content[0] === 0xFF ? content.toString('utf16le') : content.toString('utf8');
    console.log(text.split('\n').filter(l => l.includes('找到') || l.includes('PAGE LOG') || l.includes('KFC')).join('\n'));
} catch (e) { console.error(e); }
