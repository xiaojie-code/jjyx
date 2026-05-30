const fs = require('fs');
const c = fs.readFileSync('d:/myApp/work_ycykj/jjyx/jjyx/server/uploads/games/snake/assets/main/index.f6710.js', 'utf8');
// 找 onCreate
const idx = c.indexOf('onCreate');
if (idx > 0) {
  console.log('=== onCreate context ===');
  console.log(c.substring(idx, idx + 500));
}
// 找 tt.p
const idx2 = c.indexOf('tt.p');
if (idx2 > 0) {
  console.log('\n=== tt.p context ===');
  console.log(c.substring(Math.max(0, idx2 - 100), idx2 + 100));
}
