
const fs = require('fs');
const path = require('path');

const gitignorePath = path.join(process.cwd(), '.gitignore');
const buffer = fs.readFileSync(gitignorePath);
console.log('Hex digest:', buffer.slice(0, 20).toString('hex'));
console.log('Content preview:', buffer.slice(0, 50).toString());
console.log('Encoding check: Is it valid UTF-8?', Buffer.from(buffer.toString('utf8')).equals(buffer));
