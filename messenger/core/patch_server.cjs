const fs = require('fs');
const file = '/Users/oxo/work/dariakulchikhina/messenger/core/src/server.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const payload = await verifyMessengerToken\(token\)/g, "const payload = verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET)");
code = code.replace(/findMessengerUserById\(payload\.userId\)/g, "findMessengerUserById(payload.sub)");
code = code.replace(/const participantName = user\.phone \|\| 'User'/g, "const participantName = user.displayName || 'User'");
code = code.replace(/if \(conversation && !conversation\.secret && \(conversation\.userAId/g, "if (conversation && !getConversationPolicy(conversation).secret && (conversation.userAId");

fs.writeFileSync(file, code);
