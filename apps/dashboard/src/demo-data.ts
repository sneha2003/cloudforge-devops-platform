import type { AppInfo, Deployment, Incident, MetricSeries, OperationalStatus } from './types'

const now = Date.now()
const isoDaysAgo = (days: number) => new Date(now - days * 86_400_000).toISOString()
const point = (minutesAgo: number, value: number) => ({
  timestamp: Math.floor((now - minutesAgo * 60_000) / 1000),
  value,
})

export const demoDeployments: Deployment[] = [
  {
    id: 18,
    version: 'workboard-1.0.0',
    image: 'ghcr.io/sneha2003/workboard@sha256:7c4e…91af',
    commit_sha: '9c6e7e3d7f5a8e11',
    environment: 'production-simulated',
    source_url: 'https://github.com/sneha2003/cloudforge-devops-platform/releases/tag/v1.0.1',
    status: 'succeeded',
    verification: 'Readiness, API smoke tests and telemetry checks passed',
    created_at: isoDaysAgo(2),
    updated_at: isoDaysAgo(2),
  },
  {
    id: 17,
    version: 'workboard-1.1.0-rc.1',
    image: 'ghcr.io/sneha2003/workboard@sha256:18d3…42cc',
    commit_sha: '51d0a91fa42c61b7',
    environment: 'production-simulated',
    status: 'rolled_back',
    verification: 'Readiness probe failed; last verified artifact restored',
    rollback_version: 'workboard-1.0.0',
    created_at: isoDaysAgo(5),
    updated_at: isoDaysAgo(5),
  },
]

export const demoIncidents: Incident[] = [
  {
    id: 6,
    service: 'workboard',
    severity: 'critical',
    summary: 'Candidate release failed post-deployment readiness verification',
    deployment_id: 17,
    recovery: 'Automated rollback restored workboard-1.0.0; smoke tests passed',
    created_at: isoDaysAgo(5),
    resolved_at: isoDaysAgo(5),
  },
]

export const demoStatus: OperationalStatus = {
  service: 'healthy',
  environment: 'portfolio-demo',
  version: 'workboard-1.0.0',
  tracked_service: {
    name: 'WorkBoard',
    status: 'healthy',
    version: 'workboard-1.0.0',
    commit_sha: '9c6e7e3d7f5a8e11',
    environment: 'production-simulated',
    url: './workboard/',
    detail: 'Recorded validation: endpoint and database readiness passed',
  },
  last_successful_deployment: demoDeployments[0],
  recent_deployments: demoDeployments,
  active_incidents: [],
  data_classification: 'snapshot',
}

export const demoInfo: AppInfo = {
  name: 'CloudForge',
  version: 'v1.0.1',
  commit_sha: '9c6e7e3d7f5a8e11',
  environment: 'portfolio-demo',
  runtime: 'Docker Compose / Linux',
  hostname: 'cloudforge-runtime-01',
  timestamp: new Date(now).toISOString(),
}

export const demoMetrics: MetricSeries[] = [
  { key: 'request_rate', label: 'Request rate', unit: 'req/s', available: true, points: [point(30, 3.8), point(25, 4.4), point(20, 5.1), point(15, 4.7), point(10, 6.2), point(5, 5.8), point(0, 6.5)] },
  { key: 'latency_p95', label: 'Response latency p95', unit: 'ms', available: true, points: [point(30, 112), point(25, 124), point(20, 118), point(15, 139), point(10, 127), point(5, 121), point(0, 116)] },
  { key: 'cpu', label: 'Container CPU utilization', unit: '%', available: true, points: [point(30, 18.4), point(25, 21.1), point(20, 19.7), point(15, 26.2), point(10, 23.8), point(5, 25.1), point(0, 22.6)] },
  { key: 'memory', label: 'Container memory utilization', unit: '%', available: true, points: [point(30, 41.2), point(25, 42.1), point(20, 42.8), point(15, 43.4), point(10, 44.0), point(5, 43.7), point(0, 44.3)] },
]
