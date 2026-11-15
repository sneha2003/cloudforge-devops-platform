import type { AppInfo, Deployment, Incident, MetricSeries, OperationalStatus } from './types'
import { demoDeployments, demoIncidents, demoInfo, demoMetrics, demoStatus } from './demo-data'

export const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

async function request<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json() as Promise<T>
}

export const api = {
  info: () => isDemo ? Promise.resolve(demoInfo) : request<AppInfo>('/api/v1/info'),
  status: () => isDemo ? Promise.resolve(demoStatus) : request<OperationalStatus>('/api/v1/status'),
  deployments: () => isDemo ? Promise.resolve(demoDeployments) : request<Deployment[]>('/api/v1/deployments'),
  incidents: () => isDemo ? Promise.resolve(demoIncidents) : request<Incident[]>('/api/v1/incidents'),
  monitoring: () => isDemo ? Promise.resolve(demoMetrics) : request<MetricSeries[]>('/api/v1/monitoring'),
}

