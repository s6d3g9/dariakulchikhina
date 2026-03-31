const fs = require('fs');
const file = '/Users/oxo/work/dariakulchikhina/messenger/core/src/server.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/!getConversationPolicy\(conversation\)\.secret/g, "conversation.kind !== 'direct-secret'");

fs.writeFileSync(file, code);
