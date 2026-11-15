import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, Box, Boxes, CheckCircle2, CircleDot, Cloud, Cpu,
  Database, ExternalLink, Gauge, GitBranch, GitCommit, History, LayoutDashboard,
  LockKeyhole, Moon, Network, RefreshCw, Rocket, Server, ShieldCheck, Sun,
  Workflow, XCircle, Zap,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, isDemo } from './api'
import type { AppInfo, Deployment, Incident, MetricSeries, OperationalStatus } from './types'

type Page = 'overview' | 'deployments' | 'infrastructure' | 'monitoring' | 'incidents' | 'architecture'

const repositoryUrl = 'https://github.com/sneha2003/cloudforge-devops-platform'
const workboardUrl = isDemo ? './workboard/' : 'http://localhost:8100'

const pages: { id: Page; label: string; icon: typeof Activity; group: string }[] = [
  { id: 'overview', label: 'Service Overview', icon: LayoutDashboard, group: 'Operations' },
  { id: 'monitoring', label: 'Observability', icon: Activity, group: 'Operations' },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, group: 'Operations' },
  { id: 'deployments', label: 'Release Management', icon: Rocket, group: 'Delivery' },
  { id: 'infrastructure', label: 'Runtime Inventory', icon: Server, group: 'Platform' },
  { id: 'architecture', label: 'System Topology', icon: Network, group: 'Platform' },
]

const initialPage = (): Page => {
  const requested = new URLSearchParams(window.location.search).get('view')
  return pages.some(item => item.id === requested) ? requested as Page : 'overview'
}

const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Not available'
const shortSha = (sha?: string) => !sha || sha === 'unknown' || sha === '0000000' ? 'local-build' : sha.slice(0, 8)
const titleCase = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())

function Badge({ status }: { status: string }) {
  return <span className={`status status-${status}`}><span/>{titleCase(status)}</span>
}

function Empty({ title, text, icon: Icon = Box }: { title: string; text: string; icon?: typeof Box }) {
  return <div className="empty"><div className="empty-icon"><Icon size={18}/></div><strong>{title}</strong><span>{text}</span></div>
}

function PageHead({ eyebrow, title, description, status }: { eyebrow: string; title: string; description: string; status?: string }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
    <div className="context-strip"><span>ENV / {isDemo ? 'VALIDATION' : 'LOCAL'}</span><span className="context-divider"/><span className="live-dot"/>{status ?? (isDemo ? 'RECORDED SNAPSHOT' : 'TELEMETRY ACTIVE')}</div>
  </div>
}

function MetricCard({ series, label, meta }: { series?: MetricSeries; label?: string; meta: string }) {
  const last = series?.points.at(-1)?.value
  return <div className="card metric-card"><div className="metric-top"><span>{meta}</span><Gauge size={15}/></div>
    <div className="metric-value">{series?.available && last !== undefined ? `${last.toFixed(series.unit === '%' ? 1 : 2)}${series.unit === '%' ? '%' : ` ${series.unit}`}` : '—'}</div>
    <div className="metric-label">{label ?? series?.label ?? 'Metric unavailable'}</div>
    <div className={`metric-foot ${series?.available ? 'available' : ''}`}><span/>{series?.available ? 'Reporting normally' : 'Awaiting data'}</div>
  </div>
}

function DeploymentTable({ deployments }: { deployments: Deployment[] }) {
  if (!deployments.length) return <Empty icon={History} title="No release activity" text="Verified releases will appear after the delivery workflow completes its policy checks." />
  return <div className="table-wrap"><table className="table"><thead><tr><th>Release</th><th>State</th><th>Artifact</th><th>Revision</th><th>Verification result</th><th>Timestamp</th></tr></thead>
    <tbody>{deployments.map(deployment => <tr key={deployment.id}>
      <td><strong>{deployment.version}</strong><div className="subtle">{deployment.environment.toUpperCase()}</div></td>
      <td><Badge status={deployment.status}/></td>
      <td className="mono artifact">{deployment.image}</td>
      <td className="mono"><GitCommit size={12}/>{shortSha(deployment.commit_sha)}</td>
      <td className="verification">{deployment.verification ?? 'Verification in progress'}</td>
      <td className="muted">{formatDate(deployment.created_at)}</td>
    </tr>)}</tbody></table></div>
}

function Overview({ status, metrics }: { status?: OperationalStatus; metrics: MetricSeries[] }) {
  const byKey = Object.fromEntries(metrics.map(metric => [metric.key, metric]))
  const healthy = status?.service === 'healthy'
  return <><PageHead eyebrow="Service Operations" title="WorkBoard service overview" description="Availability, release posture, and operational risk for the monitored workload." status={healthy ? 'SERVICE OPERATIONAL' : 'SERVICE IMPAIRED'}/>
    <div className="grid metrics-grid">
      <div className="card metric-card service-health"><div className="metric-top"><span>AVAILABILITY</span><CheckCircle2 size={15}/></div><div className={`metric-value service-state ${healthy ? 'healthy' : 'unhealthy'}`}>{healthy ? 'Operational' : 'Unavailable'}</div><div className="metric-label">WorkBoard endpoint and database readiness</div><div className={`metric-foot ${healthy ? 'available' : 'critical'}`}><span/>{status?.tracked_service?.detail ?? 'Health probe unavailable'}</div></div>
      <div className="card metric-card"><div className="metric-top"><span>ACTIVE RELEASE</span><GitBranch size={15}/></div><div className="metric-value release-value">{status?.version ?? '—'}</div><div className="metric-label">Deployed WorkBoard version</div><div className="metric-foot available"><span/>Revision {shortSha(status?.tracked_service?.commit_sha)}</div></div>
      <MetricCard series={byKey.request_rate} label="Inbound request throughput" meta="TRAFFIC / 2M"/>
      <MetricCard series={byKey.latency_p95} label="95th percentile response time" meta="LATENCY / P95"/>
    </div>
    <div className="grid overview-grid">
      <section className="card"><div className="card-header"><div><div className="section-kicker">DELIVERY</div><div className="card-title">Recent release activity</div><div className="card-subtitle">Promotion decisions and automated verification outcomes</div></div><Rocket size={17}/></div><DeploymentTable deployments={status?.recent_deployments ?? []}/></section>
      <section className="card risk-panel"><div className="card-header"><div><div className="section-kicker">RISK</div><div className="card-title">Open incidents</div><div className="card-subtitle">Events requiring operator review</div></div><AlertTriangle size={17}/></div>
        {status?.active_incidents.length ? status.active_incidents.map(incident => <div className="alert-row" key={incident.id}><div className="alert-icon"><XCircle size={15}/></div><div className="alert-copy"><strong>{incident.summary}</strong><p>{incident.service.toUpperCase()} · {formatDate(incident.created_at)}</p></div></div>) : <Empty icon={ShieldCheck} title="No open incidents" text="No unresolved operational events are currently registered."/>}
      </section>
    </div>
  </>
}

function Infrastructure({ info, status, metrics }: { info?: AppInfo; status?: OperationalStatus; metrics: MetricSeries[] }) {
  const cpu = metrics.find(metric => metric.key === 'cpu')
  const memory = metrics.find(metric => metric.key === 'memory')
  return <><PageHead eyebrow="Platform" title="Runtime inventory" description="Authoritative runtime metadata and resource telemetry for the local environment."/>
    <div className="inventory-summary"><div><span>ENVIRONMENT</span><strong>{info?.environment?.toUpperCase() ?? 'UNAVAILABLE'}</strong></div><div><span>DEPLOYMENT MODEL</span><strong>Docker Compose</strong></div><div><span>MONITORED SERVICE</span><strong>WorkBoard</strong></div><div><span>TELEMETRY SOURCE</span><strong>Prometheus</strong></div></div>
    <div className="grid infra-grid">
      <section className="card card-pad"><div className="panel-heading"><Server size={17}/><div><span>COMPUTE</span><strong>Runtime host</strong></div></div><div className="detail-list"><div className="detail-row"><span>Hostname</span><span className="mono">{info?.hostname ?? 'Unavailable'}</span></div><div className="detail-row"><span>Application runtime</span><span>{info?.runtime ?? 'Unavailable'}</span></div><div className="detail-row"><span>Environment class</span><Badge status={info?.environment ?? 'unknown'}/></div></div></section>
      <section className="card card-pad"><div className="panel-heading"><Boxes size={17}/><div><span>WORKLOAD</span><strong>WorkBoard service</strong></div></div><div className="detail-list"><div className="detail-row"><span>Readiness</span><Badge status={status?.service === 'healthy' ? 'succeeded' : 'failed'}/></div><div className="detail-row"><span>Release</span><span>{status?.version ?? 'Unavailable'}</span></div><div className="detail-row"><span>Revision</span><span className="mono">{shortSha(status?.tracked_service?.commit_sha)}</span></div></div></section>
      <section className="card card-pad"><div className="panel-heading"><Cpu size={17}/><div><span>CAPACITY</span><strong>Resource utilization</strong></div></div><div className="detail-list"><div className="detail-row"><span>CPU utilization</span><span>{cpu?.available ? `${cpu.points.at(-1)?.value.toFixed(1)}%` : 'Awaiting telemetry'}</span></div><div className="detail-row"><span>Memory utilization</span><span>{memory?.available ? `${memory.points.at(-1)?.value.toFixed(1)}%` : 'Awaiting telemetry'}</span></div><div className="detail-row"><span>Collection status</span><Badge status="healthy"/></div></div></section>
    </div>
  </>
}

function Monitoring({ metrics }: { metrics: MetricSeries[] }) {
  return <><PageHead eyebrow="Observability" title="Service telemetry" description="Prometheus time-series for workload performance, readiness, and runtime capacity."/>
    <div className="grid chart-grid">{metrics.map(series => <section className="card chart-card" key={series.key}><div className="card-header"><div><div className="section-kicker">30 MINUTE WINDOW</div><div className="card-title">{series.label}</div><div className="card-subtitle">Unit: {series.unit}</div></div>{series.available && <span className="chart-value">{series.points.at(-1)?.value.toFixed(2)} {series.unit}</span>}</div>
      {series.available ? <div className="chart-body"><ResponsiveContainer><AreaChart data={series.points.map(point => ({ time: new Date(point.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: point.value }))}><defs><linearGradient id={`fill-${series.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#58a6ff" stopOpacity={.22}/><stop offset="95%" stopColor="#58a6ff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="time" stroke="var(--muted)" fontSize={9} tickLine={false}/><YAxis stroke="var(--muted)" fontSize={9} tickLine={false} width={38}/><Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, fontSize: 11 }}/><Area type="monotone" dataKey="value" stroke="#58a6ff" strokeWidth={1.7} fill={`url(#fill-${series.key})`}/></AreaChart></ResponsiveContainer></div> : <Empty icon={Activity} title="Telemetry unavailable" text={series.reason ?? 'Prometheus has not returned samples for this metric.'}/>}</section>)}</div>
  </>
}

function Incidents({ incidents }: { incidents: Incident[] }) {
  return <><PageHead eyebrow="Reliability" title="Incident management" description="Operational event history with release correlation and documented recovery actions."/>
    <div className="card">{incidents.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Priority</th><th>Service</th><th>Event</th><th>Release reference</th><th>Resolution</th><th>Opened</th></tr></thead><tbody>{incidents.map(incident => <tr key={incident.id}><td><Badge status={incident.severity}/></td><td><strong>{incident.service}</strong></td><td>{incident.summary}</td><td className="mono">{incident.deployment_id ? `REL-${String(incident.deployment_id).padStart(4, '0')}` : '—'}</td><td className="verification">{incident.recovery ?? 'Investigation open'}</td><td className="muted">{formatDate(incident.created_at)}</td></tr>)}</tbody></table></div> : <Empty icon={ShieldCheck} title="No incident history" text="Reliability events will be registered when a release or service check requires recovery action."/>}</div>
  </>
}

const topologyServices = [
  ['WorkBoard Web', 'Business workload and task API', 'HTTP :8100', 'User-facing'],
  ['CloudForge Control API', 'Health aggregation and release ledger', 'HTTP :8000', 'Internal'],
  ['Prometheus', 'Metrics collection and time-series queries', 'HTTP :9090', 'Operator only'],
  ['Grafana', 'Operational dashboards and analysis', 'HTTP :3001', 'Operator only'],
  ['SQLite data stores', 'Workload and operational persistence', 'Named volumes', 'Private'],
]

function Architecture() {
  return <><PageHead eyebrow="Platform Engineering" title="System topology" description="Runtime boundaries, service dependencies, and control-plane responsibilities for CloudForge."/>
    <div className="topology-facts"><div><span>DEPLOYMENT</span><strong>Single-host container platform</strong></div><div><span>CONTROL PLANE</span><strong>CloudForge API</strong></div><div><span>DATA PLANE</span><strong>WorkBoard + SQLite</strong></div><div><span>AVAILABILITY TARGET</span><strong>Health-gated recovery</strong></div></div>
    <section className="card topology-card"><div className="card-header"><div><div className="section-kicker">LOGICAL VIEW</div><div className="card-title">Runtime dependency map</div><div className="card-subtitle">Traffic and telemetry paths inside the Docker network</div></div><Network size={18}/></div>
      <div className="topology-map"><div className="topology-zone"><div className="zone-label">ACCESS LAYER</div><div className="node primary"><div><Cloud size={17}/><strong>WorkBoard Web</strong></div><span>Task management interface and REST API</span><code>:8100</code></div><div className="node"><div><LayoutDashboard size={17}/><strong>CloudForge Console</strong></div><span>Read-only operator experience</span><code>:3000</code></div></div>
        <div className="topology-connector"><span>HTTPS / health probes</span></div>
        <div className="topology-zone control"><div className="zone-label">CONTROL &amp; OBSERVABILITY</div><div className="node primary"><div><ShieldCheck size={17}/><strong>CloudForge API</strong></div><span>Status aggregation, release and incident ledger</span><code>:8000</code></div><div className="node"><div><Activity size={17}/><strong>Prometheus</strong></div><span>Metrics ingestion and query engine</span><code>:9090</code></div><div className="node"><div><Gauge size={17}/><strong>Grafana</strong></div><span>Operational analysis and dashboards</span><code>:3001</code></div></div>
        <div className="topology-connector"><span>persistent state / runtime metrics</span></div>
        <div className="topology-zone data"><div className="zone-label">DATA &amp; RUNTIME</div><div className="node"><div><Database size={17}/><strong>WorkBoard data</strong></div><span>Tasks and activity history</span><code>SQLite volume</code></div><div className="node"><div><Database size={17}/><strong>Operations data</strong></div><span>Releases and incidents</span><code>SQLite volume</code></div><div className="node"><div><Cpu size={17}/><strong>Runtime exporters</strong></div><span>Host and container telemetry</span><code>node / cAdvisor</code></div></div></div>
    </section>
    <div className="grid architecture-lower"><section className="card"><div className="card-header"><div><div className="section-kicker">SERVICE CATALOG</div><div className="card-title">Component inventory</div></div></div><div className="table-wrap"><table className="table catalog"><thead><tr><th>Component</th><th>Responsibility</th><th>Interface</th><th>Exposure</th></tr></thead><tbody>{topologyServices.map(service => <tr key={service[0]}><td><strong>{service[0]}</strong></td><td>{service[1]}</td><td className="mono">{service[2]}</td><td>{service[3]}</td></tr>)}</tbody></table></div></section>
      <section className="card controls"><div className="card-header"><div><div className="section-kicker">GOVERNANCE</div><div className="card-title">Platform controls</div></div><LockKeyhole size={17}/></div><div className="control-item"><Workflow size={16}/><div><strong>Release policy</strong><span>Readiness and smoke tests gate promotion.</span></div></div><div className="control-item"><ShieldCheck size={16}/><div><strong>Restricted mutation</strong><span>Operator token required for release and incident writes.</span></div></div><div className="control-item"><CircleDot size={16}/><div><strong>Rollback posture</strong><span>Last verified artifact retained for deterministic recovery.</span></div></div></section></div>
  </>
}

export default function App() {
  const [page, setPage] = useState<Page>(initialPage)
  const [dark, setDark] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [status, setStatus] = useState<OperationalStatus>()
  const [info, setInfo] = useState<AppInfo>()
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [metrics, setMetrics] = useState<MetricSeries[]>([])

  const load = async () => {
    setLoading(true); setError(undefined)
    try {
      const [serviceStatus, appInfo, releaseData, incidentData, telemetry] = await Promise.all([api.status(), api.info(), api.deployments(), api.incidents(), api.monitoring()])
      setStatus(serviceStatus); setInfo(appInfo); setDeployments(releaseData); setIncidents(incidentData); setMetrics(telemetry)
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load platform data') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let active = true
    Promise.all([api.status(), api.info(), api.deployments(), api.incidents(), api.monitoring()])
      .then(([serviceStatus, appInfo, releaseData, incidentData, telemetry]) => {
        if (active) { setStatus(serviceStatus); setInfo(appInfo); setDeployments(releaseData); setIncidents(incidentData); setMetrics(telemetry) }
      })
      .catch(loadError => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load platform data') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const current = useMemo(() => pages.find(item => item.id === page)!, [page])
  const navigate = (nextPage: Page) => {
    setPage(nextPage)
    const url = new URL(window.location.href)
    if (nextPage === 'overview') url.searchParams.delete('view')
    else url.searchParams.set('view', nextPage)
    window.history.replaceState({}, '', url)
  }
  const content = loading ? <div className="grid metrics-grid">{[1, 2, 3, 4].map(item => <div className="skeleton" key={item}/>)}</div>
    : page === 'overview' ? <Overview status={status} metrics={metrics}/>
      : page === 'deployments' ? <><PageHead eyebrow="Software Delivery" title="Release management" description="Auditable promotion history, immutable artifacts, and automated verification outcomes."/><div className="card"><DeploymentTable deployments={deployments}/></div></>
        : page === 'infrastructure' ? <Infrastructure info={info} status={status} metrics={metrics}/>
          : page === 'monitoring' ? <Monitoring metrics={metrics}/>
            : page === 'incidents' ? <Incidents incidents={incidents}/>
              : <Architecture/>

  const groups = ['Operations', 'Delivery', 'Platform']
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark"><Zap size={17} fill="currentColor"/></div><div><strong>CloudForge</strong><span>Platform Operations</span></div></div>
    <div className="tenant"><span>CF</span><div><strong>CloudForge Platform</strong><small>{isDemo ? 'Portfolio validation environment' : 'Local operations tenant'}</small></div></div>
    {groups.map(group => <div className="nav-group" key={group}><div className="nav-label">{group}</div>{pages.filter(item => item.group === group).map(({ id, label, icon: Icon }) => <button className={`nav-button ${page === id ? 'active' : ''}`} onClick={() => navigate(id)} key={id}><Icon size={15}/>{label}</button>)}</div>)}
    <a className="nav-button product-nav" href={workboardUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open WorkBoard</a>
    <div className="sidebar-foot"><div className="environment"><span className={`live-dot ${status?.service === 'healthy' ? '' : 'down'}`}/><div><strong>{status?.tracked_service?.name ?? 'WorkBoard'}</strong><span>{status?.service === 'healthy' ? 'Operational' : 'Unavailable'} · {status?.version ?? '—'}</span></div></div></div>
  </aside><main className="main"><header className="topbar"><div className="breadcrumb"><span>CloudForge</span><b>/</b><strong>{current.label}</strong></div><div className="top-actions"><a className="header-link" href={repositoryUrl} target="_blank" rel="noreferrer"><GitBranch size={13}/>Source &amp; CI</a><a className="header-link" href={workboardUrl} target="_blank" rel="noreferrer"><ExternalLink size={13}/>WorkBoard</a><div className="environment-badge"><span>{isDemo ? 'DEMO' : 'LOCAL'}</span><i/>{isDemo ? 'VALIDATION SNAPSHOT' : 'LIVE DATA'}</div><button className="icon-button" onClick={() => void load()} aria-label="Refresh data"><RefreshCw size={15}/></button><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle color theme">{dark ? <Sun size={15}/> : <Moon size={15}/>}</button></div></header>
    <div className="content">{isDemo && <div className="demo-banner"><ShieldCheck size={17}/><div><strong>Interactive portfolio validation</strong><span>This public view uses a recorded test snapshot. The repository contains the deployable stack, automated tests, monitoring configuration, and release evidence.</span></div><a href={`${repositoryUrl}/actions`} target="_blank" rel="noreferrer">View CI evidence <ExternalLink size={12}/></a></div>}{error && <div className="error-banner"><AlertTriangle size={16}/><div><strong>Platform data unavailable</strong><span>{error}. Confirm the CloudForge API is healthy and retry.</span></div></div>}{content}</div>
  </main><nav className="mobile-nav">{pages.map(({ id, label, icon: Icon }) => <button className={page === id ? 'active' : ''} onClick={() => navigate(id)} key={id}><Icon size={17}/><span>{label.split(' ')[0]}</span></button>)}</nav></div>
}
