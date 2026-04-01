const fs = require('fs');
const file = 'messenger/web/app/components/messenger/MessengerCallAnalysisPanel.vue';
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `          <template v-else>
            <p v-if="!calls.transcriptionEntries.value.length && !calls.transcriptionDraft.value" class="call-transcript-popup__empty">
              Ждём распознавание речи...
            </p>
            <article
              v-for="entry in calls.transcriptionEntries.value"
              :key="entry.id"
              class="call-transcript-line"
              :class="[\`call-transcript-line--\${entry.speaker}\`, { 'call-transcript-line--draft': !entry.final }]"
            >
              <header class="call-transcript-line__meta">
                <span>{{ entry.speaker === 'peer' ? 'Собеседник' : 'Вы' }}</span>
                <time>{{ formatTranscriptTime(entry.createdAt) }}</time>
              </header>
              <p>{{ entry.text }}</p>
            </article>
            <article v-if="calls.transcriptionDraft.value" class="call-transcript-line call-transcript-line--draft">
              <header class="call-transcript-line__meta">
                <span>Распознаём...</span>
              </header>
              <p>{{ calls.transcriptionDraft.value }}</p>
            </article>
          </template>`;

const newBlock = `          <TransitionGroup name="transcript-list" tag="div" class="transcript-list-wrapper" v-else>
            <p v-if="!calls.transcriptionEntries.value.length && !calls.transcriptionDraft.value" class="call-transcript-popup__empty" key="empty">
              Ждём распознавание речи...
            </p>
            <article
              v-for="entry in calls.transcriptionEntries.value"
              :key="entry.id"
              class="call-transcript-line"
              :class="[\`call-transcript-line--\${entry.speaker}\`, { 'call-transcript-line--draft': !entry.final }]"
            >
              <header class="call-transcript-line__meta">
                <span>{{ entry.speaker === 'peer' ? 'Собеседник' : 'Вы' }}</span>
                <time>{{ formatTranscriptTime(entry.createdAt) }}</time>
              </header>
              <p>{{ entry.text }}</p>
            </article>
            <article v-if="calls.transcriptionDraft.value" key="draft" class="call-transcript-line call-transcript-line--draft call-transcript-line--pulsing">
              <header class="call-transcript-line__meta">
                <span>Распознаём... <span class="typing-dots"></span></span>
              </header>
              <p>{{ calls.transcriptionDraft.value }}</p>
            </article>
          </TransitionGroup>`;

if (content.includes(oldBlock)) {
  fs.writeFileSync(file, content.replace(oldBlock, newBlock));
  console.log('Replaced successfully');
} else {
  console.log('Old block not found');
}
