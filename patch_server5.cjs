const fs = require('fs');
const file = '/Users/oxo/work/dariakulchikhina/messenger/core/src/server.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/findMessengerUserAiSettings/g, 'getMessengerUserAiSettings');

fs.writeFileSync(file, code);
