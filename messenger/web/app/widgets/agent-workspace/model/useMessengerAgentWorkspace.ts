export interface MessengerAgentWorkspaceEntry {
  path: string
  name: string
  kind: 'file' | 'directory'
  size: number
}

export interface MessengerAgentWorkspaceListing {
  source: 'local' | 'ssh'
  sshTarget: string | null
  rootPath: string
  currentPath: string
  entries: MessengerAgentWorkspaceEntry[]
}

export interface MessengerAgentWorkspaceFilePreview {
  source: 'local' | 'ssh'
  sshTarget: string | null
  rootPath: string
  path: string
  name: string
  content: string
  truncated: boolean
}

export function useMessengerAgentWorkspace() {
  const api = useAgentsApi()

  async function listWorkspace(agentId: string, currentPath = '') {
    const response = await api.getAgentWorkspace(agentId, currentPath)
    return response.workspace
  }

  async function readWorkspaceFile(agentId: string, filePath: string) {
    const response = await api.getAgentWorkspaceFile(agentId, filePath)
    return response.file
  }

  return {
    listWorkspace,
    readWorkspaceFile,
  }
}