import type { Ref } from 'vue'
import type { AgentToolUseEntry } from './useMessengerAgentStream'

export interface ReasoningGroup {
  key: string
  label: string
  icon: string
  entries: AgentToolUseEntry[]
}

const FILE_TOOLS = new Set(['Read', 'Write', 'Edit', 'NotebookEdit'])
const CMD_TOOLS = new Set(['Bash'])
const SEARCH_TOOLS = new Set(['Grep', 'Glob'])
const WEB_TOOLS = new Set(['WebFetch', 'WebSearch'])
const SUBAGENT_TOOLS = new Set(['Task', 'AskUserQuestion'])

export function useReasoningGroups(toolUses: Ref<AgentToolUseEntry[]>) {
  const groups = computed<ReasoningGroup[]>(() => {
    const files: AgentToolUseEntry[] = []
    const commands: AgentToolUseEntry[] = []
    const searches: AgentToolUseEntry[] = []
    const web: AgentToolUseEntry[] = []
    const subagents: AgentToolUseEntry[] = []
    const other: AgentToolUseEntry[] = []

    for (const t of toolUses.value) {
      if (FILE_TOOLS.has(t.tool)) files.push(t)
      else if (CMD_TOOLS.has(t.tool)) commands.push(t)
      else if (SEARCH_TOOLS.has(t.tool)) searches.push(t)
      else if (WEB_TOOLS.has(t.tool)) web.push(t)
      else if (SUBAGENT_TOOLS.has(t.tool)) subagents.push(t)
      else other.push(t)
    }

    const result: ReasoningGroup[] = []
    if (files.length)     result.push({ key: 'files',     label: 'Файлы',       icon: '📁', entries: files })
    if (commands.length)  result.push({ key: 'commands',  label: 'Команды',     icon: '⚙️', entries: commands })
    if (searches.length)  result.push({ key: 'searches',  label: 'Поиск',       icon: '🔍', entries: searches })
    if (web.length)       result.push({ key: 'web',       label: 'Веб',         icon: '🌐', entries: web })
    if (subagents.length) result.push({ key: 'subagents', label: 'Суб-агенты',  icon: '🤖', entries: subagents })
    if (other.length)     result.push({ key: 'other',     label: 'Прочее',      icon: '➤',  entries: other })
    return result
  })

  const distinctFiles = computed<string[]>(() => {
    const set = new Set<string>()
    for (const t of toolUses.value) {
      const fp = (t.input as Record<string, unknown> | undefined)?.file_path
      if (typeof fp === 'string' && fp) set.add(fp)
    }
    return [...set]
  })

  function formatDuration(ms: number) {
    if (ms < 1000) return '<1s'
    const s = Math.floor(ms / 1000)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const rem = s - m * 60
    return rem ? `${m}m ${rem}s` : `${m}m`
  }

  return { groups, distinctFiles, formatDuration }
}
