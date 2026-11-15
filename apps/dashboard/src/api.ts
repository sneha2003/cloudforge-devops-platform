import type { AppInfo, Deployment, Incident, MetricSeries, OperationalStatus } from './types'

async function request<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json() as Promise<T>
}

export const api = {
  info: () => request<AppInfo>('/api/v1/info'),
  status: () => request<OperationalStatus>('/api/v1/status'),
  deployments: () => request<Deployment[]>('/api/v1/deployments'),
  incidents: () => request<Incident[]>('/api/v1/incidents'),
  monitoring: () => request<MetricSeries[]>('/api/v1/monitoring'),
}

