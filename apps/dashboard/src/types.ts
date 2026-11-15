export type DeploymentStatus = 'pending' | 'deploying' | 'succeeded' | 'failed' | 'rolled_back'

export interface Deployment {
  id: number
  version: string
  image: string
  commit_sha: string
  environment: string
  source_url?: string
  status: DeploymentStatus
  verification?: string
  rollback_version?: string
  created_at: string
  updated_at: string
}

export interface Incident {
  id: number
  service: string
  severity: 'info' | 'warning' | 'critical'
  summary: string
  deployment_id?: number
  recovery?: string
  created_at: string
  resolved_at?: string
}

export interface OperationalStatus {
  service: string
  environment: string
  version: string
  tracked_service: {
    name: string
    status: string
    version: string
    commit_sha: string
    environment: string
    url: string
    detail: string
  }
  last_successful_deployment: Deployment | null
  recent_deployments: Deployment[]
  active_incidents: Incident[]
  data_classification: 'live' | 'snapshot'
}

export interface AppInfo {
  name: string
  version: string
  commit_sha: string
  environment: string
  runtime: string
  hostname: string
  timestamp: string
}

export interface MetricSeries {
  key: string
  label: string
  unit: string
  available: boolean
  reason?: string
  points: { timestamp: number; value: number }[]
}

