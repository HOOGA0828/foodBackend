const fs = require('fs');
try {
    const content = fs.readFileSync('scraper_debug_2.log', 'utf16le'); // Try utf16le first
    console.log(content);
} catch (e) {
    console.log('Failed to read as utf16le, trying utf8');
    try {
        const content = fs.readFileSync('scraper_debug_2.log', 'utf8');
        console.log(content);
    } catch (e2) {
        console.error(e2);
    }
}
