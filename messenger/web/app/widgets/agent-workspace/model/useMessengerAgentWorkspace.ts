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
  const auth = useMessengerAuth()

  async function listWorkspace(agentId: string, currentPath = '') {
    const response = await auth.request<{ workspace: MessengerAgentWorkspaceListing }>(`/agents/${agentId}/workspace`, {
      method: 'GET',
      query: {
        path: currentPath,
      },
    })

    return response.workspace
  }

  async function readWorkspaceFile(agentId: string, filePath: string) {
    const response = await auth.request<{ file: MessengerAgentWorkspaceFilePreview }>(`/agents/${agentId}/workspace/file`, {
      method: 'GET',
      query: {
        path: filePath,
      },
    })

    return response.file
  }

  return {
    listWorkspace,
    readWorkspaceFile,
  }
}