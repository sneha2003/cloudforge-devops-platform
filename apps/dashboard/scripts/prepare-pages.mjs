import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const dashboardRoot = resolve(import.meta.dirname, '..')
const outputRoot = resolve(dashboardRoot, 'pages-dist')
const workboardSource = resolve(dashboardRoot, '..', 'sample-service', 'app', 'static')
const workboardOutput = resolve(outputRoot, 'workboard')

await mkdir(resolve(workboardOutput, 'assets'), { recursive: true })

const sourceHtml = await readFile(resolve(workboardSource, 'index.html'), 'utf8')
const demoHtml = sourceHtml
  .replace('href="/assets/styles.css"', 'href="./assets/styles.css"')
  .replace('href="/" aria-label="WorkBoard home"', 'href="./" aria-label="WorkBoard home"')
  .replace('href="http://localhost:3000"', 'href="../"')
  .replace('<script src="/assets/app.js" defer></script>', '<script>window.WORKBOARD_DEMO = true</script>\n    <script src="./assets/app.js" defer></script>')

await writeFile(resolve(workboardOutput, 'index.html'), demoHtml)
await cp(resolve(workboardSource, 'styles.css'), resolve(workboardOutput, 'assets', 'styles.css'))
await cp(resolve(workboardSource, 'app.js'), resolve(workboardOutput, 'assets', 'app.js'))
await writeFile(resolve(outputRoot, '.nojekyll'), '')

console.log('Prepared CloudForge and WorkBoard portfolio demo')
