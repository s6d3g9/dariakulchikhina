// Local types for the communications module.
// The cross-process contract (ProjectCommunicationBootstrap) lives in
// ~/shared/types/communications/communications.

export interface RelayJsonOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  headers?: Record<string, string>
}
