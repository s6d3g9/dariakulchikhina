const fs = require('fs');

const path = process.argv[2];
const content = fs.readFileSync(path, 'utf8');

const targetStr = `location = /messenger-api {`;
const blockToInsert = `    location /livekit/ {
        proxy_pass http://127.0.0.1:7880/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
`;

if (!content.includes(blockToInsert.trim())) {
    const updated = content.replaceAll(targetStr, blockToInsert + '\n    ' + targetStr);
    fs.writeFileSync(path, updated);
    console.log("Patched " + path);
} else {
    console.log("Already patched.");
}
