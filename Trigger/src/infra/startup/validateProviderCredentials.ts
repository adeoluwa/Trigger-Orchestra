import axios from 'axios'
import { env } from '@config/env'
import { logger } from '@infra/logger/logger'

const TIMEOUT_MS = 8000

// Best-effort boot-time check so bad/expired provider tokens surface in the logs
// immediately, rather than only when a user clicks "Browse services". Never throws —
// a failed check only warns; it must not prevent the server from starting.
export async function validateProviderCredentials(): Promise<void> {
  await Promise.allSettled([checkRailway(), checkRender()])
}

async function checkRailway(): Promise<void> {
  try {
    const res = await axios.post(
      env.RAILWAY_API_URL,
      { query: 'query { me { id } }' },
      {
        headers: {
          Authorization: `Bearer ${env.RAILWAY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: TIMEOUT_MS,
      }
    )

    if (res.data?.errors) {
      logger.warn(
        { reason: res.data.errors[0]?.message },
        'Railway token check FAILED — RAILWAY_API_TOKEN may be invalid, expired, or not an account-level token (create one at railway.com/account/tokens)'
      )
      return
    }

    logger.info('Railway API token OK')
  } catch (err) {
    const detail = axios.isAxiosError(err) ? (err.code ?? err.response?.status) : undefined
    logger.warn({ detail }, 'Could not verify Railway API token at startup')
  }
}

async function checkRender(): Promise<void> {
  try {
    await axios.get(`${env.RENDER_API_URL}/owners?limit=1`, {
      headers: { Authorization: `Bearer ${env.RENDER_API_TOKEN}`, Accept: 'application/json' },
      timeout: TIMEOUT_MS,
    })

    logger.info('Render API token OK')
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    if (status === 401 || status === 403) {
      logger.warn(
        'Render token check FAILED — RENDER_API_TOKEN is invalid or expired (create a new key at dashboard.render.com/u/settings#api-keys)'
      )
      return
    }
    const detail = axios.isAxiosError(err) ? err.code : undefined
    logger.warn({ detail, status }, 'Could not verify Render API token at startup')
  }
}
