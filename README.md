# Trigger Orchestra

A unified deployment orchestration platform for personal projects. Trigger Orchestra lets you manage and deploy applications across multiple cloud platforms — Railway, Render, and more — from a single dashboard, with GitHub OAuth, real-time deployment logs, secret management, and a job queue for async processing.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone and install](#1-clone-and-install)
  - [2. Configure the API](#2-configure-the-api)
  - [3. Set up the database](#3-set-up-the-database)
  - [4. Configure GitHub OAuth](#4-configure-github-oauth)
  - [5. Run the stack](#5-run-the-stack)
- [Environment Variables](#environment-variables)
- [Features](#features)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [trigger.yml Config Format](#triggeryml-config-format)
- [Deployment](#deployment)

---

## Overview

Trigger Orchestra solves the problem of managing deployments scattered across multiple platforms. Instead of logging into Railway for one project, Render for another, and manually tracking what's deployed where, you get:

- A single dashboard showing all projects and their deployment history
- One-click deploys triggered by environment (staging, production, etc.)
- Real-time deployment logs streamed directly to the UI
- Encrypted secret management per project and environment
- GitHub repository browser for connecting repos in seconds
- Background job queue so long-running deploys never block the API

---

## Tech Stack

| Layer | Technology |
|---|---|
| **API** | Node.js, Express 5, TypeScript |
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui |
| **Database** | PostgreSQL (TypeORM) |
| **Queue / Cache** | Redis, BullMQ |
| **Auth** | JWT (access + refresh tokens), GitHub OAuth |
| **Email** | Resend |
| **Monorepo** | pnpm workspaces, Turborepo |
| **Shared types** | `packages/shared` (TypeScript interfaces) |

---

## Project Structure

```
trigger-orchestra/
├── Trigger/                    # Express API
│   ├── src/
│   │   ├── config/             # Environment validation (Zod)
│   │   ├── infra/
│   │   │   ├── database/       # TypeORM config + migrations
│   │   │   ├── queue/          # BullMQ setup
│   │   │   ├── cache/          # Redis (ioredis)
│   │   │   ├── email/          # Resend client
│   │   │   ├── logger/         # Pino logger
│   │   │   └── server/         # Express app, routes, Swagger, Bull Board
│   │   ├── modules/
│   │   │   ├── auth/           # Register, login, GitHub OAuth, JWT
│   │   │   ├── project/        # Project CRUD, YAML config parsing
│   │   │   ├── deployment/     # Trigger, track, log deployments
│   │   │   └── secret/         # Encrypted env vars per project
│   │   ├── shared/             # Guards, errors, HTTP helpers
│   │   └── utils/              # JWT, crypto, YAML parser, pagination
│   ├── .env.example
│   └── package.json
│
├── apps/
│   └── web/                    # Next.js 16 frontend
│       └── src/
│           ├── app/
│           │   ├── (auth)/     # Login, register, OAuth callback
│           │   └── (dashboard)/# All authenticated pages
│           │       └── dashboard/
│           │           ├── page.tsx          # Overview + charts
│           │           ├── projects/         # Project list + detail + settings
│           │           ├── deployments/      # All deployments + live logs
│           │           ├── repositories/     # GitHub repo browser
│           │           └── secrets/          # Secret management
│           ├── components/
│           │   ├── layout/     # Sidebar, dashboard shell
│           │   └── ui/         # shadcn components + custom (StatusBadge, etc.)
│           ├── hooks/          # SWR data hooks
│           └── lib/            # API client, auth helpers, utilities
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│       └── src/types/
│           ├── auth.ts         # User, AuthResponse, GithubRepo
│           ├── project.ts      # Project, Environment
│           ├── deployment.ts   # Deployment, DeploymentLog, status enums
│           ├── secret.ts       # Secret
│           └── api.ts          # ApiResponse, PaginatedResponse
│
├── package.json                # Workspace root
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (`npm install -g pnpm`)
- **PostgreSQL** 15+
- **Redis** 7+
- A **GitHub OAuth App** (for GitHub login and repo browsing)
- A **Railway** and/or **Render** API token (for actual deployments)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/trigger-orchestra.git
cd trigger-orchestra
pnpm install
```

### 2. Configure the API

```bash
cp Trigger/.env.example Trigger/.env
```

Open `Trigger/.env` and fill in the required values. At minimum for local development:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trigger
DB_USER=postgres
DB_PASSWORD=your_password

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

JWT_SECRET=<any 32+ character random string>
JWT_REFRESH_SECRET=<another 32+ character random string>
ENCRYPTION_KEY=<exactly 32 characters>

GITHUB_CLIENT_ID=<from your OAuth App>
GITHUB_CLIENT_SECRET=<from your OAuth App>
GITHUB_WEBHOOK_SECRET=<any random string>

FRONTEND_URL=http://localhost:3001
```

### 3. Set up the database

Make sure PostgreSQL is running, then run the migrations:

```bash
pnpm --filter @trigger-orchestra/api migration:run
```

### 4. Configure GitHub OAuth

Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App** and fill in:

| Field | Value |
|---|---|
| Homepage URL | `http://localhost:3001` |
| Authorization callback URL | `http://localhost:3000/api/v1/auth/github/callback` |

Copy the **Client ID** and generate a **Client Secret**, then paste them into `Trigger/.env`:

```env
GITHUB_CLIENT_ID=Iv23liXXXXXXXX
GITHUB_CLIENT_SECRET=your_secret_here
```

### 5. Run the stack

Start both services from the monorepo root:

```bash
pnpm dev
```

Or run them separately in different terminals:

```bash
# Terminal 1 — API on http://localhost:3000
pnpm dev:api

# Terminal 2 — Web on http://localhost:3001
pnpm dev:web
```

| Service | URL |
|---|---|
| Web dashboard | http://localhost:3001 |
| REST API | http://localhost:3000/api/v1 |
| Swagger docs | http://localhost:3000/api/docs |
| Bull Board (queue monitor) | http://localhost:3000/admin/queues |

---

## Environment Variables

### API (`Trigger/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API server port (default: `3000`) |
| `APP_URL` | No | API base URL (default: `http://localhost:3000`) |
| `FRONTEND_URL` | No | Frontend URL for OAuth redirect (default: `http://localhost:3001`) |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_PORT` | No | PostgreSQL port (default: `5432`) |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database user |
| `DB_PASSWORD` | Yes | Database password |
| `REDIS_HOST` | Yes | Redis host |
| `REDIS_PORT` | No | Redis port (default: `6379`) |
| `REDIS_PASSWORD` | No | Redis password (if auth enabled) |
| `JWT_SECRET` | Yes | Access token signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | No | Access token TTL (default: `7d`) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret (min 32 chars) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token TTL (default: `30d`) |
| `ENCRYPTION_KEY` | Yes | Secret encryption key (exactly 32 chars) |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret |
| `GITHUB_CALLBACK_URL` | Yes | OAuth callback URL |
| `GITHUB_WEBHOOK_SECRET` | Yes | Webhook signature verification secret |
| `RAILWAY_API_TOKEN` | Yes | Railway API token |
| `RENDER_API_TOKEN` | Yes | Render API token |
| `RESEND_API_KEY` | Yes | Resend API key for transactional email |
| `EMAIL_FROM` | No | Sender email address |

### Web (`apps/web/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | API base URL used by the frontend |

---

## Features

### Authentication
- Email + password registration and login
- GitHub OAuth (sign in with GitHub, stores GitHub token for repo browsing)
- JWT access tokens + refresh token rotation
- Secure token storage in `localStorage`

### Projects
- Create projects by entering a name and GitHub repository URL
- Projects are linked to a `trigger.yml` config file in the repo that defines environments and deployment targets
- Edit project settings, view auto-detected environments, delete projects

### Deployments
- Trigger deployments per environment with one click
- Deployments are processed asynchronously via a BullMQ job queue (supports 3 concurrent workers)
- Real-time deployment logs streamed to the UI (auto-polling every 2 seconds)
- Filter deployments by status: pending, queued, running, success, failed, cancelled
- Status-coded colour indicators throughout the UI

### GitHub Repositories
- Browse all GitHub repositories you own or collaborate on (up to 100, sorted by last updated)
- See language, star count, visibility (public/private)
- One-click "Add project" to create a project directly from any repo
- Search and filter by public/private

### Secrets
- Store encrypted environment variables per project
- Scoped to a specific environment (optional)
- Values are encrypted at rest using AES with the `ENCRYPTION_KEY`
- Secrets are never returned in plain text after creation

### Queue Monitoring
- Bull Board UI at `/admin/queues` shows live queue state, job retries, failed jobs
- Available in development only (disabled in production)

---

## API Reference

Full interactive documentation available at `http://localhost:3000/api/docs` (Swagger UI).

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All protected endpoints require a Bearer token:
```
Authorization: Bearer <accessToken>
```

### Endpoints Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Register with email + password |
| `POST` | `/auth/login` | No | Login with email + password |
| `POST` | `/auth/refresh` | No | Rotate refresh token |
| `GET` | `/auth/me` | Yes | Get current user profile |
| `GET` | `/auth/github` | No | Initiate GitHub OAuth |
| `GET` | `/auth/github/callback` | No | GitHub OAuth callback |
| `GET` | `/auth/github/repos` | Yes | List user's GitHub repos |
| `GET` | `/projects` | Yes | List user's projects |
| `POST` | `/projects` | Yes | Create a project |
| `GET` | `/projects/:id` | Yes | Get project with environments |
| `PATCH` | `/projects/:id` | Yes | Update project |
| `DELETE` | `/projects/:id` | Yes | Delete project |
| `POST` | `/projects/parse-config` | Yes | Preview YAML config |
| `GET` | `/deployments` | Yes | List deployments (filterable) |
| `POST` | `/deployments` | Yes | Trigger a deployment |
| `GET` | `/deployments/:id` | Yes | Get deployment details |
| `GET` | `/deployments/:id/logs` | Yes | Get deployment logs |
| `GET` | `/secrets` | Yes | List secrets for a project |
| `POST` | `/secrets` | Yes | Create a secret |
| `DELETE` | `/secrets/:id` | Yes | Delete a secret |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                     │
│  Dashboard · Projects · Deployments · Repos · Secrets   │
└──────────────────────┬──────────────────────────────────┘
                       │ REST (JWT Bearer)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Express API (port 3000)                │
│  Auth · Project · Deployment · Secret modules           │
│                       │                                  │
│         ┌─────────────┼──────────────┐                  │
│         ▼             ▼              ▼                   │
│    PostgreSQL       Redis        BullMQ                  │
│    (TypeORM)      (cache)    (job queue)                 │
└─────────────────────────────────────────────────────────┘
                       │
         ┌─────────────┴──────────┐
         ▼                        ▼
   Railway API               Render API
   (deployment)            (deployment)
```

**Request flow for a deployment:**
1. Frontend calls `POST /deployments` with `{ projectId, environmentId }`
2. API validates the request, creates a `Deployment` record with status `queued`
3. A BullMQ job is enqueued on the `deployments` queue
4. The deployment worker picks up the job, calls the appropriate platform API (Railway/Render)
5. Logs are written to `DeploymentLog` records as they arrive
6. Status is updated to `running` → `success` or `failed`
7. Frontend polls `GET /deployments/:id` and `/deployments/:id/logs` every 2-3 seconds

---

## trigger.yml Config Format

Every repository must have a `trigger.yml` file on its default branch before it can be connected as a project. This file defines the environments and their deployment targets.

```yaml
project: "my-app"
repo: "https://github.com/you/my-app"

environments:
  staging:
    branch: "develop"
    platform: "railway"        # "railway" | "render" | "local"
    docker:
      enabled: false
      dockerfilePath: "./Dockerfile"
    featureFlags:
      betaFeature: true
    rateLimit:
      requestsPerMinute: 100

  live:
    branch: "main"
    platform: "render"
```

**Rules:**
- At least one environment must be defined
- Each environment requires `branch` and `platform`
- `platform: "local"` is only valid if the environment name is `local`
- Docker, feature flags, and rate limiting are all optional

---

## Deployment

### API (Railway / Render)

Set the root directory to `Trigger/` in your platform's settings. Required production env vars are the same as development except:

```env
NODE_ENV=production
APP_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
DOCS_ENABLED=false         # disables Swagger in prod
```

### Frontend (Vercel)

Set the root directory to `apps/web/`. Add a single environment variable:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

### Update GitHub OAuth App

When going to production, update the Authorization callback URL in your GitHub OAuth App settings to:
```
https://api.yourdomain.com/api/v1/auth/github/callback
```

---

## License

MIT
