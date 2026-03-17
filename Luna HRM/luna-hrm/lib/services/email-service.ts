'use server'

/**
 * Email service — Resend SDK wrapper.
 * Retry once on transient failure. Logs success/error.
 * Never throws: returns { ok, messageId?, error? }.
 */

import { Resend } from 'resend'

/** Lazy Resend instance — avoids module-init error when API key is absent at build time */
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not set')
    _resend = new Resend(key)
  }
  return _resend
}

const FROM_ADDRESS = process.env.RESEND_FROM ?? 'noreply@hrm.buttercup.edu.vn'

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
}

export interface SendEmailResult {
  ok: boolean
  messageId?: string
  error?: string
}

async function trySend(params: SendEmailParams): Promise<SendEmailResult> {
  const { data, error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: params.subject,
    html: params.html,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, messageId: data?.id }
}

/** Send email with 1 retry on failure. */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const result = await trySend(params)
  if (result.ok) {
    console.log('[email] Sent to', params.to, '| subject:', params.subject)
    return result
  }
  // Retry once
  console.warn('[email] First attempt failed, retrying...', result.error)
  const retry = await trySend(params)
  if (retry.ok) {
    console.log('[email] Retry succeeded to', params.to)
  } else {
    console.error('[email] Both attempts failed to', params.to, '|', retry.error)
  }
  return retry
}

/** Send emails to multiple recipients concurrently. Returns per-address results. */
export async function sendBulkEmails(
  recipients: Array<{ email: string; subject: string; html: string }>
): Promise<Array<{ email: string } & SendEmailResult>> {
  const results = await Promise.allSettled(
    recipients.map((r) =>
      sendEmail({ to: r.email, subject: r.subject, html: r.html }).then((res) => ({
        email: r.email,
        ...res,
      }))
    )
  )
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    return { email: recipients[i].email, ok: false, error: String(r.reason) }
  })
}
