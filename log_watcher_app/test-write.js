const fs = require('fs');
let timer = 89;
setInterval(() => {
    fs.appendFileSync('./test.txt', `new data: ${timer}\n`);
    console.log(`Appended new data: ${timer}`);
    timer++;
}, 1000);