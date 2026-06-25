# Deploying to Many Clouds, and the Hard Part Nobody Mentions

You have a repo. You want `main` to go to production on Railway, and a `staging` branch to go to Render. Two platforms, two dashboards, two API shapes, two completely different ways of telling you a deploy went wrong. So you become the glue. You're the one alt-tabbing between consoles, copying a commit SHA into one and a service ID into another, and squinting at two different log formats trying to answer one simple question: did it work, and if not, why?

That stitched-together feeling is the problem I set out to remove with **Trigger Orchestra** — a deployment orchestration platform that pushes code from GitHub to multiple cloud platforms from a single dashboard, driven by one config file in the repo.

Before I go further: this is a proof of concept. A working one — enough of the system runs end to end to be genuinely useful — but not a hardened product. Some parts are still rough, the Railway integration is still being ironed out, and there are known limitations I'll be honest about. That's the point of building something like this early. The PoC surfaces real problems, not imagined ones. This post is part build log, part design explanation, and part honest admission about where the interesting unsolved problems live.

---

## The Shape of It

The monorepo has three pieces:

- **`Trigger/`** — a TypeScript Express API (hexagonal architecture, TypeORM, BullMQ)
- **`apps/web/`** — a Next.js 16 dashboard (React 19, Tailwind v4, shadcn/ui, SWR)
- **`packages/shared/`** — TypeScript types shared between the API and the frontend

Under the hood: PostgreSQL for state, Redis backing both a BullMQ job queue and a set of distributed deployment locks. The frontend talks to the API over REST with JWT auth. Deployments run asynchronously in a BullMQ worker — the HTTP endpoint queues the job and returns immediately; the dashboard polls for status updates every few seconds using SWR.

---

## How trigger.yml Tells the System What Goes Where

This is the part worth explaining carefully, because it is the whole mental model.

You drop a `trigger.yml` in the root of your repo:

```yaml
environments:
  - name: production
    branch: main
    platform: railway

  - name: staging
    branch: develop
    platform: render
```

When you connect the repo in the dashboard, the API fetches this file from GitHub, parses it, and creates an **environment record per entry** in the database. Each environment stores:

| Field | What it holds |
| --- | --- |
| `name` | `production` or `staging` — this is the label you see in the UI |
| `branch` | The git branch this environment tracks (`main`, `develop`, etc.) |
| `platform` | `railway` or `render` — determines which deployment adapter runs |
| `platformServiceId` | Optional ID of an existing service on that platform; set this if the service already exists |
| `status` | `idle` / `deploying` / `deployed` / `failed` |

So when you click **Deploy** on the `production` environment, the system already knows: fetch the latest commit from `main`, call the Railway adapter, and use the service linked to this environment. You never specify the platform or branch at deploy time — you specified it once in the YAML, and the system remembered it.

```
trigger.yml entry
    │
    ▼
Environment record (DB)
  name:       production
  branch:     main
  platform:   railway
  status:     idle
    │
    ▼
Click "Deploy"
    │
    ▼
DeploymentService.triggerDeployment()
  → getLatestCommit(repoUrl, "main", githubToken)   ← branch comes from the env record
  → enqueue job { platform: "railway", environmentId }
    │
    ▼
Worker picks up job
  → providerFactory.get("railway")   ← platform comes from the env record
  → provider.deploy(environment, commitSha, secrets)
```

The same click on the `staging` environment follows the identical path but pulls the latest commit from `develop` and calls the Render adapter instead. The click looks the same in the UI. The config file is what separates them.

### What if the repo doesn't have a trigger.yml yet?

One of the features in the dashboard is a **"Create trigger.yml"** flow on the Repositories page. You browse your GitHub repos, pick one that's missing the config file, fill in a form — environment name, branch, platform, add as many rows as you need — preview the exact YAML that will be committed, and push it in one step via the GitHub Contents API. After that you can connect the repo as a project immediately.

---

## One Interface, Many Clouds

The core design decision was to refuse to let the rest of the system know which platform it's talking to. Everything goes through a single port:

```typescript
interface DeploymentProviderPort {
  deploy(environment, commitSha, envVars): Promise<string>;
  rollback(lastPlatformId, lastCommitSha, environment): Promise<string>;
  getStatus(platformDeploymentId, environment): Promise<DeploymentStatus>;
  streamLogs(platformDeploymentId, environment, onLog): Promise<void>;
  cancel(platformDeploymentId, environment): Promise<void>;
}
```

Railway speaks GraphQL; Render speaks REST. Each gets an adapter that implements this interface and hides the mess — Railway's `deploymentRedeploy` mutation, Render's `POST /services/:id/deploys`, two different polling endpoints for logs. The deployment service never branches on platform; it asks a factory for "the provider for this environment" and calls five methods.

In theory, adding a third platform means writing one adapter. In practice that's only true within certain constraints.

### Where this abstraction holds — and where it breaks

The interface is shaped for **platform-as-a-service**. Railway and Render each hand you a single clean primitive — "redeploy this service" — and the five methods map onto it naturally. That stops being true the moment you point at **infrastructure-as-a-service**.

AWS is the clearest example: "deploy to AWS" isn't one thing. It could mean ECS, EKS, Lambda, Elastic Beanstalk, or raw EC2, each with its own deploy, rollback, and log semantics — and no shared "redeploy" verb that maps cleanly to this interface. An AWS adapter wouldn't be a tidy fifth implementation of the same shape; it would force a choice of sub-target upfront and bend methods like `rollback` and `streamLogs` to fit different service primitives. That's genuinely hard, and it's out of scope for this PoC.

**DigitalOcean App Platform**, on the other hand, is a closer fit — it's PaaS with a straightforward deploy/rollback/logs API not unlike Render's. Provisioning for that platform feels tractable. That said, it hasn't been built yet.

So the honest scope right now is: Railway and Render. The cross-cloud story is cleanest between platforms that share a deploy model, and gets genuinely hard between a PaaS and a fistful of AWS services.

### A note on Railway specifically

The Railway integration works, but it's still being refined. Railway's GraphQL API has some sharp edges — log queries require a separate `deploymentLogs` query rather than a subfield on the deployment, the auth model requires a personal account-level token (not a project-scoped one), and some mutations behave differently depending on whether the service was created inside Railway or linked from GitHub. These are solvable problems, but they're not fully solved yet. Expect rough edges if you're testing against Railway today.

---

## Secrets, Per Environment

Each environment gets its own set of secrets — API keys, database URLs, anything that varies between staging and production. You manage them from the dashboard; the API encrypts them with AES-256-CBC before writing to the database. At deploy time, the worker decrypts them and passes the full `Record<string, string>` to the provider adapter, which syncs them to the platform before triggering the actual build. Production secrets never leave the server; they're never in the queue payload; they're decrypted once, used, and discarded.

---

## GitHub OAuth and Why It's the Key to Everything

Rather than asking you to paste API tokens, the system uses GitHub OAuth so it can act on your behalf. After you sign in with GitHub:

- It stores your GitHub access token against your account
- The Repositories page can list all your repos (including private ones)
- When you create a trigger.yml from the app, it commits it using your token
- When a deployment runs, it fetches the latest commit SHA from the branch using your token

The OAuth flow is the standard three-step: the API redirects you to GitHub, GitHub redirects back with a `code`, the API exchanges the code for a token and redirects you to the dashboard with JWT tokens in the URL. The frontend reads them, saves them to localStorage, and from that point all API calls carry the JWT as a Bearer token.

---

## The Dashboard

The frontend is a Next.js 16 app with the following sections:

**Overview** — recent deployment activity at a glance.

**Projects** — each connected repo shows up here with its environments. Click an environment to see deployment history, trigger a new deploy, or cancel one in progress.

**Repositories** — your GitHub repos. Repos without a `trigger.yml` show a warning; the "Create trigger.yml" button opens a modal where you configure environments, preview the YAML, and commit it.

**Deployments** — a timeline of all deployments across all projects, with live log streaming as the worker runs.

**Secrets** — per-environment secret management. Keys are listed; values are never shown after being stored.

---

## Making the System Not Lie to You

A deploy isn't a request-response; it's a long-running process that can fail halfway, get triggered twice, or pile up under load. Three mechanisms keep it honest.

**Idempotency.** Two people clicking "Deploy" on the same environment a second apart should not produce two deploys. Before anything starts, the API takes a Redis lock:

```
SET lock:deploy:{environmentId} 1 EX 720 NX
```

If the lock is already held, the second request gets a `409 DEPLOYMENT_ALREADY_RUNNING` instead of a duplicate deploy. The lock is released in the worker's `finally` block — guaranteed even on exceptions — and the TTL handles crash recovery.

**Backpressure.** Deploys run in a BullMQ worker with `concurrency: 3` and a rate limiter of 10 job-starts per 5 seconds. A burst of triggers doesn't stampede the platform APIs; the surplus waits durably in Redis.

**Automatic rollback.** When a deploy ends in `failed`, the worker looks up the last successful deployment for that environment and redeploys it, streaming the rollback's logs alongside the original. The state machine, roughly:

```
queued → building → deploying → success
                              → failed → (rollback) → deploying → success
                                                                 → failed
```

There's a load-test script (`Trigger/scripts/load-test.ts`) to prove these hold — fire 50 concurrent triggers at one environment and assert exactly one `201` and forty-nine `409`s; round-robin across environments and watch the queue depth via the Bull Board admin UI; inject a forced build failure and watch the rollback fire in the logs.

---

## Where It Got Interesting (and Where It's Still Naive)

Building the reliability layer is where I stopped feeling like an engineer assembling parts and started feeling like someone with open research questions. Three things I'd fix, in increasing order of how much they bother me.

**The lock can outlive itself.** The lock's TTL is 720 seconds. But log streaming alone polls every 5 seconds up to 120 times — that's 600 seconds, before build and deploy time. A slow deploy can run longer than its own lock. When the TTL expires mid-deploy, the lock disappears, a concurrent trigger can grab a fresh one, and then the original worker's cleanup deletes whatever lock is now there — possibly someone else's. This is the classic lock-with-TTL-across-a-handoff hazard. The textbook fix is a fencing token or an owner-checked release rather than a blind `DEL`. It's a real bug hiding behind a green test suite, because the tests never ran a deploy long enough to trip it.

**Rollback is blunt.** "Any failure → roll back to last good" sounds responsible, but it's the wrong move for a lot of failures. A transient network blip is already handled by the queue's retries. A bad environment variable will fail the rollback too. A genuine code regression is the only case where rolling back is clearly right. Treating all of them identically means sometimes thrashing, sometimes hiding the real problem.

**The status enum throws away the answer.** Every platform's rich, specific failure signal — a Railway build error, a Render health-check timeout, a missing dependency — gets flattened to a single word: `failed`. The system knows that it broke and has no idea why. And "why" is the only thing the developer actually wanted to know.

---

## The Hard Part Nobody Mentions

That last point is the one I keep circling. Across heterogeneous platforms, the genuinely difficult problem isn't deploying — it's diagnosis. Each platform reports failures in its own dialect, and a human ends up being the thing that reads two log formats and decides what went wrong and what to do about it. That's exactly the work an orchestrator should be absorbing, and exactly the work this one currently punts on.

So the question I'm chasing next: can a system look at the streamed logs and status transitions from any platform, classify the failure into a small set of actionable causes — *bad env var*, *out of memory*, *health check failed*, *build error* — point at the evidence, and pick the right response: retry, roll back, or stop and tell a human? And can it do that portably, without a hand-written rulebook per platform? Rules tuned on one platform's log format are meaningless on another's. A normalized representation, or a model reading those logs, might generalize where rules can't. I don't know the answer yet, which is what makes it worth building.

---

## What's Next

Trigger Orchestra started as "I want one dashboard for my deploys." Being a proof of concept, it has plenty of obvious road ahead.

On the reliability side: fixing the lock TTL hazard, smarter rollback decisions, richer failure classification from logs.

On the platform side: properly landing the Railway integration, exploring DigitalOcean App Platform as a third provider.

One idea I keep coming back to is **database provisioning per environment**. Right now `trigger.yml` defines your app environments, but the database for each environment is a separate manual step — you go to Supabase or PlanetScale or wherever, create a database, copy the connection string, add it as a secret. It would be interesting if the config could declare the datastore alongside the service, and the system could provision both together:

```yaml
environments:
  - name: staging
    branch: develop
    platform: render
    database:
      provider: supabase
      tier: free
```

Whether that's a good idea or a can of worms, I genuinely don't know yet. Maybe it's beautiful, maybe it's scope creep, maybe it's exactly what makes the tool useful for a real team. That's the thing about building software — you don't always know which of your ideas will turn out to be interesting until you try them. And trying is the whole point of a proof of concept.

More on what actually works, and what doesn't, soon.
