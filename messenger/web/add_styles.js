const fs = require('fs');

const path = 'messenger/web/app/components/messenger/MessengerCallAnalysisPanel.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.split('<style scoped>')[0];

const styles = `
<style scoped>
.transcript-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  width: 100%;
}

/* Base styles for the messages */
.call-transcript-line {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--glass-page-bg, #ffffff) 50%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: relative;
  will-change: transform, opacity;
  box-shadow: 0 4px 12px color-mix(in srgb, #000 2%, transparent);
}

.call-transcript-line__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  opacity: 0.6;
  margin-bottom: 2px;
}

.call-transcript-line p {
  margin: 0;
  line-height: 1.5;
  font-size: 0.95rem;
  color: var(--glass-text);
  word-wrap: break-word;
}

.call-transcript-line--me {
  background: color-mix(in srgb, var(--ds-accent) 8%, transparent);
  border-color: color-mix(in srgb, var(--ds-accent) 20%, transparent);
  align-self: flex-end;
  border-bottom-right-radius: 4px;
  margin-left: 20%;
}

.call-transcript-line--peer {
  background: color-mix(in srgb, var(--glass-surface, #f0f0f0) 80%, transparent);
  align-self: flex-start;
  border-bottom-left-radius: 4px;
  margin-right: 20%;
}

/* Draft styles */
.call-transcript-line--draft {
  opacity: 0.7;
  border-style: dashed;
}

.call-transcript-line--pulsing {
  animation: pulse-draft -1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-draft {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 0.5; }
}

/* Animations for list */
.transcript-list-enter-active,
.transcript-list-leave-active,
.transcript-list-move {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.transcript-list-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}
.transcript-list-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Typing dots animation */
.typing-dots::after {
  content: '';
  animation: typing-dots 1.5s infinite steps(4, end);
}
@keyframes typing-dots {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
  100% { content: ''; }
}
</style>
`;

fs.writeFileSync(path, content.trim() + '\n' + styles);
console.log('Styles added!!');
