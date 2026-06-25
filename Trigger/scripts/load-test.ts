/**
 * Trigger Orchestra — Deployment Reliability Load Test
 *
 * Covers four automated scenarios and two manual verification steps:
 *
 *   1. Idempotency / race-condition guard
 *      50 concurrent requests → same environment
 *      Expected: exactly 1 accepted (201), 49 rejected (409 DEPLOYMENT_ALREADY_RUNNING)
 *
 *   2. Queue backpressure
 *      50 requests round-robined across N environments
 *      Expected: N accepted (one per env), remainder 409
 *      Watch queue depth live at /admin/queues
 *
 *   3. Staging gate — blocked path
 *      Deploy directly to production with no passing staging deploy
 *      Expected: 409 STAGING_GATE_FAILED
 *
 *   4. Staging gate — allowed path  (semi-automated)
 *      Triggers a staging deploy, polls until success, then triggers production
 *      Expected: staging 201, production 201
 *
 *   5. Atomic rollback  (manual)
 *      Inject a broken build, observe rollback in deployment logs
 *
 *   6. Notification queue  (manual)
 *      Verify notification jobs appear in Bull Board after a deploy
 *
 * Usage:
 *   npx ts-node Trigger/scripts/load-test.ts [1|2|3|4|5|6|all]
 *
 * Required env vars (all tests):
 *   API_URL          e.g. http://localhost:3000/api/v1
 *   ACCESS_TOKEN     JWT from POST /auth/login
 *   PROJECT_ID       UUID of an existing project
 *   ENVIRONMENT_ID   UUID of a non-production environment (idempotency + backpressure)
 *
 * Additional env vars (specific tests):
 *   PRODUCTION_ENV_ID  UUID of the environment named "production" or "prod" (tests 3 & 4)
 *   STAGING_ENV_ID     UUID of the environment named "staging" or "staging" (test 4)
 *   ENVIRONMENT_IDS    Comma-separated list of env UUIDs for backpressure test (test 2)
 */

import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

// ─── Config ──────────────────────────────────────────────────────────────────

const API_URL        = process.env.API_URL          ?? 'http://localhost:3000/api/v1'
const TOKEN          = process.env.ACCESS_TOKEN     ?? ''
const PROJECT_ID     = process.env.PROJECT_ID       ?? ''
const ENV_ID         = process.env.ENVIRONMENT_ID   ?? ''
const PROD_ENV_ID    = process.env.PRODUCTION_ENV_ID ?? ''
const STAGING_ENV_ID = process.env.STAGING_ENV_ID   ?? ''
const ENV_IDS_RAW    = process.env.ENVIRONMENT_IDS  ?? ''
const CONCURRENCY    = 50
const BULL_BOARD_URL = process.env.BULL_BOARD_URL ?? 'http://localhost:3000/admin/queues'

if (!TOKEN || !PROJECT_ID || !ENV_ID) {
  console.error([
    '',
    '  Missing required environment variables.',
    '  Set these before running:',
    '',
    '    API_URL          (default: http://localhost:3000/api/v1)',
    '    ACCESS_TOKEN     JWT from POST /auth/login',
    '    PROJECT_ID       UUID of an existing project',
    '    ENVIRONMENT_ID   UUID of a non-production environment',
    '',
    '  Optional (for staging gate tests):',
    '    PRODUCTION_ENV_ID  UUID of the production environment',
    '    STAGING_ENV_ID     UUID of the staging environment',
    '    ENVIRONMENT_IDS    Comma-separated env UUIDs for backpressure test',
    '',
  ].join('\n'))
  process.exit(1)
}

// ─── HTTP client ─────────────────────────────────────────────────────────────

const client = axios.create({
  baseURL: API_URL,
  headers: { Authorization: `Bearer ${TOKEN}` },
  validateStatus: () => true, // never throw on 4xx/5xx — we inspect status ourselves
})

// ─── Types ───────────────────────────────────────────────────────────────────

interface Result {
  index: number
  envId: string
  status: number
  code?: string
  message?: string
  deploymentId?: string
  ms: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function triggerDeploy(index: number, envId: string): Promise<Result> {
  const start = Date.now()
  const res = await client.post('/deployments/trigger', {
    projectId: PROJECT_ID,
    environmentId: envId,
  })
  const body = res.data
  const code: string | undefined = body?.error?.code ?? body?.code ?? undefined
  const message: string | undefined = body?.error?.message ?? body?.message ?? undefined
  const deploymentId: string | undefined = body?.data?.id ?? undefined
  return { index, envId, status: res.status, code, message, deploymentId, ms: Date.now() - start }
}

async function getDeployment(deploymentId: string): Promise<{ status: string } | null> {
  const res = await client.get(`/deployments/${deploymentId}`)
  if (res.status !== 200) return null
  return res.data?.data ?? null
}

async function pollUntilDone(
  deploymentId: string,
  timeoutMs = 600_000,
  intervalMs = 5000
): Promise<string> {
  const terminal = new Set(['success', 'failed', 'cancelled'])
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const deploy = await getDeployment(deploymentId)
    if (deploy && terminal.has(deploy.status)) return deploy.status
    await sleep(intervalMs)
  }
  return 'timeout'
}

function printTable(results: Result[]): void {
  const cols = ['#', 'envId (short)', 'status', 'code', 'ms']
  const rows = results.map((r) => [
    String(r.index),
    r.envId.slice(0, 8),
    String(r.status),
    r.code ?? '—',
    String(r.ms) + 'ms',
  ])
  const widths = cols.map((c, i) => Math.max(c.length, ...rows.map((r) => r[i].length)))
  const divider = widths.map((w) => '-'.repeat(w + 2)).join('+')
  const fmt = (row: string[]) => row.map((c, i) => ` ${c.padEnd(widths[i])} `).join('|')
  console.log(divider)
  console.log(fmt(cols))
  console.log(divider)
  rows.forEach((r) => console.log(fmt(r)))
  console.log(divider)
}

function header(title: string): void {
  const bar = '═'.repeat(56)
  console.log(`\n${bar}`)
  console.log(` ${title}`)
  console.log(bar)
}

function pass(msg?: string): void {
  console.log(`\n  Result: ✓ PASS${msg ? ' — ' + msg : ''}`)
}

function fail(msg: string): void {
  console.log(`\n  Result: ✗ FAIL — ${msg}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1 — Idempotency & Race-Condition Guard
// 50 concurrent requests to the same environment.
// Only one can win the Redis SETNX lock; the rest must get 409.
// ─────────────────────────────────────────────────────────────────────────────
async function testIdempotency(): Promise<void> {
  header('TEST 1 — Idempotency & Race-Condition Guard')
  console.log(`  Firing ${CONCURRENCY} concurrent requests to env ${ENV_ID.slice(0, 8)}...`)

  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => triggerDeploy(i, ENV_ID))
  )

  printTable(results)

  const accepted   = results.filter((r) => r.status === 201 || r.status === 200)
  const locked     = results.filter((r) => r.status === 409 && r.code === 'DEPLOYMENT_ALREADY_RUNNING')
  const unexpected = results.filter((r) => r.status !== 201 && r.status !== 200 && r.status !== 409)

  console.log(`  Accepted (201):               ${accepted.length}`)
  console.log(`  Locked out (409):             ${locked.length}`)
  console.log(`  Unexpected responses:         ${unexpected.length}`)

  if (unexpected.length > 0) {
    console.log('\n  Unexpected response details:')
    unexpected.forEach((r) => console.log(`    [${r.index}] ${r.status} ${r.code} — ${r.message}`))
  }

  const ok = accepted.length === 1 && locked.length === CONCURRENCY - 1 && unexpected.length === 0
  ok ? pass(`1 accepted, ${CONCURRENCY - 1} locked out`) : fail(`expected 1 accepted and ${CONCURRENCY - 1} locked`)
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2 — Queue Backpressure
// 50 requests round-robined across N environments.
// BullMQ limiter (10/5s) + concurrency (3) regulate the processing rate.
// ─────────────────────────────────────────────────────────────────────────────
async function testBackpressure(): Promise<void> {
  const envIds = ENV_IDS_RAW
    ? ENV_IDS_RAW.split(',').map((s) => s.trim()).filter(Boolean)
    : [ENV_ID]

  header('TEST 2 — Queue Backpressure')
  console.log(`  ${CONCURRENCY} requests across ${envIds.length} environment(s)...`)

  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => triggerDeploy(i, envIds[i % envIds.length]))
  )

  printTable(results)

  const accepted   = results.filter((r) => r.status === 201 || r.status === 200)
  const locked     = results.filter((r) => r.status === 409)
  const unexpected = results.filter((r) => r.status !== 201 && r.status !== 200 && r.status !== 409)

  console.log(`  Accepted (expected ${envIds.length}):          ${accepted.length}`)
  console.log(`  Locked out (409):             ${locked.length}`)
  console.log(`  Unexpected responses:         ${unexpected.length}`)
  console.log(`\n  Queue depth: ${BULL_BOARD_URL}`)

  const ok = accepted.length === envIds.length && unexpected.length === 0
  ok ? pass(`${envIds.length} accepted, rest locked`) : fail(`accepted ${accepted.length}, expected ${envIds.length}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3 — Staging Gate (blocked path)
// Deploy directly to a production environment with no passing staging deploy.
// Expected: 409 STAGING_GATE_FAILED — production must not deploy without staging.
// ─────────────────────────────────────────────────────────────────────────────
async function testStagingGateBlocked(): Promise<void> {
  header('TEST 3 — Staging Gate (blocked path)')

  if (!PROD_ENV_ID) {
    console.log('  Skipped — set PRODUCTION_ENV_ID to run this test.')
    console.log('  (This must be an environment whose name matches /^prod(uction)?$/i)')
    return
  }

  console.log(`  Attempting production deploy to env ${PROD_ENV_ID.slice(0, 8)} without a staging pass...`)

  const result = await triggerDeploy(0, PROD_ENV_ID)

  console.log(`  Status:  ${result.status}`)
  console.log(`  Code:    ${result.code ?? '—'}`)
  console.log(`  Message: ${result.message ?? '—'}`)
  console.log(`  Time:    ${result.ms}ms`)

  const ok = result.status === 409 && result.code === 'STAGING_GATE_FAILED'
  ok
    ? pass('production correctly blocked — staging gate enforced')
    : fail(`expected 409 STAGING_GATE_FAILED, got ${result.status} ${result.code ?? ''}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4 — Staging Gate (allowed path)
// Trigger a staging deploy, poll until it reaches a terminal state, then
// attempt a production deploy. If staging succeeded, production should be
// allowed through the gate.
//
// Note: this test calls real platform APIs and may take several minutes.
// ─────────────────────────────────────────────────────────────────────────────
async function testStagingGateAllowed(): Promise<void> {
  header('TEST 4 — Staging Gate (allowed path — triggers real deploys)')

  if (!STAGING_ENV_ID || !PROD_ENV_ID) {
    console.log('  Skipped — set STAGING_ENV_ID and PRODUCTION_ENV_ID to run this test.')
    return
  }

  // Step 1: trigger staging
  console.log(`  Step 1: triggering staging deploy (env ${STAGING_ENV_ID.slice(0, 8)})...`)
  const stagingResult = await triggerDeploy(0, STAGING_ENV_ID)
  console.log(`  Staging trigger: ${stagingResult.status} ${stagingResult.code ?? ''}`)

  if (stagingResult.status !== 201 && stagingResult.status !== 200) {
    fail(`staging deploy did not start — ${stagingResult.status} ${stagingResult.code ?? stagingResult.message ?? ''}`)
    return
  }

  const stagingDeployId = stagingResult.deploymentId
  if (!stagingDeployId) {
    fail('staging response did not include a deployment ID')
    return
  }

  // Step 2: poll staging until done
  console.log(`  Step 2: polling staging deployment ${stagingDeployId.slice(0, 8)} (up to 10 min)...`)
  const stagingFinalStatus = await pollUntilDone(stagingDeployId)
  console.log(`  Staging final status: ${stagingFinalStatus}`)

  if (stagingFinalStatus !== 'success') {
    fail(`staging deploy did not succeed (${stagingFinalStatus}) — production gate will remain blocked`)
    return
  }

  // Step 3: attempt production deploy
  console.log(`  Step 3: triggering production deploy (env ${PROD_ENV_ID.slice(0, 8)})...`)
  const prodResult = await triggerDeploy(1, PROD_ENV_ID)
  console.log(`  Production trigger: ${prodResult.status} ${prodResult.code ?? ''}`)

  const ok = prodResult.status === 201 || prodResult.status === 200
  ok
    ? pass('staging passed, production deploy accepted')
    : fail(`production still blocked — ${prodResult.status} ${prodResult.code ?? prodResult.message ?? ''}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5 — Atomic Rollback (manual)
// ─────────────────────────────────────────────────────────────────────────────
function printRollbackInstructions(): void {
  header('TEST 5 — Atomic Rollback (manual verification)')
  console.log(`
  This test requires a real deployment that can fail on the platform.

  Steps:

  1. Go to Secrets in the dashboard for environment ${ENV_ID.slice(0, 8)}.
     Add a secret that your build reads and treats as a fatal condition:
       BUILD_SHOULD_FAIL=true
     (Your build script must check this and exit non-zero for the test to work.)

  2. Trigger a deployment:
       curl -s -X POST ${API_URL}/deployments/trigger \\
         -H "Authorization: Bearer $ACCESS_TOKEN" \\
         -H "Content-Type: application/json" \\
         -d '{"projectId":"${PROJECT_ID}","environmentId":"${ENV_ID}"}' | jq .

  3. Note the deployment ID from the response, then tail its logs:
       DEPLOY_ID=<paste-id-here>
       watch -n 2 "curl -s ${API_URL}/deployments/$DEPLOY_ID/logs \\
         -H 'Authorization: Bearer $ACCESS_TOKEN' | jq '.data[-5:]'"

  4. Expected log sequence once the platform marks it failed:
       [system]   Deployment failed — checking for rollback candidate...
       [system]   Rolling back to <sha> (<platformDeploymentId>)...
       [system]   Rollback initiated — platform job: <rollbackId>
       [platform] ... rollback build output ...
       [system]   Rollback succeeded — environment restored to <sha>
                  OR
       [system]   Rollback also failed — environment is in a degraded state

  5. Verify the environment status is "deployed" (not "failed"):
       curl -s ${API_URL}/projects/${PROJECT_ID} \\
         -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.data.environments[] | {name, status}'

  6. Clean up: remove the BUILD_SHOULD_FAIL secret and redeploy.
  `)
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6 — Notification Queue (manual)
// ─────────────────────────────────────────────────────────────────────────────
function printNotificationInstructions(): void {
  header('TEST 6 — Notification Queue (manual verification)')
  console.log(`
  After a successful or failed deployment, the worker enqueues a notification
  job. Verify this in Bull Board:

  1. Open Bull Board: ${BULL_BOARD_URL}

  2. Navigate to the "notification" queue.

  3. Trigger a deployment and watch for new jobs to appear under:
       - "Active" while the email is being sent
       - "Completed" once Resend accepts it
       - "Failed" if the Resend API key is missing or invalid

  4. Check the job payload. It should contain:
       {
         event:        "deployment_success" | "deployment_failed" | "rollback_initiated",
         deploymentId: "<uuid>",
         projectName:  "<name>",
         environment:  "<name>",
         platform:     "railway" | "render",
         commitSha:    "<7-char sha>",
         commitMessage:"<message>",
         userEmail:    "<email>"
       }

  5. If RESEND_API_KEY is configured, check the inbox at the registered email
     for a notification email from ${API_URL.includes('localhost') ? 'noreply@trigger.dev' : 'your configured FROM address'}.

  Required env var: RESEND_API_KEY must be set in Trigger/.env
  `)
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const test = process.argv[2] ?? 'all'

  console.log(`\n  API_URL:      ${API_URL}`)
  console.log(`  PROJECT_ID:   ${PROJECT_ID.slice(0, 8)}...`)
  console.log(`  ENVIRONMENT:  ${ENV_ID.slice(0, 8)}...`)
  if (PROD_ENV_ID) console.log(`  PROD_ENV:     ${PROD_ENV_ID.slice(0, 8)}...`)
  if (STAGING_ENV_ID) console.log(`  STAGING_ENV:  ${STAGING_ENV_ID.slice(0, 8)}...`)

  if (test === '1' || test === 'all') await testIdempotency()
  if (test === '2' || test === 'all') await testBackpressure()
  if (test === '3' || test === 'all') await testStagingGateBlocked()
  if (test === '4')                   await testStagingGateAllowed()  // excluded from "all" — triggers real deploys
  if (test === '5' || test === 'all') printRollbackInstructions()
  if (test === '6' || test === 'all') printNotificationInstructions()

  console.log()
}

main().catch((err) => {
  console.error('Load test error:', err)
  process.exit(1)
})
