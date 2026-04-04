import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { ApiError } from '@/core/http'
import { env } from '@/core/env'
import { LoginChallengeModel } from '@/domain/models'
import { loginByEmail } from './service'
import { connectDb } from '@/modules/db/connection'
import { deleteDocuments, getDocumentById, writeDocument } from '@/modules/supabase/documents'
import { isSupabaseProvider } from '@/modules/db/provider'

const LOGIN_CODE_TTL_MS = 1000 * 60 * 10
const LOGIN_CHALLENGE_SUBJECT = '\u0631\u0645\u0632 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 - Bily Card'
const LOGIN_TITLE = '\u0631\u0645\u0632 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644'
const LOGIN_MESSAGE =
  '\u0627\u0633\u062a\u062e\u062f\u0645 \u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642 \u0627\u0644\u062a\u0627\u0644\u064a \u0644\u0625\u0643\u0645\u0627\u0644 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0625\u0644\u0649 \u062d\u0633\u0627\u0628\u0643 \u0628\u0623\u0645\u0627\u0646.'
const CODE_LABEL = '\u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642'
const EXPIRY_NOTE =
  '\u0635\u0644\u0627\u062d\u064a\u0629 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 {minutes} \u0641\u0642\u0637.'
const SECURITY_NOTE =
  '\u0625\u0630\u0627 \u0644\u0645 \u062a\u0642\u0645 \u0628\u0637\u0644\u0628 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632\u060c \u064a\u0645\u0643\u0646\u0643 \u062a\u062c\u0627\u0647\u0644 \u0647\u0630\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0648\u0644\u0646 \u064a\u062a\u0645 \u0625\u062c\u0631\u0627\u0621 \u0623\u064a \u062a\u063a\u064a\u064a\u0631 \u0639\u0644\u0649 \u062d\u0633\u0627\u0628\u0643.'
const FOOTER_NOTE =
  '\u0647\u0630\u0647 \u0631\u0633\u0627\u0644\u0629 \u0622\u0644\u064a\u0629 \u0645\u0646 Bily Card\u060c \u064a\u0631\u062c\u0649 \u0639\u062f\u0645 \u0627\u0644\u0631\u062f \u0639\u0644\u064a\u0647\u0627 \u0645\u0628\u0627\u0634\u0631\u0629.'
const IGNORE_NOTE =
  '\u0625\u0630\u0627 \u0644\u0645 \u062a\u0642\u0645 \u0628\u0637\u0644\u0628 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632\u060c \u064a\u0645\u0643\u0646\u0643 \u062a\u062c\u0627\u0647\u0644 \u0647\u0630\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0628\u0623\u0645\u0627\u0646.'
const INVALID_CODE_MESSAGE =
  '\u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d \u0623\u0648 \u0645\u0646\u062a\u0647\u064a'
const WRONG_CODE_MESSAGE = '\u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d'

function hashCode(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

function getTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new ApiError(500, 'SMTP_NOT_CONFIGURED', 'SMTP is not configured')
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })
}

function buildLoginChallengeHtml(code: string) {
  const expiryHtml = EXPIRY_NOTE.replace(
    '{minutes}',
    '<strong style="color:#ffffff">10 \u062f\u0642\u0627\u0626\u0642</strong>',
  )

  return `
    <div dir="rtl" lang="ar" style="margin:0;padding:32px 16px;background:#06111f;font-family:Arial,'Segoe UI',Tahoma,sans-serif;color:#e5eefb">
      <div style="max-width:580px;margin:0 auto;background:linear-gradient(180deg,#0b1728 0%,#091321 100%);border:1px solid #183049;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(2,8,23,0.45)">
        <div style="padding:28px 28px 18px;border-bottom:1px solid #16324a;background:rgba(8,23,38,0.92)">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#0f2236;border:1px solid #1c425f;color:#7dd3fc;font-size:12px;font-weight:700;letter-spacing:.4px">
            Bily Card
          </div>
          <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.35;color:#f8fbff;font-weight:800">${LOGIN_TITLE}</h1>
          <p style="margin:0;font-size:15px;line-height:1.9;color:#c8d6e8">${LOGIN_MESSAGE}</p>
        </div>

        <div style="padding:28px">
          <div style="margin:0 auto 22px;max-width:360px;padding:20px 18px;border-radius:20px;background:linear-gradient(180deg,#0a2235 0%,#081a2b 100%);border:1px solid #1d4b68;text-align:center">
            <div style="margin:0 0 10px;font-size:13px;color:#8ecae6;font-weight:700">${CODE_LABEL}</div>
            <div style="font-size:34px;line-height:1.2;font-weight:900;letter-spacing:10px;color:#67e8f9">${code}</div>
          </div>

          <div style="padding:16px 18px;border-radius:16px;background:#0a1625;border:1px solid #17314a">
            <p style="margin:0 0 10px;font-size:14px;line-height:1.9;color:#d7e4f4">${expiryHtml}</p>
            <p style="margin:0;font-size:13px;line-height:1.9;color:#93a8c0">${SECURITY_NOTE}</p>
          </div>
        </div>

        <div style="padding:16px 28px 24px;border-top:1px solid #14304a;background:#08111d;color:#6f88a3;font-size:12px;line-height:1.8">
          ${FOOTER_NOTE}
        </div>
      </div>
    </div>
  `
}

function buildLoginChallengeText(code: string) {
  return ['Bily Card', '', LOGIN_TITLE, '', `${LOGIN_MESSAGE} ${code}`, '', EXPIRY_NOTE.replace('{minutes}', '10 دقائق'), IGNORE_NOTE].join(
    '\n',
  )
}

async function sendLoginChallengeEmail(to: string, code: string) {
  const transporter = getTransporter()

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: LOGIN_CHALLENGE_SUBJECT,
    text: buildLoginChallengeText(code),
    html: buildLoginChallengeHtml(code),
  })
}

export async function createLoginChallengeForUser(user: { id: string; email: string }) {
  if (isSupabaseProvider()) {
    await deleteDocuments('login_challenges', { userId: user.id })

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const challenge = await writeDocument({
      collection: 'login_challenges',
      userId: user.id,
      status: 'pending',
      payload: {
        userId: user.id,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS).toISOString(),
        usedAt: null,
      },
    })

    await sendLoginChallengeEmail(user.email, code)

    return {
      challengeId: challenge.id,
      requiresVerification: true,
    }
  }

  await connectDb()

  await LoginChallengeModel.deleteMany({ userId: user.id, usedAt: null })

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const challenge = await LoginChallengeModel.create({
    userId: user.id,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS),
  })

  await sendLoginChallengeEmail(user.email, code)

  return {
    challengeId: String(challenge._id),
    requiresVerification: true,
  }
}

export async function requestLoginChallenge(input: { email: string; password: string }) {
  const user = await loginByEmail(input)
  return createLoginChallengeForUser(user)
}

export async function verifyLoginChallenge(input: { challengeId: string; code: string }) {
  if (isSupabaseProvider()) {
    const challenge = await getDocumentById('login_challenges', input.challengeId)
    const payload = challenge?.payload as
      | { userId: string; codeHash: string; expiresAt: string; usedAt: string | null }
      | undefined

    if (!challenge || !payload || payload.usedAt || new Date(payload.expiresAt) <= new Date()) {
      throw new ApiError(400, 'INVALID_LOGIN_CODE', INVALID_CODE_MESSAGE)
    }

    if (payload.codeHash !== hashCode(input.code.trim())) {
      throw new ApiError(401, 'INVALID_LOGIN_CODE', WRONG_CODE_MESSAGE)
    }

    await writeDocument({
      id: challenge.id,
      collection: 'login_challenges',
      userId: challenge.user_id,
      status: 'used',
      payload: {
        ...payload,
        usedAt: new Date().toISOString(),
      },
    })

    return { userId: payload.userId }
  }

  await connectDb()

  const challenge = await LoginChallengeModel.findById(input.challengeId)
  if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date()) {
    throw new ApiError(400, 'INVALID_LOGIN_CODE', INVALID_CODE_MESSAGE)
  }

  if (challenge.codeHash !== hashCode(input.code.trim())) {
    throw new ApiError(401, 'INVALID_LOGIN_CODE', WRONG_CODE_MESSAGE)
  }

  challenge.usedAt = new Date()
  await challenge.save()

  return { userId: String(challenge.userId) }
}
