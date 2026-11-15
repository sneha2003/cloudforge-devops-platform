import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null,
}))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const base = { ok: true, json: async () => [] }
    if (input.endsWith('/status')) return { ...base, json: async () => ({ service:'healthy', environment:'local', version:'dev', last_successful_deployment:null, recent_deployments:[], active_incidents:[], data_classification:'live' }) }
    if (input.endsWith('/info')) return { ...base, json: async () => ({ name:'CloudForge', version:'dev', commit_sha:'unknown', environment:'local', runtime:'Python', hostname:'test', timestamp:new Date().toISOString() }) }
    return base
  }))
})

afterEach(() => vi.unstubAllGlobals())

test('renders live overview without fabricated deployments', async () => {
  render(<App />)
  await waitFor(() => expect(screen.getByText('WorkBoard service overview')).toBeInTheDocument())
  expect(screen.getByText('No release activity')).toBeInTheDocument()
  expect(screen.getByText('Operational')).toBeInTheDocument()
})
